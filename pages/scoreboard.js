import { useState, useEffect } from 'react'
import { useSession } from '@supabase/auth-helpers-react'
import Head from 'next/head'
import Header from '../components/Header'
import styles from './scoreboard.module.css'

const ENTRY_FEE = 100

// ≤15 entries : top 3 split the full pot (60 / 27.5 / 12.5%)
// 16–29 entries: 4th=$150 flat, 5th=$100 flat; top 3 split remainder
// 30+ entries  : 4th=$200 flat, 5th=$150 flat, 6th=$100 flat; top 3 split remainder
function calcPayouts(entryCount) {
  const pot = entryCount * ENTRY_FEE
  if (entryCount <= 15) {
    return [
      { place: '1st', amount: Math.floor(pot * 0.600), label: '60%'   },
      { place: '2nd', amount: Math.floor(pot * 0.275), label: '27.5%' },
      { place: '3rd', amount: Math.floor(pot * 0.125), label: '12.5%' },
    ]
  }
  if (entryCount <= 29) {
    const flats = { '4th': 150, '5th': 100 }
    const remaining = pot - 150 - 100
    return [
      { place: '1st', amount: Math.floor(remaining * 0.600), label: '60% of remaining'   },
      { place: '2nd', amount: Math.floor(remaining * 0.275), label: '27.5% of remaining' },
      { place: '3rd', amount: Math.floor(remaining * 0.125), label: '12.5% of remaining' },
      { place: '4th', amount: 150,                           label: 'Flat payout'         },
      { place: '5th', amount: 100,                           label: 'Flat payout'         },
    ]
  }
  // 30+
  const remaining = pot - 200 - 150 - 100
  return [
    { place: '1st', amount: Math.floor(remaining * 0.600), label: '60% of remaining'   },
    { place: '2nd', amount: Math.floor(remaining * 0.275), label: '27.5% of remaining' },
    { place: '3rd', amount: Math.floor(remaining * 0.125), label: '12.5% of remaining' },
    { place: '4th', amount: 200,                           label: 'Flat payout'         },
    { place: '5th', amount: 150,                           label: 'Flat payout'         },
    { place: '6th', amount: 100,                           label: 'Flat payout'         },
  ]
}

function prizeNote(entryCount, pot) {
  if (entryCount <= 15) return null
  if (entryCount <= 29) return `4th & 5th paid flat; top 3 split $${(pot - 250).toLocaleString()}`
  return `4th, 5th & 6th paid flat; top 3 split $${(pot - 450).toLocaleString()}`
}

const medalClasses = ['medal1', 'medal2', 'medal3', 'medal4', 'medal5', 'medal6']

function PrizeCard({ entryCount }) {
  const pot = entryCount * ENTRY_FEE
  const payouts = calcPayouts(entryCount)
  const note = prizeNote(entryCount, pot)
  return (
    <div className={styles.prizeCard}>
      <div className={styles.prizeHeader}>
        <div className={styles.prizeTitle}>Prize Pool</div>
        <div className={styles.prizePot}>${pot.toLocaleString()}</div>
        <div className={styles.prizeSubtitle}>{entryCount} {entryCount === 1 ? 'entry' : 'entries'} × ${ENTRY_FEE}</div>
        {note && <div className={styles.prizeNote}>{note}</div>}
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
  // Set of entry ids whose picks are expanded; first row starts expanded
  const [expanded, setExpanded] = useState(new Set())
  const [firstId, setFirstId] = useState(null)

  useEffect(() => {
    fetch('/api/scoreboard')
      .then(r => r.json())
      .then(d => {
        const board = d.scoreboard || []
        setScoreboard(board)
        setTournamentStarted(d.tournamentStarted || false)
        setLoading(false)
        if (board.length > 0) {
          setFirstId(board[0].id)
          setExpanded(new Set([board[0].id]))
        }
      })
  }, [])

  const myId = session?.user?.id
  const entryCount = scoreboard.length
  const payouts = calcPayouts(entryCount)

  const allExpanded = scoreboard.length > 0 && scoreboard.every(e => expanded.has(e.id))

  function toggleRow(id) {
    setExpanded(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function toggleAll() {
    if (allExpanded) {
      setExpanded(new Set())
    } else {
      setExpanded(new Set(scoreboard.map(e => e.id)))
    }
  }

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
            <PrizeCard entryCount={entryCount} />

            <div>
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th style={{ width: 56 }}>Rank</th>
                      <th>Participant</th>
                      <th style={{ width: 90 }}>Score</th>
                      {tournamentStarted && <th style={{ width: 110 }}>Best Possible</th>}
                      <th>
                        <div className={styles.teamsHeader}>
                          Teams Picked
                          <button className={styles.toggleAllBtn} onClick={toggleAll}>
                            {allExpanded ? 'Hide all' : 'Show all'}
                          </button>
                        </div>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {scoreboard.map((entry, i) => {
                      const isMe = entry.user_id === myId
                      const rankClass = i === 0 ? styles.rank1 : i === 1 ? styles.rank2 : i === 2 ? styles.rank3 : i === 3 ? styles.rank4 : i === 4 ? styles.rank5 : i === 5 ? styles.rank6 : styles.rankOther
                      const payout = payouts[i]
                      const isExpanded = expanded.has(entry.id)
                      return (
                        <tr key={entry.id} className={isMe ? styles.myRow : ''}>
                          <td><div className={`${styles.rankBadge} ${rankClass}`}>{i + 1}</div></td>
                          <td>
                            <div className={styles.entryName}>
                              {entry.entry_name}
                              {isMe && <span className={styles.youBadge}>YOU</span>}
                              {tournamentStarted && payout && (
                                <span className={styles.payoutBadge}>${payout.amount.toLocaleString()}</span>
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
                              <div>
                                {isExpanded && (
                                  <div className={styles.chips}>
                                    {entry.picks.map((p, pi) => (
                                      <div key={pi} className={`${styles.chip} ${p.wins > 0 ? styles.activeChip : ''} ${p.eliminated ? styles.eliminatedChip : ''}`}>
                                        <span className={p.eliminated ? styles.elimStrike : ''}>
                                          #{p.seed} {p.team_name}
                                        </span>
                                        {p.wins > 0 && !p.eliminated && <span className={styles.winsTag}>{p.wins}W</span>}
                                        {p.eliminated && <span className={styles.elimTag}>OUT</span>}
                                      </div>
                                    ))}
                                  </div>
                                )}
                                <button
                                  className={styles.toggleBtn}
                                  onClick={() => toggleRow(entry.id)}
                                >
                                  {isExpanded ? '▲ Hide picks' : `▼ Show ${entry.pick_count} picks`}
                                </button>
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
