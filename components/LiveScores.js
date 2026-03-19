import { useState, useEffect, useRef } from 'react'
import styles from './LiveScores.module.css'

const REFRESH_INTERVAL_LIVE = 30000   // 30s while games are live
const REFRESH_INTERVAL_IDLE = 300000  // 5 min when no live games

export default function LiveScores() {
  const [data, setData] = useState(null)
  const intervalRef = useRef(null)

  async function fetchScores() {
    try {
      const res = await fetch('/api/scores')
      if (!res.ok) return
      const json = await res.json()
      setData(json)
    } catch {}
  }

  useEffect(() => {
    fetchScores()
  }, [])

  useEffect(() => {
    if (!data) return
    clearInterval(intervalRef.current)
    const hasLive = data.live?.length > 0
    intervalRef.current = setInterval(fetchScores, hasLive ? REFRESH_INTERVAL_LIVE : REFRESH_INTERVAL_IDLE)
    return () => clearInterval(intervalRef.current)
  }, [data?.live?.length])

  if (!data) return null
  const { live = [] } = data
  if (live.length === 0) return null

  return (
    <div className={styles.wrap}>
      <div className={styles.header}>
        <span className={styles.title}>Current Games</span>
        <span className={styles.livePill}>● LIVE</span>
        <button className={styles.refreshBtn} onClick={fetchScores} title="Refresh scores">↻</button>
      </div>
      <div className={styles.section}>
        {live.map(g => (
          <GameRow key={g.id} game={g} />
        ))}
      </div>
    </div>
  )
}

function GameRow({ game }) {
  const homeWinning = parseInt(game.homeScore) > parseInt(game.awayScore)
  const awayWinning = parseInt(game.awayScore) > parseInt(game.homeScore)
  const period = game.period

  // ESPN sends STATUS_HALFTIME as a separate status; the clock also reads
  // "0:00" at end of first half before halftime status kicks in, so we
  // catch both the explicit flag and the clock-at-zero case.
  const isHalftime = game.isHalftime || (game.clock === '0:00' && period === 1)
  const halfLabel = isHalftime
    ? 'Half'
    : period === 1 ? '1st'
    : period === 2 ? '2nd'
    : period === 3 ? 'OT'
    : period > 3 ? `${period - 2}OT`
    : ''

  const clockDisplay = isHalftime ? 'Halftime' : `${game.clock}${halfLabel ? ` ${halfLabel}` : ''}`

  return (
    <div className={styles.gameLive}>
      <div className={styles.teams}>
        <div className={`${styles.team} ${homeWinning ? styles.teamWinning : ''}`}>
          <span className={styles.teamAbbr}>{game.home}</span>
          <span className={`${styles.score} ${homeWinning ? styles.scoreWinning : ''}`}>{game.homeScore}</span>
        </div>
        <div className={`${styles.team} ${awayWinning ? styles.teamWinning : ''}`}>
          <span className={styles.teamAbbr}>{game.away}</span>
          <span className={`${styles.score} ${awayWinning ? styles.scoreWinning : ''}`}>{game.awayScore}</span>
        </div>
      </div>
      <div className={styles.status}>
        <span className={`${styles.clock} ${isHalftime ? styles.clockHalf : ''}`}>{clockDisplay}</span>
      </div>
    </div>
  )
}
