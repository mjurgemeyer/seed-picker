import { useState, useEffect } from 'react'
import { useSession } from '@supabase/auth-helpers-react'
import Head from 'next/head'
import Header from '../components/Header'
import styles from './scoreboard.module.css'

const ENTRY_FEE = 100
const LARGE_FIELD_THRESHOLD = 15

// ≤15 entries: top 3 split the full pot (60 / 27.5 / 12.5%).
// >15 entries: 4th gets $150 flat, 5th gets $100 flat,
//              top 3 split the remaining pot at the same percentages.
function calcPayouts(entryCount) {
  const pot = entryCount * ENTRY_FEE
  if (entryCount <= LARGE_FIELD_THRESHOLD) {
    return [
      { place: '1st', amount: Math.floor(pot * 0.600), label: '60%'   },
      { place: '2nd', amount: Math.floor(pot * 0.275), label: '27.5%' },
      { place: '3rd', amount: Math.floor(pot * 0.125), label: '12.5%' },
    ]
  }
  const flat4th = 150
  const flat5th = 100
  const remaining = pot - flat4th - flat5th
  return [
    { place: '1st', amount: Math.floor(remaining * 0.600), label: '60% of remaining' },
    { place: '2nd', amount: Math.floor(remaining * 0.275), label: '27.5% of remaining' },
    { place: '3rd', amount: Math.floor(remaining * 0.125), label: '12.5% of remaining' },
    { place: '4th', amount: flat4th,                       label: 'Flat payout'        },
    { place: '5th', amount: flat5th,                       label: 'Flat payout'        },
  ]
}

const medalClasses = ['medal1', 'medal2', 'medal3', 'medal4', 'medal5']

function PrizeCard({ entryCount }) {
  const pot = entryCount * ENTRY_FEE
  const payouts = calcPayouts(entryCount)
  const isLarge = entryCount > LARGE_FIELD_THRESHOLD
  return (
    <div className={styles.prizeCard}>
      <div className={styles.prizeHeader}>
        <div className={styles.prizeTitle}>Prize Pool</div>
        <div className={styles.prizePot}>${pot.toLocaleString()}</div>
        <div className={styles.prizeSubtitle}>{entryCount} {entryCount === 1 ? 'entry' : 'entries'} × ${ENTRY_FEE}</div>
        {isLarge && (
          <div className={styles.prizeNote}>4th & 5th paid flat; top 3 split ${(pot - 250).toLocaleString()}</div>
        )}
      </div>
      <div className={styles.prizeRows}>
        {payouts.map((p, i) => (
          <div key={i} className={styles.prizeRow}>
            <div className={`${styles.medal} ${styles[medalClasses[i]]}`}>{p.place}</div>
            <div className={styles.prizePct}>{p.label}</div>
            <div className={styles.prizeAmount}>${p.amount.toLocaleString()}</div>
          </div>
        ))}
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
                      const payout = calcPayouts(entryCount)[i]
                      return (
                        <tr key={entry.id} className={isMe ? styles.myRow : ''}>
                          <td><div className={`${styles.rankBadge} ${rankClass}`}>{i + 1}</div></td>
                          <td>
                            <div className={styles.entryName}>
                              {entry.entry_name}
                              {isMe && <span className={styles.youBadge}>YOU</span>}
                              {tournamentStarted && payout && (
                                <span className={styles.payoutBadge}>
                                  ${payout.amount.toLocaleString()}
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
