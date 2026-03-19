import { createAdminClient } from '../../lib/supabase'
import { createPagesServerClient } from '@supabase/auth-helpers-nextjs'

const ADMIN_EMAIL = process.env.NEXT_PUBLIC_ADMIN_EMAIL

async function assertAdmin(req, res) {
  const supabaseServer = createPagesServerClient({ req, res })
  const { data: { user } } = await supabaseServer.auth.getUser()
  if (!user || user.email !== ADMIN_EMAIL) {
    res.status(403).json({ error: 'Forbidden' })
    return null
  }
  return user
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()
  const user = await assertAdmin(req, res)
  if (!user) return

  const admin = createAdminClient()
  const { action } = req.body

  if (action === 'setLocked') {
    const { locked } = req.body
    const { error } = await admin.from('tournament_settings').update({ picks_locked: locked }).eq('id', 1)
    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json({ ok: true })
  }

  if (action === 'recordWin') {
    const { teamId } = req.body
    const { data: team, error: fetchErr } = await admin.from('teams').select('wins').eq('id', teamId).single()
    if (fetchErr) return res.status(500).json({ error: fetchErr.message })
    const { error } = await admin.from('teams').update({ wins: (team.wins || 0) + 1 }).eq('id', teamId)
    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json({ ok: true })
  }

  // Undo a win (in case of mis-click)
  if (action === 'undoWin') {
    const { teamId } = req.body
    const { data: team, error: fetchErr } = await admin.from('teams').select('wins').eq('id', teamId).single()
    if (fetchErr) return res.status(500).json({ error: fetchErr.message })
    const { error } = await admin.from('teams').update({ wins: Math.max(0, (team.wins || 0) - 1) }).eq('id', teamId)
    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json({ ok: true })
  }

  if (action === 'setEliminated') {
    const { teamId, eliminated } = req.body
    const { error } = await admin.from('teams').update({ eliminated }).eq('id', teamId)
    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json({ ok: true })
  }

  if (action === 'updateTeam') {
    const { teamId, name, region } = req.body
    const { error } = await admin.from('teams').update({ name, region }).eq('id', teamId)
    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json({ ok: true })
  }

  if (action === 'setStartTime') {
    const { startsAt } = req.body
    const { error } = await admin.from('tournament_settings').update({ starts_at: startsAt }).eq('id', 1)
    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json({ ok: true })
  }

  if (action === 'setPaid') {
    const { entryId, paid } = req.body
    const { error } = await admin.from('entries').update({ paid }).eq('id', entryId)
    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json({ ok: true })
  }

  res.status(400).json({ error: 'Unknown action' })
}
