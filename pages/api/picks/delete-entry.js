import { createPagesServerClient } from '@supabase/auth-helpers-nextjs'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const supabaseServer = createPagesServerClient({ req, res })
  const { data: { user } } = await supabaseServer.auth.getUser()
  if (!user) return res.status(401).json({ error: 'Not authenticated' })

  const { entryIndex } = req.body
  if (![0, 1].includes(entryIndex)) return res.status(400).json({ error: 'Invalid entry index' })

  // Fetch the user's entries
  const { data: entries, error: fetchErr } = await supabaseServer
    .from('entries')
    .select('id, entry_index')
    .eq('user_id', user.id)
    .order('entry_index')

  if (fetchErr) return res.status(500).json({ error: fetchErr.message })

  const toDelete = entries.find(e => e.entry_index === entryIndex)
  if (!toDelete) return res.status(404).json({ error: 'Entry not found' })

  // Delete the target entry (picks cascade via FK)
  const { error: deleteErr } = await supabaseServer
    .from('entries')
    .delete()
    .eq('id', toDelete.id)

  if (deleteErr) return res.status(500).json({ error: deleteErr.message })

  // If entry 0 was deleted and entry 1 exists, promote entry 1 -> entry 0
  if (entryIndex === 0) {
    const entry1 = entries.find(e => e.entry_index === 1)
    if (entry1) {
      const fullName = user.user_metadata?.full_name || user.email
      const { error: promoteErr } = await supabaseServer
        .from('entries')
        .update({ entry_index: 0, entry_name: fullName })
        .eq('id', entry1.id)

      if (promoteErr) return res.status(500).json({ error: promoteErr.message })
    }
  }

  res.status(200).json({ ok: true })
}
