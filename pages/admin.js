import { useState, useEffect } from 'react'
import { useSession } from '@supabase/auth-helpers-react'
import Head from 'next/head'
import { useRouter } from 'next/router'
import Header from '../components/Header'
import styles from './admin.module.css'

const ADMIN_EMAIL = process.env.NEXT_PUBLIC_ADMIN_EMAIL
const SEEDS = Array.from({ length: 16 }, (_, i) => ({ seed: i + 1, pts: 100 + i * 10 }))

export default function AdminPage() {
  const session = useSession()
  const router = useRouter()
  const [tournament, setTournament] = useState(null)
  const [teamsBySeed, setTeamsBySeed] = useState({})
  const [saving, setSaving] = useState({})
  const [startsAt, setStartsAt] = useState('')

  const isAdmin = session?.user?.email === ADMIN_EMAIL

  useEffect(() => {
    if (session && !isAdmin) router.push('/')
  }, [session, isAdmin])

  useEffect(() => {
    fetch('/api/tournament').then(r => r.json()).then(d => {
      setTournament(d.settings)
      setTeamsBySeed(d.teamsBySeed || {})
      if (d.settings?.starts_at) setStartsAt(d.settings.starts_at.slice(0, 16))
    })
  }, [])

  async function adminAction(body) {
    const res = await fetch('/api/admin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    return res.ok
  }

  async function handleLock(locked) {
    setSaving(s => ({ ...s, lock: true }))
    const ok = await adminAction({ action: 'setLocked', locked })
    if (ok) setTournament(t => ({ ...t, picks_locked: locked }))
    setSaving(s => ({ ...s, lock: false }))
  }

  async function handleWin(teamId, undo = false) {
    const key = undo ? `undo_${teamId}` : teamId
    setSaving(s => ({ ...s, [key]: true }))
    await adminAction({ action: undo ? 'undoWin' : 'recordWin', teamId })
    setTeamsBySeed(prev => {
      const next = { ...prev }
      for (const seed in next) {
        next[seed] = next[seed].map(t =>
          t.id === teamId ? { ...t, wins: Math.max(0, (t.wins || 0) + (undo ? -1 : 1)) } : t
        )
      }
      return next
    })
    setSaving(s => ({ ...s, [key]: false }))
  }

  async function handleEliminated(teamId, eliminated) {
    setSaving(s => ({ ...s, [`elim_${teamId}`]: true }))
    await adminAction({ action: 'setEliminated', teamId, eliminated })
    setTeamsBySeed(prev => {
      const next = { ...prev }
      for (const seed in next) {
        next[seed] = next[seed].map(t => t.id === teamId ? { ...t, eliminated } : t)
      }
      return next
    })
    setSaving(s => ({ ...s, [`elim_${teamId}`]: false }))
  }

  async function handleTeamEdit(teamId, name, region) {
    await adminAction({ action: 'updateTeam', teamId, name, region })
  }

  async function handleSetStartTime() {
    setSaving(s => ({ ...s, time: true }))
    await adminAction({ action: 'setStartTime', startsAt: new Date(startsAt).toISOString() })
    setSaving(s => ({ ...s, time: false }))
  }

  if (!session || !isAdmin) return null

  return (
    <>
      <Head><title>SeedPicker — Admin</title></Head>
      <Header />
      <main className={styles.main}>
        <div className={styles.pageTitle}>Admin Panel</div>
        <div className={styles.pageSub}>Manage teams, record wins, and control tournament settings.</div>

        {/* Settings */}
        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>Tournament Settings</h3>
          <div className={styles.settingsCard}>
            <div className={styles.settingRow}>
              <span className={styles.settingLabel}>Current status</span>
              <span className={tournament?.picks_locked ? styles.statusLocked : styles.statusOpen}>
                {tournament?.picks_locked ? '🔒 Picks locked' : '✅ Picks open'}
              </span>
            </div>
            <div className={styles.settingRow}>
              <span className={styles.settingLabel}>Tournament start time</span>
              <div className={styles.timeRow}>
                <input type="datetime-local" value={startsAt} onChange={e => setStartsAt(e.target.value)} className={styles.dateInput} />
                <button className={styles.btnOutline} onClick={handleSetStartTime} disabled={saving.time}>
                  {saving.time ? 'Saving…' : 'Update'}
                </button>
              </div>
            </div>
            <div className={styles.lockBtns}>
              <button className={styles.btnOutline} onClick={() => handleLock(false)} disabled={saving.lock || !tournament?.picks_locked}>
                Unlock Picks
              </button>
              <button className={styles.btnDanger} onClick={() => handleLock(true)} disabled={saving.lock || tournament?.picks_locked}>
                {saving.lock ? 'Updating…' : 'Lock & Start Tournament'}
              </button>
            </div>
          </div>
        </section>

        {/* Record Wins & Eliminations */}
        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>Wins & Eliminations</h3>
          <p className={styles.sectionNote}>
            Record a win each time a team advances. Mark a team as eliminated when they lose —
            this removes them from "Best Possible" score calculations on the scoreboard.
          </p>
          <div className={styles.grid}>
            {SEEDS.map(({ seed, pts }) => (
              <div key={seed} className={styles.adminCard}>
                <div className={styles.cardTitle}>#{seed} Seed — {pts} pts/win</div>
                {(teamsBySeed[seed] || []).map(t => (
                  <div key={t.id} className={`${styles.teamRow} ${t.eliminated ? styles.teamRowElim : ''}`}>
                    <span className={styles.teamName}>{t.name}</span>
                    <span className={styles.winsCount}>{t.wins || 0}W</span>
                    <button
                      className={styles.undoBtn}
                      onClick={() => handleWin(t.id, true)}
                      disabled={saving[`undo_${t.id}`] || !t.wins}
                      title="Undo last win"
                    >
                      −
                    </button>
                    <button
                      className={styles.winBtn}
                      onClick={() => handleWin(t.id)}
                      disabled={saving[t.id] || t.eliminated}
                    >
                      +Win
                    </button>
                    <button
                      className={`${styles.elimBtn} ${t.eliminated ? styles.elimBtnActive : ''}`}
                      onClick={() => handleEliminated(t.id, !t.eliminated)}
                      disabled={saving[`elim_${t.id}`]}
                      title={t.eliminated ? 'Mark as still alive' : 'Mark as eliminated'}
                    >
                      {t.eliminated ? 'OUT' : 'Elim'}
                    </button>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </section>

        {/* Edit Teams */}
        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>Edit Team Names</h3>
          <p className={styles.sectionNote}>Update names or regions if the bracket changes.</p>
          <div className={styles.grid}>
            {SEEDS.map(({ seed }) => (
              <div key={seed} className={styles.adminCard}>
                <div className={styles.cardTitle}>#{seed} Seed</div>
                {(teamsBySeed[seed] || []).map(t => (
                  <TeamEditRow key={t.id} team={t} onSave={(name, region) => handleTeamEdit(t.id, name, region)} />
                ))}
              </div>
            ))}
          </div>
        </section>
      </main>
    </>
  )
}

function TeamEditRow({ team, onSave }) {
  const [name, setName] = useState(team.name)
  const [region, setRegion] = useState(team.region)
  const [saved, setSaved] = useState(false)

  async function handleBlur() {
    if (name !== team.name || region !== team.region) {
      await onSave(name, region)
      setSaved(true)
      setTimeout(() => setSaved(false), 1500)
    }
  }

  return (
    <div className={styles.editRow}>
      <input className={styles.editInput} value={name} onChange={e => setName(e.target.value)} onBlur={handleBlur} />
      <input className={styles.editInputSmall} value={region} onChange={e => setRegion(e.target.value)} onBlur={handleBlur} placeholder="Region" />
      {saved && <span className={styles.savedDot} title="Saved" />}
    </div>
  )
}
