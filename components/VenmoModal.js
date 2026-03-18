import { useEffect, useRef } from 'react'
import styles from './VenmoModal.module.css'

const VENMO_HANDLE = 'Matt-Jurgemeyer'
const VENMO_URL = `https://venmo.com/${VENMO_HANDLE}`
const ENTRY_FEE = 100

export default function VenmoModal({ onClose }) {
  const qrRef = useRef(null)

  // Close on Escape key
  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  // Generate QR code once the canvas is mounted
  useEffect(() => {
    if (!qrRef.current) return
    const script = document.createElement('script')
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js'
    script.onload = () => {
      if (qrRef.current) {
        qrRef.current.innerHTML = ''
        new window.QRCode(qrRef.current, {
          text: VENMO_URL,
          width: 180,
          height: 180,
          colorDark: '#000000',
          colorLight: '#ffffff',
          correctLevel: window.QRCode.CorrectLevel.M,
        })
      }
    }
    document.head.appendChild(script)
    return () => { try { document.head.removeChild(script) } catch {} }
  }, [])

  return (
    <div className={styles.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div className={styles.modal}>
        <button className={styles.closeBtn} onClick={onClose} aria-label="Close">✕</button>

        <div className={styles.header}>
          <div className={styles.venmoLogo}>
            <svg viewBox="0 0 64 64" width="28" height="28" fill="none">
              <rect width="64" height="64" rx="12" fill="#008CFF"/>
              <path d="M44 14c1.8 3 2.6 6.1 2.6 10C46.6 34 40 43.5 32 50H18l-6-34.5 12.5-1.2 3.5 27.5C31 37 35.5 28 35.5 21c0-3-.5-5.3-1.5-7L44 14z" fill="white"/>
            </svg>
            Pay via Venmo
          </div>
          <div className={styles.handle}>@{VENMO_HANDLE}</div>
        </div>

        <div className={styles.qrWrap}>
          <div ref={qrRef} className={styles.qr} />
          <div className={styles.qrLabel}>Scan to open Venmo</div>
        </div>

        <a
          href={VENMO_URL}
          target="_blank"
          rel="noopener noreferrer"
          className={styles.venmoBtn}
        >
          Open Venmo
        </a>

        <div className={styles.divider} />

        <div className={styles.feeRow}>
          <span className={styles.feeLabel}>Entry fee</span>
          <span className={styles.feeAmount}>${ENTRY_FEE} per entry</span>
        </div>
        <div className={styles.noteRow}>
          Include your name and entry number in the Venmo note
          (e.g. "John Smith — Entry 1").
        </div>
      </div>
    </div>
  )
}
