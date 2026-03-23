import { useState } from 'react';
import { Socket } from 'socket.io-client';

interface LobbyProps {
  socket: Socket;
}

export default function Lobby({ socket }: LobbyProps) {
  const [name, setName] = useState(() => localStorage.getItem('skribbl-name') || '');
  const [roomCode, setRoomCode] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('room') || '';
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Create room settings
  const [createType, setCreateType] = useState<'public' | 'private'>('private');
  const [maxPlayers, setMaxPlayers] = useState(8);
  const [rounds, setRounds] = useState(3);
  const [drawTime, setDrawTime] = useState(80);
  const [wordCount, setWordCount] = useState(3);
  const [customWordsInput, setCustomWordsInput] = useState('');
  const [customWordsOnly, setCustomWordsOnly] = useState(false);

  const saveName = (n: string) => {
    setName(n);
    localStorage.setItem('skribbl-name', n);
  };

  const handlePlayPublic = () => {
    if (!name.trim()) { setError('Please enter a name'); return; }
    setLoading(true); setError('');
    socket.emit('JOIN_PUBLIC_ROOM', name.trim(), (res: any) => {
      setLoading(false);
      if (!res?.success) setError(res?.message || 'Error finding room');
    });
  };

  const handleJoinRoom = () => {
    if (!name.trim()) { setError('Please enter a name'); return; }
    if (!roomCode.trim()) { setError('Please enter a room code'); return; }
    setLoading(true); setError('');
    socket.emit('JOIN_ROOM', { roomId: roomCode.trim(), playerName: name.trim() }, (res: any) => {
      setLoading(false);
      if (!res?.success) setError(res?.message || 'Error joining room');
    });
  };

  const handleCreateRoom = () => {
    if (!name.trim()) { setError('Please enter a name'); return; }
    setLoading(true); setError('');
    const customWords = customWordsInput.split(',').map(w => w.trim().toLowerCase()).filter(w => w);
    socket.emit('CREATE_ROOM', {
      playerName: name.trim(),
      isPublic: createType === 'public',
      settings: { maxPlayers, rounds, drawTime, wordChoiceCount: wordCount, customWords, customWordsOnly },
    }, (res: any) => {
      setLoading(false);
      if (!res?.success) setError(res?.message || 'Error creating room');
      else setShowCreateModal(false);
    });
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--color-canvas)',
      backgroundImage: 'radial-gradient(circle, var(--color-ink) 0.6px, transparent 0.6px)',
      backgroundSize: '20px 20px',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 'var(--space-8)',
    }}>
      {/* Hero Section */}
      <div style={{ textAlign: 'center', marginBottom: 'var(--space-12)' }}>
        <h1 className="font-display animate-float" style={{
          fontSize: 'var(--text-hero)',
          fontWeight: 800,
          lineHeight: 'var(--leading-tight)',
          color: 'var(--color-ink)',
        }}>
          DRAW.<br />GUESS.<br />LAUGH.
        </h1>
        <p style={{ color: 'var(--color-ink-muted)', marginTop: 'var(--space-3)', fontSize: 'var(--text-lg)' }}>
          The ultimate multiplayer drawing game
        </p>
      </div>

      {/* Main Card */}
      <div className="card-lg animate-fade-in" style={{
        padding: 'var(--space-8)',
        width: '100%',
        maxWidth: '420px',
      }}>
        {error && (
          <div style={{
            background: '#FEE2E2',
            color: 'var(--color-wrong)',
            padding: 'var(--space-3) var(--space-4)',
            borderRadius: 'var(--radius-md)',
            marginBottom: 'var(--space-6)',
            fontSize: 'var(--text-sm)',
            textAlign: 'center',
            fontWeight: 700,
          }}>
            {error}
          </div>
        )}

        {/* Name Input */}
        <div style={{ marginBottom: 'var(--space-6)' }}>
          <label style={{ display: 'block', fontSize: 'var(--text-sm)', fontWeight: 700, marginBottom: 'var(--space-1)', color: 'var(--color-ink)' }}>
            Your Name
          </label>
          <div style={{ position: 'relative' }}>
            <input
              type="text"
              className="input-field"
              placeholder="Enter your name"
              value={name}
              maxLength={16}
              onChange={(e) => saveName(e.target.value)}
              disabled={loading}
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && handlePlayPublic()}
            />
            <span style={{
              position: 'absolute', right: 'var(--space-3)', top: '50%', transform: 'translateY(-50%)',
              fontSize: 'var(--text-xs)', color: 'var(--color-ink-ghost)',
            }}>
              {name.length}/16
            </span>
          </div>
        </div>

        {/* Primary CTAs */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          <button className="btn btn-primary btn-glow" onClick={handlePlayPublic} disabled={loading} style={{ width: '100%', padding: 'var(--space-4)', fontSize: 'var(--text-lg)' }}>
            ▶ Start Playing!
          </button>
          <button className="btn btn-secondary" onClick={() => setShowCreateModal(true)} disabled={loading} style={{ width: '100%' }}>
            + Create Room
          </button>
        </div>

        {/* Divider */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)', margin: 'var(--space-6) 0' }}>
          <div style={{ flex: 1, height: '1.5px', background: 'var(--color-ink-ghost)' }} />
          <span style={{ fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--color-ink-ghost)', whiteSpace: 'nowrap' }}>OR JOIN WITH CODE</span>
          <div style={{ flex: 1, height: '1.5px', background: 'var(--color-ink-ghost)' }} />
        </div>

        {/* Join with code */}
        <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
          <input
            type="text"
            className="input-field"
            placeholder="ROOM CODE"
            value={roomCode}
            onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
            disabled={loading}
            style={{ fontFamily: 'monospace', letterSpacing: '0.15em', textTransform: 'uppercase' }}
            onKeyDown={(e) => e.key === 'Enter' && handleJoinRoom()}
          />
          <button className="btn btn-secondary" onClick={handleJoinRoom} disabled={loading} style={{ whiteSpace: 'nowrap' }}>
            Join →
          </button>
        </div>
      </div>

      {/* Create Room Modal */}
      {showCreateModal && (
        <div className="overlay-backdrop" onClick={(e) => { if (e.target === e.currentTarget) setShowCreateModal(false); }}>
          <div className="modal" style={{ padding: 'var(--space-8)' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-6)' }}>
              <h2 className="font-display" style={{ fontSize: 'var(--text-2xl)', fontWeight: 700 }}>✏️ Create a Room</h2>
              <button className="btn-ghost btn-icon btn" onClick={() => setShowCreateModal(false)} style={{ fontSize: 'var(--text-xl)' }}>✕</button>
            </div>

            {/* Room Type */}
            <div style={{ display: 'flex', gap: 'var(--space-2)', marginBottom: 'var(--space-6)' }}>
              <button className={`btn ${createType === 'public' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setCreateType('public')} style={{ flex: 1 }}>Public</button>
              <button className={`btn ${createType === 'private' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setCreateType('private')} style={{ flex: 1 }}>Private</button>
            </div>

            {/* Sliders */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
              <SliderField label="Max Players" value={maxPlayers} min={2} max={20} onChange={setMaxPlayers} />
              <SliderField label="Rounds" value={rounds} min={1} max={10} onChange={setRounds} />
              <SliderField label="Draw Time" value={drawTime} min={10} max={180} onChange={setDrawTime} suffix="s" />
              <SliderField label="Word Choices" value={wordCount} min={2} max={5} onChange={setWordCount} />

              {/* Custom Words */}
              <div>
                <label style={{ display: 'block', fontSize: 'var(--text-sm)', fontWeight: 700, marginBottom: 'var(--space-1)' }}>
                  Custom Words (optional)
                </label>
                <textarea
                  className="input-field"
                  placeholder="apple, banana, rocket ship..."
                  value={customWordsInput}
                  onChange={(e) => setCustomWordsInput(e.target.value)}
                  style={{ height: '80px', resize: 'none' }}
                />
                <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginTop: 'var(--space-2)', fontSize: 'var(--text-sm)', cursor: 'pointer' }}>
                  <input type="checkbox" checked={customWordsOnly} onChange={(e) => setCustomWordsOnly(e.target.checked)} />
                  Use custom words only
                </label>
              </div>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-3)', marginTop: 'var(--space-8)' }}>
              <button className="btn btn-ghost" onClick={() => setShowCreateModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleCreateRoom} disabled={loading}>Create Room →</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SliderField({ label, value, min, max, onChange, suffix = '' }: {
  label: string; value: number; min: number; max: number; onChange: (v: number) => void; suffix?: string;
}) {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-1)' }}>
        <label style={{ fontSize: 'var(--text-sm)', fontWeight: 700 }}>{label}</label>
        <span style={{ fontSize: 'var(--text-sm)', fontWeight: 800, color: 'var(--color-accent)' }}>{value}{suffix}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{ width: '100%', accentColor: 'var(--color-accent)' }}
      />
    </div>
  );
}
