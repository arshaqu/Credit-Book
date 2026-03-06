'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'

const EMPTY_FORM = { title: '', planned_amount: '', notes: '' }
const UAE_TO_INR = 22.73 // fallback rate

export default function MyPlan() {
  const [rows, setRows]           = useState([])
  const [loading, setLoading]     = useState(true)
  const [uaeAmount, setUaeAmount] = useState('')
  const [rate, setRate]           = useState(UAE_TO_INR)
  const [rateLoading, setRateLoading] = useState(false)

  const [showForm, setShowForm]   = useState(false)
  const [form, setForm]           = useState(EMPTY_FORM)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState(null)

  const [editingId, setEditingId] = useState(null)
  const [editRow, setEditRow]     = useState({})
  const [saving, setSaving]       = useState(false)

  useEffect(() => { fetchData(); fetchRate() }, [])

  async function fetchRate() {
    setRateLoading(true)
    try {
      const res = await fetch('https://api.exchangerate-api.com/v4/latest/AED')
      const json = await res.json()
      if (json?.rates?.INR) setRate(Number(json.rates.INR.toFixed(4)))
    } catch { /* use fallback */ }
    setRateLoading(false)
  }

  async function fetchData() {
    setLoading(true)
    const { data } = await supabase
      .from('MyPlan')
      .select('id, title, planned_amount, notes, paid, created_at')
      .order('id', { ascending: true })
    setRows(data || [])
    setLoading(false)
  }

  async function handleAdd() {
    setFormError(null)
    if (!form.title || !form.planned_amount) { setFormError('Title and Planned Amount are required.'); return }
    setSubmitting(true)
    const { error } = await supabase.from('MyPlan').insert([{
      title: form.title,
      planned_amount: Number(form.planned_amount || 0),
      notes: form.notes || '',
      paid: false,
    }])
    setSubmitting(false)
    if (error) { setFormError(error.message); return }
    setForm(EMPTY_FORM)
    setShowForm(false)
    fetchData()
  }

  async function togglePaid(id, current) {
    await supabase.from('MyPlan').update({ paid: !current }).eq('id', id)
    setRows(prev => prev.map(r => r.id === id ? { ...r, paid: !current } : r))
  }

  function startEdit(item) {
    setEditingId(item.id)
    setEditRow({ title: item.title, planned_amount: item.planned_amount, notes: item.notes || '' })
  }

  async function saveEdit(id) {
    setSaving(true)
    const { error } = await supabase.from('MyPlan').update({
      title: editRow.title,
      planned_amount: Number(editRow.planned_amount || 0),
      notes: editRow.notes || '',
    }).eq('id', id)
    setSaving(false)
    if (error) { alert('Save failed: ' + error.message); return }
    setEditingId(null)
    fetchData()
  }

  async function deleteRow(id) {
    if (!confirm('Delete this plan item?')) return
    await supabase.from('MyPlan').delete().eq('id', id)
    fetchData()
  }

  const convertedINR       = uaeAmount ? Number(uaeAmount) * rate : 0
  const totalPlanned       = rows.reduce((s, r) => s + Number(r.planned_amount || 0), 0)
  const totalPaid          = rows.filter(r => r.paid).reduce((s, r) => s + Number(r.planned_amount || 0), 0)
  const remaining          = convertedINR - totalPlanned
  const remainingAfterPaid = convertedINR - totalPaid

  const fmt = (n) => `₹${Math.round(n).toLocaleString('en-IN')}`

  if (loading) return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:'80vh', gap:16, color:'#888' }}>
      <div style={{ width:40, height:40, border:'3px solid #222', borderTopColor:'#f7c26a', borderRadius:'50%', animation:'spin 0.8s linear infinite' }} />
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
        @keyframes shimmer { 0%,100%{opacity:1} 50%{opacity:0.5} }

        .page-header { margin-bottom: 32px; display: flex; align-items: flex-start; justify-content: space-between; flex-wrap: wrap; gap: 16px; }
        .page-header h1 { font-size: 2rem; font-weight: 800; letter-spacing: -0.5px; background: linear-gradient(135deg, #fff 40%, #f7c26a); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
        .page-header p { color: #555; margin-top: 6px; font-size: 0.8rem; font-family: 'JetBrains Mono', monospace; }

        .btn { border: none; padding: 10px 18px; border-radius: 10px; font-family: 'Syne', sans-serif; font-weight: 700; font-size: 0.85rem; cursor: pointer; display: inline-flex; align-items: center; gap: 7px; transition: all 0.15s; }
        .btn-primary { background: #f7c26a; color: #000; }
        .btn-primary:hover { background: #e6ae52; }
        .btn-ghost { background: transparent; color: #aaa; border: 1px solid #2a2a3e; }
        .btn-ghost:hover { background: #1a1a2e; }
        .btn-danger { background: transparent; color: #ff4d4d; border: 1px solid #3e1a1a; }
        .btn-danger:hover { background: #2e0d0d; }
        .btn-save { background: #f7c26a; color: #000; font-weight: 800; }
        .btn-save:hover { background: #e6ae52; }
        .btn-sm { padding: 6px 12px; font-size: 0.75rem; border-radius: 8px; }

        /* Converter */
        .converter-card { background: #111118; border: 1px solid #1e1e2e; border-radius: 20px; padding: 28px; margin-bottom: 28px; position: relative; overflow: hidden; }
        .converter-card::before { content:''; position:absolute; top:0; left:0; right:0; height:3px; background: linear-gradient(90deg, #f7c26a, #ffaa00, #ff7b00); }
        .converter-title { font-size: 0.7rem; text-transform: uppercase; letter-spacing: 2px; color: #555; margin-bottom: 18px; }
        .converter-row { display: flex; gap: 16px; align-items: flex-end; flex-wrap: wrap; }
        .converter-input-wrap { flex: 1; min-width: 180px; }
        .converter-label { font-size: 0.7rem; text-transform: uppercase; letter-spacing: 1.5px; color: #555; margin-bottom: 7px; }
        .converter-input { width: 100%; background: #0d0d14; border: 1px solid #2a2a3e; border-radius: 10px; padding: 13px 14px; color: #f7c26a; font-family: 'JetBrains Mono', monospace; font-size: 1.1rem; font-weight: 700; outline: none; transition: border-color 0.2s; }
        .converter-input:focus { border-color: #f7c26a; }
        .converter-arrow { font-size: 1.5rem; color: #333; padding-bottom: 10px; }
        .converter-result { flex: 1; min-width: 180px; }
        .converter-result-value { font-size: 2rem; font-weight: 800; font-family: 'JetBrains Mono', monospace; color: #4dff91; letter-spacing: -1px; }
        .converter-result-sub { font-size: 0.7rem; color: #444; font-family: 'JetBrains Mono', monospace; margin-top: 4px; }
        .rate-badge { display: inline-flex; align-items: center; gap: 6px; background: #0d0d14; border: 1px solid #2a2a3e; border-radius: 20px; padding: 5px 12px; font-size: 0.72rem; font-family: 'JetBrains Mono', monospace; color: #666; margin-top: 14px; }
        .rate-dot { width: 7px; height: 7px; border-radius: 50%; background: #4dff91; animation: shimmer 2s infinite; }

        /* Summary */
        .summary-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; margin-bottom: 28px; }
        .stat-card { background: #111118; border: 1px solid #1e1e2e; border-radius: 16px; padding: 20px; position: relative; overflow: hidden; }
        .stat-card::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 3px; }
        .stat-card.gold::before   { background: linear-gradient(90deg, #f7c26a, #ffaa00); }
        .stat-card.green::before  { background: linear-gradient(90deg, #4dff91, #4dffd4); }
        .stat-card.blue::before   { background: linear-gradient(90deg, #4d9fff, #a8d4ff); }
        .stat-card.red::before    { background: linear-gradient(90deg, #ff6b6b, #ff4d4d); }
        .stat-card.purple::before { background: linear-gradient(90deg, #c084fc, #818cf8); }
        .stat-label { font-size: 0.65rem; text-transform: uppercase; letter-spacing: 1.5px; color: #555; margin-bottom: 8px; }
        .stat-value { font-size: 1.4rem; font-weight: 800; font-family: 'JetBrains Mono', monospace; letter-spacing: -1px; }
        .stat-card.gold .stat-value   { color: #f7c26a; }
        .stat-card.green .stat-value  { color: #4dff91; }
        .stat-card.blue .stat-value   { color: #6ab4ff; }
        .stat-card.red .stat-value    { color: #ff6b6b; }
        .stat-card.purple .stat-value { color: #c084fc; }

        /* Cards */
        .cards-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 18px; }
        .cards-title { font-size: 1rem; font-weight: 700; display: flex; align-items: center; gap: 10px; }
        .cards-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 18px; margin-bottom: 32px; }

        .plan-card { background: #111118; border: 1px solid #1e1e2e; border-radius: 16px; padding: 20px; position: relative; overflow: hidden; transition: border-color 0.2s, transform 0.15s; }
        .plan-card:hover { border-color: #f7c26a44; transform: translateY(-2px); }
        .plan-card.paid-card { border-color: #1a2e1a; opacity: 0.75; }
        .plan-card::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 3px; background: linear-gradient(90deg, #f7c26a, #ffaa00); }
        .plan-card.paid-card::before { background: linear-gradient(90deg, #4dff91, #4dffd4); }

        .plan-card-header { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 14px; gap: 8px; }
        .plan-icon { width: 40px; height: 40px; border-radius: 12px; background: linear-gradient(135deg, #f7c26a22, #ffaa0022); border: 1px solid #f7c26a33; display: flex; align-items: center; justify-content: center; font-size: 1.1rem; flex-shrink: 0; }
        .plan-title-wrap { flex: 1; min-width: 0; }
        .plan-title { font-size: 0.95rem; font-weight: 700; color: #e8e8f0; word-break: break-word; }
        .plan-notes { font-size: 0.75rem; color: #555; font-family: 'JetBrains Mono', monospace; margin-top: 3px; word-break: break-word; }
        .plan-card-actions { display: flex; gap: 5px; flex-shrink: 0; }

        .plan-amount-label { font-size: 0.65rem; text-transform: uppercase; letter-spacing: 1.5px; color: #444; margin-bottom: 5px; }
        .plan-amount { font-size: 1.6rem; font-weight: 800; font-family: 'JetBrains Mono', monospace; color: #f7c26a; }
        .plan-card.paid-card .plan-amount { color: #4dff91; }

        .paid-toggle { display: flex; align-items: center; gap: 8px; margin-top: 14px; cursor: pointer; user-select: none; }
        .paid-toggle-box { width: 38px; height: 22px; border-radius: 11px; background: #1a1a2e; border: 1px solid #2a2a3e; position: relative; transition: background 0.2s; flex-shrink: 0; }
        .paid-toggle-box.on { background: #4dff9144; border-color: #4dff9166; }
        .paid-toggle-knob { position: absolute; top: 3px; left: 3px; width: 14px; height: 14px; border-radius: 50%; background: #555; transition: all 0.2s; }
        .paid-toggle-box.on .paid-toggle-knob { left: 20px; background: #4dff91; }
        .paid-toggle-label { font-size: 0.75rem; font-weight: 700; color: #555; }
        .paid-toggle-box.on + .paid-toggle-label { color: #4dff91; }
        .paid-badge { background: #0d2e1a; border: 1px solid #4dff9144; border-radius: 6px; padding: 2px 8px; font-size: 0.65rem; font-weight: 700; color: #4dff91; letter-spacing: 1px; margin-left: 4px; }

        .person-edit-input { background: #0a0a14; border: 1px solid #f7c26a; border-radius: 8px; padding: 8px 10px; color: #e8e8f0; font-family: 'JetBrains Mono', monospace; font-size: 0.9rem; width: 100%; outline: none; margin-top: 4px; }
        .person-edit-input:focus { border-color: #f7c26a; }
        .person-date { font-size: 0.7rem; color: #333; font-family: 'JetBrains Mono', monospace; margin-top: 10px; }

        .empty-state { background: #111118; border: 1px solid #1e1e2e; border-radius: 16px; padding: 40px; text-align: center; color: #444; font-size: 0.9rem; margin-bottom: 28px; }

        /* Modal */
        .overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.75); backdrop-filter: blur(6px); z-index: 200; display: flex; align-items: center; justify-content: center; }
        .modal { background: #111118; border: 1px solid #2a2a3e; border-radius: 20px; padding: 32px; width: 100%; max-width: 440px; animation: fadeIn 0.2s ease; }
        .modal h2 { font-size: 1.2rem; font-weight: 800; margin-bottom: 24px; background: linear-gradient(135deg, #fff, #f7c26a); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
        .form-group { margin-bottom: 16px; }
        .form-group label { display: block; font-size: 0.7rem; text-transform: uppercase; letter-spacing: 1.5px; color: #555; margin-bottom: 7px; }
        .form-input { width: 100%; background: #0d0d14; border: 1px solid #2a2a3e; border-radius: 10px; padding: 12px 14px; color: #e8e8f0; font-family: 'JetBrains Mono', monospace; font-size: 0.9rem; outline: none; transition: border-color 0.2s; }
        .form-input:focus { border-color: #f7c26a; }
        .form-error { background: #2e0d0d; border: 1px solid #ff4d4d; border-radius: 8px; padding: 10px 14px; color: #ff8c8c; font-size: 0.8rem; margin-bottom: 16px; font-family: 'JetBrains Mono', monospace; }
        .modal-actions { display: flex; gap: 10px; margin-top: 24px; justify-content: flex-end; }

        @media (max-width: 768px) {
          .summary-grid { grid-template-columns: repeat(2, 1fr); }
          .cards-grid { grid-template-columns: 1fr; }
        }
        @media (max-width: 480px) {
          .summary-grid { grid-template-columns: 1fr; }
        }
      `}</style>

      {/* Header */}
      <div className="page-header">
        <div>
          <h1>🗺️ My Plan</h1>
          <p>// {new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setShowForm(true); setFormError(null); setForm(EMPTY_FORM) }}>
          + Add Plan Item
        </button>
      </div>

      {/* UAE → INR Converter */}
      <div className="converter-card">
        <div className="converter-title">💱 UAE Dirham → Indian Rupee Converter</div>
        <div className="converter-row">
          <div className="converter-input-wrap">
            <div className="converter-label">Amount in UAE (AED)</div>
            <input
              className="converter-input"
              type="number"
              placeholder="Enter AED amount"
              value={uaeAmount}
              onChange={e => setUaeAmount(e.target.value)}
            />
          </div>
          <div className="converter-arrow">→</div>
          <div className="converter-result">
            <div className="converter-label">Converted to INR</div>
            <div className="converter-result-value">
              {uaeAmount ? fmt(convertedINR) : '₹ —'}
            </div>
            <div className="converter-result-sub">
              {uaeAmount ? `${Number(uaeAmount).toLocaleString()} AED × ${rate} = ₹${Math.round(convertedINR).toLocaleString()}` : 'Enter an amount above'}
            </div>
          </div>
        </div>
        <div className="rate-badge">
          <div className="rate-dot" />
          {rateLoading ? 'Fetching rate...' : `1 AED = ₹${rate} (live rate)`}
        </div>
      </div>

      {/* Summary Stats */}
      <div className="summary-grid">
        <div className="stat-card gold">
          <div className="stat-label">Converted INR</div>
          <div className="stat-value">{uaeAmount ? fmt(convertedINR) : '—'}</div>
        </div>
        <div className="stat-card blue">
          <div className="stat-label">Total Planned</div>
          <div className="stat-value">{fmt(totalPlanned)}</div>
        </div>
        <div className="stat-card green">
          <div className="stat-label">Balance (All)</div>
          <div className="stat-value" style={{ color: remaining >= 0 ? '#4dff91' : '#ff6b6b' }}>
            {uaeAmount ? fmt(remaining) : '—'}
          </div>
        </div>
        <div className="stat-card purple">
          <div className="stat-label">Balance (After Paid)</div>
          <div className="stat-value" style={{ color: remainingAfterPaid >= 0 ? '#c084fc' : '#ff6b6b' }}>
            {uaeAmount ? fmt(remainingAfterPaid) : '—'}
          </div>
        </div>
      </div>

      {/* Plan Cards */}
      <div className="cards-header">
        <div className="cards-title">📋 Plan Items</div>
        <span style={{ fontSize:'0.75rem', fontFamily:'JetBrains Mono, monospace', color:'#555', background:'#1a1a2e', padding:'4px 12px', borderRadius:20 }}>
          {rows.filter(r => r.paid).length}/{rows.length} paid
        </span>
      </div>

      {rows.length === 0 ? (
        <div className="empty-state">No plan items yet. Click "+ Add Plan Item" to get started.</div>
      ) : (
        <div className="cards-grid">
          {rows.map((item) => {
            const isEditing = editingId === item.id
            return (
              <div key={item.id} className={`plan-card ${item.paid ? 'paid-card' : ''}`}>
                <div className="plan-card-header">
                  <div className="plan-icon">{item.paid ? '✅' : '📌'}</div>
                  <div className="plan-title-wrap">
                    {isEditing ? (
                      <>
                        <input className="person-edit-input" value={editRow.title} onChange={e => setEditRow(p => ({ ...p, title: e.target.value }))} placeholder="Title" />
                        <input className="person-edit-input" value={editRow.notes} onChange={e => setEditRow(p => ({ ...p, notes: e.target.value }))} placeholder="Notes (optional)" style={{ marginTop:6 }} />
                      </>
                    ) : (
                      <>
                        <div className="plan-title">{item.title} {item.paid && <span className="paid-badge">PAID</span>}</div>
                        {item.notes && <div className="plan-notes">{item.notes}</div>}
                      </>
                    )}
                  </div>
                  <div className="plan-card-actions">
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

                <div className="plan-amount-label">Planned Amount</div>
                {isEditing ? (
                  <input className="person-edit-input" type="number" value={editRow.planned_amount} onChange={e => setEditRow(p => ({ ...p, planned_amount: e.target.value }))} />
                ) : (
                  <div className="plan-amount">{fmt(Number(item.planned_amount || 0))}</div>
                )}

                {/* Paid Toggle */}
                <div className="paid-toggle" onClick={() => togglePaid(item.id, item.paid)}>
                  <div className={`paid-toggle-box ${item.paid ? 'on' : ''}`}>
                    <div className="paid-toggle-knob" />
                  </div>
                  <span className="paid-toggle-label">{item.paid ? 'Paid ✓' : 'Mark as Paid'}</span>
                </div>

                <div className="person-date">
                  Added {item.created_at ? new Date(item.created_at).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' }) : '—'}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Add Modal */}
      {showForm && (
        <div className="overlay" onClick={e => { if (e.target === e.currentTarget) setShowForm(false) }}>
          <div className="modal">
            <h2>+ Add Plan Item</h2>
            {formError && <div className="form-error">⚠ {formError}</div>}

            <div className="form-group">
              <label>Title / What to Spend On</label>
              <input className="form-input" placeholder="e.g. Flight tickets, Rent, Groceries" value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} />
            </div>
            <div className="form-group">
              <label>Planned Amount (₹ INR)</label>
              <input className="form-input" type="number" placeholder="0" value={form.planned_amount} onChange={e => setForm(p => ({ ...p, planned_amount: e.target.value }))} />
            </div>
            <div className="form-group">
              <label>Notes (Optional)</label>
              <input className="form-input" placeholder="Any extra details..." value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} />
            </div>

            <div className="modal-actions">
              <button className="btn btn-ghost" onClick={() => setShowForm(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleAdd} disabled={submitting}>
                {submitting ? 'Saving...' : '+ Add Item'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}