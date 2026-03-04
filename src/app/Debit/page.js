'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'

const EMPTY_FORM = { name: '', amount: '' }

export default function Home() {
  const [rows, setRows] = useState([])
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)

  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState(null)

  const [editingId, setEditingId] = useState(null)
  const [editRow, setEditRow] = useState({})
  const [saving, setSaving] = useState(false)

  useEffect(() => { fetchData(); fetchHistory() }, [])

  async function fetchData() {
    setLoading(true)
    const { data } = await supabase
      .from('Need to Get')
      .select('id, name, amount, created_at')
      .order('id', { ascending: true })
    setRows(data || [])
    setLoading(false)
  }

  async function fetchHistory() {
    const { data } = await supabase
      .from('NeedToGet_History')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50)
    setHistory(data || [])
  }

  async function logHistory(action, record_id, details) {
    await supabase.from('NeedToGet_History').insert([{ action, record_id: String(record_id), details }])
    fetchHistory()
  }

  async function handleAdd() {
    setFormError(null)
    if (!form.name || !form.amount) { setFormError('Name and Amount are required.'); return }
    setSubmitting(true)
    const { data, error } = await supabase.from('Need to Get').insert([{
      name: form.name,
      amount: Number(form.amount || 0),
    }]).select()
    setSubmitting(false)
    if (error) { setFormError(error.message); return }
    if (data?.[0]) {
      await logHistory('ADD', data[0].id, `Added: ${form.name} — Amount ₹${Number(form.amount).toLocaleString()}`)
    }
    setForm(EMPTY_FORM)
    setShowForm(false)
    fetchData()
  }

  function startEdit(item) {
    setEditingId(item.id)
    setEditRow({ name: item.name, amount: item.amount })
  }

  async function saveEdit(id) {
    setSaving(true)
    const original = rows.find(r => r.id === id)
    const changes = []
    if (original.name !== editRow.name) changes.push(`Name: "${original.name}" → "${editRow.name}"`)
    if (Number(original.amount) !== Number(editRow.amount)) changes.push(`Amount: ₹${Number(original.amount).toLocaleString()} → ₹${Number(editRow.amount).toLocaleString()}`)

    const { error } = await supabase.from('Need to Get').update({
      name: editRow.name,
      amount: Number(editRow.amount || 0),
    }).eq('id', id)
    setSaving(false)
    if (error) { alert('Save failed: ' + error.message); return }
    if (changes.length > 0) {
      await logHistory('EDIT', id, `Edited ${original.name}: ${changes.join(' | ')}`)
    }
    setEditingId(null)
    fetchData()
  }

  async function deleteRow(id) {
    if (!confirm('Delete this record?')) return
    const record = rows.find(r => r.id === id)
    await supabase.from('Need to Get').delete().eq('id', id)
    await logHistory('DELETE', id, `Deleted: ${record?.name || 'unknown'} — ₹${Number(record?.amount || 0).toLocaleString()}`)
    fetchData()
  }

  const totalAmount = rows.reduce((s, r) => s + Number(r.amount || 0), 0)

  const getActionIcon  = (a) => a === 'ADD' ? '➕' : a === 'EDIT' ? '✏️' : a === 'DELETE' ? '🗑️' : '📝'
  const getActionColor = (a) => a === 'ADD' ? '#4dff91' : a === 'EDIT' ? '#6ab4ff' : a === 'DELETE' ? '#ff6b6b' : '#ffa94d'

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
        @keyframes fadeIn { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }

        .page-header { margin-bottom: 32px; display: flex; align-items: flex-start; justify-content: space-between; flex-wrap: wrap; gap: 16px; }
        .page-header h1 { font-size: 2rem; font-weight: 800; letter-spacing: -0.5px; background: linear-gradient(135deg, #fff 40%, #4dff91); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
        .page-header p { color: #555; margin-top: 6px; font-size: 0.8rem; font-family: 'JetBrains Mono', monospace; }

        .btn { border: none; padding: 10px 18px; border-radius: 10px; font-family: 'Syne', sans-serif; font-weight: 700; font-size: 0.85rem; cursor: pointer; display: inline-flex; align-items: center; gap: 7px; transition: all 0.15s; }
        .btn-primary { background: #4dff91; color: #000; }
        .btn-primary:hover { background: #3ae07c; }
        .btn-ghost { background: transparent; color: #aaa; border: 1px solid #2a2a3e; }
        .btn-ghost:hover { background: #1a1a2e; }
        .btn-danger { background: transparent; color: #ff4d4d; border: 1px solid #3e1a1a; }
        .btn-danger:hover { background: #2e0d0d; }
        .btn-save { background: #4dff91; color: #000; font-weight: 800; }
        .btn-save:hover { background: #3ae07c; }
        .btn-sm { padding: 6px 12px; font-size: 0.75rem; border-radius: 8px; }

        /* Summary */
        .summary-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-bottom: 32px; }
        .stat-card { background: #111118; border: 1px solid #1e1e2e; border-radius: 16px; padding: 24px; position: relative; overflow: hidden; }
        .stat-card::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 3px; }
        .stat-card.green::before  { background: linear-gradient(90deg, #4dff91, #4dffd4); }
        .stat-card.blue::before   { background: linear-gradient(90deg, #4d9fff, #a8d4ff); }
        .stat-card.purple::before { background: linear-gradient(90deg, #c084fc, #818cf8); }
        .stat-label { font-size: 0.7rem; text-transform: uppercase; letter-spacing: 1.5px; color: #555; margin-bottom: 8px; }
        .stat-value { font-size: 1.8rem; font-weight: 800; font-family: 'JetBrains Mono', monospace; letter-spacing: -1px; }
        .stat-card.green .stat-value  { color: #4dff91; }
        .stat-card.blue .stat-value   { color: #6ab4ff; }
        .stat-card.purple .stat-value { color: #c084fc; }

        /* Cards */
        .cards-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 20px; margin-bottom: 32px; }
        .person-card { background: #111118; border: 1px solid #1e1e2e; border-radius: 16px; padding: 20px; position: relative; overflow: hidden; transition: border-color 0.2s, transform 0.15s; }
        .person-card:hover { border-color: #4dff9155; transform: translateY(-2px); }
        .person-card::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 3px; background: linear-gradient(90deg, #4dff91, #4dffd4); }
        .person-card-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; }
        .person-name { font-size: 1rem; font-weight: 800; color: #e8e8f0; display: flex; align-items: center; gap: 10px; }
        .person-avatar { width: 38px; height: 38px; border-radius: 50%; background: linear-gradient(135deg, #4dff91, #4dffd4); display: flex; align-items: center; justify-content: center; font-size: 1rem; font-weight: 800; color: #000; flex-shrink: 0; border: 2px solid #ffffff ;}
        .person-card-actions { display: flex; gap: 6px; }
        .person-amount { font-size: 1.6rem; font-weight: 800; font-family: 'JetBrains Mono', monospace; color: #4dff91; margin-bottom: 8px; }
        .person-amount-label { font-size: 0.65rem; text-transform: uppercase; letter-spacing: 1.5px; color: #444; margin-bottom: 6px; }
        .person-edit-input { background: #0a0a14; border: 1px solid #4dff91; border-radius: 8px; padding: 8px 10px; color: #e8e8f0; font-family: 'JetBrains Mono', monospace; font-size: 0.9rem; width: 100%; outline: none; margin-top: 4px; }
        .person-edit-input:focus { border-color: #4dffd4; }
        .person-date { font-size: 0.7rem; color: #333; font-family: 'JetBrains Mono', monospace; margin-top: 12px; }

        /* History */
        .section { background: #111118; border: 1px solid #1e1e2e; border-radius: 16px; padding: 24px; margin-bottom: 24px; }
        .section-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; }
        .section-title { font-size: 1rem; font-weight: 700; display: flex; align-items: center; gap: 10px; }
        .section-icon { width: 36px; height: 36px; border-radius: 10px; background: #0a1a0a; display: flex; align-items: center; justify-content: center; font-size: 1.1rem; }
        .section-badge { font-family: 'JetBrains Mono', monospace; font-size: 0.75rem; background: #1a1a2e; color: #666; padding: 4px 10px; border-radius: 20px; }
        .history-list { display: flex; flex-direction: column; }
        .history-item { display: flex; gap: 16px; align-items: flex-start; padding: 14px 0; border-bottom: 1px solid #161622; }
        .history-item:last-child { border-bottom: none; }
        .history-dot { width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 1rem; flex-shrink: 0; }
        .history-content { flex: 1; min-width: 0; }
        .history-action { font-size: 0.7rem; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 4px; }
        .history-details { font-size: 0.82rem; color: #888; font-family: 'JetBrains Mono', monospace; line-height: 1.6; word-break: break-word; white-space: normal; }
        .history-time { font-size: 0.7rem; color: #444; font-family: 'JetBrains Mono', monospace; margin-top: 4px; }
        .history-empty { text-align: center; padding: 32px; color: #444; font-size: 0.9rem; }
        .empty-state { text-align: center; padding: 40px; color: #444; font-size: 0.9rem; }

        /* Modal */
        .overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.75); backdrop-filter: blur(6px); z-index: 200; display: flex; align-items: center; justify-content: center; }
        .modal { background: #111118; border: 1px solid #2a2a3e; border-radius: 20px; padding: 32px; width: 100%; max-width: 440px; animation: fadeIn 0.2s ease; }
        .modal h2 { font-size: 1.2rem; font-weight: 800; margin-bottom: 24px; background: linear-gradient(135deg, #fff, #4dff91); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
        .form-group { margin-bottom: 16px; }
        .form-group label { display: block; font-size: 0.7rem; text-transform: uppercase; letter-spacing: 1.5px; color: #555; margin-bottom: 7px; }
        .form-input { width: 100%; background: #0d0d14; border: 1px solid #2a2a3e; border-radius: 10px; padding: 12px 14px; color: #e8e8f0; font-family: 'JetBrains Mono', monospace; font-size: 0.9rem; outline: none; transition: border-color 0.2s; }
        .form-input:focus { border-color: #4dff91; }
        .form-error { background: #2e0d0d; border: 1px solid #ff4d4d; border-radius: 8px; padding: 10px 14px; color: #ff8c8c; font-size: 0.8rem; margin-bottom: 16px; font-family: 'JetBrains Mono', monospace; }
        .modal-actions { display: flex; gap: 10px; margin-top: 24px; justify-content: flex-end; }

        @media (max-width: 768px) {
          .summary-grid { grid-template-columns: 1fr; }
          .cards-grid { grid-template-columns: 1fr; }
          .section { padding: 16px; }
        }
      `}</style>

      {/* Header */}
      <div className="page-header">
        <div>
          <h1>💰 Need to Get</h1>
          <p>// {new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setShowForm(true); setFormError(null); setForm(EMPTY_FORM) }}>
          + Add Person
        </button>
      </div>

      {/* Summary */}
      <div className="summary-grid">
        <div className="stat-card green">
          <div className="stat-label">Total to Collect</div>
          <div className="stat-value">₹{totalAmount.toLocaleString()}</div>
        </div>
        <div className="stat-card blue">
          <div className="stat-label">Total People</div>
          <div className="stat-value">{rows.length}</div>
        </div>
        <div className="stat-card purple">
          <div className="stat-label">Avg per Person</div>
          <div className="stat-value">₹{rows.length ? Math.round(totalAmount / rows.length).toLocaleString() : 0}</div>
        </div>
      </div>

      {/* Person Cards */}
      {rows.length === 0 ? (
        <div className="section">
          <div className="empty-state">No records found. Click "+ Add Person" to get started.</div>
        </div>
      ) : (
        <div className="cards-grid">
          {rows.map((item) => {
            const isEditing = editingId === item.id
            const initials = (item.name || '?').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
            return (
              <div key={item.id} className="person-card">
                <div className="person-card-header">
                  <div className="person-name">
                    <div className="person-avatar">{initials}</div>
                    {isEditing
                      ? <input className="person-edit-input" value={editRow.name || ''} onChange={e => setEditRow(p => ({ ...p, name: e.target.value }))} style={{ fontSize:'0.9rem' }} />
                      : item.name}
                  </div>
                  <div className="person-card-actions">
                    {isEditing ? (
                      <>
                        <button className="btn btn-save btn-sm" onClick={() => saveEdit(item.id)} disabled={saving}>{saving ? '...' : '✓'}</button>
                        <button className="btn btn-ghost btn-sm" onClick={() => setEditingId(null)}>✕</button>
                      </>
                    ) : (
                      <>
                        <button className="btn btn-ghost btn-sm" onClick={() => startEdit(item)}>✎</button>
                        <button className="btn btn-danger btn-sm" onClick={() => deleteRow(item.id)}>🗑</button>
                      </>
                    )}
                  </div>
                </div>

                <div className="person-amount-label">Amount to Collect</div>
                {isEditing
                  ? <input className="person-edit-input" type="number" value={editRow.amount || ''} onChange={e => setEditRow(p => ({ ...p, amount: e.target.value }))} />
                  : <div className="person-amount">₹{Number(item.amount || 0).toLocaleString()}</div>}

                <div className="person-date">
                  Added {item.created_at ? new Date(item.created_at).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' }) : '—'}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* History */}
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

      {/* Add Modal */}
      {showForm && (
        <div className="overlay" onClick={e => { if (e.target === e.currentTarget) setShowForm(false) }}>
          <div className="modal">
            <h2>+ Add Person</h2>
            {formError && <div className="form-error">⚠ {formError}</div>}

            <div className="form-group">
              <label>Name</label>
              <input className="form-input" placeholder="e.g. Ahmed" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
            </div>
            <div className="form-group">
              <label>Amount to Collect (₹)</label>
              <input className="form-input" type="number" placeholder="0" value={form.amount} onChange={e => setForm(p => ({ ...p, amount: e.target.value }))} />
            </div>

            <div className="modal-actions">
              <button className="btn btn-ghost" onClick={() => setShowForm(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleAdd} disabled={submitting}>
                {submitting ? 'Saving...' : '+ Add Person'}
              </button>
            </div>
          </div>
        </div>
      )}

      
    </>
  )
}