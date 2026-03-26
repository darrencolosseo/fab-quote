const STATUS_STYLES = {
  Draft:        { bg: '#2d3448', color: '#94a3b8', label: 'Draft' },
  Sent:         { bg: '#1e3a5f', color: '#60a5fa', label: 'Sent' },
  Won:          { bg: '#14532d', color: '#4ade80', label: 'Won' },
  Lost:         { bg: '#450a0a', color: '#f87171', label: 'Lost' },
  'Followed Up':{ bg: '#431407', color: '#fb923c', label: 'Followed Up' },
}

export default function StatusBadge({ status }) {
  const style = STATUS_STYLES[status] || STATUS_STYLES['Draft']
  return (
    <span
      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
      style={{ backgroundColor: style.bg, color: style.color }}
    >
      {style.label}
    </span>
  )
}
