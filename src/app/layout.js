import Sidebar from './Sidebar'

export const metadata = {
  title: 'EMI Tracker — Arshaq'
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body style={{
        fontFamily: "'Syne', sans-serif",
        margin: 0,
        background: '#0a0a0f',
        color: '#e8e8f0'
      }}>
        <div style={{ display: 'flex', minHeight: '100vh' }}>
          <Sidebar />
          <div style={{ flex: 1, padding: '40px 36px', overflowY: 'auto' }}>
            {children}
          </div>
        </div>
      </body>
    </html>
  )
}