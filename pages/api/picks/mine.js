import { createPagesServerClient } from '@supabase/auth-helpers-nextjs'
import { supabase } from '../../../lib/supabase'

export default async function handler(req, res) {
  const supabaseServer = createPagesServerClient({ req, res })
  const { data: { user } } = await supabaseServer.auth.getUser()
  if (!user) return res.status(401).json({ error: 'Not authenticated' })

  const { data: entries, error } = await supabase
    .from('entries')
    .select(`
      id, entry_index, entry_name, updated_at,
      picks ( seed, team_id )
    `)
    .eq('user_id', user.id)
    .order('entry_index')

  if (error) return res.status(500).json({ error: error.message })

  res.status(200).json({ entries: entries || [] })
}
