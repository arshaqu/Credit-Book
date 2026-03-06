'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'

export default function Sidebar() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  const navItems = [
    { href: '/', label: 'Dashboard', icon: '◉' },
    { href: '/Bike', label: 'Bike', icon: '🏍️' },
    { href: '/Phone', label: 'Phone', icon: '📱' },
    { href: '/Iphone', label: 'Iphone', icon: '◇' },
    { href: '/Credit', label: 'Credit', icon: '💳' },
    { href: '/Debit', label: 'Debit', icon: '💸' },
    { href: '/history', label: 'History', icon: '📜' },
    { href: '/plan', label: 'Plan', icon: '🎯' },


    


  ]

  return (
    <>
      <style>{`
        .sidebar {
          width: 220px;
          background: #0d0d14;
          border-right: 1px solid #1a1a2e;
          padding: 28px 20px;
          display: flex;
          flex-direction: column;
          gap: 8px;
          position: sticky;
          top: 0;
          height: 100vh;
          transition: transform 0.3s ease;
        }

        .hamburger {
          display: none;
          position: fixed;
          top: 16px;
          left: 16px;
          background: #161622;
          border: none;
          color: #fff;
          font-size: 1.4rem;
          padding: 8px 12px;
          border-radius: 8px;
          z-index: 1001;
          cursor: pointer;
        }

        .overlay {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.6);
          backdrop-filter: blur(4px);
          z-index: 1000;
        }

        @media (max-width: 768px) {
          .sidebar {
            position: fixed;
            left: 0;
            top: 0;
            height: 100vh;
            z-index: 1002;
            transform: translateX(-100%);
          }

          .sidebar.open {
            transform: translateX(0);
          }

          .hamburger {
            display: block;
          }
        }
      `}</style>

      {/* Hamburger Button */}
      <button className="hamburger" onClick={() => setOpen(true)}>
        ☰
      </button>

      {/* Overlay */}
      {open && <div className="overlay" onClick={() => setOpen(false)} />}

      {/* Sidebar */}
      <div className={`sidebar ${open ? 'open' : ''}`}>
        
        {/* Logo */}
        <div style={{ marginBottom: 32 }}>
          <div style={{
            fontSize: '0.65rem',
            letterSpacing: '3px',
            textTransform: 'uppercase',
            color: '#444',
            marginBottom: 6,
            fontFamily: 'monospace'
          }}>arshaq</div>

          <div style={{
            fontSize: '1.1rem',
            fontWeight: 800,
            background: 'linear-gradient(135deg, #fff, #7c6af7)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
          }}>
            Credit App
          </div>
        </div>

        {/* Nav Label */}
        <div style={{
          fontSize: '0.65rem',
          letterSpacing: '2px',
          textTransform: 'uppercase',
          color: '#333',
          marginBottom: 4,
          fontFamily: 'monospace'
        }}>
          Navigation
        </div>

        {navItems.map(({ href, label, icon }) => {
          const isActive = pathname === href
          return (
            <Link
              key={href}
              href={href}
              onClick={() => setOpen(false)}
              style={{
                color: isActive ? '#fff' : '#aaa',
                textDecoration: 'none',
                padding: '10px 14px',
                borderRadius: 10,
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                fontSize: '0.9rem',
                fontWeight: 600,
                background: isActive ? '#161622' : 'transparent',
                transition: 'all 0.2s',
              }}
            >
              <span style={{ fontSize: '0.8rem', color: '#7c6af7' }}>
                {icon}
              </span>
              {label}
            </Link>
          )
        })}

        {/* Bottom */}
        <div style={{
          marginTop: 'auto',
          fontSize: '0.7rem',
          color: '#333',
          fontFamily: 'monospace'
        }}>
          v1.0.0 · production
        </div>
      </div>
    </>
  )
}