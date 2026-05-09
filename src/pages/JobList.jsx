import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { formatCurrency, formatDate } from '../utils/format'
import { showToast } from '../utils/toast'
import StatusBadge from '../components/StatusBadge'

const STATUS_COLORS = {
  Draft: '#64748b',
  Sent: '#3b82f6',
  'Followed Up': '#f97316',
  Won: '#22c55e',
  Lost: '#ef4444',
}

const FILTER_TABS = ['All', 'Active', 'Won', 'Lost']

function formatPipelineAmount(n) {
  if (!n || n === 0) return '$0'
  if (n >= 1000000) return `$${(n / 1000000).toFixed(1)}M`
  if (n >= 10000) return `$${Math.round(n / 1000)}k`
  return `$${Math.round(n).toLocaleString('en-AU')}`
}

export default function JobList() {
  const navigate = useNavigate()
  const [jobs, setJobs] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [activeTab, setActiveTab] = useState('All')
  const [selectMode, setSelectMode] = useState(false)
  const [selected, setSelected] = useState(new Set())
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    fetchJobs()
  }, [])

  async function fetchJobs() {
    setLoading(true)
    const { data, error } = await supabase
      .from('jobs')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) console.error('Error fetching jobs:', error)
    else setJobs(data || [])
    setLoading(false)
  }

  function toggleSelectMode() {
    setSelectMode((v) => !v)
    setSelected(new Set())
  }

  function toggleSelect(id) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleSelectAll() {
    if (selected.size === filtered.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(filtered.map((j) => j.id)))
    }
  }

  async function deleteSelected() {
    setDeleting(true)
    const ids = [...selected]
    const { error } = await supabase.from('jobs').delete().in('id', ids)
    if (error) {
      showToast('Failed to delete quotes', 'error')
    } else {
      showToast(`${ids.length} quote${ids.length > 1 ? 's' : ''} deleted`)
      setJobs((prev) => prev.filter((j) => !ids.includes(j.id)))
      setSelected(new Set())
      setSelectMode(false)
    }
    setConfirmDelete(false)
    setDeleting(false)
  }

  async function deleteSingle(id, e) {
    e.stopPropagation()
    const { error } = await supabase.from('jobs').delete().eq('id', id)
    if (error) {
      showToast('Failed to delete quote', 'error')
    } else {
      showToast('Quote deleted')
      setJobs((prev) => prev.filter((j) => j.id !== id))
    }
  }

  // Filter by tab
  const tabFiltered = jobs.filter((j) => {
    if (activeTab === 'All') return true
    if (activeTab === 'Active') return ['Draft', 'Sent', 'Followed Up'].includes(j.status)
    if (activeTab === 'Won') return j.status === 'Won'
    if (activeTab === 'Lost') return j.status === 'Lost'
    return true
  })

  // Filter by search
  const filtered = tabFiltered.filter((j) => {
    const q = search.toLowerCase()
    if (!q) return true
    return (
      (j.address || '').toLowerCase().includes(q) ||
      (j.suburb || '').toLowerCase().includes(q) ||
      (j.quote_number || '').toLowerCase().includes(q)
    )
  })

  // Stats
  const wonJobs = jobs.filter((j) => j.status === 'Won')
  const lostJobs = jobs.filter((j) => j.status === 'Lost')
  const activeJobs = jobs.filter((j) => ['Draft', 'Sent', 'Followed Up'].includes(j.status))
  const wonRevenue = wonJobs.reduce((sum, j) => sum + (j.total_price || 0), 0)
  const pipelineTotal = activeJobs.reduce((sum, j) => sum + (j.total_price || 0), 0)
  const conversionPct =
    wonJobs.length + lostJobs.length > 0
      ? Math.round((wonJobs.length / (wonJobs.length + lostJobs.length)) * 100)
      : 0

  const emptyMessages = {
    All: search ? 'No quotes match your search' : 'No quotes yet — tap New Quote to start',
    Active: search ? 'No active quotes match your search' : 'No active quotes — all closed out',
    Won: search ? 'No won quotes match your search' : 'No won jobs yet — keep quoting!',
    Lost: search ? 'No lost quotes match your search' : 'No lost jobs recorded',
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#1a1f2e' }}>
      {/* Header */}
      <header className="sticky top-0 z-50" style={{ backgroundColor: 'rgba(20,24,32,0.92)', borderBottom: '1px solid rgba(255,255,255,0.06)', backdropFilter: 'blur(12px)' }}>
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm flex-shrink-0" style={{ backgroundColor: '#f97316', color: 'white' }}>
            FG
          </div>
          <h1 className="text-base font-semibold text-white flex-1 m-0">Fab Quote</h1>

          {/* Select / Cancel toggle */}
          <button
            onClick={toggleSelectMode}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
            style={{
              backgroundColor: selectMode ? '#ef4444' : '#252b3d',
              color: selectMode ? 'white' : '#94a3b8',
              border: `1px solid ${selectMode ? '#ef4444' : '#2d3448'}`,
            }}
          >
            {selectMode ? 'Cancel' : 'Select'}
          </button>

          <button
            onClick={fetchJobs}
            className="flex items-center justify-center w-9 h-9 rounded-lg text-slate-400 hover:text-white transition-colors"
            style={{ backgroundColor: '#252b3d', border: '1px solid #2d3448' }}
            title="Refresh"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="23 4 23 10 17 10" />
              <polyline points="1 20 1 14 7 14" />
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
            </svg>
          </button>

          {!selectMode && (
            <button
              onClick={() => navigate('/new')}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold transition-colors"
              style={{ backgroundColor: '#f97316', color: 'white' }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              New Quote
            </button>
          )}
        </div>

        {/* Select-all bar */}
        {selectMode && (
          <div className="max-w-2xl mx-auto px-4 pb-2 flex items-center justify-between">
            <button
              onClick={toggleSelectAll}
              className="text-xs font-semibold text-orange-400 hover:text-orange-300 transition-colors"
            >
              {selected.size === filtered.length && filtered.length > 0 ? 'Deselect All' : 'Select All'}
            </button>
            <span className="text-xs text-slate-500">
              {selected.size > 0 ? `${selected.size} selected` : 'Tap quotes to select'}
            </span>
          </div>
        )}
      </header>

      <div className="max-w-2xl mx-auto px-4 py-5" style={{ paddingBottom: selectMode && selected.size > 0 ? '96px' : '20px' }}>
        {/* Search */}
        <div className="relative mb-4">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            placeholder="Search by address, suburb or quote number…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm text-white placeholder-slate-500 outline-none"
            style={{ backgroundColor: '#252b3d', border: '1px solid #2d3448' }}
          />
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-4 gap-2 mb-4">
          {[
            { label: 'Total', value: jobs.length, color: 'white' },
            { label: 'Pipeline', value: formatPipelineAmount(pipelineTotal), color: '#fb923c' },
            { label: 'Won', value: formatPipelineAmount(wonRevenue), color: '#4ade80' },
            { label: 'Conv.', value: `${conversionPct}%`, color: '#38bdf8' },
          ].map((stat) => (
            <div key={stat.label} className="rounded-xl p-2.5 text-center" style={{ backgroundColor: '#252b3d', border: '1px solid #2d3448' }}>
              <div className="text-base font-bold font-mono leading-tight" style={{ color: stat.color }}>{stat.value}</div>
              <div className="text-xs text-slate-500 mt-0.5">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2 mb-4 overflow-x-auto" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
          {FILTER_TABS.map((tab) => {
            const isActive = activeTab === tab
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className="flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-semibold transition-all"
                style={{
                  backgroundColor: isActive ? '#f97316' : '#252b3d',
                  color: isActive ? 'white' : '#94a3b8',
                  border: `1px solid ${isActive ? '#f97316' : '#2d3448'}`,
                }}
              >
                {tab}
              </button>
            )
          })}
        </div>

        {/* Job list */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-500">
            <div className="w-8 h-8 border-2 border-slate-600 border-t-orange-500 rounded-full animate-spin mb-3" />
            <span className="text-sm">Loading quotes…</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-500">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mb-3 opacity-40">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14,2 14,8 20,8" />
            </svg>
            <p className="text-sm text-center">{emptyMessages[activeTab]}</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {filtered.map((job) => {
              const borderColor = STATUS_COLORS[job.status] || '#64748b'
              const isSelected = selected.has(job.id)
              return (
                <div
                  key={job.id}
                  onClick={() => selectMode ? toggleSelect(job.id) : navigate(`/job/${job.id}`)}
                  className="w-full text-left rounded-xl p-4 transition-all cursor-pointer relative"
                  style={{
                    backgroundColor: isSelected ? '#2d3a55' : '#252b3d',
                    border: `1px solid ${isSelected ? '#f97316' : '#2d3448'}`,
                    borderLeft: selectMode
                      ? `4px solid ${isSelected ? '#f97316' : '#3d4460'}`
                      : `4px solid ${borderColor}`,
                  }}
                >
                  <div className="flex items-start gap-3">
                    {/* Checkbox in select mode */}
                    {selectMode && (
                      <div
                        className="flex-shrink-0 mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all"
                        style={{
                          backgroundColor: isSelected ? '#f97316' : 'transparent',
                          borderColor: isSelected ? '#f97316' : '#4d5568',
                        }}
                      >
                        {isSelected && (
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        )}
                      </div>
                    )}

                    <div className="flex-1 min-w-0">
                      {/* Top row */}
                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-white text-sm truncate">{job.address || 'No address'}</div>
                          <div className="text-xs text-slate-400 mt-0.5">{job.suburb || '—'}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <StatusBadge status={job.status} />
                          {/* Trash icon — only visible when NOT in select mode */}
                          {!selectMode && (
                            <button
                              onClick={(e) => deleteSingle(job.id, e)}
                              className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-600 hover:text-red-400 hover:bg-red-500/10 transition-all"
                              title="Delete quote"
                            >
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="3 6 5 6 21 6" />
                                <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                                <path d="M10 11v6M14 11v6" />
                                <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                              </svg>
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Door type + dims */}
                      {(job.door_type || (job.width_mm && job.height_mm)) && (
                        <div className="text-xs text-slate-500 mb-2">
                          {job.door_type && <span>{job.door_type}</span>}
                          {job.door_type && job.width_mm && job.height_mm && <span className="mx-1">·</span>}
                          {job.width_mm && job.height_mm && (
                            <span className="font-mono">{job.width_mm}×{job.height_mm}mm</span>
                          )}
                        </div>
                      )}

                      {/* Bottom row */}
                      <div className="flex items-center justify-between mt-1">
                        <div className="flex items-center gap-2 text-xs text-slate-500">
                          {job.quote_number && <span className="font-mono text-slate-400">{job.quote_number}</span>}
                          {job.quote_number && <span>·</span>}
                          <span>{formatDate(job.created_at)}</span>
                        </div>
                        <span className="font-mono font-bold text-base" style={{ color: '#f97316' }}>
                          {formatCurrency(job.total_price)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Sticky delete bar — shown when items selected */}
      {selectMode && selected.size > 0 && (
        <div
          className="fixed bottom-0 left-0 right-0 z-50 px-4 py-4"
          style={{ backgroundColor: '#1a1f2e', borderTop: '1px solid #2d3448' }}
        >
          <div className="max-w-2xl mx-auto">
            <button
              onClick={() => setConfirmDelete(true)}
              className="w-full py-3.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all"
              style={{ backgroundColor: '#ef4444', color: 'white' }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                <path d="M10 11v6M14 11v6" />
                <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
              </svg>
              Delete {selected.size} Quote{selected.size > 1 ? 's' : ''}
            </button>
          </div>
        </div>
      )}

      {/* Confirm delete modal */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-end justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}>
          <div className="w-full max-w-sm rounded-2xl p-6" style={{ backgroundColor: '#252b3d', border: '1px solid #2d3448' }}>
            <h3 className="text-white font-bold text-base mb-1">Delete {selected.size} Quote{selected.size > 1 ? 's' : ''}?</h3>
            <p className="text-slate-400 text-sm mb-5">This can't be undone. The quotes will be permanently removed.</p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmDelete(false)}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-slate-300 transition-colors"
                style={{ backgroundColor: '#1a1f2e', border: '1px solid #2d3448' }}
              >
                Cancel
              </button>
              <button
                onClick={deleteSelected}
                disabled={deleting}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white transition-all"
                style={{ backgroundColor: '#ef4444', opacity: deleting ? 0.6 : 1 }}
              >
                {deleting ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
