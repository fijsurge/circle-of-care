import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { DEMO_STEPS } from './demoScript';

const ROLE_CHIP = {
  admin:     'bg-purple-600 text-white',
  caregiver: 'bg-blue-600 text-white',
  family:    'bg-green-600 text-white',
  patient:   'bg-amber-500 text-white',
};

export function DemoPlayer({ onExit }) {
  const { setRoleOverride } = useAuth();
  const navigate = useNavigate();

  const [idx,      setIdx]      = useState(0);
  const [autoPlay, setAutoPlay] = useState(false);
  const [progress, setProgress] = useState(0); // 0–100

  const timerRef    = useRef(null);
  const progressRef = useRef(null);

  const step   = DEMO_STEPS[idx];
  const isFirst = idx === 0;
  const isLast  = idx === DEMO_STEPS.length - 1;

  // Apply role + route whenever the step changes
  useEffect(() => {
    setRoleOverride(step.role);
    navigate(step.route, { replace: true });
    setProgress(0);
  }, [idx]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-advance countdown
  useEffect(() => {
    clearTimeout(timerRef.current);
    clearInterval(progressRef.current);

    if (!autoPlay) return;

    const durationMs = (step.durationSecs || 10) * 1000;
    const startTime  = Date.now();

    progressRef.current = setInterval(() => {
      const pct = Math.min(100, ((Date.now() - startTime) / durationMs) * 100);
      setProgress(pct);
    }, 80);

    timerRef.current = setTimeout(() => {
      if (isLast) {
        handleExit();
      } else {
        setIdx((i) => i + 1);
      }
    }, durationMs);

    return () => {
      clearTimeout(timerRef.current);
      clearInterval(progressRef.current);
    };
  }, [autoPlay, idx]); // eslint-disable-line react-hooks/exhaustive-deps

  function handleExit() {
    clearTimeout(timerRef.current);
    clearInterval(progressRef.current);
    setRoleOverride(null);
    onExit();
  }

  function handlePrev() {
    if (!isFirst) setIdx((i) => i - 1);
  }

  function handleNext() {
    if (isLast) handleExit();
    else setIdx((i) => i + 1);
  }

  const chipLabel = step.persona ?? (idx === 0 ? 'Introduction' : 'Closing');
  const chipCls   = ROLE_CHIP[step.role] ?? 'bg-gray-600 text-white';

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[9990] bg-gray-900/96 backdrop-blur-sm text-white border-t border-gray-700 shadow-2xl">
      <div className="max-w-4xl mx-auto px-4 py-3 space-y-2">

        {/* Row 1: persona chip · step counter · auto toggle · exit */}
        <div className="flex items-center gap-2">
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full shrink-0 ${chipCls}`}>
            {chipLabel}
          </span>
          <span className="text-xs text-gray-400 shrink-0">
            {idx + 1} / {DEMO_STEPS.length}
          </span>

          <div className="flex-1" />

          <button
            onClick={() => setAutoPlay((a) => !a)}
            className={[
              'text-xs px-2.5 py-1 rounded-full border transition-colors shrink-0',
              autoPlay
                ? 'border-green-500 text-green-400 bg-green-500/10 hover:bg-green-500/20'
                : 'border-gray-600 text-gray-400 hover:border-gray-400',
            ].join(' ')}
          >
            {autoPlay ? '⏸ Auto' : '▶ Auto'}
          </button>

          <button
            onClick={handleExit}
            className="ml-1 text-gray-400 hover:text-white text-xl leading-none shrink-0 transition-colors"
            title="Exit demo"
          >
            ✕
          </button>
        </div>

        {/* Row 2: headline */}
        <p className="text-sm font-bold text-white leading-snug">
          {step.headline}
        </p>

        {/* Row 3: talking-point bullets */}
        <ul className="space-y-0.5">
          {step.bullets.map((b, i) => (
            <li key={i} className="flex gap-2 text-sm text-gray-300">
              <span className="text-gray-500 shrink-0 mt-px">·</span>
              <span>{b}</span>
            </li>
          ))}
        </ul>

        {/* Row 4: Prev · progress bar · Next/Finish */}
        <div className="flex items-center gap-3 pt-0.5">
          <button
            onClick={handlePrev}
            disabled={isFirst}
            className="text-xs px-3 py-1.5 rounded-lg border border-gray-600 text-gray-300 hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors shrink-0"
          >
            ← Prev
          </button>

          {/* Progress track */}
          <div className="flex-1 h-1.5 bg-gray-700 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full ${autoPlay ? 'bg-blue-500' : 'bg-gray-600'}`}
              style={{
                width: autoPlay
                  ? `${progress}%`
                  : `${(idx / Math.max(DEMO_STEPS.length - 1, 1)) * 100}%`,
                transition: autoPlay ? 'none' : 'width 0.3s ease',
              }}
            />
          </div>

          <button
            onClick={handleNext}
            className="text-xs px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold transition-colors shrink-0"
          >
            {isLast ? '✓ Finish' : 'Next →'}
          </button>
        </div>

      </div>
    </div>
  );
}
