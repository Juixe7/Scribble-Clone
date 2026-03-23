interface TurnEndOverlayProps {
  word: string;
  reason: string;
  scores: { userId: string; name: string; score: number; delta: number }[];
  countdown: number;
}

export default function TurnEndOverlay({ word, reason, scores, countdown }: TurnEndOverlayProps) {
  let headerText = 'The word was...';
  let headerEmoji = '';
  if (reason === 'drawerLeft') { headerText = '⚠️ The drawer left! Word was:'; }
  if (reason === 'allGuessed') { headerText = '🎉 Everyone guessed it!'; }

  const medals = ['🥇', '🥈', '🥉'];

  return (
    <div style={{
      position: 'absolute', inset: 0, zIndex: 40,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(0,0,0,0.6)',
      backdropFilter: 'blur(4px)',
      borderRadius: 'var(--radius-lg)',
    }}>
      <div className="card-xl animate-scale-up" style={{
        padding: 'var(--space-8)',
        maxWidth: '480px',
        width: '90%',
        textAlign: 'center',
      }}>
        <p style={{ fontSize: 'var(--text-lg)', color: 'var(--color-ink-muted)', marginBottom: 'var(--space-3)' }}>
          {headerText}
        </p>

        {/* Word reveal */}
        <div className="animate-bounce-in" style={{
          display: 'inline-block',
          padding: 'var(--space-3) var(--space-6)',
          background: 'var(--color-accent-soft)',
          border: '2.5px solid var(--color-accent)',
          borderRadius: 'var(--radius-lg)',
          marginBottom: 'var(--space-6)',
        }}>
          <span className="font-display" style={{
            fontSize: 'var(--text-3xl)',
            fontWeight: 800,
            color: 'var(--color-accent)',
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
          }}>
            {word}
          </span>
        </div>

        {/* Scores */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', marginBottom: 'var(--space-6)' }}>
          {scores.map((s, i) => (
            <div key={s.userId} className="animate-slide-in" style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: 'var(--space-2) var(--space-3)',
              background: s.delta > 0 ? 'rgba(22,163,74,0.06)' : 'var(--color-surface-alt)',
              borderRadius: 'var(--radius-sm)',
              animationDelay: `${i * 80}ms`,
              animationFillMode: 'both',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                <span style={{ fontSize: 'var(--text-md)' }}>{i < 3 ? medals[i] : '✕'}</span>
                <span style={{ fontWeight: 700, fontSize: 'var(--text-sm)' }}>{s.name}</span>
              </div>
              <span style={{
                fontWeight: 800,
                fontSize: 'var(--text-sm)',
                color: s.delta > 0 ? 'var(--color-correct)' : 'var(--color-ink-muted)',
              }}>
                +{s.delta}
              </span>
            </div>
          ))}
        </div>

        {/* Countdown */}
        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-ink-muted)' }}>
          Next turn in {countdown}...
        </p>
      </div>
    </div>
  );
}
