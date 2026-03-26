import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { MARGIN_PCT } from '../config/pricing'
import { formatCurrency } from '../utils/format'

function Label({ children }) {
  return <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">{children}</label>
}

function TextInput({ label, value, onChange, type = 'text', placeholder }) {
  return (
    <div>
      <Label>{label}</Label>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
        className="w-full px-4 py-3 rounded-xl text-white placeholder-slate-600 text-base outline-none"
        style={{ backgroundColor: '#252b3d', border: '1px solid #2d3448' }} />
    </div>
  )
}

function parseNotes(raw) {
  if (!raw) return { userNotes: '', parsed: null }
  try {
    const obj = JSON.parse(raw)
    if (obj.v === 2) return { userNotes: obj.userNotes || '', parsed: obj }
  } catch {}
  return { userNotes: raw, parsed: null }
}

export default function EditQuote() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [job, setJob] = useState(null)

  const [name, setName]       = useState('')
  const [phone, setPhone]     = useState('')
  const [email, setEmail]     = useState('')
  const [address, setAddress] = useState('')
  const [suburb, setSuburb]   = useState('')
  const [notes, setNotes]     = useState('')
  const [totalOverride, setTotalOverride]   = useState('')
  const [overrideActive, setOverrideActive] = useState(false)
  const [quoteNumber, setQuoteNumber]       = useState('')

  useEffect(() => {
    supabase.from('jobs').select('*').eq('id', id).single().then(({ data, error }) => {
      if (error || !data) { navigate('/'); return }
      setJob(data)
      setName(data.customer_name || '')
      setPhone(data.customer_phone || '')
      setEmail(data.customer_email || '')
      setAddress(data.address || '')
      setSuburb(data.suburb || '')
      setQuoteNumber(data.quote_number || '')
      const { userNotes } = parseNotes(data.notes)
      setNotes(userNotes)
      setLoading(false)
    })
  }, [id])

  async function handleSave() {
    setSaving(true)
    try {
      // Rebuild notes JSON preserving the existing breakdown
      const { parsed } = parseNotes(job.notes)
      const updatedNotes = parsed
        ? JSON.stringify({ ...parsed, userNotes: notes })
        : notes

      const newTotal = overrideActive && totalOverride !== ''
        ? parseFloat(totalOverride)
        : job.total_price

      const { error } = await supabase.from('jobs').update({
        customer_name:  name,
        customer_email: email,
        customer_phone: phone,
        address,
        suburb,
        notes:          updatedNotes,
        total_price:    newTotal,
      }).eq('id', id)

      if (error) throw error
      navigate(`/job/${id}`)
    } catch (err) {
      alert('Save failed: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#1a1f2e' }}>
        <div className="w-8 h-8 border-2 border-slate-600 border-t-orange-500 rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#1a1f2e' }}>
      <header className="sticky top-0 z-50" style={{ backgroundColor: '#1a1f2e', borderBottom: '1px solid #2d3448' }}>
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <button onClick={() => navigate(`/job/${id}`)}
            className="flex items-center justify-center w-9 h-9 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15,18 9,12 15,6" />
            </svg>
          </button>
          <div className="flex-1">
            <h1 className="text-base font-semibold text-white m-0">Edit Quote</h1>
            <p className="text-xs text-slate-400 m-0">{quoteNumber}</p>
          </div>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-5 pb-32 flex flex-col gap-5">

        {/* Customer */}
        <section className="rounded-xl p-5" style={{ backgroundColor: '#252b3d', border: '1px solid #2d3448' }}>
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">Customer Details</div>
          <div className="flex flex-col gap-4">
            <TextInput label="Customer Name" value={name} onChange={setName} placeholder="Jane Smith" />
            <div className="grid grid-cols-2 gap-3">
              <TextInput label="Phone" value={phone} onChange={setPhone} type="tel" placeholder="04XX XXX XXX" />
              <TextInput label="Email" value={email} onChange={setEmail} type="email" placeholder="jane@example.com" />
            </div>
            <TextInput label="Address" value={address} onChange={setAddress} placeholder="123 Main Street" />
            <TextInput label="Suburb" value={suburb} onChange={setSuburb} placeholder="Suburb" />
          </div>
        </section>

        {/* Current price (read-only) + override */}
        <section className="rounded-xl p-5" style={{ backgroundColor: '#252b3d', border: '1px solid #2d3448' }}>
          <div className="flex items-center justify-between mb-3">
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Current Total</div>
            <button type="button"
              onClick={() => { setOverrideActive(!overrideActive); if (!overrideActive) setTotalOverride(String(job.total_price)) }}
              className="text-xs font-medium" style={{ color: overrideActive ? '#f97316' : '#64748b' }}>
              {overrideActive ? 'Use Existing' : 'Override Price'}
            </button>
          </div>

          {overrideActive ? (
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-mono">$</span>
              <input type="number" inputMode="decimal" value={totalOverride}
                onChange={(e) => setTotalOverride(e.target.value)}
                className="w-full pl-7 pr-4 py-3 rounded-xl text-white text-base outline-none font-mono"
                style={{ backgroundColor: '#12172a', border: '1px solid #f97316' }} />
            </div>
          ) : (
            <div className="rounded-lg px-4 py-3 flex justify-between items-center"
              style={{ backgroundColor: '#12172a', border: '1px solid #f97316' }}>
              <span className="text-sm font-bold text-white">TOTAL + GST</span>
              <span className="font-mono text-2xl font-bold" style={{ color: '#f97316' }}>
                {formatCurrency(job.total_price)}
              </span>
            </div>
          )}
        </section>

        {/* Notes */}
        <section className="rounded-xl p-5" style={{ backgroundColor: '#252b3d', border: '1px solid #2d3448' }}>
          <Label>Notes</Label>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)}
            placeholder="Site conditions, access notes, customer requests…" rows={4}
            className="w-full px-4 py-3 rounded-xl text-white placeholder-slate-600 text-sm outline-none resize-none"
            style={{ backgroundColor: '#12172a', border: '1px solid #2d3448' }} />
        </section>

        {/* Info box about pricing changes */}
        <div className="rounded-xl p-4 flex gap-3 items-start" style={{ backgroundColor: '#1e2a3d', border: '1px solid #2d3448' }}>
          <span className="text-base flex-shrink-0" style={{ color: '#f97316' }}>ℹ</span>
          <p className="text-xs text-slate-400 m-0 leading-relaxed">
            To change door specs or recalculate pricing, create a new quote. This screen updates customer details, notes, and price only.
          </p>
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 z-50 px-4 py-4" style={{ backgroundColor: '#1a1f2e', borderTop: '1px solid #2d3448' }}>
        <div className="max-w-2xl mx-auto">
          <button onClick={handleSave} disabled={saving}
            className="w-full py-4 rounded-xl text-base font-bold disabled:opacity-50"
            style={{ backgroundColor: '#f97316', color: 'white' }}>
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  )
}
