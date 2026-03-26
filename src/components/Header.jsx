import { Link, useNavigate } from 'react-router-dom'

export default function Header({ title, backTo, backLabel, actions }) {
  const navigate = useNavigate()

  return (
    <header className="sticky top-0 z-50" style={{ backgroundColor: '#1a1f2e', borderBottom: '1px solid #2d3448' }}>
      <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
        {backTo && (
          <button
            onClick={() => navigate(backTo)}
            className="flex items-center justify-center w-9 h-9 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15,18 9,12 15,6" />
            </svg>
          </button>
        )}

        {!backTo && (
          <Link to="/" className="flex items-center gap-2 no-underline">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm" style={{ backgroundColor: '#f97316', color: 'white' }}>
              FG
            </div>
          </Link>
        )}

        <div className="flex-1 min-w-0">
          <h1 className="text-base font-semibold text-white truncate m-0 leading-tight">
            {title || 'Fab Quote'}
          </h1>
        </div>

        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
    </header>
  )
}
