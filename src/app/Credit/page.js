'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'

const EMPTY_FORM = { name: '', amount_borrowed: '', amount_given: '', pending: '' }

export default function Home() {
  const [rows, setRows] = useState([])
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

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
    setError(null)
    const { data, error } = await supabase
      .from('Need To pay')
      .select('id, name, amount_borrowed, amount_given, pending, created_at')
      .order('id', { ascending: true })
    if (error) setError(error.message)
    setRows(data || [])
    setLoading(false)
  }

  async function fetchHistory() {
    const { data } = await supabase
      .from('NeedToPay_History')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50)
    setHistory(data || [])
  }

  async function logHistory(action, record_id, details) {
    await supabase.from('NeedToPay_History').insert([{ action, record_id: String(record_id), details }])
    fetchHistory()
  }

  async function handleAdd() {
    setFormError(null)
    if (!form.name || !form.amount_borrowed) { setFormError('Name and Amount Borrowed are required.'); return }
    setSubmitting(true)
    const { data, error } = await supabase.from('Need To pay').insert([{
      name: form.name,
      amount_borrowed: Number(form.amount_borrowed || 0),
      amount_given: Number(form.amount_given || 0),
      pending: Number(form.pending || 0),
    }]).select()
    setSubmitting(false)
    if (error) { setFormError(error.message); return }
    if (data?.[0]) {
      await logHistory('ADD', data[0].id, `Added: ${form.name} — Borrowed ₹${Number(form.amount_borrowed).toLocaleString()}, Given ₹${Number(form.amount_given || 0).toLocaleString()}, Pending ₹${Number(form.pending || 0).toLocaleString()}`)
    }
    setForm(EMPTY_FORM)
    setShowForm(false)
    fetchData()
  }

  function startEdit(item) {
    setEditingId(item.id)
    setEditRow({
      name: item.name,
      amount_borrowed: item.amount_borrowed,
      amount_given: item.amount_given,
      pending: item.pending,
    })
  }

  async function saveEdit(id) {
    setSaving(true)
    const original = rows.find(r => r.id === id)
    const changes = []
    if (original.name !== editRow.name) changes.push(`Name: "${original.name}" → "${editRow.name}"`)
    if (Number(original.amount_borrowed) !== Number(editRow.amount_borrowed)) changes.push(`Borrowed: ₹${Number(original.amount_borrowed).toLocaleString()} → ₹${Number(editRow.amount_borrowed).toLocaleString()}`)
    if (Number(original.amount_given) !== Number(editRow.amount_given)) changes.push(`Given: ₹${Number(original.amount_given).toLocaleString()} → ₹${Number(editRow.amount_given).toLocaleString()}`)
    if (Number(original.pending) !== Number(editRow.pending)) changes.push(`Pending: ₹${Number(original.pending).toLocaleString()} → ₹${Number(editRow.pending).toLocaleString()}`)

    const { error } = await supabase.from('Need To pay').update({
      name: editRow.name,
      amount_borrowed: Number(editRow.amount_borrowed || 0),
      amount_given: Number(editRow.amount_given || 0),
      pending: Number(editRow.pending || 0),
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
    await supabase.from('Need To pay').delete().eq('id', id)
    await logHistory('DELETE', id, `Deleted: ${record?.name || 'unknown'} — Borrowed ₹${Number(record?.amount_borrowed || 0).toLocaleString()}, Pending ₹${Number(record?.pending || 0).toLocaleString()}`)
    fetchData()
  }

  const totalBorrowed = rows.reduce((s, r) => s + Number(r.amount_borrowed || 0), 0)
  const totalGiven    = rows.reduce((s, r) => s + Number(r.amount_given || 0), 0)
  const totalPending  = rows.reduce((s, r) => s + Number(r.pending || 0), 0)

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
        .page-header h1 { font-size: 2rem; font-weight: 800; letter-spacing: -0.5px; background: linear-gradient(135deg, #fff 40%, #7c6af7); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
        .page-header p { color: #555; margin-top: 6px; font-size: 0.8rem; font-family: 'JetBrains Mono', monospace; }

        .btn { border: none; padding: 10px 18px; border-radius: 10px; font-family: 'Syne', sans-serif; font-weight: 700; font-size: 0.85rem; cursor: pointer; display: inline-flex; align-items: center; gap: 7px; transition: all 0.15s; }
        .btn-primary { background: #7c6af7; color: #fff; }
        .btn-primary:hover { background: #6a58e0; }
        .btn-ghost { background: transparent; color: #555; border: 1px solid #2a2a3e; color: #aaa; }
        .btn-ghost:hover { background: #1a1a2e; }
        .btn-danger { background: transparent; color: #ff4d4d; border: 1px solid #3e1a1a; }
        .btn-danger:hover { background: #2e0d0d; }
        .btn-save { background: #4dff91; color: #000; font-weight: 800; }
        .btn-save:hover { background: #3ae07c; }
        .btn-sm { padding: 6px 12px; font-size: 0.75rem; border-radius: 8px; }

        .summary-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-bottom: 32px; }
        .stat-card { background: #111118; border: 1px solid #1e1e2e; border-radius: 16px; padding: 24px; position: relative; overflow: hidden; }
        .stat-card::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 3px; }
        .stat-card.red::before    { background: linear-gradient(90deg, #ff4d4d, #ff8c8c); }
        .stat-card.green::before  { background: linear-gradient(90deg, #4dff91, #4dffd4); }
        .stat-card.orange::before { background: linear-gradient(90deg, #ffa94d, #ffd94d); }
        .stat-card.blue::before   { background: linear-gradient(90deg, #4d9fff, #a8d4ff); }
        .stat-card.purple::before { background: linear-gradient(90deg, #c084fc, #818cf8); }
        .stat-label { font-size: 0.7rem; text-transform: uppercase; letter-spacing: 1.5px; color: #555; margin-bottom: 8px; }
        .stat-value { font-size: 1.8rem; font-weight: 800; font-family: 'JetBrains Mono', monospace; letter-spacing: -1px; }
        .stat-card.red .stat-value    { color: #ff6b6b; }
        .stat-card.green .stat-value  { color: #4dff91; }
        .stat-card.orange .stat-value { color: #ffa94d; }
        .stat-card.blue .stat-value   { color: #6ab4ff; }
        .stat-card.purple .stat-value { color: #c084fc; }

        /* Person Cards Grid */
        .cards-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 20px; margin-bottom: 32px; }
        .person-card { background: #111118; border: 1px solid #1e1e2e; border-radius: 16px; padding: 20px; position: relative; overflow: hidden; transition: border-color 0.2s; }
        .person-card:hover { border-color: #7c6af755; }
        .person-card::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 3px; background: linear-gradient(90deg, #48f0f3, #a458c3); }
        .person-card-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; }
        .person-name { font-size: 1.1rem; font-weight: 900; color: #ffffff; display: flex; align-items: center; gap: 8px;  }
        .person-avatar { width: 38px; height: 38px; border-radius: 50%; background: linear-gradient(135deg, #3caa6e, #22ada1); display: flex; align-items: center; justify-content: center; font-size: 1rem; font-weight: 800; color: #fff; flex-shrink: 0; border: 2px solid #22d9df ; }
        .person-card-actions { display: flex; gap: 6px;  }

        .person-field { margin-bottom: 12px; }
        .person-field-label { font-size: 0.65rem; text-transform: uppercase; letter-spacing: 1.5px; color: #444; margin-bottom: 4px;  }
        .person-field-value { font-size: 1.1rem; font-weight: 700; font-family: 'JetBrains Mono', monospace; }
        .person-field-value.borrowed { color: #ff6b6b; }
        .person-field-value.given    { color: #4dff91; }
        .person-field-value.pending  { color: #ffa94d; }

        .person-field-row { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; }

        .person-edit-input { background: #0a0a14; border: 1px solid #7c6af7; border-radius: 8px; padding: 8px 10px; color: #e8e8f0; font-family: 'JetBrains Mono', monospace; font-size: 0.9rem; width: 100%; outline: none; margin-top: 4px; }
        .person-edit-input:focus { border-color: #f79a9a; }

        .section { background: #111118; border: 1px solid #1e1e2e; border-radius: 16px; padding: 24px; margin-bottom: 24px; }
        .section-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; }
        .section-title { font-size: 1rem; font-weight: 700; display: flex; align-items: center; gap: 10px; }
        .section-icon { width: 36px; height: 36px; border-radius: 10px; background: #0a1a1a; display: flex; align-items: center; justify-content: center; font-size: 1.1rem; }
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

        .overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.75); backdrop-filter: blur(6px); z-index: 200; display: flex; align-items: center; justify-content: center; }
        .modal { background: #111118; border: 1px solid #2a2a3e; border-radius: 20px; padding: 32px; width: 100%; max-width: 480px; animation: fadeIn 0.2s ease; max-height: 90vh; overflow-y: auto; }
        .modal h2 { font-size: 1.2rem; font-weight: 800; margin-bottom: 24px; background: linear-gradient(135deg, #fff, #7c6af7); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
        .form-group { margin-bottom: 16px; }
        .form-group label { display: block; font-size: 0.7rem; text-transform: uppercase; letter-spacing: 1.5px; color: #555; margin-bottom: 7px; }
        .form-input { width: 100%; background: #0d0d14; border: 1px solid #2a2a3e; border-radius: 10px; padding: 12px 14px; color: #e8e8f0; font-family: 'JetBrains Mono', monospace; font-size: 0.9rem; outline: none; transition: border-color 0.2s; }
        .form-input:focus { border-color: #7c6af7; }
        .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
        .form-error { background: #2e0d0d; border: 1px solid #ff4d4d; border-radius: 8px; padding: 10px 14px; color: #ff8c8c; font-size: 0.8rem; margin-bottom: 16px; font-family: 'JetBrains Mono', monospace; }
        .modal-actions { display: flex; gap: 10px; margin-top: 24px; justify-content: flex-end; }

        @media (max-width: 768px) {
          .summary-grid { grid-template-columns: 1fr; }
          .cards-grid { grid-template-columns: 1fr; }
          .person-field-row { grid-template-columns: 1fr; }
          .section { padding: 16px; }
        }
      `}</style>

      {/* Header */}
      <div className="page-header">
        <div>
          <h1>💸 Need To Pay</h1>
          <p>// {new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setShowForm(true); setFormError(null); setForm(EMPTY_FORM) }}>
          + Add Person
        </button>
      </div>

      {/* Summary */}
      <div className="summary-grid">
        <div className="stat-card red">
          <div className="stat-label">Total Borrowed</div>
          <div className="stat-value">₹{totalBorrowed.toLocaleString()}</div>
        </div>
        <div className="stat-card green">
          <div className="stat-label">Total Given</div>
          <div className="stat-value">₹{totalGiven.toLocaleString()}</div>
        </div>
        <div className="stat-card orange">
          <div className="stat-label">Total Pending</div>
          <div className="stat-value">₹{totalPending.toLocaleString()}</div>
        </div>
      </div>

      {/* Person Cards */}
      {rows.length === 0 ? (
        <div className="section"><div className="empty-state">No records found. Click "+ Add Person" to get started.</div></div>
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
                      ? <input  className="person-edit-input" value={editRow.name || ''} onChange={e => setEditRow(p => ({ ...p, name: e.target.value }))} style={{ fontSize:'0.9rem' }} />
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

                <div className="person-field-row">
                  <div className="person-field">
                    <div className="person-field-label">Borrowed</div>
                    {isEditing
                      ? <input className="person-edit-input" type="number" value={editRow.amount_borrowed || ''} onChange={e => setEditRow(p => ({ ...p, amount_borrowed: e.target.value }))} />
                      : <div className="person-field-value borrowed">₹{Number(item.amount_borrowed || 0).toLocaleString()}</div>}
                  </div>
                  <div className="person-field">
                    <div className="person-field-label">Given</div>
                    {isEditing
                      ? <input className="person-edit-input" type="number" value={editRow.amount_given || ''} onChange={e => setEditRow(p => ({ ...p, amount_given: e.target.value }))} />
                      : <div className="person-field-value given">₹{Number(item.amount_given || 0).toLocaleString()}</div>}
                  </div>
                  <div className="person-field">
                    <div className="person-field-label">Pending</div>
                    {isEditing
                      ? <input className="person-edit-input" type="number" value={editRow.pending || ''} onChange={e => setEditRow(p => ({ ...p, pending: e.target.value }))} />
                      : <div className="person-field-value pending">₹{Number(item.pending || 0).toLocaleString()}</div>}
                  </div>
                </div>

                <div style={{ marginTop: 12, fontSize: '0.7rem', color: '#333', fontFamily: 'JetBrains Mono, monospace' }}>
                  Added {item.created_at ? new Date(item.created_at).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' }) : '—'}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* History Section */}
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
              <input className="form-input" placeholder="e.g. Muhsin" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Amount Borrowed (₹)</label>
                <input className="form-input" type="number" placeholder="0" value={form.amount_borrowed} onChange={e => setForm(p => ({ ...p, amount_borrowed: e.target.value }))} />
              </div>
              <div className="form-group">
                <label>Amount Given (₹)</label>
                <input className="form-input" type="number" placeholder="0" value={form.amount_given} onChange={e => setForm(p => ({ ...p, amount_given: e.target.value }))} />
              </div>
            </div>
            <div className="form-group">
              <label>Pending (₹)</label>
              <input className="form-input" type="number" placeholder="0" value={form.pending} onChange={e => setForm(p => ({ ...p, pending: e.target.value }))} />
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