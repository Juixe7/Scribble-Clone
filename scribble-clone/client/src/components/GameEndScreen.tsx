import { Socket } from 'socket.io-client';

interface GameEndScreenProps {
  scores: { userId: string; name: string; score: number }[];
  socket: Socket;
  roomId: string;
  isOwner: boolean;
}

export default function GameEndScreen({ scores, socket, roomId, isOwner }: GameEndScreenProps) {
  const winner = scores[0];
  const maxScore = winner?.score || 1;

  return (
    <div style={{
      position: 'absolute', inset: 0, zIndex: 50,
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      background: 'var(--color-ink)',
      borderRadius: 'var(--radius-lg)',
      padding: 'var(--space-8)',
      overflow: 'auto',
    }}>
      {/* Confetti particles (CSS only) */}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
        {Array.from({ length: 40 }).map((_, i) => (
          <div key={i} style={{
            position: 'absolute',
            left: `${Math.random() * 100}%`,
            top: '-5%',
            width: `${4 + Math.random() * 8}px`,
            height: `${4 + Math.random() * 8}px`,
            background: ['#FF6B6B','#4ECDC4','#FECA57','#FF9FF3','#54A0FF','#FF4D1C','#16A34A','#5F27CD'][i % 8],
            borderRadius: Math.random() > 0.5 ? '50%' : '2px',
            animation: `confettiFall ${2 + Math.random() * 3}s linear ${Math.random() * 2}s infinite`,
          }} />
        ))}
      </div>

      <h1 className="font-display animate-bounce-in" style={{
        fontSize: 'var(--text-4xl)',
        fontWeight: 800,
        color: '#FECA57',
        marginBottom: 'var(--space-10)',
        textShadow: '2px 2px 0px rgba(0,0,0,0.3)',
      }}>
        🎉 GAME OVER!
      </h1>

      {/* Winner */}
      {winner && (
        <div className="animate-bounce-in" style={{
          textAlign: 'center',
          marginBottom: 'var(--space-10)',
          animationDelay: '200ms',
          animationFillMode: 'both',
        }}>
          <div style={{ fontSize: 'var(--text-xl)', color: '#FECA57', fontWeight: 800, marginBottom: 'var(--space-2)' }}>
            🏆 WINNER
          </div>
          <div style={{
            width: '80px', height: '80px', borderRadius: '50%',
            background: '#FECA57',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto var(--space-3)',
            fontSize: 'var(--text-3xl)', fontWeight: 800, color: 'var(--color-ink)',
            border: '3px solid white',
            boxShadow: '0 0 20px rgba(254, 202, 87, 0.5)',
          }}>
            {winner.name.slice(0, 2).toUpperCase()}
          </div>
          <div style={{ fontSize: 'var(--text-2xl)', fontWeight: 800, color: 'white' }}>{winner.name}</div>
          <div style={{ fontSize: 'var(--text-lg)', color: 'rgba(255,255,255,0.7)', fontWeight: 700 }}>
            {winner.score.toLocaleString()} pts
          </div>
        </div>
      )}

      {/* Full rankings */}
      <div style={{
        width: '100%', maxWidth: '400px',
        display: 'flex', flexDirection: 'column', gap: 'var(--space-2)',
        marginBottom: 'var(--space-8)',
      }}>
        {scores.map((s, i) => {
          const medals = ['🥇', '🥈', '🥉'];
          return (
            <div key={s.userId} className="animate-slide-in" style={{
              display: 'flex', alignItems: 'center', gap: 'var(--space-3)',
              padding: 'var(--space-2) var(--space-3)',
              background: 'rgba(255,255,255,0.08)',
              borderRadius: 'var(--radius-sm)',
              animationDelay: `${400 + i * 100}ms`,
              animationFillMode: 'both',
              position: 'relative',
              overflow: 'hidden',
            }}>
              <div style={{
                position: 'absolute', left: 0, top: 0, bottom: 0,
                width: `${(s.score / maxScore) * 100}%`,
                background: ['#FECA57','#C0C0C0','#CD7F32','rgba(255,255,255,0.1)'][Math.min(i, 3)],
                opacity: 0.15,
                transition: 'width 800ms ease-out',
                transitionDelay: `${600 + i * 100}ms`,
              }} />
              <span style={{ fontSize: 'var(--text-md)', zIndex: 1 }}>{i < 3 ? medals[i] : `#${i + 1}`}</span>
              <span style={{ flex: 1, fontWeight: 700, color: 'white', zIndex: 1 }}>{s.name}</span>
              <span style={{ fontWeight: 800, color: 'rgba(255,255,255,0.7)', zIndex: 1 }}>
                {s.score.toLocaleString()}
              </span>
            </div>
          );
        })}
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
        {isOwner && (
          <button
            className="btn btn-primary"
            onClick={() => socket.emit('PLAY_AGAIN', roomId)}
            style={{ fontSize: 'var(--text-lg)', padding: 'var(--space-4) var(--space-8)' }}
          >
            🔄 Play Again
          </button>
        )}
        <button
          className="btn btn-ghost"
          onClick={() => window.location.reload()}
          style={{ color: 'rgba(255,255,255,0.6)', borderColor: 'rgba(255,255,255,0.2)' }}
        >
          🚪 Leave Room
        </button>
      </div>
    </div>
  );
}
