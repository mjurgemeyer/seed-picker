// Points awarded per win for each seed number
export const ptsForSeed = (seed) => 100 + (seed - 1) * 10

// Calculate total score for an array of picks joined with team wins
// picks: [{ seed, team_id, teams: { wins } }]
export const calcScore = (picks = []) =>
  picks.reduce((sum, p) => sum + (p.teams?.wins ?? 0) * ptsForSeed(p.seed), 0)

// Build scoreboard rows from entries + picks
// entries: [{ id, entry_name, user_id, picks: [...] }]
export const buildScoreboard = (entries = []) =>
  entries
    .map((e) => ({ ...e, score: calcScore(e.picks) }))
    .sort((a, b) => b.score - a.score)
