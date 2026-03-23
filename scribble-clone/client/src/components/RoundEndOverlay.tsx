interface RoundEndOverlayProps {
  round: number;
  totalRounds: number;
  scores: { userId: string; name: string; score: number }[];
  countdown: number;
}

export default function RoundEndOverlay({ round, totalRounds, scores, countdown }: RoundEndOverlayProps) {
  const maxScore = Math.max(...scores.map(s => s.score), 1);
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
        <h2 className="font-display" style={{
          fontSize: 'var(--text-3xl)',
          fontWeight: 800,
          marginBottom: 'var(--space-6)',
          color: 'var(--color-ink)',
        }}>
          🏁 Round {round} Complete!
        </h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', marginBottom: 'var(--space-6)' }}>
          {scores.map((s, i) => (
            <div key={s.userId} className="animate-slide-in" style={{
              display: 'flex', alignItems: 'center', gap: 'var(--space-3)',
              padding: 'var(--space-2) var(--space-3)',
              borderRadius: 'var(--radius-sm)',
              background: 'var(--color-surface-alt)',
              animationDelay: `${i * 80}ms`,
              animationFillMode: 'both',
              position: 'relative',
              overflow: 'hidden',
            }}>
              {/* Score bar behind */}
              <div style={{
                position: 'absolute', left: 0, top: 0, bottom: 0,
                width: `${(s.score / maxScore) * 100}%`,
                background: 'var(--color-accent-soft)',
                opacity: 0.4,
                transition: 'width 800ms ease-out',
              }} />
              <span style={{ fontSize: 'var(--text-md)', zIndex: 1 }}>{i < 3 ? medals[i] : ' '}</span>
              <span style={{ flex: 1, fontWeight: 700, fontSize: 'var(--text-sm)', zIndex: 1 }}>{s.name}</span>
              <span style={{ fontWeight: 800, fontSize: 'var(--text-sm)', zIndex: 1 }}>
                {s.score.toLocaleString()} pts
              </span>
            </div>
          ))}
        </div>

        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-ink-muted)' }}>
          {round < totalRounds ? `Round ${round + 1} starts in ${countdown}...` : `Final results in ${countdown}...`}
        </p>
      </div>
    </div>
  );
}
