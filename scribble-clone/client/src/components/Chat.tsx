import React, { useState, useEffect, useRef } from 'react';
import { Socket } from 'socket.io-client';

interface ChatMessage {
  id: string;
  sender: string;
  text: string;
  type: 'chat' | 'correct' | 'system' | 'close' | 'guessed-chat';
}

interface ChatProps {
  socket: Socket;
  roomId: string;
  hasGuessed: boolean;
  isDrawer: boolean;
  gameState: string;
}

export default function Chat({ socket, roomId, hasGuessed, isDrawer, gameState }: ChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [showNewMsg, setShowNewMsg] = useState(false);

  useEffect(() => {
    const handle = (msg: ChatMessage) => setMessages(prev => [...prev, msg]);
    const handleClose = () => {
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        sender: 'System',
        text: '⚡ So close!',
        type: 'close',
      }]);
    };

    socket.on('CHAT_MESSAGE', handle);
    socket.on('CLOSE_GUESS', handleClose);
    return () => { socket.off('CHAT_MESSAGE', handle); socket.off('CLOSE_GUESS', handleClose); };
  }, [socket]);

  // Smart auto-scroll (§15.3)
  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;
    if (isAtBottom) {
      container.scrollTop = container.scrollHeight;
      setShowNewMsg(false);
    } else {
      setShowNewMsg(true);
    }
  }, [messages, isAtBottom]);

  const handleScroll = () => {
    const c = scrollRef.current;
    if (!c) return;
    setIsAtBottom(c.scrollTop >= c.scrollHeight - c.clientHeight - 50);
  };

  const scrollToBottom = () => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    setShowNewMsg(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    if (isDrawer && gameState === 'drawing') return;
    socket.emit('GUESS_WORD', { roomId, text: input });
    setInput('');
  };

  // Input placeholder per state (§15.4)
  let placeholder = 'Chat with players...';
  if (gameState === 'drawing') {
    if (isDrawer) placeholder = '';
    else if (hasGuessed) placeholder = 'You guessed it! Chat with other guessers...';
    else placeholder = 'Type your guess...';
  }

  return (
    <div className="card" style={{
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
    }}>
      <div style={{
        padding: 'var(--space-3) var(--space-4)',
        borderBottom: '1.5px solid var(--color-ink-ghost)',
        fontWeight: 800,
        fontSize: 'var(--text-sm)',
        color: 'var(--color-ink)',
      }}>
        CHAT
      </div>

      <div
        ref={scrollRef}
        onScroll={handleScroll}
        style={{
          flex: 1,
          padding: 'var(--space-3)',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--space-1)',
          position: 'relative',
        }}
      >
        {messages.map((m) => (
          <div key={m.id} className={`chat-msg chat-msg-animate ${
            m.type === 'system' ? 'chat-msg-system' :
            m.type === 'correct' ? 'chat-msg-correct' :
            m.type === 'close' ? 'chat-msg-close' : ''
          }`}>
            {m.type === 'correct' && <span>✅ </span>}
            {m.type !== 'system' && m.type !== 'correct' && (
              <span style={{ fontWeight: 700, marginRight: 'var(--space-2)', color: 'var(--color-ink-muted)' }}>
                {m.sender}:
              </span>
            )}
            {m.text}
          </div>
        ))}

        {/* New messages indicator */}
        {showNewMsg && (
          <button onClick={scrollToBottom} style={{
            position: 'sticky',
            bottom: 0,
            alignSelf: 'center',
            background: 'var(--color-accent)',
            color: 'white',
            border: 'none',
            borderRadius: 'var(--radius-full)',
            padding: '4px 12px',
            fontSize: 'var(--text-xs)',
            fontWeight: 700,
            cursor: 'pointer',
          }}>
            ↓ New messages
          </button>
        )}
      </div>

      {/* Input */}
      {isDrawer && gameState === 'drawing' ? (
        <div style={{
          padding: 'var(--space-3) var(--space-4)',
          borderTop: '1.5px solid var(--color-ink-ghost)',
          background: 'var(--color-surface-alt)',
          fontSize: 'var(--text-sm)',
          color: 'var(--color-ink-muted)',
          textAlign: 'center',
        }}>
          You're drawing! Focus on the canvas. 🖊️
        </div>
      ) : (
        <form onSubmit={handleSubmit} style={{
          padding: 'var(--space-3)',
          borderTop: '1.5px solid var(--color-ink-ghost)',
          background: 'var(--color-surface-alt)',
        }}>
          <input
            type="text"
            className="input-field"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={placeholder}
            maxLength={200}
            style={{ fontSize: 'var(--text-sm)' }}
          />
        </form>
      )}
    </div>
  );
}
