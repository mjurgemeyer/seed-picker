import { supabase } from '../../lib/supabase'

export default async function handler(req, res) {
  const { data: settings, error: sErr } = await supabase
    .from('tournament_settings')
    .select('*')
    .single()

  const { data: teams, error: tErr } = await supabase
    .from('teams')
    .select('*')
    .order('seed')
    .order('region')

  if (sErr || tErr) return res.status(500).json({ error: 'Failed to load data' })

  // Group teams by seed
  const teamsBySeed = {}
  teams.forEach((t) => {
    if (!teamsBySeed[t.seed]) teamsBySeed[t.seed] = []
    teamsBySeed[t.seed].push(t)
  })

  res.status(200).json({ settings, teamsBySeed })
}
