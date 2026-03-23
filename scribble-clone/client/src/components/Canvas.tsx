import React, { useEffect, useRef, useState } from 'react';
import { Socket } from 'socket.io-client';
import { v4 as uuidv4 } from 'uuid';

interface CanvasProps {
  socket: Socket;
  roomId: string;
  isDrawer: boolean;
}

interface Point { x: number; y: number; }
interface StrokeBatch {
  actionId: string;
  type: 'STROKE';
  tool: 'pencil' | 'eraser';
  color: string;
  width: number;
  points: Point[];
}

const COLORS = [
  '#000000', '#FFFFFF', '#808080', '#C0C0C0',
  '#FF0000', '#FF6B6B', '#FF4D1C', '#FF9800',
  '#FFEB3B', '#FECA57', '#4CAF50', '#16A34A',
  '#2196F3', '#2563EB', '#9C27B0', '#5F27CD',
  '#FF9FF3', '#795548', '#607D8B', '#4ECDC4',
  '#45B7D1', '#E91E63', '#96CEB4', '#1A1A18',
];

export default function Canvas({ socket, roomId, isDrawer }: CanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState('#000000');
  const [lineWidth, setLineWidth] = useState(5);
  const [tool, setTool] = useState<'pencil' | 'eraser'>('pencil');
  const [showColors, setShowColors] = useState(false);

  const INTERNAL_W = 800;
  const INTERNAL_H = 600;

  const currentActionId = useRef<string>('');
  const pointsBatch = useRef<Point[]>([]);
  const lastEmitTime = useRef<number>(0);

  const drawLine = (ctx: CanvasRenderingContext2D, start: Point, end: Point, c: string, w: number, isEraser: boolean) => {
    ctx.strokeStyle = isEraser ? '#ffffff' : c;
    ctx.lineWidth = w;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(start.x, start.y);
    ctx.lineTo(end.x, end.y);
    ctx.stroke();
  };

  const drawQuadCurve = (ctx: CanvasRenderingContext2D, points: Point[], c: string, w: number, isEraser: boolean) => {
    if (points.length < 2) return;
    ctx.strokeStyle = isEraser ? '#ffffff' : c;
    ctx.lineWidth = w;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length - 1; i++) {
      const xc = (points[i].x + points[i + 1].x) / 2;
      const yc = (points[i].y + points[i + 1].y) / 2;
      ctx.quadraticCurveTo(points[i].x, points[i].y, xc, yc);
    }
    ctx.lineTo(points[points.length - 1].x, points[points.length - 1].y);
    ctx.stroke();
  };

  useEffect(() => {
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, INTERNAL_W, INTERNAL_H);

    const handleBatch = (batch: StrokeBatch) => {
      if (batch.points.length > 0) {
        drawQuadCurve(ctx, batch.points, batch.color, batch.width, batch.tool === 'eraser');
      }
    };

    const handleClear = () => {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, INTERNAL_W, INTERNAL_H);
    };

    socket.on('DRAW_STROKES_BATCH', handleBatch);
    socket.on('CLEAR_CANVAS', handleClear);

    return () => {
      socket.off('DRAW_STROKES_BATCH', handleBatch);
      socket.off('CLEAR_CANVAS', handleClear);
    };
  }, [socket]);

  const getCoords = (e: React.PointerEvent<HTMLCanvasElement>): Point | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) * (INTERNAL_W / rect.width),
      y: (e.clientY - rect.top) * (INTERNAL_H / rect.height),
    };
  };

  const startDrawing = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawer) return;
    const pos = getCoords(e);
    if (!pos) return;
    setIsDrawing(true);
    currentActionId.current = uuidv4();
    pointsBatch.current = [pos];
    lastEmitTime.current = Date.now();
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx) drawLine(ctx, pos, pos, color, lineWidth, tool === 'eraser');
  };

  const draw = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !isDrawer) return;
    const pos = getCoords(e);
    if (!pos) return;
    const lastPos = pointsBatch.current[pointsBatch.current.length - 1];
    pointsBatch.current.push(pos);
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx) drawLine(ctx, lastPos, pos, color, lineWidth, tool === 'eraser');
    const now = Date.now();
    if (now - lastEmitTime.current >= 16) {
      emitBatch();
      lastEmitTime.current = now;
      pointsBatch.current = [pos];
    }
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    if (pointsBatch.current.length > 0) emitBatch();
    pointsBatch.current = [];
  };

  const emitBatch = () => {
    if (pointsBatch.current.length === 0) return;
    socket.emit('DRAW_STROKES_BATCH', {
      roomId,
      batch: { actionId: currentActionId.current, type: 'STROKE', tool, color, width: lineWidth, points: [...pointsBatch.current] },
    });
  };

  const handleClear = () => {
    if (!isDrawer) return;
    socket.emit('CLEAR_CANVAS', roomId);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', width: '100%' }}>
      <div className="canvas-container" style={{ cursor: isDrawer ? 'crosshair' : 'default' }}>
        <canvas
          ref={canvasRef}
          width={INTERNAL_W}
          height={INTERNAL_H}
          onPointerDown={startDrawing}
          onPointerMove={draw}
          onPointerUp={stopDrawing}
          onPointerOut={stopDrawing}
        />
        {/* Non-drawer click blocker */}
        {!isDrawer && (
          <div style={{
            position: 'absolute', inset: 0,
            cursor: 'default',
            zIndex: 2,
          }} />
        )}
      </div>

      {/* Toolbar — only for drawer (§7.4) */}
      {isDrawer && (
        <div className="toolbar" style={{ justifyContent: 'center', position: 'relative' }}>
          {/* Tools */}
          <button className={`toolbar-btn ${tool === 'pencil' ? 'active' : ''}`} onClick={() => setTool('pencil')} title="Pen">✏️</button>
          <button className={`toolbar-btn ${tool === 'eraser' ? 'active' : ''}`} onClick={() => setTool('eraser')} title="Eraser">🧹</button>

          <div className="toolbar-divider" />

          {/* Color picker */}
          <button
            className="toolbar-btn"
            onClick={() => setShowColors(!showColors)}
            title="Colors"
            style={{ position: 'relative' }}
          >
            <div style={{
              width: '20px', height: '20px', borderRadius: 'var(--radius-sm)',
              background: color, border: '2px solid var(--color-ink)',
            }} />
          </button>

          {showColors && (
            <div className="color-palette" style={{
              position: 'absolute',
              bottom: 'calc(100% + 8px)',
              left: '50%',
              transform: 'translateX(-50%)',
              zIndex: 50,
            }}>
              {COLORS.map((c) => (
                <button
                  key={c}
                  className={`color-swatch ${c === color ? 'selected' : ''}`}
                  style={{ background: c }}
                  onClick={() => { setColor(c); setShowColors(false); }}
                  title={c}
                />
              ))}
            </div>
          )}

          <div className="toolbar-divider" />

          {/* Size slider */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            <input
              type="range"
              min={2}
              max={40}
              value={lineWidth}
              onChange={(e) => setLineWidth(Number(e.target.value))}
              style={{ width: '80px', accentColor: 'var(--color-accent)' }}
              title="Brush Size"
            />
            <div style={{
              width: Math.min(lineWidth, 24) + 'px',
              height: Math.min(lineWidth, 24) + 'px',
              borderRadius: '50%',
              background: tool === 'eraser' ? 'var(--color-ink-ghost)' : color,
              border: '1px solid var(--color-ink)',
              flexShrink: 0,
            }} />
          </div>

          <div className="toolbar-divider" />

          {/* Clear */}
          <button className="toolbar-btn" onClick={handleClear} title="Clear Canvas" style={{ color: 'var(--color-wrong)' }}>🗑️</button>
        </div>
      )}
    </div>
  );
}
