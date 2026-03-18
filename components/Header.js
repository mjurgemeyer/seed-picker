import { useSession, useSupabaseClient } from '@supabase/auth-helpers-react'
import Link from 'next/link'
import { useRouter } from 'next/router'
import styles from './Header.module.css'

const ADMIN_EMAIL = process.env.NEXT_PUBLIC_ADMIN_EMAIL

export default function Header() {
  const session = useSession()
  const supabase = useSupabaseClient()
  const router = useRouter()

  const user = session?.user
  const isAdmin = user?.email === ADMIN_EMAIL
  const initials = user?.user_metadata?.full_name
    ? user.user_metadata.full_name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
    : user?.email?.slice(0, 2).toUpperCase() ?? ''

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/')
  }

  return (
    <header className={styles.header}>
      <Link href="/" className={styles.logo}>Seed<span>Picker</span></Link>
      {user && (
        <>
          <nav className={styles.nav}>
            <Link href="/" className={`${styles.navBtn} ${router.pathname === '/' ? styles.active : ''}`}>My Picks</Link>
            <Link href="/scoreboard" className={`${styles.navBtn} ${router.pathname === '/scoreboard' ? styles.active : ''}`}>Scoreboard</Link>
            {isAdmin && <Link href="/admin" className={`${styles.navBtn} ${router.pathname === '/admin' ? styles.active : ''}`}>Admin</Link>}
          </nav>
          <div className={styles.userInfo}>
            <div className={styles.avatar}>{initials}</div>
            <span className={styles.userName}>{user.user_metadata?.full_name || user.email}</span>
            <button className={styles.logoutBtn} onClick={handleLogout}>Sign out</button>
          </div>
        </>
      )}
    </header>
  )
}
