import { useState, useEffect } from 'react';
import { Socket } from 'socket.io-client';

interface WordSelectionProps {
  socket: Socket;
  roomId: string;
  words: string[];
}

export default function WordSelection({ socket, roomId, words }: WordSelectionProps) {
  const [timeLeft, setTimeLeft] = useState(15);
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    setTimeLeft(15);
    setSelected(null);
    const interval = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) { clearInterval(interval); return 0; }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [words]);

  const handleSelect = (word: string) => {
    if (selected) return;
    setSelected(word);
    socket.emit('SELECT_WORD', { roomId, word });
  };

  if (!words || words.length === 0) return null;

  return (
    <div style={{
      position: 'absolute', inset: 0, zIndex: 50,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(0,0,0,0.6)',
      backdropFilter: 'blur(2px)',
      borderRadius: 'var(--radius-lg)',
    }}>
      <div className="card-xl animate-scale-up" style={{
        padding: 'var(--space-8)',
        maxWidth: '500px',
        width: '90%',
        textAlign: 'center',
      }}>
        <h3 className="font-display" style={{
          fontSize: 'var(--text-2xl)',
          fontWeight: 800,
          marginBottom: 'var(--space-2)',
          color: 'var(--color-ink)',
        }}>
          Choose your word!
        </h3>

        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 'var(--space-2)',
          marginBottom: 'var(--space-6)',
        }}>
          <span style={{ fontSize: 'var(--text-lg)' }}>⏱</span>
          <span style={{
            fontWeight: 800,
            fontSize: 'var(--text-xl)',
            color: timeLeft <= 5 ? 'var(--color-wrong)' : timeLeft <= 10 ? 'var(--color-warning)' : 'var(--color-ink)',
          }}>
            {timeLeft}s
          </span>
        </div>

        <div style={{ display: 'flex', gap: 'var(--space-4)', justifyContent: 'center', flexWrap: 'wrap' }}>
          {words.map((w) => (
            <button
              key={w}
              onClick={() => handleSelect(w)}
              disabled={!!selected}
              style={{
                width: '140px',
                height: '72px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: selected === w ? 'var(--color-accent)' : 'var(--color-surface)',
                color: selected === w ? 'white' : 'var(--color-ink)',
                border: `2.5px solid ${selected === w ? 'var(--color-accent)' : 'var(--color-ink)'}`,
                borderRadius: 'var(--radius-lg)',
                boxShadow: 'var(--shadow-card-lg)',
                fontFamily: 'var(--font-body)',
                fontWeight: 800,
                fontSize: 'var(--text-xl)',
                cursor: selected ? 'default' : 'pointer',
                transition: 'all 150ms cubic-bezier(0.34, 1.56, 0.64, 1)',
                transform: selected === w ? 'scale(1.05)' : 'none',
                textTransform: 'capitalize',
              }}
              onMouseEnter={(e) => { if (!selected) { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '5px 8px 0px var(--color-ink)'; }}}
              onMouseLeave={(e) => { if (!selected) { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'var(--shadow-card-lg)'; }}}
            >
              {w}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
