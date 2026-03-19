import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { useSession } from '@supabase/auth-helpers-react'
import Head from 'next/head'
import Auth from '../components/Auth'
import Header from '../components/Header'
import VenmoModal from '../components/VenmoModal'
import styles from './picks.module.css'

const SEEDS = Array.from({ length: 16 }, (_, i) => ({ seed: i + 1, pts: 100 + i * 10 }))

export default function PicksPage() {
  const session = useSession()
  const router = useRouter()
  const [teamsBySeed, setTeamsBySeed] = useState({})
  const [activeEntry, setActiveEntry] = useState(0)
  const [picks, setPicks] = useState([{}, {}])
  const [saveStatus, setSaveStatus] = useState('idle')
  const [hasEntry, setHasEntry] = useState([false, false])
  const [loading, setLoading] = useState(true)
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [tournament, setTournament] = useState(null)
  const [showVenmo, setShowVenmo] = useState(false)

  useEffect(() => {
    fetch('/api/tournament').then(r => r.json()).then(d => {
      setTournament(d.settings)
      setTeamsBySeed(d.teamsBySeed || {})
      // Redirect logged-in users to scoreboard when picks are locked
      if (d.settings?.picks_locked && session) {
        router.replace('/scoreboard')
      }
    })
  }, [session])

  useEffect(() => {
    if (!session) return
    fetch('/api/picks/mine').then(r => r.json()).then(d => {
      if (d.entries) {
        const p = [{}, {}]
        const has = [false, false]
        d.entries.forEach(e => {
          const map = {}
          e.picks.forEach(pk => { map[pk.seed] = pk.team_id })
          p[e.entry_index] = map
          has[e.entry_index] = true
        })
        setPicks(p)
        setHasEntry(has)
      }
      setLoading(false)
    })
  }, [session])

  const locked = tournament?.picks_locked ?? false

  async function handleSave() {
    setSaveStatus('saving')
    const curPicks = picks[activeEntry]
    const picksArr = Object.entries(curPicks).map(([seed, teamId]) => ({ seed: parseInt(seed), teamId }))
    const res = await fetch('/api/picks/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ entryIndex: activeEntry, picks: picksArr }),
    })
    if (res.ok) {
      setSaveStatus('saved')
      setHasEntry(prev => { const n = [...prev]; n[activeEntry] = true; return n })
      setTimeout(() => setSaveStatus('idle'), 2500)
    } else {
      const data = await res.json()
      console.error('Save error:', data)
      setSaveStatus('error')
    }
  }

  async function handleDeleteEntry(entryIndex) {
    setDeleting(true)
    const res = await fetch('/api/picks/delete-entry', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ entryIndex }),
    })
    if (res.ok) {
      if (entryIndex === 0) {
        const wasEntry1 = hasEntry[1]
        setPicks(prev => [wasEntry1 ? prev[1] : {}, {}])
        setHasEntry([wasEntry1, false])
        setActiveEntry(0)
      } else {
        setPicks(prev => [prev[0], {}])
        setHasEntry(prev => [prev[0], false])
        setActiveEntry(0)
      }
    }
    setDeleteConfirm(null)
    setDeleting(false)
  }

  function togglePick(seed, teamId) {
    if (locked) return
    setPicks(prev => {
      const next = [...prev]
      const cur = { ...next[activeEntry] }
      if (cur[seed] === teamId) { delete cur[seed] } else { cur[seed] = teamId }
      next[activeEntry] = cur
      return next
    })
  }

  const curPicks = picks[activeEntry]
  const pickCount = Object.keys(curPicks).length
  const showEntry2Tab = hasEntry[1] || Object.keys(picks[1]).length > 0

  if (!session) return (
    <>
      <Head><title>SeedPicker — NCAA Seed Picker</title></Head>
      <Header />
      <Auth />
    </>
  )

  return (
    <>
      <Head><title>SeedPicker — My Picks</title></Head>
      <Header activePage="picks" />
      <main className={styles.main} style={{ paddingBottom: locked ? 24 : 80 }}>
        <div className={styles.pageTitle}>My Picks</div>
        <div className={styles.pageSub}>
          Select one team per seed. Up to 2 entries allowed.{' '}
          <button className={styles.venmoLink} onClick={() => setShowVenmo(true)}>
            $100 per entry
          </button>
        </div>

        <div className={`${styles.banner} ${locked ? styles.locked : styles.open}`}>
          <span className={styles.dot} />
          {locked
            ? 'Picks are locked — the tournament has started. Good luck!'
            : 'Picks are open. Edit anytime before the first game.'}
        </div>

        <div className={styles.entryTabs}>
          <button
            className={`${styles.tab} ${activeEntry === 0 ? styles.activeTab : ''}`}
            onClick={() => setActiveEntry(0)}
          >
            Entry 1
          </button>
          {showEntry2Tab
            ? <button
                className={`${styles.tab} ${activeEntry === 1 ? styles.activeTab : ''}`}
                onClick={() => setActiveEntry(1)}
              >
                Entry 2
              </button>
            : !locked && (
              <button className={styles.addTab} onClick={() => setActiveEntry(1)}>
                + Add Entry 2
              </button>
            )
          }
        </div>

        <div className={styles.grid}>
          {SEEDS.map(({ seed, pts }) => {
            const teams = teamsBySeed[seed] || []
            return (
              <div key={seed} className={styles.seedCard}>
                <div className={styles.seedHeader}>
                  <span className={styles.seedLabel}>#{seed} Seed</span>
                  <span className={styles.seedPts}>{pts} pts/win</span>
                </div>
                <div className={styles.teamsList}>
                  {teams.map(t => {
                    const isSel = curPicks[seed] === t.id
                    return (
                      <button
                        key={t.id}
                        className={`${styles.teamBtn} ${isSel ? styles.selected : ''}`}
                        disabled={locked && !isSel}
                        onClick={() => togglePick(seed, t.id)}
                      >
                        <div className={`${styles.check} ${isSel ? styles.checkFilled : ''}`}>
                          {isSel && <div className={styles.checkmark} />}
                        </div>
                        <span className={styles.teamName}>{t.name}</span>
                        <span className={styles.teamRegion}>{t.region}</span>
                      </button>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>

        {!locked && hasEntry[activeEntry] && (
          <div className={styles.deleteSection}>
            {deleteConfirm === activeEntry ? (
              <div className={styles.deleteConfirm}>
                <span>Remove Entry {activeEntry + 1}?{activeEntry === 0 && hasEntry[1] ? ' Entry 2 will become Entry 1.' : ' This cannot be undone.'}</span>
                <button className={styles.btnConfirmDelete} onClick={() => handleDeleteEntry(activeEntry)} disabled={deleting}>
                  {deleting ? 'Removing…' : 'Yes, remove'}
                </button>
                <button className={styles.btnCancelDelete} onClick={() => setDeleteConfirm(null)}>Cancel</button>
              </div>
            ) : (
              <button className={styles.btnDeleteEntry} onClick={() => setDeleteConfirm(activeEntry)}>
                Remove Entry {activeEntry + 1}
              </button>
            )}
          </div>
        )}

        {!locked && (
          <div className={styles.saveBar}>
            <div className={styles.picksCount}>
              Entry {activeEntry + 1}: <strong>{pickCount}/16</strong> seeds picked
            </div>
            <div className={styles.saveRight}>
              {saveStatus === 'saved' && <span className={styles.savedMsg}>✓ Saved!</span>}
              {saveStatus === 'error' && <span className={styles.errorMsg}>Save failed — try again</span>}
              <button
                className={styles.saveBtn}
                onClick={handleSave}
                disabled={pickCount === 0 || saveStatus === 'saving'}
              >
                {saveStatus === 'saving' ? 'Saving…' : 'Save Picks'}
              </button>
            </div>
          </div>
        )}
      </main>

      {showVenmo && <VenmoModal onClose={() => setShowVenmo(false)} />}
    </>
  )
}
