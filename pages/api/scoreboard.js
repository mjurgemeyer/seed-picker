import { supabase } from '../../lib/supabase'
import { buildScoreboard } from '../../lib/scoring'
import { createPagesServerClient } from '@supabase/auth-helpers-nextjs'

export default async function handler(req, res) {
  const supabaseServer = createPagesServerClient({ req, res })
  const { data: { user } } = await supabaseServer.auth.getUser()

  const { data: settings } = await supabase
    .from('tournament_settings')
    .select('picks_locked')
    .single()

  const tournamentStarted = settings?.picks_locked ?? false

  const { data: entries, error } = await supabase
    .from('entries')
    .select(`
      id, entry_name, user_id, updated_at,
      picks (
        seed, team_id,
        teams ( id, name, seed, region, wins, eliminated )
      )
    `)
    .order('entry_name')

  if (error) return res.status(500).json({ error: error.message })

  const scoreboard = buildScoreboard(entries || [])

  // Hide picks from other users until tournament starts
  const sanitized = scoreboard.map((e) => ({
    id: e.id,
    entry_name: e.entry_name,
    user_id: e.user_id,
    score: e.score,
    pick_count: e.picks?.length ?? 0,
    picks: (tournamentStarted || e.user_id === user?.id)
      ? e.picks.map((p) => ({ seed: p.seed, team_name: p.teams?.name, wins: p.teams?.wins ?? 0 }))
      : null, // hidden
  }))

  res.status(200).json({ scoreboard: sanitized, tournamentStarted })
}
