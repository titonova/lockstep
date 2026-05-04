import { useEffect, useRef, useState } from 'react';

interface LandingPageProps {
  onGetStarted: () => void;
}

const FEATURES = [
  {
    label: 'Sequential execution',
    description: 'Tasks run one at a time, in order. No jumping ahead, no going back.',
  },
  {
    label: 'Password-gated friction',
    description: 'Extensions and pauses require your password. Every escape has a cost.',
  },
  {
    label: 'Color-coded urgency',
    description: 'The timer shifts green → orange → red as time runs out. No hiding from it.',
  },
  {
    label: 'Honest post-session data',
    description: 'Planned vs. actual time, extensions used, tasks completed. Facts, not feelings.',
  },
  {
    label: 'Offline-first PWA',
    description: 'Runs entirely in your browser. Install it. It works without a connection.',
  },
  {
    label: 'Pinned task templates',
    description: 'Save recurring tasks to quickly build your daily plan without re-entering them.',
  },
];

const RULES = [
  'Plan your tasks and time estimates before you begin.',
  'Once the session starts, tasks run sequentially with no going back.',
  'Extending time requires your password.',
  'Emergency pause requires your password + a long press.',
  'Finish early? Mark it done. Move forward.',
];

// Animated live clock
function LiveClock() {
  const [time, setTime] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const hh = String(time.getHours()).padStart(2, '0');
  const mm = String(time.getMinutes()).padStart(2, '0');
  const ss = String(time.getSeconds()).padStart(2, '0');

  return (
    <span className="font-mono tabular-nums tracking-tight">
      {hh}
      <span className="opacity-40 animate-pulse">:</span>
      {mm}
      <span className="opacity-40 animate-pulse">:</span>
      {ss}
    </span>
  );
}

// Animated canvas background — same system as the app
function LandingBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let t = 0;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const palette = ['#1e293b', '#334155', '#0f172a', '#162032'];

    const draw = () => {
      t += 0.0004;

      const grad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
      grad.addColorStop(0, palette[0]);
      grad.addColorStop(0.5, palette[2]);
      grad.addColorStop(1, palette[3]);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      for (let i = 0; i < 5; i++) {
        const x = canvas.width * (0.2 + 0.6 * Math.sin(t * (i + 1) * 0.7 + i));
        const y = canvas.height * (0.2 + 0.6 * Math.cos(t * (i + 1) * 0.5 + i * 2));
        const r = Math.abs(80 + 180 * Math.sin(t * 0.3 + i));
        const sg = ctx.createRadialGradient(x, y, 0, x, y, Math.max(r, 10));
        sg.addColorStop(0, `${palette[i % palette.length]}60`);
        sg.addColorStop(1, 'transparent');
        ctx.fillStyle = sg;
        ctx.beginPath();
        ctx.arc(x, y, Math.max(r, 10), 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.strokeStyle = 'rgba(255,255,255,0.025)';
      ctx.lineWidth = 1;
      for (let i = 0; i < 4; i++) {
        ctx.beginPath();
        ctx.moveTo(0, canvas.height * (0.2 + i * 0.18 + Math.sin(t + i) * 0.08));
        for (let x = 0; x < canvas.width; x += 20) {
          const y =
            canvas.height *
            (0.2 + i * 0.18 + Math.sin(t + x * 0.002 + i) * 0.08 + Math.cos(t * 0.5 + x * 0.001) * 0.04);
          ctx.lineTo(x, y);
        }
        ctx.stroke();
      }

      animId = requestAnimationFrame(draw);
    };

    draw();
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return <canvas ref={canvasRef} className="fixed inset-0 -z-10" style={{ background: '#0f172a' }} />;
}

export function LandingPage({ onGetStarted }: LandingPageProps) {
  return (
    <div className="min-h-screen text-white selection:bg-green-500/20">
      <LandingBackground />

      {/* ── Top bar ── */}
      <header className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-4 border-b border-white/5 backdrop-blur-md bg-[#0f172a]/60">
        <div className="flex items-center gap-3">
          {/* Lockstep wordmark */}
          <div className="flex items-center gap-2">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <rect x="2" y="2" width="7" height="7" rx="1" fill="#22c55e" />
              <rect x="11" y="2" width="7" height="7" rx="1" fill="rgba(255,255,255,0.15)" />
              <rect x="2" y="11" width="7" height="7" rx="1" fill="rgba(255,255,255,0.15)" />
              <rect x="11" y="11" width="7" height="7" rx="1" fill="rgba(255,255,255,0.15)" />
            </svg>
            <span className="text-sm font-semibold tracking-widest uppercase text-white/90">Lockstep</span>
          </div>
        </div>

        <div className="text-xs text-white/30 font-mono tabular-nums">
          <LiveClock />
        </div>

        <button
          onClick={onGetStarted}
          className="text-xs font-medium tracking-widest uppercase text-green-400 border border-green-400/30 px-4 py-1.5 rounded hover:bg-green-400/10 transition-all"
        >
          Get started
        </button>
      </header>

      {/* ── Hero ── */}
      <main>
        <section className="min-h-screen flex flex-col justify-center px-6 pt-24 pb-16 max-w-5xl mx-auto">
          {/* Eyebrow */}
          <div className="flex items-center gap-2 mb-8">
            <span className="w-6 h-px bg-green-500" />
            <span className="text-xs font-mono tracking-widest uppercase text-green-400/80">
              Deep work, enforced
            </span>
          </div>

          {/* Headline */}
          <h1 className="text-[clamp(3rem,10vw,8rem)] font-bold leading-[0.92] tracking-tight text-balance mb-10">
            The timer
            <br />
            that{' '}
            <span className="text-green-400">holds</span>
            <br />
            you to it.
          </h1>

          {/* Description */}
          <p className="text-white/50 text-lg leading-relaxed max-w-xl mb-12 text-pretty">
            Lockstep is a deep-work timer that forces you to plan your day honestly and execute without
            negotiation. Tasks run sequentially, extensions require a password, and the clock never lies.
          </p>

          {/* CTA */}
          <div className="flex items-center gap-4">
            <button
              onClick={onGetStarted}
              className="group flex items-center gap-3 bg-green-500 hover:bg-green-400 text-[#0f172a] font-semibold px-8 py-4 rounded transition-all text-sm tracking-wide"
            >
              Set your password
              <svg
                className="w-4 h-4 translate-x-0 group-hover:translate-x-1 transition-transform"
                viewBox="0 0 16 16"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M3 8h10M9 4l4 4-4 4" />
              </svg>
            </button>
            <span className="text-xs text-white/25 font-mono">No account. No sync. No cloud.</span>
          </div>
        </section>

        {/* ── Divider ── */}
        <div className="max-w-5xl mx-auto px-6">
          <div className="h-px bg-white/5" />
        </div>

        {/* ── How it works ── */}
        <section className="max-w-5xl mx-auto px-6 py-24">
          <div className="flex items-center gap-2 mb-12">
            <span className="w-6 h-px bg-white/20" />
            <span className="text-xs font-mono tracking-widest uppercase text-white/30">How it works</span>
          </div>

          {/* Step list */}
          <ol className="space-y-0">
            {RULES.map((rule, i) => (
              <li
                key={i}
                className="flex items-start gap-6 py-6 border-b border-white/5 group"
              >
                <span className="text-xs font-mono text-white/20 mt-1 w-6 shrink-0 tabular-nums">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <span className="text-white/70 text-base leading-relaxed group-hover:text-white/90 transition-colors">
                  {rule}
                </span>
              </li>
            ))}
          </ol>
        </section>

        {/* ── Divider ── */}
        <div className="max-w-5xl mx-auto px-6">
          <div className="h-px bg-white/5" />
        </div>

        {/* ── Features ── */}
        <section className="max-w-5xl mx-auto px-6 py-24">
          <div className="flex items-center gap-2 mb-12">
            <span className="w-6 h-px bg-white/20" />
            <span className="text-xs font-mono tracking-widest uppercase text-white/30">What&apos;s inside</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-px bg-white/5 rounded-xl overflow-hidden">
            {FEATURES.map((f, i) => (
              <div key={i} className="bg-[#0f172a] p-8 hover:bg-white/[0.03] transition-colors">
                <div className="w-1 h-4 bg-green-500/60 mb-5 rounded-full" />
                <h3 className="text-sm font-semibold text-white/90 mb-2">{f.label}</h3>
                <p className="text-sm text-white/40 leading-relaxed">{f.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Divider ── */}
        <div className="max-w-5xl mx-auto px-6">
          <div className="h-px bg-white/5" />
        </div>

        {/* ── The philosophy ── */}
        <section className="max-w-5xl mx-auto px-6 py-24">
          <div className="flex items-center gap-2 mb-12">
            <span className="w-6 h-px bg-white/20" />
            <span className="text-xs font-mono tracking-widest uppercase text-white/30">Why it exists</span>
          </div>

          <blockquote className="text-[clamp(1.25rem,3vw,2rem)] text-white/60 leading-relaxed font-light max-w-3xl text-pretty">
            Most productivity tools let you off the hook. They&apos;re flexible, forgiving, and ultimately
            complicit in your procrastination.{' '}
            <span className="text-white/90">
              Lockstep isn&apos;t. It treats your time estimate as a commitment, and it enforces that
              commitment with friction — intentional, password-gated friction.
            </span>{' '}
            The result is a session history that shows you exactly how honest you were with yourself.
          </blockquote>
        </section>

        {/* ── Divider ── */}
        <div className="max-w-5xl mx-auto px-6">
          <div className="h-px bg-white/5" />
        </div>

        {/* ── Bottom CTA ── */}
        <section className="max-w-5xl mx-auto px-6 py-24 flex flex-col md:flex-row items-start md:items-end justify-between gap-10">
          <div>
            <p className="text-xs font-mono tracking-widest uppercase text-white/25 mb-4">Ready?</p>
            <h2 className="text-[clamp(2rem,6vw,4.5rem)] font-bold leading-tight tracking-tight text-balance">
              Stop planning to start.
              <br />
              <span className="text-green-400">Just start.</span>
            </h2>
          </div>

          <button
            onClick={onGetStarted}
            className="group shrink-0 flex items-center gap-3 border border-white/10 hover:border-green-400/40 hover:bg-green-400/5 text-white/70 hover:text-white font-medium px-8 py-4 rounded transition-all text-sm tracking-wide"
          >
            Open Lockstep
            <svg
              className="w-4 h-4 translate-x-0 group-hover:translate-x-1 transition-transform"
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M3 8h10M9 4l4 4-4 4" />
            </svg>
          </button>
        </section>

        {/* ── Footer ── */}
        <footer className="max-w-5xl mx-auto px-6 pb-10">
          <div className="h-px bg-white/5 mb-8" />
          <div className="flex items-center justify-between text-xs text-white/20 font-mono">
            <span>Lockstep — deep work, enforced.</span>
            <span>No account. No cloud. Just work.</span>
          </div>
        </footer>
      </main>
    </div>
  );
}
