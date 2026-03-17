import { useState, useEffect } from 'react'
import { useSession } from '@supabase/auth-helpers-react'
import Head from 'next/head'
import Header from '../components/Header'
import styles from './scoreboard.module.css'

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

  return (
    <>
      <Head><title>BracketBuster — Scoreboard</title></Head>
      <Header />
      <main className={styles.main}>
        <div className={styles.pageTitle}>Scoreboard</div>
        <div className={styles.pageSub}>
          {tournamentStarted
            ? 'Live standings — updates as teams advance.'
            : 'Standings are visible, but picks are hidden until the tournament begins.'}
        </div>

        {loading ? (
          <div className={styles.empty}><p>Loading…</p></div>
        ) : scoreboard.length === 0 ? (
          <div className={styles.empty}>
            <div className={styles.emptyIcon}>🏀</div>
            <p>No entries yet. Be the first to submit picks!</p>
          </div>
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th style={{ width: 56 }}>Rank</th>
                  <th>Participant</th>
                  <th style={{ width: 100 }}>Score</th>
                  <th>Teams Picked</th>
                </tr>
              </thead>
              <tbody>
                {scoreboard.map((entry, i) => {
                  const isMe = entry.user_id === myId
                  const rankClass = i === 0 ? styles.rank1 : i === 1 ? styles.rank2 : i === 2 ? styles.rank3 : styles.rankOther
                  return (
                    <tr key={entry.id} className={isMe ? styles.myRow : ''}>
                      <td><div className={`${styles.rankBadge} ${rankClass}`}>{i + 1}</div></td>
                      <td>
                        <div className={styles.entryName}>
                          {entry.entry_name}
                          {isMe && <span className={styles.youBadge}>YOU</span>}
                        </div>
                        <div className={styles.entrySub}>{entry.pick_count} picks made</div>
                      </td>
                      <td><div className={styles.scorePts}>{entry.score.toLocaleString()}</div></td>
                      <td>
                        {entry.picks ? (
                          <div className={styles.chips}>
                            {entry.picks.map((p, pi) => (
                              <div key={pi} className={`${styles.chip} ${p.wins > 0 ? styles.activeChip : ''}`}>
                                #{p.seed} {p.team_name}
                                {p.wins > 0 && <span className={styles.winsTag}>{p.wins}W</span>}
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
        )}

        {!tournamentStarted && scoreboard.length > 0 && (
          <div className={styles.notice}>
            Pick counts are visible so participants know others have submitted. Team selections reveal at tip-off.
          </div>
        )}
      </main>
    </>
  )
}
