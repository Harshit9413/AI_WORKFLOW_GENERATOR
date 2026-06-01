import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api, setToken } from '../api'

export default function LoginPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const data = await api.login(email, password)
      setToken(data.access_token)
      navigate('/dashboard')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', height: '100vh', background: '#0f172a' }}>
      {/* Left — diagram preview */}
      <div style={{
        background: 'linear-gradient(135deg, #0d1f35 0%, #0f172a 55%, #130d27 100%)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        padding: '40px', position: 'relative', overflow: 'hidden',
      }}>
        {/* glow blobs */}
        <div style={{ position: 'absolute', top: -100, left: -100, width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(circle, rgba(96,165,250,0.08) 0%, transparent 70%)' }} />
        <div style={{ position: 'absolute', bottom: -80, right: -80, width: 350, height: 350, borderRadius: '50%', background: 'radial-gradient(circle, rgba(139,92,246,0.08) 0%, transparent 70%)' }} />

        {/* brand top-left */}
        <div style={{ position: 'absolute', top: 24, left: 28, display: 'flex', alignItems: 'center', gap: 8, zIndex: 2 }}>
          <span style={{ fontSize: 20 }}>🗺️</span>
          <span style={{ fontSize: 15, fontWeight: 700, color: '#60a5fa', fontFamily: 'system-ui' }}>AI Workflow Generator</span>
        </div>

        {/* diagram preview card */}
        <div style={{
          position: 'relative', zIndex: 2, background: '#1e293b', border: '1px solid #334155',
          borderRadius: 16, padding: 24, width: '100%', maxWidth: 420,
          boxShadow: '0 25px 60px rgba(0,0,0,0.5)', fontFamily: 'system-ui',
        }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 16 }}>
            Generated Architecture Diagram
          </div>

          {/* SVG flow diagram */}
          <div style={{ position: 'relative', height: 200, marginBottom: 18 }}>
            <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', overflow: 'visible' }}>
              <defs>
                <marker id="arr" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
                  <path d="M0,0 L0,6 L6,3 Z" fill="#3b82f6" opacity="0.6" />
                </marker>
              </defs>
              <line x1="90" y1="32" x2="148" y2="32" stroke="#3b82f6" strokeWidth="1.5" strokeOpacity="0.4" markerEnd="url(#arr)" />
              <line x1="245" y1="28" x2="295" y2="15" stroke="#10b981" strokeWidth="1.5" strokeOpacity="0.4" markerEnd="url(#arr)" />
              <line x1="245" y1="38" x2="295" y2="82" stroke="#8b5cf6" strokeWidth="1.5" strokeOpacity="0.4" markerEnd="url(#arr)" />
              <line x1="245" y1="33" x2="295" y2="148" stroke="#f59e0b" strokeWidth="1.5" strokeOpacity="0.4" markerEnd="url(#arr)" />
            </svg>
            {[
              { label: 'User', x: 0, y: 18, color: '#3b82f6' },
              { label: 'FastAPI', x: 148, y: 18, color: '#3b82f6', selected: true },
              { label: 'Redis', x: 295, y: 0, color: '#10b981' },
              { label: 'PostgreSQL', x: 295, y: 62, color: '#8b5cf6' },
              { label: 'Celery', x: 295, y: 130, color: '#f59e0b' },
            ].map((n) => (
              <div key={n.label} style={{
                position: 'absolute', left: n.x, top: n.y,
                background: '#0f172a',
                border: `1.5px solid ${n.color}`,
                boxShadow: n.selected ? `0 0 0 3px ${n.color}33` : undefined,
                borderRadius: 8, padding: '8px 14px',
                fontSize: 12, fontWeight: 600, color: '#f1f5f9', whiteSpace: 'nowrap',
                display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'system-ui',
              }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: n.color, display: 'inline-block' }} />
                {n.label}
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <div style={{
              flex: 1, background: '#0f172a', border: '1px solid #334155', borderRadius: 8,
              padding: '9px 12px', fontSize: 12, color: '#64748b', fontFamily: 'system-ui',
            }}>
              FastAPI with Redis, PostgreSQL and Celery
            </div>
            <div style={{
              background: 'linear-gradient(135deg, #2563eb, #7c3aed)', color: 'white',
              border: 'none', borderRadius: 8, padding: '9px 14px',
              fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap', fontFamily: 'system-ui',
            }}>
              Generate ✨
            </div>
          </div>
        </div>
      </div>

      {/* Right — login form */}
      <div style={{ background: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40 }}>
        <div style={{
          width: '100%', maxWidth: 380, background: '#1e293b',
          border: '1px solid #334155', borderRadius: 16, padding: 36, fontFamily: 'system-ui',
        }}>
          <div style={{ fontSize: 22, fontWeight: 700, color: '#f1f5f9', marginBottom: 4 }}>Welcome back</div>
          <div style={{ fontSize: 13, color: '#64748b', marginBottom: 28 }}>Sign in to your account</div>

          <form onSubmit={handleSubmit}>
            <label style={{ fontSize: 12, fontWeight: 500, color: '#94a3b8', marginBottom: 6, display: 'block' }}>Email address</label>
            <input
              type="email" value={email} onChange={(e) => setEmail(e.target.value)} required
              placeholder="you@example.com"
              style={{ width: '100%', background: '#0f172a', border: '1px solid #334155', borderRadius: 8, padding: '10px 14px', fontSize: 14, color: '#f1f5f9', marginBottom: 16, outline: 'none', boxSizing: 'border-box' }}
            />
            <label style={{ fontSize: 12, fontWeight: 500, color: '#94a3b8', marginBottom: 6, display: 'block' }}>Password</label>
            <input
              type="password" value={password} onChange={(e) => setPassword(e.target.value)} required
              placeholder="••••••••"
              style={{ width: '100%', background: '#0f172a', border: '1px solid #334155', borderRadius: 8, padding: '10px 14px', fontSize: 14, color: '#f1f5f9', marginBottom: 16, outline: 'none', boxSizing: 'border-box' }}
            />
            {error && (
              <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#f87171', borderRadius: 8, padding: '10px 14px', fontSize: 13, marginBottom: 16 }}>
                {error}
              </div>
            )}
            <button
              type="submit" disabled={loading}
              style={{ width: '100%', background: 'linear-gradient(135deg, #2563eb, #7c3aed)', color: 'white', border: 'none', borderRadius: 8, padding: 12, fontSize: 14, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', marginBottom: 16, opacity: loading ? 0.7 : 1 }}
            >
              {loading ? 'Signing in...' : 'Sign In →'}
            </button>
          </form>

          <div style={{ textAlign: 'center', fontSize: 13, color: '#64748b' }}>
            Don't have an account?{' '}
            <Link to="/signup" style={{ color: '#60a5fa', textDecoration: 'none' }}>Create one free</Link>
          </div>
        </div>
      </div>
    </div>
  )
}
