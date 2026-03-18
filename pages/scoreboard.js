import { useState, useEffect } from 'react'
import { useSession } from '@supabase/auth-helpers-react'
import Head from 'next/head'
import Header from '../components/Header'
import styles from './scoreboard.module.css'

const ENTRY_FEE = 100
const PAYOUTS = [
  { place: '1st', pct: 0.60,  label: '60%'   },
  { place: '2nd', pct: 0.275, label: '27.5%' },
  { place: '3rd', pct: 0.125, label: '12.5%' },
]

function PrizeCard({ entryCount }) {
  const pot = entryCount * ENTRY_FEE
  return (
    <div className={styles.prizeCard}>
      <div className={styles.prizeHeader}>
        <div className={styles.prizeTitle}>Prize Pool</div>
        <div className={styles.prizePot}>${pot.toLocaleString()}</div>
        <div className={styles.prizeSubtitle}>{entryCount} {entryCount === 1 ? 'entry' : 'entries'} × ${ENTRY_FEE}</div>
      </div>
      <div className={styles.prizeRows}>
        {PAYOUTS.map((p, i) => {
          const amount = Math.floor(pot * p.pct)
          const medalClass = [styles.medal1, styles.medal2, styles.medal3][i]
          return (
            <div key={i} className={styles.prizeRow}>
              <div className={`${styles.medal} ${medalClass}`}>{p.place}</div>
              <div className={styles.prizePct}>{p.label}</div>
              <div className={styles.prizeAmount}>${amount.toLocaleString()}</div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default function ScoreboardPage() {
  const session = useSession()
  const [scoreboard, setScoreboard] = useState([])
  const [tournamentStarted, setTournamentStarted] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/scoreboard')
      .then(r => r.json())
      .then(d => {
        setScoreboard(d.scoreboard || [])
        setTournamentStarted(d.tournamentStarted || false)
        setLoading(false)
      })
  }, [])

  const myId = session?.user?.id
  const entryCount = scoreboard.length

  return (
    <>
      <Head><title>SeedPicker — Scoreboard</title></Head>
      <Header />
      <main className={styles.main}>
        <div className={styles.header}>
          <div className={styles.pageTitle}>Scoreboard</div>
          <div className={styles.pageSub}>
            {tournamentStarted
              ? 'Live standings — updates as teams advance.'
              : 'Standings are visible, but picks are hidden until the tournament begins.'}
          </div>
        </div>

        {loading ? (
          <div className={styles.empty}><p>Loading…</p></div>
        ) : scoreboard.length === 0 ? (
          <div className={styles.empty}>
            <div className={styles.emptyIcon}>🏀</div>
            <p>No entries yet. Be the first to submit picks!</p>
          </div>
        ) : (
          <div className={styles.contentRow}>
            {/* Left: prize card */}
            <PrizeCard entryCount={entryCount} />

            {/* Right: scoreboard table */}
            <div>
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th style={{ width: 56 }}>Rank</th>
                      <th>Participant</th>
                      <th style={{ width: 90 }}>Score</th>
                      {tournamentStarted && <th style={{ width: 110 }}>Best Possible</th>}
                      <th>Teams Picked</th>
                    </tr>
                  </thead>
                  <tbody>
                    {scoreboard.map((entry, i) => {
                      const isMe = entry.user_id === myId
                      const rankClass = i === 0 ? styles.rank1 : i === 1 ? styles.rank2 : i === 2 ? styles.rank3 : styles.rankOther
                      const payout = PAYOUTS[i]
                      return (
                        <tr key={entry.id} className={isMe ? styles.myRow : ''}>
                          <td><div className={`${styles.rankBadge} ${rankClass}`}>{i + 1}</div></td>
                          <td>
                            <div className={styles.entryName}>
                              {entry.entry_name}
                              {isMe && <span className={styles.youBadge}>YOU</span>}
                              {tournamentStarted && payout && (
                                <span className={styles.payoutBadge}>
                                  ${Math.floor(entryCount * ENTRY_FEE * payout.pct).toLocaleString()}
                                </span>
                              )}
                            </div>
                            <div className={styles.entrySub}>{entry.pick_count} picks made</div>
                          </td>
                          <td><div className={styles.scorePts}>{entry.score.toLocaleString()}</div></td>
                          {tournamentStarted && (
                            <td><div className={styles.bestPts}>{entry.best_possible.toLocaleString()}</div></td>
                          )}
                          <td>
                            {entry.picks ? (
                              <div className={styles.chips}>
                                {entry.picks.map((p, pi) => (
                                  <div key={pi} className={`${styles.chip} ${p.wins > 0 ? styles.activeChip : ''} ${p.eliminated ? styles.eliminatedChip : ''}`}>
                                    #{p.seed} {p.team_name}
                                    {p.wins > 0 && <span className={styles.winsTag}>{p.wins}W</span>}
                                    {p.eliminated && <span className={styles.elimTag}>OUT</span>}
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <span className={styles.hidden}>Hidden until tip-off</span>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {!tournamentStarted && (
                <div className={styles.notice}>
                  Pick counts are visible so participants know others have submitted. Team selections reveal at tip-off.
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </>
  )
}
