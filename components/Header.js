import { useState } from 'react'
import { useSession, useSupabaseClient } from '@supabase/auth-helpers-react'
import Link from 'next/link'
import { useRouter } from 'next/router'
import styles from './Header.module.css'

const ADMIN_EMAIL = process.env.NEXT_PUBLIC_ADMIN_EMAIL

export default function Header() {
  const session = useSession()
  const supabase = useSupabaseClient()
  const router = useRouter()
  const [menuOpen, setMenuOpen] = useState(false)

  const user = session?.user
  const isAdmin = user?.email === ADMIN_EMAIL
  const initials = user?.user_metadata?.full_name
    ? user.user_metadata.full_name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
    : user?.email?.slice(0, 2).toUpperCase() ?? ''

  async function handleLogout() {
    setMenuOpen(false)
    await supabase.auth.signOut()
    router.push('/')
  }

  function closeMenu() { setMenuOpen(false) }

  const navLinks = [
    { href: '/', label: 'My Picks' },
    { href: '/scoreboard', label: 'Scoreboard' },
    ...(isAdmin ? [{ href: '/admin', label: 'Admin' }] : []),
  ]

  return (
    <>
      <header className={styles.header}>
        <Link href="/" className={styles.logo}>Seed<span>Picker</span></Link>

        {user && (
          <>
            {/* Desktop nav */}
            <nav className={styles.nav}>
              {navLinks.map(({ href, label }) => (
                <Link key={href} href={href} className={`${styles.navBtn} ${router.pathname === href ? styles.active : ''}`}>
                  {label}
                </Link>
              ))}
            </nav>

            <div className={styles.right}>
              {/* Desktop user info */}
              <div className={styles.userInfo}>
                <div className={styles.avatar}>{initials}</div>
                <span className={styles.userName}>{user.user_metadata?.full_name || user.email}</span>
                <button className={styles.logoutBtn} onClick={handleLogout}>Sign out</button>
              </div>

              {/* Mobile hamburger */}
              <button
                className={styles.hamburger}
                onClick={() => setMenuOpen(o => !o)}
                aria-label="Toggle menu"
                aria-expanded={menuOpen}
              >
                <span className={`${styles.bar} ${menuOpen ? styles.barOpen1 : ''}`} />
                <span className={`${styles.bar} ${menuOpen ? styles.barOpen2 : ''}`} />
                <span className={`${styles.bar} ${menuOpen ? styles.barOpen3 : ''}`} />
              </button>
            </div>
          </>
        )}
      </header>

      {/* Mobile dropdown menu */}
      {user && menuOpen && (
        <>
          <div className={styles.mobileOverlay} onClick={closeMenu} />
          <div className={styles.mobileMenu}>
            <div className={styles.mobileUser}>
              <div className={styles.avatar}>{initials}</div>
              <span className={styles.mobileUserName}>{user.user_metadata?.full_name || user.email}</span>
            </div>
            {navLinks.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className={`${styles.mobileNavBtn} ${router.pathname === href ? styles.mobileActive : ''}`}
                onClick={closeMenu}
              >
                {label}
              </Link>
            ))}
            <button className={styles.mobileLogout} onClick={handleLogout}>Sign out</button>
          </div>
        </>
      )}
    </>
  )
}
