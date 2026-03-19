// Fetches live NCAA tournament scores from ESPN's public API.
// Always returns 200 with empty arrays on any failure so the scoreboard never breaks.

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 's-maxage=30, stale-while-revalidate=60')

  try {
    const url = 'https://site.api.espn.com/apis/site/v2/sports/basketball/mens-college-basketball/scoreboard?groups=100&limit=50'
    const apiRes = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } })

    if (!apiRes.ok) return res.status(200).json({ live: [] })

    const data = await apiRes.json()
    const events = data.events || []

    const live = []

    for (const event of events) {
      const comp = event.competitions?.[0]
      if (!comp) continue

      const status = event.status?.type?.name
      // Include in-progress AND halftime games; exclude finished/scheduled
      const isActive = status === 'STATUS_IN_PROGRESS' || status === 'STATUS_HALFTIME'
      if (!isActive) continue

      const home = comp.competitors?.find(c => c.homeAway === 'home')
      const away = comp.competitors?.find(c => c.homeAway === 'away')
      if (!home || !away) continue

      live.push({
        id: event.id,
        home: home.team?.abbreviation,
        away: away.team?.abbreviation,
        homeScore: home.score,
        awayScore: away.score,
        clock: event.status?.displayClock,
        period: event.status?.period,
        isHalftime: status === 'STATUS_HALFTIME',
      })
    }

    res.status(200).json({ live })
  } catch (e) {
    res.status(200).json({ live: [] })
  }
}
