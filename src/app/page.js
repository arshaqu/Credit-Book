'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabase'

// Define these at the top level outside the component
const BIKE_PENDING   = 23690
const PHONE_PENDING  = 9074
const IPHONE_PENDING = 30000
const TOTAL_NEED_TO_GET = BIKE_PENDING + PHONE_PENDING + IPHONE_PENDING

export default function Page() {
  const router = useRouter()
  const [stats, setStats] = useState(null)
    const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { fetchAllStats() }, [])

  async function fetchAllStats() {
    setLoading(true)
    const [bikeRes, phoneRes, iphoneRes, needToPayRes, needToGetRes] = await Promise.all([
      supabase.from('bike').select('amount_paid'),
      supabase.from('Phone Emi').select('emi_amount, balance'),
      supabase.from('Iphone').select('emi_amount'),
      supabase.from('Need To pay').select('pending'),
      supabase.from('Need to Get').select('amount'),
    ])

    const bike      = bikeRes.data      || []
    const phone     = phoneRes.data     || []
    const iphone    = iphoneRes.data    || []
    const needToPay = needToPayRes.data || []
    const needToGet = needToGetRes.data || []

    const bikePaid    = bike.reduce((s, r)   => s + Number(r.amount_paid || 0), 0)
    const phonePaid   = phone.reduce((s, r)  => s + Number(r.emi_amount  || 0), 0)
    const iphonePaid  = iphone.reduce((s, r) => s + Number(r.emi_amount  || 0), 0)

    const bikeRemaining   = 62190 - bikePaid
    const phoneRemaining  = 24999 - phonePaid
    const iphoneRemaining = 50000 - iphonePaid

    setStats({
      bike:      { paid: bikePaid,   remaining: bikeRemaining,   months: bike.length,   total: 62190 },
      phone:     { paid: phonePaid,  remaining: phoneRemaining,  months: phone.length,  total: 24999,
                   balance: phone.reduce((s, r) => s + Number(r.balance || 0), 0) },
      iphone:    { paid: iphonePaid, remaining: iphoneRemaining, months: iphone.length, total: 50000 },
      needToPay: { pending: needToPay.reduce((s, r) => s + Number(r.pending || 0), 0), count: needToPay.length },
      needToGet: { amount:  needToGet.reduce((s, r) => s + Number(r.amount  || 0), 0), count: needToGet.length },
    })
    setLoading(false)
  }

  const totalRemainingEMI = stats ? (stats.bike.remaining + stats.phone.remaining + stats.iphone.remaining) : 0
  const totalPending      = stats ? stats.needToPay.pending : 0

  if (loading) return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:'80vh', gap:16, color:'#888' }}>
      <div style={{ width:40, height:40, border:'3px solid #222', borderTopColor:'#7c6af7', borderRadius:'50%', animation:'spin 0.8s linear infinite' }} />
      <p>Loading...</p>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #0a0a0f; color: #e8e8f0; font-family: 'Syne', sans-serif; }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }

        .page-header { margin-bottom: 36px; }
        .page-header h1 { font-size: 2.2rem; font-weight: 800; letter-spacing: -0.5px; background: linear-gradient(135deg, #fff 40%, #7c6af7); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
        .page-header p { color: #555; margin-top: 6px; font-size: 0.8rem; font-family: 'JetBrains Mono', monospace; }

        .overview-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-bottom: 36px; }
        .overview-card { background: #111118; border: 1px solid #1e1e2e; border-radius: 16px; padding: 24px; position: relative; overflow: hidden; animation: fadeIn 0.3s ease; }
        .overview-card::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 3px; }
        .overview-card.red::before    { background: linear-gradient(90deg, #ff4d4d, #ff8c8c); }
        .overview-card.green::before  { background: linear-gradient(90deg, #4dff91, #4dffd4); }
        .overview-card.orange::before { background: linear-gradient(90deg, #ffa94d, #ffd94d); }
        .overview-label { font-size: 0.7rem; text-transform: uppercase; letter-spacing: 1.5px; color: #555; margin-bottom: 8px; }
        .overview-value { font-size: 1.9rem; font-weight: 800; font-family: 'JetBrains Mono', monospace; letter-spacing: -1px; }
        .overview-card.red .overview-value    { color: #ff6b6b; }
        .overview-card.green .overview-value  { color: #4dff91; }
        .overview-card.orange .overview-value { color: #ffa94d; }
        .overview-sub { font-size: 0.72rem; color: #444; margin-top: 8px; font-family: 'JetBrains Mono', monospace; line-height: 1.8; }
        .overview-sub span { display: block; }

        .section-title { font-size: 0.7rem; text-transform: uppercase; letter-spacing: 2px; color: #444; margin-bottom: 16px; font-family: 'JetBrains Mono', monospace; padding-left: 4px; }

        .nav-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 16px; margin-bottom: 36px; }
        .nav-card { background: #111118; border: 1px solid #1e1e2e; border-radius: 16px; padding: 22px; cursor: pointer; position: relative; overflow: hidden; transition: transform 0.15s, border-color 0.2s; animation: fadeIn 0.3s ease; }
        .nav-card:hover { transform: translateY(-3px); }
        .nav-card::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 3px; }
        .nav-card.purple::before { background: linear-gradient(90deg, #7c6af7, #a89af7); }
        .nav-card.purple:hover   { border-color: #7c6af755; }
        .nav-card.blue::before   { background: linear-gradient(90deg, #4d9fff, #a8d4ff); }
        .nav-card.blue:hover     { border-color: #4d9fff55; }
        .nav-card.cyan::before   { background: linear-gradient(90deg, #4dfff0, #4db8ff); }
        .nav-card.cyan:hover     { border-color: #4dfff055; }

        .nav-card-top { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; }
        .nav-card-icon { width: 44px; height: 44px; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 1.4rem; }
        .nav-card.purple .nav-card-icon { background: #7c6af711; }
        .nav-card.blue   .nav-card-icon { background: #4d9fff11; }
        .nav-card.cyan   .nav-card-icon { background: #4dfff011; }
        .nav-card-arrow { color: #333; font-size: 1.2rem; transition: color 0.15s, transform 0.15s; }
        .nav-card:hover .nav-card-arrow { color: #888; transform: translateX(3px); }
        .nav-card-label { font-size: 1rem; font-weight: 800; color: #e8e8f0; margin-bottom: 14px; }

        .nav-card-stats { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
        .nav-stat { background: #0a0a14; border-radius: 10px; padding: 10px 12px; }
        .nav-stat-label { font-size: 0.62rem; text-transform: uppercase; letter-spacing: 1.2px; color: #444; margin-bottom: 4px; }
        .nav-stat-value { font-size: 0.95rem; font-weight: 700; font-family: 'JetBrains Mono', monospace; }
        .nav-stat-value.green  { color: #4dff91; }
        .nav-stat-value.red    { color: #ff6b6b; }
        .nav-stat-value.orange { color: #ffa94d; }
        .nav-stat-value.blue   { color: #6ab4ff; }
        .nav-stat-value.purple { color: #c084fc; }

        .simple-nav-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 16px; margin-bottom: 36px; }
        .simple-nav-card { background: #111118; border: 1px solid #1e1e2e; border-radius: 16px; padding: 22px; cursor: pointer; position: relative; overflow: hidden; transition: transform 0.15s, border-color 0.2s; animation: fadeIn 0.35s ease; display: flex; flex-direction: column; align-items: flex-start; gap: 12px; }
        .simple-nav-card:hover { transform: translateY(-3px); }
        .simple-nav-card::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 3px; }
        .simple-nav-card.pink::before   { background: linear-gradient(90deg, #ff6eb4, #ff94d4); }
        .simple-nav-card.pink:hover     { border-color: #ff6eb455; }
        .simple-nav-card.teal::before   { background: linear-gradient(90deg, #4dffcf, #4dff91); }
        .simple-nav-card.teal:hover     { border-color: #4dffcf55; }
        .simple-nav-card.yellow::before { background: linear-gradient(90deg, #ffe44d, #ffd94d); }
        .simple-nav-card.yellow:hover   { border-color: #ffe44d55; }
        .simple-nav-card.indigo::before { background: linear-gradient(90deg, #818cf8, #6366f1); }
        .simple-nav-card.indigo:hover   { border-color: #818cf855; }

        .simple-icon { width: 48px; height: 48px; border-radius: 14px; display: flex; align-items: center; justify-content: center; font-size: 1.5rem; }
        .simple-nav-card.pink   .simple-icon { background: #ff6eb411; }
        .simple-nav-card.teal   .simple-icon { background: #4dffcf11; }
        .simple-nav-card.yellow .simple-icon { background: #ffe44d11; }
        .simple-nav-card.indigo .simple-icon { background: #818cf811; }
        .simple-label { font-size: 1rem; font-weight: 800; color: #e8e8f0; }
        .simple-sub   { font-size: 0.75rem; color: #444; font-family: 'JetBrains Mono', monospace; }
        .simple-value { font-size: 1.3rem; font-weight: 800; font-family: 'JetBrains Mono', monospace; }
        .simple-nav-card.pink   .simple-value { color: #ff6eb4; }
        .simple-nav-card.teal   .simple-value { color: #4dffcf; }
        .simple-nav-card.yellow .simple-value { color: #ffe44d; }
        .simple-nav-card.indigo .simple-value { color: #818cf8; }
        .simple-arrow { position: absolute; bottom: 18px; right: 18px; color: #2a2a3e; font-size: 1rem; transition: color 0.15s; }
        .simple-nav-card:hover .simple-arrow { color: #555; }

        @media (max-width: 768px) {
          .overview-grid { grid-template-columns: 1fr; }
          .nav-grid { grid-template-columns: 1fr; }
          .simple-nav-grid { grid-template-columns: 1fr 1fr; }
        }
        @media (max-width: 480px) {
          .simple-nav-grid { grid-template-columns: 1fr; }
        }
      `}</style>

      {/* Header */}
      <div className="page-header">
        <h1>◉ Dashboard</h1>
        <p>// {new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
      </div>

      {/* Overview */}
      <div className="section-title">// overview</div>
      <div className="overview-grid">

        <div className="overview-card red">
          <div className="overview-label">Total Remaining EMI</div>
          <div className="overview-value">₹{totalRemainingEMI.toLocaleString()}</div>
          <div className="overview-sub">
            <span>🏍️ Bike — ₹{stats.bike.remaining.toLocaleString()}</span>
            <span>📞 Phone — ₹{stats.phone.remaining.toLocaleString()}</span>
            <span>📱 iPhone — ₹{stats.iphone.remaining.toLocaleString()}</span>
          </div>
        </div>

        <div className="overview-card green">
          <div className="overview-label">Total Remaining to Pay</div>
          <div className="overview-value">₹{TOTAL_NEED_TO_GET.toLocaleString()}</div>
          <div className="overview-sub">
            <span>🏍️ ₹{BIKE_PENDING.toLocaleString()}</span>
            <span>📞 ₹{PHONE_PENDING.toLocaleString()}</span>
            <span>📱 ₹{IPHONE_PENDING.toLocaleString()}</span>
          </div>
        </div>

        <div className="overview-card orange">
          <div className="overview-label">1 Mont Minimum Pay</div>
          <div className="overview-value">₹11,625</div>
          <div className="overview-sub">
            <span>{stats.needToPay.count} pending payments</span>
          </div>
        </div>

      </div>

      {/* EMI Section */}
      <div className="section-title">// emi trackers</div>
      <div className="nav-grid">

        <div className="nav-card purple" onClick={() => router.push('/Bike')}>
          <div className="nav-card-top">
            <div className="nav-card-icon">🏍️</div>
            <span className="nav-card-arrow">→</span>
          </div>
          <div className="nav-card-label">Bike EMI</div>
          <div className="nav-card-stats">
            <div className="nav-stat">
              <div className="nav-stat-label">Total</div>
              <div className="nav-stat-value purple">₹62,190</div>
            </div>
            <div className="nav-stat">
              <div className="nav-stat-label">Paid</div>
              <div className="nav-stat-value green">₹{stats.bike.paid.toLocaleString()}</div>
            </div>
            <div className="nav-stat">
              <div className="nav-stat-label">Remaining</div>
              <div className="nav-stat-value red">₹{stats.bike.remaining.toLocaleString()}</div>
            </div>
            <div className="nav-stat">
              <div className="nav-stat-label">Months Done</div>
              <div className="nav-stat-value blue">{stats.bike.months} / 18</div>
            </div>
          </div>
        </div>

        <div className="nav-card blue" onClick={() => router.push('/Phone')}>
          <div className="nav-card-top">
            <div className="nav-card-icon">📞</div>
            <span className="nav-card-arrow">→</span>
          </div>
          <div className="nav-card-label">Phone EMI</div>
          <div className="nav-card-stats">
            <div className="nav-stat">
              <div className="nav-stat-label">Total</div>
              <div className="nav-stat-value blue">₹24,999</div>
            </div>
            <div className="nav-stat">
              <div className="nav-stat-label">Paid</div>
              <div className="nav-stat-value green">₹{stats.phone.paid.toLocaleString()}</div>
            </div>
            <div className="nav-stat">
              <div className="nav-stat-label">Remaining</div>
              <div className="nav-stat-value red">₹{stats.phone.remaining.toLocaleString()}</div>
            </div>
            <div className="nav-stat">
              <div className="nav-stat-label">Months Done</div>
              <div className="nav-stat-value orange">{stats.phone.months} / 8</div>
            </div>
          </div>
        </div>

        <div className="nav-card cyan" onClick={() => router.push('/Iphone')}>
          <div className="nav-card-top">
            <div className="nav-card-icon">📱</div>
            <span className="nav-card-arrow">→</span>
          </div>
          <div className="nav-card-label">iPhone EMI</div>
          <div className="nav-card-stats">
            <div className="nav-stat">
              <div className="nav-stat-label">Total</div>
              <div className="nav-stat-value blue">₹50,000</div>
            </div>
            <div className="nav-stat">
              <div className="nav-stat-label">Paid</div>
              <div className="nav-stat-value green">₹{stats.iphone.paid.toLocaleString()}</div>
            </div>
            <div className="nav-stat">
              <div className="nav-stat-label">Remaining</div>
              <div className="nav-stat-value red">₹{stats.iphone.remaining.toLocaleString()}</div>
            </div>
            <div className="nav-stat">
              <div className="nav-stat-label">Months Done</div>
              <div className="nav-stat-value orange">{stats.iphone.months} / 10</div>
            </div>
          </div>
        </div>

      </div>

      {/* Quick Links */}
      <div className="section-title">// quick links</div>
      <div className="simple-nav-grid">

        <div className="simple-nav-card yellow" onClick={() => router.push('/Credit')}>
          <div className="simple-icon">💳</div>
          <div className="simple-label">Credit</div>
          <div className="simple-sub">credit tracker</div>
          <span className="simple-arrow">→</span>
        </div>

        <div className="simple-nav-card indigo" onClick={() => router.push('/Debit')}>
          <div className="simple-icon">💸</div>
          <div className="simple-label">Debit</div>
          <div className="simple-sub">debit tracker</div>
          <span className="simple-arrow">→</span>
        </div>

        <div className="simple-nav-card pink" onClick={() => router.push('/NeedToPay')}>
          <div className="simple-icon">🧾</div>
          <div className="simple-label">Need To Pay</div>
          <div className="simple-value">₹{stats.needToPay.pending.toLocaleString()}</div>
          <div className="simple-sub">{stats.needToPay.count} people</div>
          <span className="simple-arrow">→</span>
        </div>

        <div className="simple-nav-card teal" onClick={() => router.push('/NeedToGet')}>
          <div className="simple-icon">💰</div>
          <div className="simple-label">Need To Get</div>
          <div className="simple-value">₹{stats.needToGet.amount.toLocaleString()}</div>
          <div className="simple-sub">{stats.needToGet.count} people</div>
          <span className="simple-arrow">→</span>
        </div>

      </div>

         <div className="section">
        <div className="section-header">
          <div className="section-title">
            <div className="section-icon">🕒</div>
            Activity History
          </div>
          <span className="section-badge">{history.length} events</span>
        </div>
        {history.length === 0 ? (
          <div className="history-empty">No activity yet. Changes will appear here.</div>
        ) : (
          <div className="history-list">
            {history.map((item) => (
              <div key={item.id} className="history-item">
                <div className="history-dot" style={{ background: `${getActionColor(item.action)}18`, border: `1px solid ${getActionColor(item.action)}44` }}>
                  {getActionIcon(item.action)}
                </div>
                <div className="history-content">
                  <div className="history-action" style={{ color: getActionColor(item.action) }}>{item.action}</div>
                  <div className="history-details">{item.details}</div>
                  <div className="history-time">{new Date(item.created_at).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent Activity */}
      <div className="section-title">// recent activity</div>
      <div
        style={{ background:'#111118', border:'1px solid #1e1e2e', borderRadius:16, padding:24, cursor:'pointer', position:'relative', overflow:'hidden', transition:'border-color 0.2s' }}
        onClick={() => router.push('/History')}
        onMouseEnter={e => e.currentTarget.style.borderColor = '#7c6af755'}
        onMouseLeave={e => e.currentTarget.style.borderColor = '#1e1e2e'}
      >
        {/* Top bar */}
        <div style={{ position:'absolute', top:0, left:0, right:0, height:3, background:'linear-gradient(90deg, #7c6af7, #a89af7)' }} />

        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <div style={{ width:36, height:36, borderRadius:10, background:'#0a0a1a', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'1.1rem' }}>🕒</div>
            <span style={{ fontWeight:800, fontSize:'1rem' }}>Activity History</span>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <span style={{ fontFamily:'JetBrains Mono, monospace', fontSize:'0.75rem', background:'#1a1a2e', color:'#666', padding:'4px 10px', borderRadius:20 }}>all pages</span>
            <span style={{ color:'#555', fontSize:'1rem', transition:'color 0.15s, transform 0.15s' }}>→</span>
          </div>
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap:12 }}>
          {[
            { label:'Bike',        icon:'🏍️', color:'#7c6af7' },
            { label:'Phone EMI',   icon:'📞', color:'#4d9fff' },
            { label:'iPhone EMI',  icon:'📱', color:'#4dfff0' },
            { label:'Need To Pay', icon:'🧾', color:'#ff6eb4' },
          ].map(item => (
            <div key={item.label} style={{ background:'#0a0a14', borderRadius:10, padding:'10px 12px', borderLeft:`3px solid ${item.color}33` }}>
              <div style={{ fontSize:'0.65rem', textTransform:'uppercase', letterSpacing:'1.2px', color:'#444', marginBottom:4, fontFamily:'JetBrains Mono, monospace' }}>{item.icon} {item.label}</div>
              <div style={{ fontSize:'0.8rem', color:'#555', fontFamily:'JetBrains Mono, monospace' }}>view logs →</div>
            </div>
          ))}
        </div>

        <div style={{ marginTop:14, fontSize:'0.72rem', color:'#333', fontFamily:'JetBrains Mono, monospace' }}>
          Click to view full activity history across all pages
        </div>
      </div>

      
    </>
  )
}