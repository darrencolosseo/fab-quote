import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { formatCurrency } from '../utils/format'

export default function EmailTemplate() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [job, setJob] = useState(null)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    supabase.from('jobs').select('*').eq('id', id).single().then(({ data, error }) => {
      if (error) navigate('/')
      else setJob(data)
      setLoading(false)
    })
  }, [id])

  function buildEmailBody(job) {
    return `Hi ${job.customer_name || '[Customer Name]'},

Thanks for getting in touch with Fab Garage Doors.

Please find your quote attached for the ${job.door_type || '[Door Type]'} installation at ${job.address ? job.address + ',' : ''} ${job.suburb || '[Suburb]'}.

Quote Summary:
─────────────────────────────
Quote Number: ${job.quote_number}
Door: ${job.width_mm || '[W]'}mm × ${job.height_mm || '[H]'}mm ${job.door_type || ''}
Total Investment: ${formatCurrency(job.total_price)} inc. GST
─────────────────────────────

This quote is valid for 30 days. To proceed, simply reply to this email or give us a call.

Looking forward to working with you.

Warm regards,
[Your Name]
Fab Garage Doors
Ph: 0XXX XXX XXX
fab@fabgaragedoors.com.au`
  }

  async function handleCopy() {
    if (!job) return
    const text = buildEmailBody(job)
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    } catch {
      // Fallback
      const el = document.createElement('textarea')
      el.value = text
      document.body.appendChild(el)
      el.select()
      document.execCommand('copy')
      document.body.removeChild(el)
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#1a1f2e' }}>
        <div className="w-8 h-8 border-2 border-slate-600 border-t-orange-500 rounded-full animate-spin" />
      </div>
    )
  }

  if (!job) return null

  const emailBody = buildEmailBody(job)
  const subject = `Your Garage Door Quote — ${job.quote_number}`

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#1a1f2e' }}>
      {/* Header */}
      <header className="sticky top-0 z-50" style={{ backgroundColor: '#1a1f2e', borderBottom: '1px solid #2d3448' }}>
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => navigate(`/job/${id}`)}
            className="flex items-center justify-center w-9 h-9 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15,18 9,12 15,6" />
            </svg>
          </button>
          <h1 className="text-base font-semibold text-white flex-1 m-0">Email Template</h1>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-5 flex flex-col gap-4">

        {/* Send to */}
        <section className="rounded-xl p-4" style={{ backgroundColor: '#252b3d', border: '1px solid #2d3448' }}>
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Send To</div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-white font-medium text-sm font-mono">{job.customer_email || 'No email on file'}</span>
            {job.customer_email && (
              <a
                href={`mailto:${job.customer_email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(emailBody)}`}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors"
                style={{ backgroundColor: '#f97316', color: 'white' }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                  <polyline points="22,6 12,13 2,6"/>
                </svg>
                Open Mail
              </a>
            )}
          </div>
        </section>

        {/* Subject */}
        <section className="rounded-xl p-4" style={{ backgroundColor: '#252b3d', border: '1px solid #2d3448' }}>
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Subject Line</div>
          <p className="text-white text-sm m-0 font-mono">{subject}</p>
        </section>

        {/* Email body */}
        <section className="rounded-xl p-4" style={{ backgroundColor: '#252b3d', border: '1px solid #2d3448' }}>
          <div className="flex items-center justify-between mb-3">
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Email Body</div>
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
              style={copied
                ? { backgroundColor: '#14532d', color: '#4ade80' }
                : { backgroundColor: '#2d3448', color: '#cbd5e1' }
              }
            >
              {copied ? (
                <>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20,6 9,17 4,12" />
                  </svg>
                  Copied!
                </>
              ) : (
                <>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                  </svg>
                  Copy to Clipboard
                </>
              )}
            </button>
          </div>

          <pre
            className="text-sm text-slate-300 whitespace-pre-wrap m-0 leading-relaxed"
            style={{ fontFamily: "'DM Mono', monospace", fontSize: '13px' }}
          >
            {emailBody}
          </pre>
        </section>

        {/* Quote summary reminder */}
        <section className="rounded-xl p-4" style={{ backgroundColor: '#12172a', border: '1px solid #2d3448' }}>
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Quote Summary</div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-slate-400">{job.quote_number}</span>
            <span className="font-mono font-bold text-lg" style={{ color: '#f97316' }}>{formatCurrency(job.total_price)}</span>
          </div>
          <div className="text-xs text-slate-500 mt-1">{job.customer_name} · {job.suburb}</div>
        </section>

      </div>
    </div>
  )
}
