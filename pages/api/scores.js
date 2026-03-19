// Fetches live NCAA tournament scores from ESPN's public API.
// Returns live, upcoming (next 24h), and recently completed (last 3h) games.
// Always returns 200 with empty arrays on any failure so the scoreboard never breaks.

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 's-maxage=30, stale-while-revalidate=60')

  try {
    const url = 'https://site.api.espn.com/apis/site/v2/sports/basketball/mens-college-basketball/scoreboard?groups=100&limit=50'
    const apiRes = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
    })

    if (!apiRes.ok) return res.status(200).json({ live: [], upcoming: [], recent: [] })

    const data = await apiRes.json()
    const events = data.events || []
    const now = Date.now()
    const THREE_HOURS_MS = 3 * 60 * 60 * 1000
    const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000

    const live = [], upcoming = [], recent = []

    for (const event of events) {
      const comp = event.competitions?.[0]
      if (!comp) continue
      const status = event.status?.type?.name // STATUS_IN_PROGRESS, STATUS_FINAL, STATUS_SCHEDULED
      const startMs = new Date(event.date).getTime()

      const home = comp.competitors?.find(c => c.homeAway === 'home')
      const away = comp.competitors?.find(c => c.homeAway === 'away')
      if (!home || !away) continue

      const game = {
        id: event.id,
        home: home.team?.abbreviation,
        away: away.team?.abbreviation,
        homeName: home.team?.displayName,
        awayName: away.team?.displayName,
        homeScore: home.score,
        awayScore: away.score,
        clock: event.status?.displayClock,
        period: event.status?.period,
        startTime: event.date,
        displayTime: new Date(event.date).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZoneName: 'short' }),
      }

      if (status === 'STATUS_IN_PROGRESS') {
        live.push(game)
      } else if (status === 'STATUS_SCHEDULED' && startMs - now < TWENTY_FOUR_HOURS_MS && startMs > now) {
        upcoming.push(game)
      } else if (status === 'STATUS_FINAL' && now - startMs < THREE_HOURS_MS) {
        recent.push(game)
      }
    }

    res.status(200).json({ live, upcoming, recent })
  } catch (e) {
    res.status(200).json({ live: [], upcoming: [], recent: [] })
  }
}
