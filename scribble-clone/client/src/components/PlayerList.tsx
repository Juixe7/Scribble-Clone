import { Socket } from 'socket.io-client';

export interface Player {
  id: string;
  name: string;
  score: number;
  hasGuessed: boolean;
  isConnected: boolean;
  avatarColor?: string;
}

interface PlayerListProps {
  players: Record<string, Player>;
  hostId: string;
  socket: Socket;
  roomId: string;
  isPublic: boolean;
  myId: string;
  currentDrawerId?: string | null;
}

const AVATAR_COLORS = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FECA57', '#FF9FF3', '#54A0FF', '#5F27CD'];

export default function PlayerList({ players, hostId, socket, roomId, isPublic, myId, currentDrawerId }: PlayerListProps) {
  const playerList = Object.values(players).sort((a, b) => b.score - a.score);
  const maxScore = Math.max(...playerList.map(p => p.score), 1);

  const handleKick = (targetId: string) => {
    if (isPublic) {
      socket.emit('VOTE_KICK', roomId, targetId);
    } else {
      if (window.confirm('Kick this player?')) {
        socket.emit('KICK_PLAYER', roomId, targetId);
      }
    }
  };

  return (
    <div className="card" style={{
      padding: 'var(--space-4)',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
    }}>
      <h3 style={{
        fontWeight: 800,
        fontSize: 'var(--text-sm)',
        color: 'var(--color-ink)',
        marginBottom: 'var(--space-3)',
        paddingBottom: 'var(--space-2)',
        borderBottom: '1.5px solid var(--color-ink-ghost)',
      }}>
        PLAYERS ({playerList.length})
      </h3>

      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
        {playerList.map((player, idx) => {
          const isDrawer = player.id === currentDrawerId;
          const isHost = player.id === hostId;
          const avatarColor = player.avatarColor || AVATAR_COLORS[idx % AVATAR_COLORS.length];

          return (
            <div
              key={player.id}
              className={`${player.hasGuessed ? 'animate-correct-pop' : ''} ${player.id === myId ? 'player-self' : ''} animate-slide-in`}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-2)',
                padding: 'var(--space-2)',
                borderRadius: 'var(--radius-sm)',
                background: player.hasGuessed ? 'rgba(22, 163, 74, 0.08)' : 'var(--color-surface-alt)',
                opacity: player.isConnected ? 1 : 0.5,
                filter: player.isConnected ? 'none' : 'grayscale(1)',
                transition: 'all 300ms ease',
                position: 'relative',
              }}
            >
              {/* Avatar */}
              <div
                className={`avatar avatar-sm ${isDrawer ? 'drawing' : ''} ${player.hasGuessed ? 'guessed' : ''} ${!player.isConnected ? 'disconnected' : ''}`}
                style={{ background: avatarColor }}
              >
                {player.name.slice(0, 2)}
              </div>

              {/* Name & badges */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span className="truncate" style={{ fontWeight: 700, fontSize: 'var(--text-sm)', color: 'var(--color-ink)' }}>
                    {player.name}
                  </span>
                  {player.id === myId && <span style={{ fontSize: '10px', fontWeight: 800, color: 'var(--color-accent)', marginLeft: '2px' }}>(You)</span>}
                  {isHost && <span title="Host" style={{ fontSize: '12px' }}>⭐</span>}
                  {isDrawer && <span title="Drawing" style={{ fontSize: '12px' }}>🖊️</span>}
                  {player.hasGuessed && <span title="Guessed" style={{ fontSize: '12px' }}>✅</span>}
                  {!player.isConnected && <span title="Disconnected" style={{ fontSize: '12px' }}>🔌</span>}
                </div>

                {/* Score bar */}
                <div style={{
                  width: '100%',
                  height: '3px',
                  background: 'var(--color-surface)',
                  borderRadius: 'var(--radius-full)',
                  marginTop: '3px',
                }}>
                  <div className="score-bar" style={{
                    width: `${(player.score / maxScore) * 100}%`,
                    background: avatarColor,
                  }} />
                </div>
              </div>

              {/* Score */}
              <div style={{ fontWeight: 800, fontSize: 'var(--text-sm)', color: 'var(--color-ink)', whiteSpace: 'nowrap' }}>
                {player.score.toLocaleString()}
              </div>

              {/* Transfer Host button */}
              {!isPublic && hostId === myId && player.id !== myId && (
                <button
                  onClick={() => {
                    if (window.confirm('Transfer host to this player?')) {
                      socket.emit('TRANSFER_OWNER', roomId, player.id);
                    }
                  }}
                  className="btn"
                  style={{
                    padding: '2px 6px',
                    fontSize: 'var(--text-xs)',
                    position: 'absolute',
                    right: '32px',
                    top: '4px',
                    opacity: 0,
                    transition: 'opacity 200ms',
                    background: 'var(--color-ink)',
                    color: 'white',
                    border: '1px solid var(--color-ink)',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
                  onMouseLeave={(e) => (e.currentTarget.style.opacity = '0')}
                  title="Transfer Host"
                >
                  👑
                </button>
              )}

              {/* Kick button */}
              {player.id !== myId && ((!isPublic && hostId === myId) || isPublic) && (
                <button
                  onClick={() => handleKick(player.id)}
                  className="btn btn-danger"
                  style={{
                    padding: '2px 6px',
                    fontSize: 'var(--text-xs)',
                    position: 'absolute',
                    right: '4px',
                    top: '4px',
                    opacity: 0,
                    transition: 'opacity 200ms',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
                  onMouseLeave={(e) => (e.currentTarget.style.opacity = '0')}
                  title={isPublic ? 'Vote Kick' : 'Kick'}
                >
                  ✕
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
