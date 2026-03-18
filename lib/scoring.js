// Points awarded per win for each seed number
export const ptsForSeed = (seed) => 100 + (seed - 1) * 10

// Max wins any team can have in the tournament (rounds: 64 -> 32 -> 16 -> 8 -> 4 -> 2 -> champion)
const MAX_WINS = 6

// Calculate current score for an array of picks joined with team data
// picks: [{ seed, teams: { wins, eliminated } }]
export const calcScore = (picks = []) =>
  picks.reduce((sum, p) => sum + (p.teams?.wins ?? 0) * ptsForSeed(p.seed), 0)

// Calculate best possible score = current score + max remaining points for non-eliminated teams
// An eliminated team can earn no more points.
// A still-alive team can earn points for (MAX_WINS - wins_so_far) more wins.
export const calcBestPossible = (picks = []) =>
  picks.reduce((sum, p) => {
    const wins = p.teams?.wins ?? 0
    const eliminated = p.teams?.eliminated ?? false
    const currentPts = wins * ptsForSeed(p.seed)
    const remainingPts = eliminated ? 0 : (MAX_WINS - wins) * ptsForSeed(p.seed)
    return sum + currentPts + remainingPts
  }, 0)

// Build scoreboard rows from entries + picks
export const buildScoreboard = (entries = []) =>
  entries
    .map((e) => ({
      ...e,
      score: calcScore(e.picks),
      best_possible: calcBestPossible(e.picks),
    }))
    .sort((a, b) => b.score - a.score)
