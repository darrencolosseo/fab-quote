import { useState, useEffect } from 'react'
import { _setToastListener } from '../utils/toast'

export default function Toast() {
  const [toasts, setToasts] = useState([])

  useEffect(() => {
    _setToastListener((toast) => {
      setToasts(prev => [...prev.slice(-2), { ...toast, visible: true }])
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== toast.id))
      }, 2500)
    })
    return () => _setToastListener(null)
  }, [])

  return (
    <div className="fixed top-4 left-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none max-w-lg mx-auto">
      {toasts.map(t => (
        <div key={t.id}
          className="rounded-xl px-4 py-3 flex items-center gap-3 shadow-xl pointer-events-auto"
          style={{
            backgroundColor: '#1e2535',
            border: '1px solid #2d3448',
            borderLeft: `4px solid ${t.type === 'error' ? '#ef4444' : '#22c55e'}`,
            animation: 'slideDown 0.25s ease-out',
          }}>
          <span style={{ fontSize: 16 }}>{t.type === 'error' ? '✕' : '✓'}</span>
          <span className="text-sm text-white font-medium flex-1">{t.message}</span>
        </div>
      ))}
      <style>{`@keyframes slideDown { from { opacity:0; transform:translateY(-12px) } to { opacity:1; transform:translateY(0) } }`}</style>
    </div>
  )
}
