import { useEffect, useRef, useState } from 'react'
import { renderMarkdown } from '../utils/markdown'

const WELCOME_MSG = {
  role: 'assistant',
  content: 'Hello! I\'m your **Architecture AI** assistant.\n\n- Generate diagrams from your system description\n- Answer architecture and system design questions\n- Explain patterns, services, and infrastructure\n\nDescribe a system to build, or ask me anything about software architecture!',
}

const SUGGESTIONS = [
  'Design a microservices e-commerce platform on AWS',
  'What is the difference between SQL and NoSQL?',
  'Build a real-time chat app with WebSockets',
]

export default function InitialChatBox({ history, loading, generatingStep, onSend }) {
  const [input, setInput] = useState('')
  const bottomRef = useRef(null)
  const textareaRef = useRef(null)

  useEffect(() => {
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
  }, [history, loading])

  const send = () => {
    const msg = input.trim()
    if (!msg || loading) return
    setInput('')
    if (textareaRef.current) textareaRef.current.style.height = 'auto'
    onSend(msg)
  }

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
  }

  const handleInput = (e) => {
    setInput(e.target.value)
    e.target.style.height = 'auto'
    e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px'
  }

  const messages = history.length > 0 ? history : [WELCOME_MSG]

  return (
    <div style={{
      height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: '#0f172a', position: 'relative', overflow: 'hidden',
    }}>
      {/* Background glows */}
      <div style={{ position: 'absolute', top: '15%', left: '25%', width: 500, height: 500, background: 'radial-gradient(circle, rgba(124,58,237,0.08) 0%, transparent 70%)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: '10%', right: '20%', width: 400, height: 400, background: 'radial-gradient(circle, rgba(37,99,235,0.07) 0%, transparent 70%)', pointerEvents: 'none' }} />

      {/* Card */}
      <div style={{
        position: 'relative', zIndex: 1,
        width: 'min(680px, 90vw)', height: 'min(680px, 82vh)',
        display: 'flex', flexDirection: 'column',
        background: 'rgba(15,23,42,0.95)',
        border: '1px solid rgba(99,116,143,0.2)',
        borderRadius: 24,
        boxShadow: '0 30px 60px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.04)',
        overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid rgba(51,65,85,0.5)', background: 'rgba(30,41,59,0.5)', flexShrink: 0, textAlign: 'center' }}>
          <div style={{ width: 48, height: 48, borderRadius: 14, margin: '0 auto 12px', background: 'linear-gradient(135deg,#2563eb,#7c3aed)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, boxShadow: '0 4px 20px rgba(124,58,237,0.45)' }}>⚡</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#f1f5f9', letterSpacing: '-0.02em' }}>Architecture AI</div>
          <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>Design systems · Explore patterns · Generate diagrams</div>
        </div>

        {/* Messages */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          {messages.map((msg, i) => (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
              <div style={{ fontSize: 10, color: '#475569', marginBottom: 5, fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                {msg.role === 'user' ? 'You' : 'Architecture AI'}
              </div>
              {msg.role === 'user' ? (
                <div style={{ background: 'linear-gradient(135deg,#2563eb,#7c3aed)', color: 'white', padding: '10px 16px', borderRadius: '18px 18px 4px 18px', fontSize: 13, lineHeight: 1.65, maxWidth: '80%', boxShadow: '0 2px 12px rgba(37,99,235,0.3)' }}>
                  {msg.content}
                </div>
              ) : (
                <div style={{ background: 'rgba(30,41,59,0.9)', border: '1px solid rgba(51,65,85,0.7)', padding: '12px 16px', borderRadius: '4px 18px 18px 18px', maxWidth: '92%' }}>
                  {renderMarkdown(msg.content)}
                </div>
              )}
            </div>
          ))}

          {/* Suggestion chips — only on first load */}
          {history.length === 0 && !loading && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, paddingTop: 4 }}>
              {SUGGESTIONS.map((s, i) => (
                <button key={i} onClick={() => onSend(s)} style={{ alignSelf: 'flex-start', background: 'rgba(37,99,235,0.08)', border: '1px solid rgba(37,99,235,0.2)', borderRadius: 12, padding: '7px 14px', fontSize: 12, color: '#93c5fd', cursor: 'pointer', textAlign: 'left', fontFamily: 'system-ui' }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(37,99,235,0.15)'; e.currentTarget.style.borderColor = 'rgba(37,99,235,0.4)' }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'rgba(37,99,235,0.08)'; e.currentTarget.style.borderColor = 'rgba(37,99,235,0.2)' }}>
                  {s}
                </button>
              ))}
            </div>
          )}

          {/* Loading / generating indicator */}
          {loading && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
              <div style={{ fontSize: 10, color: '#475569', marginBottom: 5, fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase' }}>Architecture AI</div>
              <div style={{ background: 'rgba(30,41,59,0.9)', border: '1px solid rgba(51,65,85,0.7)', padding: '12px 16px', borderRadius: '4px 18px 18px 18px' }}>
                <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
                  {[0, 150, 300].map(d => (
                    <div key={d} style={{ width: 7, height: 7, borderRadius: '50%', background: 'linear-gradient(135deg,#2563eb,#7c3aed)', animation: 'icbounce 1.2s ease-in-out infinite', animationDelay: `${d}ms` }} />
                  ))}
                </div>
                {generatingStep && (
                  <div style={{ fontSize: 11, color: '#64748b', marginTop: 6, display: 'flex', alignItems: 'center', gap: 5 }}>
                    <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#34d399', animation: 'icpulse 1s ease-in-out infinite' }} />
                    {generatingStep}
                  </div>
                )}
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div style={{ padding: '12px 16px 14px', borderTop: '1px solid rgba(51,65,85,0.5)', background: 'rgba(30,41,59,0.4)', flexShrink: 0 }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
            <textarea ref={textareaRef} value={input} onChange={handleInput} onKeyDown={handleKey} disabled={loading} rows={1}
              placeholder="Describe your architecture, or ask about system design..."
              style={{ flex: 1, resize: 'none', background: 'rgba(15,23,42,0.8)', border: '1px solid rgba(51,65,85,0.8)', borderRadius: 14, padding: '10px 14px', fontSize: 13, color: '#f1f5f9', outline: 'none', lineHeight: 1.6, minHeight: 42, maxHeight: 120, fontFamily: 'system-ui', overflow: 'hidden', transition: 'border-color 0.2s' }}
              onFocus={e => { e.target.style.borderColor = 'rgba(124,58,237,0.5)' }}
              onBlur={e => { e.target.style.borderColor = 'rgba(51,65,85,0.8)' }}
            />
            <button onClick={send} disabled={loading || !input.trim()} style={{ width: 42, height: 42, flexShrink: 0, background: !loading && input.trim() ? 'linear-gradient(135deg,#2563eb,#7c3aed)' : 'rgba(30,41,59,0.8)', border: '1px solid ' + (!loading && input.trim() ? 'transparent' : 'rgba(51,65,85,0.6)'), borderRadius: 12, cursor: !loading && input.trim() ? 'pointer' : 'not-allowed', color: !loading && input.trim() ? 'white' : '#475569', fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}>↑</button>
          </div>
          <div style={{ fontSize: 10, color: '#334155', marginTop: 6, textAlign: 'center' }}>Enter to send · Shift+Enter for new line</div>
        </div>
      </div>

      <style>{`
        @keyframes icbounce {
          0%, 60%, 100% { transform: translateY(0); opacity: 1; }
          30% { transform: translateY(-6px); opacity: 0.7; }
        }
        @keyframes icpulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.4; transform: scale(0.8); }
        }
      `}</style>
    </div>
  )
}
