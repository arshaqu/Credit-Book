'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'

const EMPTY_FORM = { Month: '', Total_Emi: '', emi_amount: '', Given: 'Pending' }

const TOTAL_EMI_AMOUNT = 50000
const TOTAL_MONTHS = 10

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
      .from('Iphone')
      .select('id, Month, Total_Emi, emi_amount, Given, created_at')
      .order('created_at', { ascending: true })
    if (error) setError(error.message)
    setRows(data || [])
    setLoading(false)
  }

  async function fetchHistory() {
    const { data } = await supabase
      .from('Iphone_History')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50)
    setHistory(data || [])
  }

  async function logHistory(action, record_id, details) {
    await supabase.from('Iphone_History').insert([{ action, record_id, details }])
    fetchHistory()
  }

  async function handleAdd() {
    setFormError(null)
    if (!form.Month || !form.emi_amount) { setFormError('Month and EMI Amount are required.'); return }
    setSubmitting(true)
    const { data, error } = await supabase.from('Iphone').insert([{
      Month: form.Month,
      Total_Emi: Number(form.Total_Emi || 0),
      emi_amount: Number(form.emi_amount || 0),
      Given: form.Given,
    }]).select()
    setSubmitting(false)
    if (error) { setFormError(error.message); return }
    if (data?.[0]) {
      await logHistory('ADD', data[0].id, `Added record for ${form.Month} — EMI ₹${Number(form.emi_amount).toLocaleString()}, Status: ${form.Given}`)
    }
    setForm(EMPTY_FORM)
    setShowForm(false)
    fetchData()
  }

  function startEdit(item) {
    setEditingId(item.id)
    setEditRow({
      Month: item.Month,
      Total_Emi: item.Total_Emi,
      emi_amount: item.emi_amount,
      Given: item.Given,
    })
  }

  async function saveEdit(id) {
    setSaving(true)
    const original = rows.find(r => r.id === id)
    const changes = []
    if (original.Month !== editRow.Month) changes.push(`Month: "${original.Month}" → "${editRow.Month}"`)
    if (Number(original.Total_Emi) !== Number(editRow.Total_Emi)) changes.push(`Total EMI: ₹${Number(original.Total_Emi).toLocaleString()} → ₹${Number(editRow.Total_Emi).toLocaleString()}`)
    if (Number(original.emi_amount) !== Number(editRow.emi_amount)) changes.push(`EMI Amount: ₹${Number(original.emi_amount).toLocaleString()} → ₹${Number(editRow.emi_amount).toLocaleString()}`)
    if (original.Given !== editRow.Given) changes.push(`Status: "${original.Given}" → "${editRow.Given}"`)

    const { error } = await supabase.from('Iphone').update({
      Month: editRow.Month,
      Total_Emi: Number(editRow.Total_Emi || 0),
      emi_amount: Number(editRow.emi_amount || 0),
      Given: editRow.Given,
    }).eq('id', id)
    setSaving(false)
    if (error) { alert('Save failed: ' + error.message); return }
    if (changes.length > 0) {
      await logHistory('EDIT', id, `Edited ${original.Month || 'record'}: ${changes.join(' | ')}`)
    }
    setEditingId(null)
    fetchData()
  }

  async function deleteRow(id) {
    if (!confirm('Delete this record?')) return
    const record = rows.find(r => r.id === id)
    await supabase.from('Iphone').delete().eq('id', id)
    await logHistory('DELETE', id, `Deleted record for ${record?.Month || 'unknown'} — EMI ₹${Number(record?.emi_amount || 0).toLocaleString()}, Status: ${record?.Given || '—'}`)
    fetchData()
  }

  const totalEmiPaid    = rows.reduce((s, r) => s + Number(r.emi_amount || 0), 0)
  const totalRemaining  = TOTAL_EMI_AMOUNT - totalEmiPaid
  const paidMonths      = rows.length
  const remainingMonths = TOTAL_MONTHS - paidMonths

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
        .btn-ghost { background: transparent; color: #555; border: 1px solid #2a2a3e; }
        .btn-ghost:hover { background: #1a1a2e; color: #aaa; }
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

        .section { background: #111118; border: 1px solid #1e1e2e; border-radius: 16px; padding: 24px; margin-bottom: 24px; }
        .section-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; }
        .section-title { font-size: 1rem; font-weight: 700; display: flex; align-items: center; gap: 10px; }
        .section-icon { width: 36px; height: 36px; border-radius: 10px; background: #0a1a1a; display: flex; align-items: center; justify-content: center; font-size: 1.1rem; }
        .section-badge { font-family: 'JetBrains Mono', monospace; font-size: 0.75rem; background: #1a1a2e; color: #666; padding: 4px 10px; border-radius: 20px; }

        .data-table { width: 100%; min-width: 600px; border-collapse: collapse; }
        .data-table th { text-align: left; padding: 10px 12px; font-size: 0.7rem; text-transform: uppercase; letter-spacing: 1.5px; color: #444; border-bottom: 1px solid #1e1e2e; white-space: nowrap; }
        .data-table td { padding: 10px 12px; font-size: 0.875rem; border-bottom: 1px solid #161622; font-family: 'JetBrains Mono', monospace; vertical-align: middle; white-space: nowrap; }
        .data-table tr:last-child td { border-bottom: none; }
        .data-table tr:hover td { background: #14141f; }
        .data-table tr.editing td { background: #0f0f1e !important; }

        .inline-input { background: #0a0a14; border: 1px solid #7c6af7; border-radius: 8px; padding: 7px 10px; color: #e8e8f0; font-family: 'JetBrains Mono', monospace; font-size: 0.85rem; width: 100%; outline: none; }
        .inline-input:focus { border-color: #a89af7; }
        .inline-select { background: #0a0a14; border: 1px solid #7c6af7; border-radius: 8px; padding: 7px 10px; color: #e8e8f0; font-family: 'JetBrains Mono', monospace; font-size: 0.85rem; width: 100%; outline: none; }
        .inline-select option { background: #111118; }

        .badge { display: inline-block; padding: 3px 10px; border-radius: 20px; font-size: 0.7rem; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; }
        .badge-paid    { background: #0d2e1a; color: #4dff91; }
        .badge-pending { background: #2e1a0d; color: #ffa94d; }

        .amount-positive { color: #4dff91; }
        .amount-negative { color: #ff6b6b; }
        .empty-state { text-align: center; padding: 40px; color: #444; font-size: 0.9rem; }
        .actions-cell { display: flex; gap: 6px; }
        .table-wrapper { width: 100%; overflow-x: auto; -webkit-overflow-scrolling: touch; }

        .history-list { display: flex; flex-direction: column; }
        .history-item { display: flex; gap: 16px; align-items: flex-start; padding: 14px 0; border-bottom: 1px solid #161622; }
        .history-item:last-child { border-bottom: none; }
        .history-dot { width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 1rem; flex-shrink: 0; }
        .history-content { flex: 1; min-width: 0; }
        .history-action { font-size: 0.7rem; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 4px; }
        .history-details { font-size: 0.82rem; color: #888; font-family: 'JetBrains Mono', monospace; line-height: 1.6; word-break: break-word; white-space: normal; }
        .history-time { font-size: 0.7rem; color: #444; font-family: 'JetBrains Mono', monospace; margin-top: 4px; }
        .history-empty { text-align: center; padding: 32px; color: #444; font-size: 0.9rem; }

        .overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.75); backdrop-filter: blur(6px); z-index: 200; display: flex; align-items: center; justify-content: center; }
        .modal { background: #111118; border: 1px solid #2a2a3e; border-radius: 20px; padding: 32px; width: 100%; max-width: 480px; animation: fadeIn 0.2s ease; max-height: 90vh; overflow-y: auto; }
        .modal h2 { font-size: 1.2rem; font-weight: 800; margin-bottom: 24px; background: linear-gradient(135deg, #fff, #7c6af7); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
        .form-group { margin-bottom: 16px; }
        .form-group label { display: block; font-size: 0.7rem; text-transform: uppercase; letter-spacing: 1.5px; color: #555; margin-bottom: 7px; }
        .form-input { width: 100%; background: #0d0d14; border: 1px solid #2a2a3e; border-radius: 10px; padding: 12px 14px; color: #e8e8f0; font-family: 'JetBrains Mono', monospace; font-size: 0.9rem; outline: none; transition: border-color 0.2s; }
        .form-input:focus { border-color: #7c6af7; }
        .form-select { width: 100%; background: #0d0d14; border: 1px solid #2a2a3e; border-radius: 10px; padding: 12px 14px; color: #e8e8f0; font-family: 'JetBrains Mono', monospace; font-size: 0.9rem; outline: none; }
        .form-select:focus { border-color: #7c6af7; }
        .form-select option { background: #111118; }
        .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
        .form-error { background: #2e0d0d; border: 1px solid #ff4d4d; border-radius: 8px; padding: 10px 14px; color: #ff8c8c; font-size: 0.8rem; margin-bottom: 16px; font-family: 'JetBrains Mono', monospace; }
        .modal-actions { display: flex; gap: 10px; margin-top: 24px; justify-content: flex-end; }

        @media (max-width: 768px) {
          .summary-grid { grid-template-columns: 1fr; }
          .section { padding: 16px; }
          .section-header { flex-direction: column; align-items: flex-start; gap: 8px; }
        }
      `}</style>

      {/* Header */}
      <div className="page-header">
        <div>
          <h1>📱 iPhone EMI</h1>
          <p>// {new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setShowForm(true); setFormError(null); setForm(EMPTY_FORM) }}>
          + Add Record
        </button>
      </div>

      {/* Amount Summary */}
      <div className="summary-grid">
        <div className="stat-card red">
          <div className="stat-label">Total EMI Value</div>
          <div className="stat-value">₹{TOTAL_EMI_AMOUNT.toLocaleString()}</div>
        </div>
        <div className="stat-card green">
          <div className="stat-label">Total EMI Paid</div>
          <div className="stat-value">₹{totalEmiPaid.toLocaleString()}</div>
        </div>
        <div className="stat-card orange">
          <div className="stat-label">Remaining</div>
          <div className="stat-value">₹{totalRemaining.toLocaleString()}</div>
        </div>
      </div>

      {/* Months Summary */}
      <div className="summary-grid">
        <div className="stat-card blue">
          <div className="stat-label">Total Months</div>
          <div className="stat-value">{TOTAL_MONTHS}</div>
        </div>
        <div className="stat-card green">
          <div className="stat-label">Paid Months</div>
          <div className="stat-value">{paidMonths}</div>
        </div>
        <div className="stat-card orange">
          <div className="stat-label">Remaining Months</div>
          <div className="stat-value">{remainingMonths}</div>
        </div>
      </div>

      {/* Table */}
      <div className="section">
        <div className="section-header">
          <div className="section-title">
            <div className="section-icon">📱</div>
            iPhone Records
          </div>
          <span className="section-badge">{rows.length} records</span>
        </div>

        {rows.length === 0 ? (
          <div className="empty-state">No records found. Click "+ Add Record" to get started.</div>
        ) : (
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Month</th>
                  <th>Total EMI</th>
                  <th>EMI Amount</th>
                  <th>Given</th>
                  <th>Created At</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((item) => {
                  const isEditing = editingId === item.id
                  return (
                    <tr key={item.id} className={isEditing ? 'editing' : ''}>
                      <td>
                        {isEditing ? (
                          <input className="inline-input" value={editRow.Month || ''} onChange={e => setEditRow(p => ({ ...p, Month: e.target.value }))} />
                        ) : (item.Month || '—')}
                      </td>
                      <td>
                        {isEditing ? (
                          <input className="inline-input" type="number" value={editRow.Total_Emi || ''} onChange={e => setEditRow(p => ({ ...p, Total_Emi: e.target.value }))} />
                        ) : (
                          <span className="amount-negative">₹{Number(item.Total_Emi || 0).toLocaleString()}</span>
                        )}
                      </td>
                      <td>
                        {isEditing ? (
                          <input className="inline-input" type="number" value={editRow.emi_amount || ''} onChange={e => setEditRow(p => ({ ...p, emi_amount: e.target.value }))} />
                        ) : (
                          <span className="amount-positive">₹{Number(item.emi_amount || 0).toLocaleString()}</span>
                        )}
                      </td>
                      <td>
                        {isEditing ? (
                          <select className="inline-select" value={editRow.Given || 'Pending'} onChange={e => setEditRow(p => ({ ...p, Given: e.target.value }))}>
                            <option value="Pending">Pending</option>
                            <option value="Paid">Paid</option>
                          </select>
                        ) : (
                          <span className={`badge ${item.Given === 'Paid' ? 'badge-paid' : 'badge-pending'}`}>
                            {item.Given || 'Pending'}
                          </span>
                        )}
                      </td>
                      <td style={{ color: '#555' }}>
                        {item.created_at ? new Date(item.created_at).toLocaleDateString('en-IN') : '—'}
                      </td>
                      <td>
                        <div className="actions-cell">
                          {isEditing ? (
                            <>
                              <button className="btn btn-save btn-sm" onClick={() => saveEdit(item.id)} disabled={saving}>{saving ? '...' : '✓ Save'}</button>
                              <button className="btn btn-ghost btn-sm" onClick={() => setEditingId(null)}>Cancel</button>
                            </>
                          ) : (
                            <>
                              <button className="btn btn-ghost btn-sm" onClick={() => startEdit(item)}>✎ Edit</button>
                              <button className="btn btn-danger btn-sm" onClick={() => deleteRow(item.id)}>✕</button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

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
            <h2>+ Add New Record</h2>
            {formError && <div className="form-error">⚠ {formError}</div>}

            <div className="form-group">
              <label>Month</label>
              <input className="form-input" placeholder="e.g. November 2025" value={form.Month} onChange={e => setForm(p => ({ ...p, Month: e.target.value }))} />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Total EMI (₹)</label>
                <input className="form-input" type="number" placeholder="0" value={form.Total_Emi} onChange={e => setForm(p => ({ ...p, Total_Emi: e.target.value }))} />
              </div>
              <div className="form-group">
                <label>EMI Amount (₹)</label>
                <input className="form-input" type="number" placeholder="0" value={form.emi_amount} onChange={e => setForm(p => ({ ...p, emi_amount: e.target.value }))} />
              </div>
            </div>

            <div className="form-group">
              <label>Given</label>
              <select className="form-select" value={form.Given} onChange={e => setForm(p => ({ ...p, Given: e.target.value }))}>
                <option value="Pending">Pending</option>
                <option value="Paid">Paid</option>
              </select>
            </div>

            <div className="modal-actions">
              <button className="btn btn-ghost" onClick={() => setShowForm(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleAdd} disabled={submitting}>
                {submitting ? 'Saving...' : '+ Add Record'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}