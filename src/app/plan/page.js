'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'

const EMPTY_FORM = { name: '', amount_rupee: '', amount_paying: '', notes: '' }
const FIXED_BUDGET = 51450

export default function MyPlan() {
  const [rows, setRows]               = useState([])
  const [history, setHistory]         = useState([])
  const [cycles, setCycles]           = useState([])
  const [expandedCycle, setExpandedCycle] = useState(null)
  const [loading, setLoading]         = useState(true)
  const [rate, setRate]               = useState(22.73)
  const [rateLoading, setRateLoading] = useState(false)
  const [showForm, setShowForm]       = useState(false)
  const [form, setForm]               = useState(EMPTY_FORM)
  const [formError, setFormError]     = useState(null)
  const [submitting, setSubmitting]   = useState(false)
  const [editingId, setEditingId]     = useState(null)
  const [editRow, setEditRow]         = useState({})
  const [saving, setSaving]           = useState(false)
  const [archiving, setArchiving]     = useState(false)
  const [showArchiveConfirm, setShowArchiveConfirm] = useState(false)

  const today = new Date()
  const dayOfMonth = today.getDate()
  const isCycleDay = dayOfMonth >= 20

  const currentCycleLabel = (() => {
    const d = new Date()
    if (d.getDate() >= 20) {
      return `${d.toLocaleString('en-IN', { month: 'long' })} 20 – ${new Date(d.getFullYear(), d.getMonth() + 1, 19).toLocaleString('en-IN', { month: 'long' })} 19, ${d.getFullYear()}`
    } else {
      const prev = new Date(d.getFullYear(), d.getMonth() - 1, 20)
      return `${prev.toLocaleString('en-IN', { month: 'long' })} 20 – ${new Date(d.getFullYear(), d.getMonth(), 19).toLocaleString('en-IN', { month: 'long' })} 19, d.getFullYear()`
    }
  })()

  useEffect(() => { fetchRate().then(() => fetchData()); fetchHistory(); fetchCycles() }, [])

  async function fetchRate() {
    setRateLoading(true)
    try {
      const res  = await fetch('https://api.exchangerate-api.com/v4/latest/AED')
      const json = await res.json()
      if (json?.rates?.INR) setRate(Number(json.rates.INR.toFixed(4)))
    } catch {}
    setRateLoading(false)
  }

  async function fetchData() {
    setLoading(true)
    const { data } = await supabase
      .from('MyPlan')
      .select('id, name, amount_AED, amount_rupee, amount_paying, balance, notes, paid, created_at')
      .order('id', { ascending: true })
    setRows(data || [])
    setLoading(false)
  }

  async function fetchHistory() {
    const { data } = await supabase
      .from('MyPlan_History')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50)
    setHistory(data || [])
  }

  async function fetchCycles() {
    const { data } = await supabase
      .from('MyPlan_Cycles')
      .select('*')
      .order('archived_at', { ascending: false })
    setCycles(data || [])
  }

  async function logHistory(action, record_id, details) {
    await supabase.from('MyPlan_History').insert([{ action, record_id: String(record_id), details }])
    fetchHistory()
  }

  // ─── ARCHIVE CURRENT PLAN ──────────────────────────────────────────────────
  async function archiveCurrentPlan() {
    if (rows.length === 0) {
      alert('Nothing to archive — the current plan is empty.')
      setShowArchiveConfirm(false)
      return
    }
    setArchiving(true)

    const now   = new Date()
    const label = `${now.toLocaleString('en-IN', { month: 'long' })} ${now.getFullYear()}`

    // Snapshot summary
    const snapshot = {
      cycle_label:   label,
      archived_at:   now.toISOString(),
      fixed_budget:  FIXED_BUDGET,
      total_spent:   rows.reduce((s, r) => s + Number(r.amount_paying || 0), 0),
      total_paid:    rows.filter(r => r.paid).reduce((s, r) => s + Number(r.amount_paying || 0), 0),
      paid_count:    rows.filter(r => r.paid).length,
      total_items:   rows.length,
      items_json:    JSON.stringify(rows),
    }

    const { error } = await supabase.from('MyPlan_Cycles').insert([snapshot])
    if (error) {
      alert('Archive failed: ' + error.message)
      setArchiving(false)
      setShowArchiveConfirm(false)
      return
    }

    // Delete all current rows
    await supabase.from('MyPlan').delete().neq('id', 0)
    await logHistory('ARCHIVE', 'ALL', `Archived ${label} cycle — ${rows.length} items, ₹${snapshot.total_spent.toLocaleString('en-IN')} spent`)

    setArchiving(false)
    setShowArchiveConfirm(false)
    fetchData()
    fetchCycles()
  }

  // ─── ADD / EDIT / DELETE ───────────────────────────────────────────────────
  async function handleAdd() {
    setFormError(null)
    if (!form.name)          { setFormError('Name is required.');           return }
    if (!form.amount_rupee)  { setFormError('₹ amount is required.');       return }
    if (!form.amount_paying) { setFormError('Amount spent ₹ is required.'); return }

    const inr    = Number(form.amount_rupee)
    const paying = Number(form.amount_paying)
    if (paying > inr) { setFormError('Amount Spent ₹ cannot exceed Total Amount ₹.'); return }

    setSubmitting(true)
    const aed = Number((inr / rate).toFixed(2))
    const bal = inr - paying
    const { data, error } = await supabase.from('MyPlan').insert([{
      name: form.name, amount_AED: aed, amount_rupee: inr,
      amount_paying: paying, balance: bal, notes: form.notes || '', paid: false,
    }]).select()
    setSubmitting(false)
    if (error) { setFormError(error.message); return }
    if (data?.[0]) await logHistory('ADD', data[0].id, `Added: ${form.name} — ₹${inr.toLocaleString()} total, ₹${paying.toLocaleString()} spent`)
    setForm(EMPTY_FORM); setShowForm(false); fetchData()
  }

  async function togglePaid(id, current) {
    const record  = rows.find(r => r.id === id)
    const newPaid = !current
    const updates = newPaid
      ? { paid: true, balance: 0 }
      : { paid: false, balance: Number(record.amount_rupee) - Number(record.amount_paying) }
    await supabase.from('MyPlan').update(updates).eq('id', id)
    await logHistory('PAID', id, `${newPaid ? 'Marked PAID' : 'Unmarked'}: ${record.name} — ₹${Number(record.amount_paying).toLocaleString()}`)
    fetchData()
  }

  function startEdit(item) {
    setEditingId(item.id)
    setEditRow({ name: item.name||'', amount_rupee: item.amount_rupee||'', amount_paying: item.amount_paying||'', notes: item.notes||'' })
  }

  async function saveEdit(id) {
    setSaving(true)
    const original = rows.find(r => r.id === id)
    const inr    = Number(editRow.amount_rupee)
    const aed    = Number((inr / rate).toFixed(2))
    const paying = Number(editRow.amount_paying || 0)
    const bal    = inr - paying
    const { error } = await supabase.from('MyPlan').update({
      name: editRow.name, amount_AED: aed, amount_rupee: inr,
      amount_paying: paying, balance: bal, notes: editRow.notes || '',
    }).eq('id', id)
    setSaving(false)
    if (error) { alert('Save failed: ' + error.message); return }
    const changes = []
    if (original.name !== editRow.name) changes.push(`Name: "${original.name}" → "${editRow.name}"`)
    if (Number(original.amount_rupee) !== inr) changes.push(`Total: ₹${Number(original.amount_rupee).toLocaleString()} → ₹${inr.toLocaleString()}`)
    if (Number(original.amount_paying) !== paying) changes.push(`Spent: ₹${Number(original.amount_paying).toLocaleString()} → ₹${paying.toLocaleString()}`)
    if (changes.length) await logHistory('EDIT', id, `Edited ${original.name}: ${changes.join(' | ')}`)
    setEditingId(null); fetchData()
  }

  async function deleteRow(id) {
    if (!confirm('Delete this plan item?')) return
    const record = rows.find(r => r.id === id)
    await supabase.from('MyPlan').delete().eq('id', id)
    await logHistory('DELETE', id, `Deleted: ${record?.name} — ₹${Number(record?.amount_rupee||0).toLocaleString()}`)
    fetchData()
  }

  // ─── COMPUTED ─────────────────────────────────────────────────────────────
  const totalSpent   = rows.reduce((s, r) => s + Number(r.amount_paying || 0), 0)
  const totalPaid    = rows.filter(r => r.paid).reduce((s, r) => s + Number(r.amount_paying || 0), 0)
  const paidCount    = rows.filter(r => r.paid).length
  const totalBalance = FIXED_BUDGET - totalSpent
  const totalAED     = Number((FIXED_BUDGET / rate).toFixed(2))
  const progressPct  = Math.min(100, Math.round((totalSpent / FIXED_BUDGET) * 100))

  const fmt    = (n) => `₹${Math.round(n).toLocaleString('en-IN')}`
  const fmtAED = (n) => `AED ${Number(n).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`
  const previewBal = (Number(form.amount_rupee)||0) - (Number(form.amount_paying)||0)
  const spentExceedsTotal = form.amount_paying && form.amount_rupee && Number(form.amount_paying) > Number(form.amount_rupee)

  const getActionIcon  = (a) => a === 'ADD' ? '➕' : a === 'EDIT' ? '✏️' : a === 'DELETE' ? '🗑️' : a === 'PAID' ? '✅' : a === 'ARCHIVE' ? '📦' : '📝'
  const getActionColor = (a) => a === 'ADD' ? '#4dff91' : a === 'EDIT' ? '#6ab4ff' : a === 'DELETE' ? '#ff6b6b' : a === 'PAID' ? '#f7c26a' : a === 'ARCHIVE' ? '#c084fc' : '#ffa94d'

  function openAddModal() {
    const remaining = FIXED_BUDGET - totalSpent
    const prefilled = remaining > 0 ? String(Math.round(remaining)) : ''
    setForm({ ...EMPTY_FORM, amount_rupee: prefilled })
    setFormError(null)
    setShowForm(true)
  }

  if (loading) return (
    <div style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',height:'80vh',gap:16,color:'#555'}}>
      <div style={{width:40,height:40,border:'3px solid #1c1c2e',borderTopColor:'#f7c26a',borderRadius:'50%',animation:'spin 0.8s linear infinite'}} />
      <p style={{fontFamily:'JetBrains Mono, monospace',fontSize:'0.8rem'}}>Loading…</p>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0} 
        body{background:#0a0a0f}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes fadeIn{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
        @keyframes shimmer{0%,100%{opacity:1}50%{opacity:0.4}}
        @keyframes pulse{0%,100%{box-shadow:0 0 0 0 #c084fc44}50%{box-shadow:0 0 0 8px #c084fc00}}

        .root{background:#0a0a0f;min-height:100vh;color:#e8e8f0;font-family:'Syne',sans-serif;padding:36px 32px;max-width:1200px;margin:0 auto}

        .page-header{margin-bottom:32px;display:flex;align-items:flex-start;justify-content:space-between;flex-wrap:wrap;gap:16px}
        .page-header h1{font-size:2.2rem;font-weight:800;letter-spacing:-1px;background:linear-gradient(135deg,#fff 40%,#f7c26a);-webkit-background-clip:text;-webkit-text-fill-color:transparent}
        .page-header p{color:#444;margin-top:6px;font-size:0.78rem;font-family:'JetBrains Mono',monospace}
        .header-actions{display:flex;gap:10px;flex-wrap:wrap;align-items:center}

        .btn{border:none;padding:11px 20px;border-radius:11px;font-family:'Syne',sans-serif;font-weight:700;font-size:0.85rem;cursor:pointer;display:inline-flex;align-items:center;gap:7px;transition:all 0.15s}
        .btn-primary{background:#f7c26a;color:#000;box-shadow:0 4px 20px #f7c26a33}
        .btn-primary:hover{background:#e6ae52;transform:translateY(-1px)}
        .btn-ghost{background:transparent;color:#888;border:1px solid #252535}
        .btn-ghost:hover{background:#16161f;color:#ccc}
        .btn-danger{background:transparent;color:#ff5555;border:1px solid #2e1111}
        .btn-danger:hover{background:#1e0808}
        .btn-save{background:#f7c26a;color:#000;font-weight:800}
        .btn-sm{padding:6px 11px;font-size:0.72rem;border-radius:8px}
        .btn-archive{background:linear-gradient(135deg,#c084fc22,#818cf822);color:#c084fc;border:1px solid #c084fc44;animation:pulse 2.5s infinite}
        .btn-archive:hover{background:linear-gradient(135deg,#c084fc33,#818cf833);transform:translateY(-1px)}

        /* ── CYCLE BANNER ── */
        .cycle-banner{background:linear-gradient(135deg,#1a0e2e,#0e1a2e);border:1px solid #c084fc44;border-radius:16px;padding:18px 22px;margin-bottom:24px;display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap;animation:fadeIn 0.4s ease}
        .cycle-banner-left{display:flex;align-items:center;gap:14px}
        .cycle-icon{font-size:1.6rem}
        .cycle-title{font-size:0.95rem;font-weight:800;color:#c084fc}
        .cycle-sub{font-size:0.68rem;font-family:'JetBrains Mono',monospace;color:#5a4a7a;margin-top:3px}

        .rate-bar{background:#0e0e18;border:1px solid #1c1c2e;border-radius:14px;padding:13px 20px;margin-bottom:24px;display:flex;align-items:center;gap:12px;flex-wrap:wrap}
        .rdot{width:8px;height:8px;border-radius:50%;background:#4dff91;animation:shimmer 2s infinite;flex-shrink:0}
        .rtxt{font-size:0.78rem;font-family:'JetBrains Mono',monospace;color:#4dff91;font-weight:600}
        .rnote{font-size:0.68rem;font-family:'JetBrains Mono',monospace;color:#3a3a55}
        .rright{margin-left:auto;font-size:0.65rem;font-family:'JetBrains Mono',monospace;color:#3a3a55}

        .summary-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-bottom:28px}
        .sc{background:#0e0e18;border:1px solid #1c1c2e;border-radius:18px;padding:22px;position:relative;overflow:hidden;animation:fadeIn 0.4s ease}
        .sc::before{content:'';position:absolute;top:0;left:0;right:0;height:3px}
        .sc.gold::before{background:linear-gradient(90deg,#f7c26a,#ffaa00)}
        .sc.blue::before{background:linear-gradient(90deg,#4d9fff,#a8d4ff)}
        .sc.green::before{background:linear-gradient(90deg,#4dff91,#4dffd4)}
        .sc.purple::before{background:linear-gradient(90deg,#c084fc,#818cf8)}
        .slbl{font-size:0.6rem;text-transform:uppercase;letter-spacing:2px;color:#3a3a55;margin-bottom:10px}
        .sval{font-size:1.45rem;font-weight:800;font-family:'JetBrains Mono',monospace;letter-spacing:-1px}
        .sc.gold .sval{color:#f7c26a}
        .sc.blue .sval{color:#6ab4ff}
        .sc.green .sval{color:#4dff91}
        .sc.purple .sval{color:#c084fc}
        .ssub{font-size:0.6rem;font-family:'JetBrains Mono',monospace;color:#2a2a40;margin-top:5px}

        .prog-wrap{background:#0e0e18;border:1px solid #1c1c2e;border-radius:16px;padding:20px 24px;margin-bottom:28px}
        .prog-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:12px}
        .prog-lbl{font-size:0.6rem;text-transform:uppercase;letter-spacing:2px;color:#3a3a55}
        .prog-pct{font-size:0.9rem;font-weight:800;font-family:'JetBrains Mono',monospace;color:#f7c26a}
        .prog-bar{height:7px;background:#111120;border-radius:99px;overflow:hidden}
        .prog-fill{height:100%;border-radius:99px;background:linear-gradient(90deg,#f7c26a,#4dff91);transition:width 0.6s cubic-bezier(.4,0,.2,1)}

        .section-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:18px}
        .section-title{font-size:1rem;font-weight:800;color:#e8e8f0}
        .count-badge{font-family:'JetBrains Mono',monospace;font-size:0.7rem;background:#111120;color:#3a3a55;padding:4px 12px;border-radius:20px;border:1px solid #1c1c2e}
        .cards-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(270px,1fr));gap:18px;margin-bottom:32px}

        .plan-card{background:#0e0e18;border:1px solid #1c1c2e;border-radius:18px;padding:22px;position:relative;overflow:hidden;transition:border-color 0.25s,transform 0.2s,box-shadow 0.2s;animation:fadeIn 0.4s ease}
        .plan-card:hover{border-color:#f7c26a33;transform:translateY(-3px);box-shadow:0 12px 40px #00000066}
        .plan-card.is-paid{border-color:#1a3a1a;opacity:0.8}
        .plan-card::before{content:'';position:absolute;top:0;left:0;right:0;height:3px;background:linear-gradient(90deg,#f7c26a,#ffaa00);transition:background 0.3s}
        .plan-card.is-paid::before{background:linear-gradient(90deg,#4dff91,#4dffd4)}

        .card-top{display:flex;align-items:flex-start;justify-content:space-between;gap:10px;margin-bottom:18px}
        .card-icon{width:42px;height:42px;border-radius:13px;display:flex;align-items:center;justify-content:center;font-size:1.1rem;flex-shrink:0;background:#f7c26a12;border:1px solid #f7c26a22}
        .is-paid .card-icon{background:#4dff9112;border-color:#4dff9122}
        .card-title-block{flex:1;min-width:0}
        .card-name{font-size:0.95rem;font-weight:700;color:#e8e8f0;word-break:break-word;line-height:1.3}
        .card-notes{font-size:0.7rem;color:#3a3a55;font-family:'JetBrains Mono',monospace;margin-top:3px;word-break:break-word}
        .card-actions{display:flex;gap:5px;flex-shrink:0}
        .paid-chip{background:#0d2a1a;border:1px solid #4dff9133;border-radius:6px;padding:2px 8px;font-size:0.58rem;font-weight:800;color:#4dff91;letter-spacing:1.5px;margin-left:6px}

        .card-amounts{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:14px}
        .ca-block{background:#070710;border:1px solid #111120;border-radius:10px;padding:10px 12px}
        .ca-lbl{font-size:0.56rem;text-transform:uppercase;letter-spacing:1.5px;color:#2a2a40;margin-bottom:4px}
        .ca-val{font-family:'JetBrains Mono',monospace;font-weight:700;font-size:1rem}
        .ca-val.inr{color:#6ab4ff}
        .ca-val.spent{color:#e8e8f0}
        .ca-val.bal-pos{color:#c084fc}
        .ca-val.bal-neg{color:#ff6b6b}
        .ca-val.bal-zero{color:#2a2a40}
        .ca-sub{font-size:0.56rem;color:#2a2a40;font-family:'JetBrains Mono',monospace;margin-top:2px}

        .tgl-row{display:flex;align-items:center;gap:8px;cursor:pointer;user-select:none;margin-top:4px}
        .ttrack{width:36px;height:20px;border-radius:10px;background:#111120;border:1px solid #1e1e32;position:relative;transition:all 0.25s;flex-shrink:0}
        .ttrack.on{background:#4dff9122;border-color:#4dff9155}
        .tknob{position:absolute;top:2px;left:2px;width:14px;height:14px;border-radius:50%;background:#2a2a40;transition:all 0.25s}
        .ttrack.on .tknob{left:18px;background:#4dff91;box-shadow:0 0 6px #4dff9166}
        .tgl-lbl{font-size:0.7rem;font-weight:700;color:#3a3a55;font-family:'JetBrains Mono',monospace;transition:color 0.2s}
        .ttrack.on~.tgl-lbl{color:#4dff91}
        .card-date{font-size:0.62rem;color:#1e1e2e;font-family:'JetBrains Mono',monospace;margin-top:12px;border-top:1px solid #111120;padding-top:10px}

        .ei{background:#070710;border:1px solid #f7c26a44;border-radius:7px;padding:7px 10px;color:#e8e8f0;font-family:'JetBrains Mono',monospace;font-size:0.82rem;width:100%;outline:none;transition:border-color 0.2s;margin-top:4px}
        .ei:focus{border-color:#f7c26a88}

        .empty-state{background:#0e0e18;border:1px dashed #1c1c2e;border-radius:18px;padding:48px;text-align:center;color:#2a2a40;font-size:0.9rem;margin-bottom:28px}

        .history-wrap{background:#0e0e18;border:1px solid #1c1c2e;border-radius:18px;padding:24px;margin-bottom:28px;animation:fadeIn 0.6s ease}
        .hist-list{display:flex;flex-direction:column}
        .hist-item{display:flex;gap:14px;align-items:flex-start;padding:14px 0;border-bottom:1px solid #0d0d18}
        .hist-item:last-child{border-bottom:none}
        .hist-dot{width:36px;height:36px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:1rem;flex-shrink:0}
        .hist-content{flex:1;min-width:0}
        .hist-action{font-size:0.62rem;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;margin-bottom:4px}
        .hist-details{font-size:0.78rem;color:#666;font-family:'JetBrains Mono',monospace;line-height:1.6;word-break:break-word}
        .hist-time{font-size:0.65rem;color:#2a2a40;font-family:'JetBrains Mono',monospace;margin-top:4px}
        .hist-empty{text-align:center;padding:28px;color:#2a2a40;font-size:0.85rem}

        /* ── PAST CYCLES ── */
        .cycles-wrap{margin-bottom:32px;animation:fadeIn 0.5s ease}
        .cycle-row{background:#0e0e18;border:1px solid #1c1c2e;border-radius:16px;margin-bottom:12px;overflow:hidden;transition:border-color 0.2s}
        .cycle-row:hover{border-color:#c084fc33}
        .cycle-header{display:flex;align-items:center;justify-content:space-between;padding:18px 22px;cursor:pointer;gap:12px;flex-wrap:wrap}
        .cycle-header-left{display:flex;align-items:center;gap:14px}
        .cycle-month-icon{width:40px;height:40px;border-radius:12px;background:#c084fc12;border:1px solid #c084fc22;display:flex;align-items:center;justify-content:center;font-size:1rem;flex-shrink:0}
        .cycle-month-name{font-size:0.9rem;font-weight:800;color:#e8e8f0}
        .cycle-month-date{font-size:0.62rem;font-family:'JetBrains Mono',monospace;color:#3a3a55;margin-top:2px}
        .cycle-stats{display:flex;gap:18px;flex-wrap:wrap;align-items:center}
        .cstat{text-align:right}
        .cstat-lbl{font-size:0.56rem;text-transform:uppercase;letter-spacing:1.5px;color:#2a2a40}
        .cstat-val{font-family:'JetBrains Mono',monospace;font-size:0.85rem;font-weight:700;color:#c084fc}
        .cycle-chevron{font-size:0.8rem;color:#2a2a40;transition:transform 0.25s;flex-shrink:0}
        .cycle-chevron.open{transform:rotate(180deg)}

        .cycle-body{padding:0 22px 22px;animation:fadeIn 0.2s ease}
        .cycle-items-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:12px;margin-top:14px}
        .ci-card{background:#070710;border:1px solid #111120;border-radius:12px;padding:14px}
        .ci-name{font-size:0.82rem;font-weight:700;color:#e8e8f0;margin-bottom:8px}
        .ci-row{display:flex;justify-content:space-between;font-size:0.65rem;font-family:'JetBrains Mono',monospace;color:#3a3a55;margin-bottom:3px}
        .ci-row span:last-child{color:#6ab4ff}
        .ci-paid{display:inline-flex;align-items:center;gap:4px;background:#0d2a1a;border:1px solid #4dff9133;border-radius:5px;padding:2px 7px;font-size:0.55rem;font-weight:800;color:#4dff91;letter-spacing:1px;margin-top:6px}
        .cycle-summary-bar{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-top:16px;padding:14px;background:#070710;border:1px solid #111120;border-radius:12px}
        .csb-item{text-align:center}
        .csb-lbl{font-size:0.55rem;text-transform:uppercase;letter-spacing:1.5px;color:#2a2a40;margin-bottom:4px}
        .csb-val{font-family:'JetBrains Mono',monospace;font-size:0.9rem;font-weight:800;color:#c084fc}

        /* ── MODALS ── */
        .overlay{position:fixed;inset:0;background:rgba(0,0,0,0.84);backdrop-filter:blur(8px);z-index:200;display:flex;align-items:center;justify-content:center;padding:20px}
        .modal{background:#0e0e18;border:1px solid #252535;border-radius:22px;padding:34px;width:100%;max-width:460px;animation:fadeIn 0.2s ease;position:relative;overflow:hidden}
        .modal::before{content:'';position:absolute;top:0;left:0;right:0;height:3px;background:linear-gradient(90deg,#f7c26a,#ffaa00)}
        .modal.modal-archive::before{background:linear-gradient(90deg,#c084fc,#818cf8)}
        .modal h2{font-size:1.2rem;font-weight:800;margin-bottom:24px;background:linear-gradient(135deg,#fff,#f7c26a);-webkit-background-clip:text;-webkit-text-fill-color:transparent}
        .modal.modal-archive h2{background:linear-gradient(135deg,#fff,#c084fc);-webkit-background-clip:text;-webkit-text-fill-color:transparent}
        .archive-preview{background:#070710;border:1px solid #1c1c2e;border-radius:12px;padding:16px;margin-bottom:20px}
        .ap-row{display:flex;justify-content:space-between;align-items:center;padding:6px 0;border-bottom:1px solid #111120;font-size:0.78rem}
        .ap-row:last-child{border-bottom:none}
        .ap-lbl{color:#3a3a55;font-family:'JetBrains Mono',monospace}
        .ap-val{color:#e8e8f0;font-family:'JetBrains Mono',monospace;font-weight:700}
        .archive-warn{background:#1a0e2e;border:1px solid #c084fc33;border-radius:10px;padding:12px 15px;color:#9a74cc;font-size:0.75rem;font-family:'JetBrains Mono',monospace;margin-bottom:20px;line-height:1.6}
        .fg{margin-bottom:16px}
        .fg label{display:block;font-size:0.6rem;text-transform:uppercase;letter-spacing:2px;color:#3a3a55;margin-bottom:7px}
        .fi{width:100%;background:#070710;border:1px solid #1e1e32;border-radius:11px;padding:13px 15px;color:#e8e8f0;font-family:'JetBrains Mono',monospace;font-size:0.9rem;outline:none;transition:border-color 0.2s}
        .fi:focus{border-color:#f7c26a55;box-shadow:0 0 0 3px #f7c26a0d}
        .fi.fi-error{border-color:#ff444488 !important;box-shadow:0 0 0 3px #ff44440d}
        .fi-hint{font-size:0.6rem;font-family:'JetBrains Mono',monospace;color:#3a3a55;margin-top:5px}
        .fi-hint.hint-error{color:#ff8888}
        .aed-hint{display:flex;align-items:center;justify-content:space-between;background:#07100a;border:1px solid #1a2e1a;border-radius:9px;padding:9px 14px;margin-top:-8px;margin-bottom:16px}
        .aed-hint-lbl{font-size:0.58rem;text-transform:uppercase;letter-spacing:1.5px;color:#2a4a2a}
        .aed-hint-val{font-family:'JetBrains Mono',monospace;font-size:0.85rem;font-weight:700;color:#4dff9166}
        .bal-preview{display:flex;align-items:center;justify-content:space-between;border-radius:11px;padding:12px 15px;margin-bottom:16px}
        .divider{height:1px;background:#111120;margin:4px 0 16px}
        .form-error{background:#1e0808;border:1px solid #ff444444;border-radius:9px;padding:11px 15px;color:#ff8888;font-size:0.78rem;margin-bottom:16px;font-family:'JetBrains Mono',monospace}
        .ma{display:flex;gap:10px;margin-top:24px;justify-content:flex-end}
        .autofill-badge{display:inline-flex;align-items:center;gap:4px;background:#f7c26a18;border:1px solid #f7c26a33;border-radius:6px;padding:2px 8px;font-size:0.58rem;font-weight:700;color:#f7c26a;letter-spacing:1px;margin-left:8px;vertical-align:middle}
        .btn-archive-confirm{background:linear-gradient(135deg,#c084fc,#818cf8);color:#fff;font-weight:800;border:none}
        .btn-archive-confirm:hover{opacity:0.9;transform:translateY(-1px)}

        @media(max-width:900px){.summary-grid{grid-template-columns:repeat(2,1fr)}}
        @media(max-width:600px){.summary-grid{grid-template-columns:1fr}.root{padding:20px 14px}.cards-grid{grid-template-columns:1fr}.cycle-stats{display:none}}
      `}</style>

      <div className="root">

        {/* HEADER */}
        <div className="page-header">
          <div>
            <h1>🗺️ My Plan</h1>
            <p>// {new Date().toLocaleDateString('en-IN', { weekday:'long', year:'numeric', month:'long', day:'numeric' })}</p>
          </div>
          <div className="header-actions">
            {isCycleDay && (
              <button className="btn btn-archive" onClick={() => setShowArchiveConfirm(true)}>
                📦 Archive & Start New Cycle
              </button>
            )}
            <button className="btn btn-primary" onClick={openAddModal}>+ Add Plan Item</button>
          </div>
        </div>

        {/* CYCLE BANNER — only on 20th+ */}
        {isCycleDay && (
          <div className="cycle-banner">
            <div className="cycle-banner-left">
              <div className="cycle-icon">🔄</div>
              <div>
                <div className="cycle-title">New Cycle Available</div>
                <div className="cycle-sub">Today is the 20th or later — you can archive this month's plan and start fresh</div>
              </div>
            </div>
            <button className="btn btn-archive btn-sm" onClick={() => setShowArchiveConfirm(true)}>Archive Now →</button>
          </div>
        )}

        {/* RATE BAR */}
        <div className="rate-bar">
          <div className="rdot" />
          <span className="rtxt">1 AED = ₹{rate}</span>
          <span className="rnote">{rateLoading ? 'Fetching live rate…' : '· Live Rate'}</span>
          <span className="rright">All amounts in ₹ · AED shown for reference only</span>
        </div>

        {/* SUMMARY STATS */}
        <div className="summary-grid">
          <div className="sc blue">
            <div className="slbl">Total Amount ₹</div>
            <div className="sval">{fmt(FIXED_BUDGET)}</div>
            <div className="ssub">≈ {fmtAED(totalAED)}</div>
          </div>
          <div className="sc gold">
            <div className="slbl">Total Spent ₹</div>
            <div className="sval">{fmt(totalSpent)}</div>
            <div className="ssub">{rows.length} items</div>
          </div>
          <div className="sc green">
            <div className="slbl">Total Paid ₹</div>
            <div className="sval">{fmt(totalPaid)}</div>
            <div className="ssub">{paidCount} of {rows.length} paid</div>
          </div>
          <div className="sc purple">
            <div className="slbl">Remaining Balance ₹</div>
            <div className="sval" style={{ color: totalBalance >= 0 ? '#c084fc' : '#ff6b6b' }}>{fmt(totalBalance)}</div>
            <div className="ssub">{totalBalance >= 0 ? 'Surplus 🎉' : '⚠ Over budget'}</div>
          </div>
        </div>

        {/* PROGRESS BAR */}
        <div className="prog-wrap">
          <div className="prog-head">
            <span className="prog-lbl">Budget Used (Spent ÷ Fixed Budget ₹{FIXED_BUDGET.toLocaleString('en-IN')})</span>
            <span className="prog-pct">{progressPct}%</span>
          </div>
          <div className="prog-bar">
            <div className="prog-fill" style={{ width:`${progressPct}%` }} />
          </div>
        </div>

        {/* PLAN CARDS */}
        <div className="section-head">
          <span className="section-title">📋 Plan Items</span>
          <span className="count-badge">{paidCount}/{rows.length} paid</span>
        </div>

        {rows.length === 0 ? (
          <div className="empty-state">No plan items yet. Click "+ Add Plan Item" to get started.</div>
        ) : (
          <div className="cards-grid">
            {rows.map(item => {
              const isEditing = editingId === item.id
              const bal       = Number(item.balance || 0)
              const aedRef    = Number((Number(item.amount_rupee || 0) / rate).toFixed(2))
              return (
                <div key={item.id} className={`plan-card ${item.paid ? 'is-paid' : ''}`}>
                  <div className="card-top">
                    <div className="card-icon">{item.paid ? '✅' : '📌'}</div>
                    <div className="card-title-block">
                      {isEditing
                        ? <input className="ei" value={editRow.name} onChange={e => setEditRow(p => ({...p, name: e.target.value}))} placeholder="Name" />
                        : <div className="card-name">
                            {item.name || '—'}
                            {item.paid && <span className="paid-chip">PAID</span>}
                          </div>}
                      {!isEditing && item.notes && <div className="card-notes">{item.notes}</div>}
                      {isEditing && <input className="ei" value={editRow.notes} onChange={e => setEditRow(p => ({...p, notes: e.target.value}))} placeholder="Notes (optional)" />}
                    </div>
                    <div className="card-actions">
                      {isEditing ? (
                        <>
                          <button className="btn btn-save btn-sm" onClick={() => saveEdit(item.id)} disabled={saving}>{saving ? '…' : '✓'}</button>
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

                  <div className="card-amounts">
                    <div className="ca-block">
                      <div className="ca-lbl">Total ₹</div>
                      {isEditing
                        ? <input className="ei" type="number" value={editRow.amount_rupee} onChange={e => setEditRow(p => ({...p, amount_rupee: e.target.value}))} placeholder="₹" />
                        : <>
                            <div className="ca-val inr">{fmt(item.amount_rupee || 0)}</div>
                            <div className="ca-sub">≈ {fmtAED(aedRef)}</div>
                          </>}
                    </div>
                    <div className="ca-block">
                      <div className="ca-lbl">Spent ₹</div>
                      {isEditing
                        ? <input className="ei" type="number" value={editRow.amount_paying} onChange={e => setEditRow(p => ({...p, amount_paying: e.target.value}))} placeholder="₹ spent" />
                        : <div className="ca-val spent">{fmt(item.amount_paying || 0)}</div>}
                    </div>
                    <div className="ca-block" style={{ gridColumn: '1 / -1' }}>
                      <div className="ca-lbl">Balance ₹</div>
                      <div className={`ca-val ${bal === 0 ? 'bal-zero' : bal > 0 ? 'bal-pos' : 'bal-neg'}`}>{fmt(bal)}</div>
                    </div>
                  </div>

                  <div className="tgl-row" onClick={() => togglePaid(item.id, item.paid)}>
                    <div className={`ttrack ${item.paid ? 'on' : ''}`}>
                      <div className="tknob" />
                    </div>
                    <span className="tgl-lbl">{item.paid ? 'Paid ✓' : 'Mark as Paid'}</span>
                  </div>

                  <div className="card-date">
                    Added {item.created_at ? new Date(item.created_at).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' }) : '—'}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* ── PAST CYCLES ── */}
        {cycles.length > 0 && (
          <>
            <div className="section-head">
              <span className="section-title">📦 Past Cycles</span>
              <span className="count-badge">{cycles.length} archived</span>
            </div>
            <div className="cycles-wrap">
              {cycles.map(cycle => {
                const items    = (() => { try { return JSON.parse(cycle.items_json) } catch { return [] } })()
                const isOpen   = expandedCycle === cycle.id
                const budgetPct = Math.min(100, Math.round((Number(cycle.total_spent) / Number(cycle.fixed_budget)) * 100))
                return (
                  <div key={cycle.id} className="cycle-row">
                    <div className="cycle-header" onClick={() => setExpandedCycle(isOpen ? null : cycle.id)}>
                      <div className="cycle-header-left">
                        <div className="cycle-month-icon">📦</div>
                        <div>
                          <div className="cycle-month-name">{cycle.cycle_label}</div>
                          <div className="cycle-month-date">Archived {new Date(cycle.archived_at).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' })}</div>
                        </div>
                      </div>
                      <div className="cycle-stats">
                        <div className="cstat">
                          <div className="cstat-lbl">Spent</div>
                          <div className="cstat-val">{fmt(cycle.total_spent)}</div>
                        </div>
                        <div className="cstat">
                          <div className="cstat-lbl">Paid</div>
                          <div className="cstat-val">{cycle.paid_count}/{cycle.total_items}</div>
                        </div>
                        <div className="cstat">
                          <div className="cstat-lbl">Budget Used</div>
                          <div className="cstat-val">{budgetPct}%</div>
                        </div>
                      </div>
                      <div className={`cycle-chevron ${isOpen ? 'open' : ''}`}>▼</div>
                    </div>

                    {isOpen && (
                      <div className="cycle-body">
                        <div className="cycle-summary-bar">
                          <div className="csb-item">
                            <div className="csb-lbl">Fixed Budget</div>
                            <div className="csb-val">{fmt(cycle.fixed_budget)}</div>
                          </div>
                          <div className="csb-item">
                            <div className="csb-lbl">Total Spent</div>
                            <div className="csb-val" style={{color:'#f7c26a'}}>{fmt(cycle.total_spent)}</div>
                          </div>
                          <div className="csb-item">
                            <div className="csb-lbl">Remaining</div>
                            <div className="csb-val" style={{color: Number(cycle.fixed_budget) - Number(cycle.total_spent) >= 0 ? '#4dff91' : '#ff6b6b'}}>
                              {fmt(Number(cycle.fixed_budget) - Number(cycle.total_spent))}
                            </div>
                          </div>
                        </div>
                        <div className="cycle-items-grid">
                          {items.map((item, i) => (
                            <div key={i} className="ci-card">
                              <div className="ci-name">{item.name}</div>
                              <div className="ci-row"><span>Total</span><span>{fmt(item.amount_rupee)}</span></div>
                              <div className="ci-row"><span>Spent</span><span>{fmt(item.amount_paying)}</span></div>
                              <div className="ci-row"><span>Balance</span><span style={{color: Number(item.balance) >= 0 ? '#c084fc' : '#ff6b6b'}}>{fmt(item.balance)}</span></div>
                              {item.notes && <div className="ci-row" style={{color:'#2a2a40',fontSize:'0.6rem'}}><span>📝</span><span>{item.notes}</span></div>}
                              {item.paid && <div className="ci-paid">✓ PAID</div>}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </>
        )}

        {/* HISTORY */}
        <div className="section-head">
          <span className="section-title">🕒 Activity History</span>
          <span className="count-badge">{history.length} events</span>
        </div>
        <div className="history-wrap">
          {history.length === 0 ? (
            <div className="hist-empty">No activity yet. Changes will appear here.</div>
          ) : (
            <div className="hist-list">
              {history.map(item => (
                <div key={item.id} className="hist-item">
                  <div className="hist-dot" style={{ background:`${getActionColor(item.action)}18`, border:`1px solid ${getActionColor(item.action)}44` }}>
                    {getActionIcon(item.action)}
                  </div>
                  <div className="hist-content">
                    <div className="hist-action" style={{ color: getActionColor(item.action) }}>{item.action}</div>
                    <div className="hist-details">{item.details}</div>
                    <div className="hist-time">{new Date(item.created_at).toLocaleString('en-IN', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' })}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── ARCHIVE CONFIRM MODAL ── */}
      {showArchiveConfirm && (
        <div className="overlay" onClick={e => { if (e.target === e.currentTarget) setShowArchiveConfirm(false) }}>
          <div className="modal modal-archive">
            <h2>📦 Archive This Cycle?</h2>

            <div className="archive-preview">
              <div className="ap-row">
                <span className="ap-lbl">Cycle</span>
                <span className="ap-val">{new Date().toLocaleString('en-IN', { month: 'long', year: 'numeric' })}</span>
              </div>
              <div className="ap-row">
                <span className="ap-lbl">Items</span>
                <span className="ap-val">{rows.length}</span>
              </div>
              <div className="ap-row">
                <span className="ap-lbl">Fixed Budget</span>
                <span className="ap-val">{fmt(FIXED_BUDGET)}</span>
              </div>
              <div className="ap-row">
                <span className="ap-lbl">Total Spent</span>
                <span className="ap-val" style={{color:'#f7c26a'}}>{fmt(totalSpent)}</span>
              </div>
              <div className="ap-row">
                <span className="ap-lbl">Remaining</span>
                <span className="ap-val" style={{color: totalBalance >= 0 ? '#4dff91' : '#ff6b6b'}}>{fmt(totalBalance)}</span>
              </div>
              <div className="ap-row">
                <span className="ap-lbl">Paid Items</span>
                <span className="ap-val">{paidCount} of {rows.length}</span>
              </div>
            </div>

            <div className="archive-warn">
              ⚠️ This will save the current plan as a past cycle and clear all items for a fresh start. Archived data is never deleted — you can always view it below.
            </div>

            <div className="ma">
              <button className="btn btn-ghost" onClick={() => setShowArchiveConfirm(false)}>Cancel</button>
              <button className="btn btn-archive-confirm" onClick={archiveCurrentPlan} disabled={archiving}>
                {archiving ? 'Archiving…' : '📦 Archive & Start Fresh'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ADD MODAL */}
      {showForm && (
        <div className="overlay" onClick={e => { if (e.target === e.currentTarget) setShowForm(false) }}>
          <div className="modal">
            <h2>+ Add Plan Item</h2>
            {formError && <div className="form-error">⚠ {formError}</div>}

            <div className="fg">
              <label>Name / Item Title</label>
              <input className="fi" placeholder="e.g. Flight Tickets, Rent, Gold…" value={form.name} onChange={e => setForm(p => ({...p, name: e.target.value}))} />
            </div>

            <div className="fg">
              <label>
                🇮🇳 Total Amount in ₹
                <span className="autofill-badge">⚡ Auto-filled</span>
              </label>
              <input
                className="fi"
                type="number"
                placeholder="Enter ₹ amount"
                value={form.amount_rupee}
                onChange={e => setForm(p => ({...p, amount_rupee: e.target.value, amount_paying: ''}))}
              />
              <div className="fi-hint">Pre-filled with remaining budget: {fmt(FIXED_BUDGET - totalSpent)}</div>
            </div>

            {form.amount_rupee && (
              <div className="aed-hint">
                <span className="aed-hint-lbl">🇦🇪 AED equivalent</span>
                <span className="aed-hint-val">≈ {fmtAED((Number(form.amount_rupee) / rate).toFixed(2))}</span>
              </div>
            )}

            <div className="divider" />

            <div className="fg">
              <label>🇮🇳 Amount Spent ₹</label>
              <input
                className={`fi ${spentExceedsTotal ? 'fi-error' : ''}`}
                type="number"
                placeholder={form.amount_rupee ? `Max: ${fmt(Number(form.amount_rupee))}` : 'How much will you spend?'}
                value={form.amount_paying}
                onChange={e => setForm(p => ({...p, amount_paying: e.target.value}))}
              />
              {spentExceedsTotal && (
                <div className="fi-hint hint-error">⚠ Cannot exceed Total Amount {fmt(Number(form.amount_rupee))}</div>
              )}
              {!spentExceedsTotal && form.amount_rupee && form.amount_paying && (
                <div className="fi-hint">Remaining after this: {fmt(Number(form.amount_rupee) - Number(form.amount_paying))}</div>
              )}
            </div>

            {form.amount_rupee && form.amount_paying && !spentExceedsTotal && (
              <div className="bal-preview" style={{ background:'#070710', border:`1px solid ${previewBal >= 0 ? '#1e2e1e' : '#2e1111'}`, marginBottom:16 }}>
                <span style={{fontSize:'0.6rem',textTransform:'uppercase',letterSpacing:2,color:'#3a3a55'}}>Balance ₹</span>
                <span style={{fontFamily:'JetBrains Mono, monospace',fontWeight:800,fontSize:'1rem',color:previewBal >= 0 ? '#c084fc' : '#ff6b6b'}}>
                  {fmt(previewBal)}
                </span>
              </div>
            )}

            <div className="fg">
              <label>Notes (Optional)</label>
              <input className="fi" placeholder="Any extra details…" value={form.notes} onChange={e => setForm(p => ({...p, notes: e.target.value}))} />
            </div>

            <div className="ma">
              <button className="btn btn-ghost" onClick={() => setShowForm(false)}>Cancel</button>
              <button
                className="btn btn-primary"
                onClick={handleAdd}
                disabled={submitting || spentExceedsTotal}
                style={spentExceedsTotal ? { opacity:0.5, cursor:'not-allowed' } : {}}
              >
                {submitting ? 'Saving…' : '+ Add Item'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}