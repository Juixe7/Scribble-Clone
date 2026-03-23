import { useEffect, useState, useRef } from 'react';
import Canvas from './components/Canvas';
import Lobby from './components/Lobby';
import PlayerList, { type Player } from './components/PlayerList';
import Chat from './components/Chat';
import WordSelection from './components/WordSelection';
import Timer from './components/Timer';
import TurnEndOverlay from './components/TurnEndOverlay';
import RoundEndOverlay from './components/RoundEndOverlay';
import GameEndScreen from './components/GameEndScreen';
import useSoundEffects from './hooks/useSoundEffects';
import { io, Socket } from 'socket.io-client';

// ==========================================
// TYPES (matches server payloads)
// ==========================================

interface RoomSettings {
  maxPlayers: number;
  rounds: number;
  drawTime: number;
  customWords: string[];
  customWordsOnly: boolean;
  hintCount: number;
  wordChoiceCount: number;
}

type GameState = 'waiting' | 'choosingWord' | 'drawing' | 'turnEnd' | 'roundEnd' | 'gameEnd';

interface RoomState {
  id: string;
  type: 'public' | 'private';
  inviteCode: string | null;
  ownerId: string;
  settings: RoomSettings;
  state: GameState;
  phase: 'lobby' | 'in-game';
  players: Record<string, Player>;
  currentDrawerId: string | null;
  currentWord: string | null;
  wordChoices: string[];
  wordHint: string;
  wordLength: number;
  roundStartTime: number | null;
  currentRound: number;
  startingSoonEndTime: number | null;
}

interface TurnEndData {
  word: string;
  reason: string;
  scores: { userId: string; name: string; score: number; delta: number }[];
}

interface RoundEndData {
  round: number;
  totalRounds: number;
  scores: { userId: string; name: string; score: number }[];
}

interface GameEndData {
  winner: { userId: string; name: string; score: number } | null;
  finalScores: { userId: string; name: string; score: number }[];
}

// ==========================================
// APP COMPONENT
// ==========================================

function App() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [room, setRoom] = useState<RoomState | null>(null);

  // Overlay states
  const [turnEnd, setTurnEnd] = useState<TurnEndData | null>(null);
  const [roundEnd, setRoundEnd] = useState<RoundEndData | null>(null);
  const [gameEnd, setGameEnd] = useState<GameEndData | null>(null);
  const [overlayCountdown, setOverlayCountdown] = useState(5);

  // Word selection for drawer
  const [wordChoices, setWordChoices] = useState<string[]>([]);

  // Drawing timer
  const [timeLeft, setTimeLeft] = useState(0);

  // Hint state (updated live from server)
  const [currentHint, setCurrentHint] = useState('');

  // Starting soon countdown
  const [startingSoon, setStartingSoon] = useState(false);
  const [startCountdown, setStartCountdown] = useState(0);

  // Sound effects
  const { playSound, muted, setMuted } = useSoundEffects();
  const playSoundRef = useRef(playSound);
  playSoundRef.current = playSound;

  // =====================
  // TIMER EFFECT
  // =====================
  useEffect(() => {
    if (!room || !room.roundStartTime || room.state !== 'drawing') {
      setTimeLeft(0);
      return;
    }
    const update = () => {
      const elapsed = (Date.now() - room.roundStartTime!) / 1000;
      setTimeLeft(Math.max(0, room.settings.drawTime - elapsed));
    };
    update();
    const interval = setInterval(update, 250);
    return () => clearInterval(interval);
  }, [room?.roundStartTime, room?.state, room?.settings?.drawTime]);

  // Overlay countdown timer
  useEffect(() => {
    if (!turnEnd && !roundEnd) return;
    setOverlayCountdown(5);
    const interval = setInterval(() => {
      setOverlayCountdown(c => { if (c <= 1) { clearInterval(interval); return 0; } return c - 1; });
    }, 1000);
    return () => clearInterval(interval);
  }, [turnEnd, roundEnd]);

  // Starting soon countdown
  useEffect(() => {
    if (!room?.startingSoonEndTime) { setStartingSoon(false); return; }
    setStartingSoon(true);
    const interval = setInterval(() => {
      const remaining = Math.max(0, Math.ceil((room.startingSoonEndTime! - Date.now()) / 1000));
      setStartCountdown(remaining);
      if (remaining <= 0) clearInterval(interval);
    }, 200);
    return () => clearInterval(interval);
  }, [room?.startingSoonEndTime]);

  // =====================
  // SOCKET CONNECTION
  // =====================
  useEffect(() => {
    const newSocket = io('http://localhost:3001');
    setSocket(newSocket);

    newSocket.on('connect', () => setConnected(true));
    newSocket.on('disconnect', () => { setConnected(false); setRoom(null); setTurnEnd(null); setRoundEnd(null); setGameEnd(null); });

    // Room state updates
    newSocket.on('ROOM_UPDATE', (state: RoomState) => {
      setRoom(state);
      if (state.wordHint) setCurrentHint(state.wordHint);
    });

    // Word choices for drawer
    newSocket.on('WORD_CHOICES', ({ words }: { words: string[] }) => {
      setWordChoices(words);
      playSoundRef.current('yourTurn');
    });

    newSocket.on('WORD_SELECTING', () => {
      setWordChoices([]);
    });

    // Drawing started
    newSocket.on('DRAWING_STARTED', ({ wordHint }: { wordHint: string }) => {
      setWordChoices([]);
      setTurnEnd(null);
      setRoundEnd(null);
      setCurrentHint(wordHint);
    });

    // Current word (drawer only)
    newSocket.on('CURRENT_WORD', () => {
      setWordChoices([]);
    });

    // Hint reveals
    newSocket.on('HINT_REVEALED', ({ hint }: { hint: string }) => {
      setCurrentHint(hint);
    });

    // Turn end overlay
    newSocket.on('TURN_END', (data: TurnEndData) => {
      setTurnEnd(data);
      setRoundEnd(null);
      playSoundRef.current('turnEnd');
    });

    // Round end overlay
    newSocket.on('ROUND_END', (data: RoundEndData) => {
      setTurnEnd(null);
      setRoundEnd(data);
    });

    // Game end
    newSocket.on('GAME_END', (data: GameEndData) => {
      setTurnEnd(null);
      setRoundEnd(null);
      setGameEnd(data);
      playSoundRef.current('gameEnd');
    });

    // Game started
    newSocket.on('GAME_STARTED', () => {
      setGameEnd(null);
      setTurnEnd(null);
      setRoundEnd(null);
      setStartingSoon(false);
      playSoundRef.current('roundStart');
    });

    // Starting soon
    newSocket.on('STARTING_SOON', () => {
      setStartingSoon(true);
    });

    newSocket.on('AUTO_START_CANCELLED', () => {
      setStartingSoon(false);
    });

    newSocket.on('OWNER_TRANSFERRED', () => {
      // room state update handles the rest
    });

    // Kicked
    newSocket.on('KICKED', () => {
      setRoom(null);
      setGameEnd(null);
      setTurnEnd(null);
      setRoundEnd(null);
    });

    newSocket.on('CORRECT_GUESS', () => {
      playSoundRef.current('correctGuess');
    });

    newSocket.on('CLOSE_GUESS', () => {
      playSoundRef.current('closeGuess');
    });

    newSocket.on('PLAYER_JOINED', () => {
      playSoundRef.current('playerJoined');
    });

    newSocket.on('PLAYER_LEFT', () => {
      playSoundRef.current('playerLeft');
    });

    return () => { newSocket.close(); };
  }, []);

  // == Derived state ==
  const myId = socket?.id ?? '';
  const isDrawer = room?.currentDrawerId === myId;
  const isOwner = room?.ownerId === myId;

  // Word display in topbar
  const getWordDisplay = () => {
    if (!room) return '';
    if (room.state === 'drawing') {
      if (isDrawer && room.currentWord) return room.currentWord.toUpperCase();
      return currentHint || '';
    }
    if (room.state === 'choosingWord') return '...';
    return '';
  };

  const getDrawerName = () => {
    if (!room?.currentDrawerId) return '';
    return room.players[room.currentDrawerId]?.name || '';
  };

  const copyInviteCode = () => {
    if (room?.inviteCode) {
      navigator.clipboard.writeText(room.inviteCode);
    }
  };

  const handleLeaveRoom = () => {
    if (!room || !socket) return;
    socket.emit('LEAVE_ROOM', room.id);
    setRoom(null);
    setGameEnd(null);
    setTurnEnd(null);
    setRoundEnd(null);
    setWordChoices([]);
  };

  // =====================
  // RENDER
  // =====================

  // Lobby / Landing screen
  if (!socket || !connected || !room) {
    return <Lobby socket={socket!} />;
  }

  // Game view
  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--color-canvas)',
      display: 'flex',
      flexDirection: 'column',
      padding: 'var(--space-3)',
      gap: 'var(--space-3)',
    }}>
      {/* ======= TOPBAR ======= */}
      <div className="topbar">
        {/* Left: round info + status */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', minWidth: '180px' }}>
          {room.phase === 'in-game' && (
            <div style={{
              background: 'var(--color-accent-soft)',
              padding: '4px 10px',
              borderRadius: 'var(--radius-full)',
              fontSize: 'var(--text-xs)',
              fontWeight: 800,
              color: 'var(--color-accent)',
              border: '1.5px solid var(--color-accent)',
            }}>
              Round {room.currentRound}/{room.settings.rounds}
            </div>
          )}

          <span style={{ fontSize: 'var(--text-sm)', fontWeight: 700, color: 'var(--color-ink-muted)' }}>
            {room.id}
          </span>

          {room.type === 'private' && room.inviteCode && (
            <button className="btn btn-ghost" onClick={copyInviteCode} style={{
              padding: '3px 8px', fontSize: 'var(--text-xs)',
            }}>
              📋 {room.inviteCode}
            </button>
          )}

          {isOwner && room.type === 'private' && room.state === 'waiting' && (
            <button className="btn btn-primary" onClick={() => socket.emit('START_GAME', room.id)} style={{
              padding: '4px 12px', fontSize: 'var(--text-sm)',
            }}>
              ▶ Start
            </button>
          )}
        </div>

        {/* Center: word / drawer info */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          {room.state === 'drawing' && (
            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-ink-muted)', fontWeight: 600, marginBottom: '2px' }}>
              {isDrawer ? 'You are drawing' : `${getDrawerName()} is drawing`}
            </div>
          )}
          {room.state === 'choosingWord' && (
            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-ink-muted)', fontWeight: 600, marginBottom: '2px' }}>
              {isDrawer ? 'Choose a word!' : `${getDrawerName()} is choosing...`}
            </div>
          )}
          {(room.state === 'drawing' || room.state === 'choosingWord') && (
            <div className="word-hint">
              {getWordDisplay()}
            </div>
          )}
          {room.state === 'waiting' && room.phase === 'lobby' && (
            <span style={{ fontWeight: 700, color: 'var(--color-ink-muted)', fontSize: 'var(--text-sm)' }}>
              {startingSoon ? `Starting in ${startCountdown}...` : 'Waiting for players...'}
            </span>
          )}
        </div>

        {/* Right: timer + controls */}
        <div style={{ minWidth: '120px', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 'var(--space-2)' }}>
          {room.state === 'drawing' && (
            <Timer timeRemaining={timeLeft} totalTime={room.settings.drawTime} />
          )}
          <button
            className="btn btn-ghost btn-icon"
            onClick={() => setMuted(!muted)}
            title={muted ? 'Unmute' : 'Mute'}
            style={{ fontSize: 'var(--text-lg)', padding: '4px', width: '32px', height: '32px' }}
          >
            {muted ? '🔇' : '🔊'}
          </button>
          <button
            className="btn btn-ghost"
            onClick={handleLeaveRoom}
            title="Leave Room"
            style={{ fontSize: 'var(--text-xs)', padding: '4px 8px', color: 'var(--color-wrong)' }}
          >
            🚪 Leave
          </button>
        </div>
      </div>

      {/* ======= MAIN GAME AREA ======= */}
      <div style={{ flex: 1, display: 'flex', gap: 'var(--space-3)', minHeight: 0 }}>
        {/* Left: Player list */}
        <div style={{ width: '240px', flexShrink: 0, height: '100%' }}>
          <PlayerList
            players={room.players}
            hostId={room.ownerId}
            socket={socket}
            roomId={room.id}
            isPublic={room.type === 'public'}
            myId={myId}
            currentDrawerId={room.currentDrawerId}
          />
        </div>

        {/* Center: Canvas area */}
        <div style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
          overflow: 'hidden',
        }}>
          <div className={`card ${room.state === 'drawing' ? 'canvas-drawing-active' : ''}`} style={{ flex: 1, padding: 'var(--space-3)', display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}>
            <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', position: 'relative' }}>
              <Canvas socket={socket} roomId={room.id} isDrawer={isDrawer && room.state === 'drawing'} />

              {/* Word selection overlay (drawer only) */}
              {room.state === 'choosingWord' && isDrawer && wordChoices.length > 0 && (
                <WordSelection socket={socket} roomId={room.id} words={wordChoices} />
              )}

              {/* Choosing word overlay (non-drawer) */}
              {room.state === 'choosingWord' && !isDrawer && (
                <div style={{
                  position: 'absolute', inset: 0, zIndex: 10,
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  background: 'rgba(255,255,255,0.95)',
                  borderRadius: 'var(--radius-lg)',
                }}>
                  <div className="font-display animate-fade-in" style={{
                    fontSize: 'var(--text-2xl)',
                    fontWeight: 800,
                    color: 'var(--color-ink)',
                  }}>
                    ✏️ {getDrawerName()} is choosing...
                  </div>
                </div>
              )}

              {/* Lobby overlay */}
              {room.state === 'waiting' && room.phase === 'lobby' && (
                <div style={{
                  position: 'absolute', inset: 0, zIndex: 10,
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  background: 'rgba(255,255,255,0.95)',
                  borderRadius: 'var(--radius-lg)',
                  gap: 'var(--space-4)',
                }}>
                  {isOwner && room.type === 'private' ? (
                    <>
                      <h2 className="font-display" style={{ fontSize: 'var(--text-3xl)', fontWeight: 800 }}>
                        ⚙️ Room Settings
                      </h2>
                      <div style={{ width: '100%', maxWidth: '320px', display: 'flex', flexDirection: 'column', gap: 'var(--space-4)', padding: 'var(--space-4)' }}>
                        <SettingsRow label="Rounds" value={room.settings.rounds} options={[1,2,3,4,5,6,7,8,9,10]}
                          onChange={(v) => socket.emit('UPDATE_SETTINGS', room.id, { rounds: v })} />
                        <SettingsRow label="Draw Time" value={room.settings.drawTime} options={[30,45,60,80,100,120,150,180]}
                          onChange={(v) => socket.emit('UPDATE_SETTINGS', room.id, { drawTime: v })} suffix="s" />
                      </div>
                      {room.inviteCode && (
                        <div style={{ textAlign: 'center' }}>
                          <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-ink-muted)', marginBottom: 'var(--space-1)' }}>Share this code:</p>
                          <button className="btn btn-secondary" onClick={copyInviteCode} style={{ fontFamily: 'monospace', letterSpacing: '0.15em', fontSize: 'var(--text-lg)' }}>
                            📋 {room.inviteCode}
                          </button>
                        </div>
                      )}
                    </>
                  ) : (
                    <>
                      <div className="font-display animate-fade-in" style={{ fontSize: 'var(--text-3xl)', fontWeight: 800 }}>
                        {startingSoon ? '🚀 Game starts in' : '⏳ Waiting for more players...'}
                      </div>
                      {startingSoon && (
                        <div style={{
                          fontSize: 'var(--text-4xl)', fontWeight: 800,
                          color: 'var(--color-accent)',
                        }}>
                          0:{String(startCountdown).padStart(2, '0')}
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

              {/* Turn end overlay */}
              {turnEnd && room.state === 'turnEnd' && (
                <TurnEndOverlay
                  word={turnEnd.word}
                  reason={turnEnd.reason}
                  scores={turnEnd.scores}
                  countdown={overlayCountdown}
                />
              )}

              {/* Round end overlay */}
              {roundEnd && room.state === 'roundEnd' && (
                <RoundEndOverlay
                  round={roundEnd.round}
                  totalRounds={roundEnd.totalRounds}
                  scores={roundEnd.scores}
                  countdown={overlayCountdown}
                />
              )}

              {/* Game end screen */}
              {gameEnd && room.state === 'gameEnd' && (
                <GameEndScreen
                  scores={gameEnd.finalScores}
                  socket={socket}
                  roomId={room.id}
                  isOwner={isOwner}
                />
              )}
            </div>
          </div>
        </div>

        {/* Right: Chat */}
        <div style={{ width: '280px', flexShrink: 0, height: '100%' }}>
          <Chat
            socket={socket}
            roomId={room.id}
            hasGuessed={room.players[myId]?.hasGuessed || false}
            isDrawer={isDrawer}
            gameState={room.state}
          />
        </div>
      </div>
    </div>
  );
}

// Settings dropdown row
function SettingsRow({ label, value, options, onChange, suffix = '' }: {
  label: string; value: number; options: number[]; onChange: (v: number) => void; suffix?: string;
}) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <label style={{ fontWeight: 700, fontSize: 'var(--text-sm)' }}>{label}</label>
      <select
        className="input-field"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{ width: '100px', fontSize: 'var(--text-sm)' }}
      >
        {options.map(o => <option key={o} value={o}>{o}{suffix}</option>)}
      </select>
    </div>
  );
}

export default App;
