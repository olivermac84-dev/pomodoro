import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

type SessionMode = 'work' | 'break';

const DEFAULTS = {
  work: 25,
  break: 5
};

const clampMinutes = (value: number, fallback: number) => {
  if (!Number.isFinite(value)) return fallback;
  return Math.min(120, Math.max(1, Math.round(value)));
};

const formatTime = (seconds: number) => {
  const safeSeconds = Math.max(0, seconds);
  const minutesPart = String(Math.floor(safeSeconds / 60)).padStart(2, '0');
  const secondsPart = String(safeSeconds % 60).padStart(2, '0');
  return `${minutesPart}:${secondsPart}`;
};

const App = () => {
  const [mode, setMode] = useState<SessionMode>('work');
  const [isRunning, setIsRunning] = useState(false);
  const [darkMode, setDarkMode] = useState(true);
  const [workMinutes, setWorkMinutes] = useState(DEFAULTS.work);
  const [breakMinutes, setBreakMinutes] = useState(DEFAULTS.break);
  const [remainingSeconds, setRemainingSeconds] = useState(DEFAULTS.work * 60);
  const [completedPomodoros, setCompletedPomodoros] = useState(0);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const intervalRef = useRef<number | null>(null);

  const activeSessionSeconds = (mode === 'work' ? workMinutes : breakMinutes) * 60;
  const progress = useMemo(() => {
    if (activeSessionSeconds <= 0) return 0;
    return ((activeSessionSeconds - remainingSeconds) / activeSessionSeconds) * 100;
  }, [activeSessionSeconds, remainingSeconds]);

  const strokeDashoffset = 754 - (Math.min(100, Math.max(0, progress)) / 100) * 754;

  const playNotification = useCallback(async () => {
    try {
      const context = new AudioContext();
      const oscillator = context.createOscillator();
      const gainNode = context.createGain();
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(660, context.currentTime);
      gainNode.gain.setValueAtTime(0.0001, context.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.25, context.currentTime + 0.01);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.4);
      oscillator.connect(gainNode);
      gainNode.connect(context.destination);
      oscillator.start();
      oscillator.stop(context.currentTime + 0.4);
      await new Promise((resolve) => setTimeout(resolve, 450));
      await context.close();
    } catch (error) {
      console.error('Audio notification failed', error);
    }
  }, []);

  const resetTimer = useCallback(() => {
    setIsRunning(false);
    setRemainingSeconds((mode === 'work' ? workMinutes : breakMinutes) * 60);
  }, [mode, workMinutes, breakMinutes]);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
  }, [darkMode]);

  useEffect(() => {
    if (!isRunning) {
      if (intervalRef.current) {
        window.clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    intervalRef.current = window.setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev <= 1) {
          window.clearInterval(intervalRef.current ?? undefined);
          intervalRef.current = null;
          setIsRunning(false);
          void playNotification();

          if (mode === 'work') {
            setCompletedPomodoros((count) => count + 1);
            setMode('break');
            return breakMinutes * 60;
          }

          setMode('work');
          return workMinutes * 60;
        }

        return prev - 1;
      });
    }, 1000);

    return () => {
      if (intervalRef.current) {
        window.clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isRunning, mode, workMinutes, breakMinutes, playNotification]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      if (target?.tagName === 'INPUT') return;

      if (event.code === 'Space') {
        event.preventDefault();
        setIsRunning((running) => !running);
      }

      if (event.key.toLowerCase() === 'r') {
        event.preventDefault();
        resetTimer();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [resetTimer]);

  const updateDuration = (target: SessionMode, rawValue: string) => {
    const nextValue = clampMinutes(Number.parseInt(rawValue, 10), DEFAULTS[target]);

    if (target === 'work') {
      setWorkMinutes(nextValue);
      if (!isRunning && mode === 'work') {
        setRemainingSeconds(nextValue * 60);
      }
      return;
    }

    setBreakMinutes(nextValue);
    if (!isRunning && mode === 'break') {
      setRemainingSeconds(nextValue * 60);
    }
  };

  const modeTheme = mode === 'work'
    ? 'from-rose-700 via-rose-900 to-slate-950'
    : 'from-sky-700 via-blue-900 to-slate-950';

  const glow = mode === 'work' ? 'shadow-redglow' : 'shadow-glow';

  return (
    <main className={`min-h-screen bg-gradient-to-br ${modeTheme} transition-all duration-700 ease-in-out text-white`}>
      <div className="mx-auto flex min-h-screen max-w-5xl flex-col items-center justify-center gap-8 px-4 py-10">
        <section className="glass w-full rounded-3xl p-6 sm:p-10">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm uppercase tracking-[0.35em] text-white/70">Session</p>
              <h1 className="mt-1 text-2xl font-semibold sm:text-3xl">
                {mode === 'work' ? 'Focus Time' : 'Break Time'}
              </h1>
              <p className="mt-2 text-sm text-white/75">Completed today: {completedPomodoros}</p>
            </div>
            <button
              type="button"
              className="action-btn p-3"
              onClick={() => setDarkMode((value) => !value)}
              title="Toggle light/dark mode"
              aria-label="Toggle light mode"
            >
              {darkMode ? '🌙' : '☀️'}
            </button>
          </div>

          <div className="mt-8 flex flex-col items-center justify-center">
            <div className={`relative grid h-72 w-72 place-items-center rounded-full sm:h-80 sm:w-80 ${glow}`}>
              <svg className="absolute h-full w-full -rotate-90" viewBox="0 0 260 260" aria-hidden="true">
                <circle cx="130" cy="130" r="120" stroke="rgba(255,255,255,0.15)" strokeWidth="10" fill="none" />
                <circle
                  cx="130"
                  cy="130"
                  r="120"
                  stroke="url(#timer-gradient)"
                  strokeWidth="12"
                  strokeLinecap="round"
                  fill="none"
                  strokeDasharray="754"
                  strokeDashoffset={strokeDashoffset}
                  className="transition-all duration-700"
                />
                <defs>
                  <linearGradient id="timer-gradient" x1="0" x2="1" y1="0" y2="1">
                    <stop offset="0%" stopColor={mode === 'work' ? '#fb7185' : '#38bdf8'} />
                    <stop offset="100%" stopColor={mode === 'work' ? '#f97316' : '#6366f1'} />
                  </linearGradient>
                </defs>
              </svg>

              <div className="glass z-10 rounded-full px-10 py-8 text-center">
                <p className="text-xs uppercase tracking-[0.35em] text-white/60">{mode}</p>
                <p className="mt-2 font-mono text-5xl font-bold sm:text-6xl">{formatTime(remainingSeconds)}</p>
              </div>
            </div>

            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                className="action-btn group relative min-w-24 rounded-2xl px-5 py-3"
                onClick={() => setIsRunning((value) => !value)}
                title="Space"
              >
                {isRunning ? 'Pause' : 'Start'}
                <span className="pointer-events-none absolute -bottom-9 left-1/2 -translate-x-1/2 rounded-md bg-black/70 px-2 py-1 text-xs opacity-0 transition group-hover:opacity-100">
                  Space
                </span>
              </button>
              <button
                type="button"
                className="action-btn group relative min-w-24 rounded-2xl px-5 py-3"
                onClick={resetTimer}
                title="Reset timer"
              >
                Reset
                <span className="pointer-events-none absolute -bottom-9 left-1/2 -translate-x-1/2 rounded-md bg-black/70 px-2 py-1 text-xs opacity-0 transition group-hover:opacity-100">
                  R
                </span>
              </button>
            </div>
          </div>
        </section>

        <button
          type="button"
          onClick={() => setSettingsOpen((value) => !value)}
          className="action-btn fixed bottom-6 right-6 z-20"
          title="Open settings"
        >
          ⚙️
        </button>

        {settingsOpen && (
          <aside className="glass fixed bottom-24 right-6 z-20 w-[min(22rem,calc(100vw-3rem))] rounded-2xl p-5">
            <h2 className="text-lg font-semibold">Timer Settings</h2>
            <p className="mt-1 text-xs text-white/70">Use 1-120 minutes for each session.</p>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <label className="text-sm">
                Work (min)
                <input
                  value={workMinutes}
                  onChange={(event) => updateDuration('work', event.target.value)}
                  type="number"
                  min={1}
                  max={120}
                  className="mt-1 w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 outline-none ring-sky-400 transition focus:ring"
                />
              </label>
              <label className="text-sm">
                Break (min)
                <input
                  value={breakMinutes}
                  onChange={(event) => updateDuration('break', event.target.value)}
                  type="number"
                  min={1}
                  max={120}
                  className="mt-1 w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 outline-none ring-sky-400 transition focus:ring"
                />
              </label>
            </div>
          </aside>
        )}
      </div>
    </main>
  );
};

export default App;
