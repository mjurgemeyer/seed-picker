import { createPagesServerClient } from '@supabase/auth-helpers-nextjs'
import { supabase } from '../../../lib/supabase'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  // Auth — use the user's own session cookie for all writes.
  // This means RLS policies apply naturally; no service role key needed.
  const supabaseServer = createPagesServerClient({ req, res })
  const { data: { user }, error: authErr } = await supabaseServer.auth.getUser()
  if (!user) return res.status(401).json({ error: 'Not authenticated' })

  // Check picks aren't locked (public read, no auth needed)
  const { data: settings } = await supabase
    .from('tournament_settings')
    .select('picks_locked')
    .single()
  if (settings?.picks_locked) return res.status(403).json({ error: 'Picks are locked' })

  const { entryIndex, picks } = req.body
  if (![0, 1].includes(entryIndex)) return res.status(400).json({ error: 'Invalid entry index' })
  if (!Array.isArray(picks) || picks.length > 16) return res.status(400).json({ error: 'Invalid picks' })

  const entryName = entryIndex === 0
    ? user.user_metadata?.full_name || user.email
    : `${user.user_metadata?.full_name || user.email} (2)`

  // Upsert the entry using the user's session (respects RLS: user_id = auth.uid())
  const { data: entry, error: entryErr } = await supabaseServer
    .from('entries')
    .upsert(
      { user_id: user.id, entry_index: entryIndex, entry_name: entryName, updated_at: new Date().toISOString() },
      { onConflict: 'user_id,entry_index' }
    )
    .select()
    .single()

  if (entryErr) {
    console.error('Entry upsert error:', entryErr)
    return res.status(500).json({ error: entryErr.message })
  }

  // Delete existing picks for this entry then re-insert
  const { error: deleteErr } = await supabaseServer
    .from('picks')
    .delete()
    .eq('entry_id', entry.id)

  if (deleteErr) {
    console.error('Picks delete error:', deleteErr)
    return res.status(500).json({ error: deleteErr.message })
  }

  if (picks.length > 0) {
    const rows = picks.map(({ seed, teamId }) => ({ entry_id: entry.id, seed, team_id: teamId }))
    const { error: picksErr } = await supabaseServer.from('picks').insert(rows)
    if (picksErr) {
      console.error('Picks insert error:', picksErr)
      return res.status(500).json({ error: picksErr.message })
    }
  }

  res.status(200).json({ ok: true, entryId: entry.id })
}
