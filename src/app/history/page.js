'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'

export default function Page() {
  const [history, setHistory] = useState([])
  const [filtered, setFiltered] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeFilter, setActiveFilter] = useState('ALL')
  const [activeSource, setActiveSource] = useState('ALL')

  useEffect(() => { fetchAllHistory() }, [])

  useEffect(() => {
    let data = [...history]
    if (activeFilter !== 'ALL') data = data.filter(h => h.action === activeFilter)
    if (activeSource !== 'ALL') data = data.filter(h => h.source === activeSource)
    setFiltered(data)
  }, [activeFilter, activeSource, history])

  async function fetchAllHistory() {
    setLoading(true)
    const [bikeRes, phoneRes, iphoneRes, needToPayRes, needToGetRes] = await Promise.all([
      supabase.from('Bike_History').select('*').order('created_at', { ascending: false }).limit(100),
      supabase.from('PhoneEmi_History').select('*').order('created_at', { ascending: false }).limit(100),
      supabase.from('Iphone_History').select('*').order('created_at', { ascending: false }).limit(100),
      supabase.from('NeedToPay_History').select('*').order('created_at', { ascending: false }).limit(100),
      supabase.from('NeedToGet_History').select('*').order('created_at', { ascending: false }).limit(100),
    ])

    const tag = (data, source, color, icon) =>
      (data || []).map(r => ({ ...r, source, color, icon }))

    const all = [
      ...tag(bikeRes.data,      'Bike',        '#7c6af7', '🏍️'),
      ...tag(phoneRes.data,     'Phone EMI',   '#4d9fff', '📞'),
      ...tag(iphoneRes.data,    'iPhone EMI',  '#4dfff0', '📱'),
      ...tag(needToPayRes.data, 'Need To Pay', '#ff6eb4', '🧾'),
      ...tag(needToGetRes.data, 'Need To Get', '#4dffcf', '💰'),
    ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at))

    setHistory(all)
    setFiltered(all)
    setLoading(false)
  }

  const sources = ['ALL', 'Bike', 'Phone EMI', 'iPhone EMI', 'Need To Pay', 'Need To Get']
  const actions = ['ALL', 'ADD', 'EDIT', 'DELETE']

  const getActionColor = (a) => a === 'ADD' ? '#4dff91' : a === 'EDIT' ? '#6ab4ff' : a === 'DELETE' ? '#ff6b6b' : '#ffa94d'
  const getActionIcon  = (a) => a === 'ADD' ? '➕' : a === 'EDIT' ? '✏️' : a === 'DELETE' ? '🗑️' : '📝'

  const addCount    = history.filter(h => h.action === 'ADD').length
  const editCount   = history.filter(h => h.action === 'EDIT').length
  const deleteCount = history.filter(h => h.action === 'DELETE').length

  if (loading) return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:'80vh', gap:16, color:'#888' }}>
      <div style={{ width:40, height:40, border:'3px solid #222', borderTopColor:'#7c6af7', borderRadius:'50%', animation:'spin 0.8s linear infinite' }} />
      <p>Loading history...</p>
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
        @keyframes fadeIn { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }

        .page-header { margin-bottom: 32px; }
        .page-header h1 { font-size: 2rem; font-weight: 800; letter-spacing: -0.5px; background: linear-gradient(135deg, #fff 40%, #7c6af7); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
        .page-header p { color: #555; margin-top: 6px; font-size: 0.8rem; font-family: 'JetBrains Mono', monospace; }

        /* Stats */
        .stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; margin-bottom: 28px; }
        .stat-card { background: #111118; border: 1px solid #1e1e2e; border-radius: 14px; padding: 18px 20px; position: relative; overflow: hidden; }
        .stat-card::before { content:''; position:absolute; top:0; left:0; right:0; height:3px; }
        .stat-card.all::before    { background: linear-gradient(90deg, #7c6af7, #a89af7); }
        .stat-card.add::before    { background: linear-gradient(90deg, #4dff91, #4dffd4); }
        .stat-card.edit::before   { background: linear-gradient(90deg, #4d9fff, #a8d4ff); }
        .stat-card.delete::before { background: linear-gradient(90deg, #ff4d4d, #ff8c8c); }
        .stat-label { font-size: 0.65rem; text-transform: uppercase; letter-spacing: 1.5px; color: #555; margin-bottom: 6px; }
        .stat-value { font-size: 1.6rem; font-weight: 800; font-family: 'JetBrains Mono', monospace; }
        .stat-card.all .stat-value    { color: #a89af7; }
        .stat-card.add .stat-value    { color: #4dff91; }
        .stat-card.edit .stat-value   { color: #6ab4ff; }
        .stat-card.delete .stat-value { color: #ff6b6b; }

        /* Filters */
        .filters-row { display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 10px; }
        .filter-label { font-size: 0.65rem; text-transform: uppercase; letter-spacing: 1.5px; color: #444; font-family: 'JetBrains Mono', monospace; margin-bottom: 8px; }
        .filter-group { margin-bottom: 20px; }
        .filter-btn { border: 1px solid #2a2a3e; background: transparent; color: #555; padding: 6px 14px; border-radius: 20px; font-family: 'Syne', sans-serif; font-size: 0.78rem; font-weight: 600; cursor: pointer; transition: all 0.15s; }
        .filter-btn:hover { background: #1a1a2e; color: #aaa; }
        .filter-btn.active { border-color: #7c6af7; background: #7c6af722; color: #a89af7; }
        .filter-btn.active-add    { border-color: #4dff91; background: #4dff9122; color: #4dff91; }
        .filter-btn.active-edit   { border-color: #4d9fff; background: #4d9fff22; color: #6ab4ff; }
        .filter-btn.active-delete { border-color: #ff4d4d; background: #ff4d4d22; color: #ff6b6b; }

        /* Source filter pills with colored dots */
        .source-btn { border: 1px solid #2a2a3e; background: transparent; color: #555; padding: 6px 14px; border-radius: 20px; font-family: 'Syne', sans-serif; font-size: 0.78rem; font-weight: 600; cursor: pointer; transition: all 0.15s; display: inline-flex; align-items: center; gap: 6px; }
        .source-btn:hover { background: #1a1a2e; color: #aaa; }
        .source-btn.active { border-color: #7c6af7; background: #7c6af722; color: #e8e8f0; }
        .source-dot { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; }

        /* History list */
        .section { background: #111118; border: 1px solid #1e1e2e; border-radius: 16px; padding: 24px; }
        .section-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; }
        .section-title { font-size: 1rem; font-weight: 700; display: flex; align-items: center; gap: 10px; }
        .section-icon { width: 36px; height: 36px; border-radius: 10px; background: #0a0a1a; display: flex; align-items: center; justify-content: center; font-size: 1.1rem; }
        .section-badge { font-family: 'JetBrains Mono', monospace; font-size: 0.75rem; background: #1a1a2e; color: #666; padding: 4px 10px; border-radius: 20px; }

        .history-list { display: flex; flex-direction: column; }
        .history-item { display: flex; gap: 14px; align-items: flex-start; padding: 14px 0; border-bottom: 1px solid #161622; animation: fadeIn 0.2s ease; }
        .history-item:last-child { border-bottom: none; }

        .history-dot { width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 0.95rem; flex-shrink: 0; }
        .history-content { flex: 1; min-width: 0; }
        .history-top { display: flex; align-items: center; gap: 8px; margin-bottom: 4px; flex-wrap: wrap; }
        .history-action-badge { font-size: 0.65rem; font-weight: 700; text-transform: uppercase; letter-spacing: 1.2px; padding: 2px 8px; border-radius: 20px; }
        .history-source-badge { font-size: 0.65rem; font-weight: 600; padding: 2px 8px; border-radius: 20px; background: #1a1a2e; color: #555; display: flex; align-items: center; gap: 5px; }
        .history-details { font-size: 0.82rem; color: #777; font-family: 'JetBrains Mono', monospace; line-height: 1.6; word-break: break-word; white-space: normal; }
        .history-time { font-size: 0.68rem; color: #333; font-family: 'JetBrains Mono', monospace; margin-top: 5px; }

        .empty-state { text-align: center; padding: 48px; color: #444; font-size: 0.9rem; }
        .empty-icon { font-size: 2.5rem; margin-bottom: 12px; opacity: 0.3; }

        @media (max-width: 768px) {
          .stats-grid { grid-template-columns: 1fr 1fr; }
          .section { padding: 16px; }
        }
        @media (max-width: 480px) {
          .stats-grid { grid-template-columns: 1fr 1fr; }
        }
      `}</style>

      {/* Header */}
      <div className="page-header">
        <h1>🕒 Activity History</h1>
        <p>// {new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
      </div>

      {/* Stats */}
      <div className="stats-grid">
        <div className="stat-card all">
          <div className="stat-label">Total Events</div>
          <div className="stat-value">{history.length}</div>
        </div>
        <div className="stat-card add">
          <div className="stat-label">Added</div>
          <div className="stat-value">{addCount}</div>
        </div>
        <div className="stat-card edit">
          <div className="stat-label">Edited</div>
          <div className="stat-value">{editCount}</div>
        </div>
        <div className="stat-card delete">
          <div className="stat-label">Deleted</div>
          <div className="stat-value">{deleteCount}</div>
        </div>
      </div>

      {/* Action Filter */}
      <div className="filter-group">
        <div className="filter-label">// filter by action</div>
        <div className="filters-row">
          {actions.map(a => (
            <button
              key={a}
              className={`filter-btn ${
                activeFilter === a
                  ? a === 'ALL'    ? 'active'
                  : a === 'ADD'    ? 'active-add'
                  : a === 'EDIT'   ? 'active-edit'
                  : 'active-delete'
                  : ''
              }`}
              onClick={() => setActiveFilter(a)}
            >
              {a === 'ADD' ? '➕' : a === 'EDIT' ? '✏️' : a === 'DELETE' ? '🗑️' : '◉'} {a}
            </button>
          ))}
        </div>
      </div>

      {/* Source Filter */}
      <div className="filter-group">
        <div className="filter-label">// filter by source</div>
        <div className="filters-row">
          {sources.map(s => {
            const colorMap = {
              'Bike': '#7c6af7', 'Phone EMI': '#4d9fff', 'iPhone EMI': '#4dfff0',
              'Need To Pay': '#ff6eb4', 'Need To Get': '#4dffcf'
            }
            const iconMap = {
              'Bike': '🏍️', 'Phone EMI': '📞', 'iPhone EMI': '📱',
              'Need To Pay': '🧾', 'Need To Get': '💰'
            }
            return (
              <button
                key={s}
                className={`source-btn ${activeSource === s ? 'active' : ''}`}
                onClick={() => setActiveSource(s)}
              >
                {s !== 'ALL' && <span className="source-dot" style={{ background: colorMap[s] }} />}
                {s === 'ALL' ? '◉ ALL' : `${iconMap[s]} ${s}`}
              </button>
            )
          })}
        </div>
      </div>

      {/* History List */}
      <div className="section">
        <div className="section-header">
          <div className="section-title">
            <div className="section-icon">🕒</div>
            All Activity
          </div>
          <span className="section-badge">{filtered.length} events</span>
        </div>

        {filtered.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">🕳️</div>
            No history found for this filter.
          </div>
        ) : (
          <div className="history-list">
            {filtered.map((item) => (
              <div key={`${item.source}-${item.id}`} className="history-item">
                <div
                  className="history-dot"
                  style={{ background: `${getActionColor(item.action)}18`, border: `1px solid ${getActionColor(item.action)}44` }}
                >
                  {getActionIcon(item.action)}
                </div>
                <div className="history-content">
                  <div className="history-top">
                    <span
                      className="history-action-badge"
                      style={{ background: `${getActionColor(item.action)}22`, color: getActionColor(item.action) }}
                    >
                      {item.action}
                    </span>
                    <span className="history-source-badge">
                      <span style={{ width:6, height:6, borderRadius:'50%', background: item.color, display:'inline-block' }} />
                      {item.icon} {item.source}
                    </span>
                  </div>
                  <div className="history-details">{item.details}</div>
                  <div className="history-time">
                    {new Date(item.created_at).toLocaleString('en-IN', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  )
}