import { useEffect, useRef } from 'react';

interface TimerProps {
  timeRemaining: number;
  totalTime: number;
}

export default function Timer({ timeRemaining, totalTime }: TimerProps) {
  const RADIUS = 28;
  const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
  const fraction = totalTime > 0 ? Math.max(0, timeRemaining / totalTime) : 0;
  const dashOffset = CIRCUMFERENCE * (1 - fraction);

  // Color states (§17.2)
  let ringColor = 'var(--color-correct)';
  let textColor = 'var(--color-ink)';
  let urgent = false;

  if (fraction <= 0.33 || timeRemaining <= 10) {
    ringColor = 'var(--color-wrong)';
    textColor = 'var(--color-wrong)';
    urgent = timeRemaining > 5;
  } else if (fraction <= 0.66) {
    ringColor = 'var(--color-warning)';
  }

  return (
    <div className={`timer-ring-container ${urgent ? 'animate-timer-urgent' : ''}`}>
      <svg className="timer-ring" width="64" height="64" viewBox="0 0 64 64">
        <circle className="track" cx="32" cy="32" r={RADIUS} />
        <circle
          className="progress"
          cx="32"
          cy="32"
          r={RADIUS}
          stroke={ringColor}
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={dashOffset}
        />
      </svg>
      <div className="timer-text" style={{ color: textColor }}>
        {Math.max(0, Math.ceil(timeRemaining))}
      </div>
    </div>
  );
}
