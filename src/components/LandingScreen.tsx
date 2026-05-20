import React, { useState, useEffect, useRef } from "react";
import { motion } from "motion/react";
import { Sparkles, Trophy, Zap, Shield, Play, ChevronRight, Cpu, UserCheck } from "lucide-react";

interface LandingScreenProps {
  onStartGuest: () => void;
  onEnterDashboard: () => void;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  alpha: number;
}

interface InteractiveTiltCardProps {
  children: React.ReactNode;
  className?: string;
  id?: string;
  key?: React.Key;
}

function InteractiveTiltCard({ children, className = "", id }: InteractiveTiltCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [transformStyle, setTransformStyle] = useState("perspective(1000px) rotateX(0deg) rotateY(0deg) scale(1)");

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const card = cardRef.current;
    if (!card) return;
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    
    // Smooth tilt limit
    const maxRotation = 8;
    const rotateY = ((x - centerX) / centerX) * maxRotation;
    const rotateX = -((y - centerY) / centerY) * maxRotation;
    
    setTransformStyle(`perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(1.02)`);
  };

  const handleMouseLeave = () => {
    setTransformStyle("perspective(1000px) rotateX(0deg) rotateY(0deg) scale(1)");
  };

  return (
    <div
      ref={cardRef}
      id={id}
      className={`${className} transition-transform duration-300 ease-out`}
      style={{ transform: transformStyle, transformStyle: "preserve-3d" }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      {children}
    </div>
  );
}

interface AnimatedCounterProps {
  value: string;
  label: string;
  color: string;
  key?: React.Key;
}

function AnimatedCounter({ value, label, color }: AnimatedCounterProps) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  
  const numericStr = value.replace(/[^0-9.]/g, "");
  const suffix = value.replace(/[0-9.]/g, "");
  const targetNum = parseFloat(numericStr);

  useEffect(() => {
    let active = true;
    const observer = new IntersectionObserver((entries) => {
      const entry = entries[0];
      if (entry.isIntersecting && active) {
        let startNum = 0;
        const duration = 1200;
        const startTime = performance.now();
        
        const tick = (now: number) => {
          if (!active) return;
          const elapsed = now - startTime;
          const progress = Math.min(elapsed / duration, 1);
          const easeProgress = 1 - Math.pow(1 - progress, 3);
          const current = Math.floor(easeProgress * targetNum * 10) / 10;
          
          setCount(current);

          if (progress < 1) {
            requestAnimationFrame(tick);
          } else {
            setCount(targetNum);
          }
        };
        requestAnimationFrame(tick);
        observer.disconnect();
      }
    }, { threshold: 0.1 });

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => {
      active = false;
      observer.disconnect();
    };
  }, [targetNum]);

  return (
    <div ref={ref} className="space-y-1">
      <div className={`text-lg xs:text-2xl sm:text-3xl font-display font-bold ${color}`}>
        {count % 1 === 0 ? Math.floor(count) : count.toFixed(1)}{suffix}
      </div>
      <div className="text-[8px] xs:text-[10px] sm:text-xs text-slate-500 font-mono tracking-wider uppercase leading-none">
        {label}
      </div>
    </div>
  );
}

export default function LandingScreen({ onStartGuest, onEnterDashboard }: LandingScreenProps) {
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const mouseRef = useRef({ x: -1000, y: -1000 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    let particles: Particle[] = [];
    const particleCount = 75;

    const resizeCanvas = () => {
      if (canvas && canvas.parentElement) {
        canvas.width = canvas.parentElement.clientWidth || window.innerWidth;
        canvas.height = canvas.parentElement.clientHeight || window.innerHeight;
      }
    };

    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    // Deep theme colors
    const colors = [
      "rgba(59, 130, 246,",  // blue-500
      "rgba(99, 102, 241,",  // indigo-500
      "rgba(139, 92, 246,",  // violet-500
      "rgba(244, 63, 94,",   // rose-500
    ];

    // Seed particles
    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * (canvas.width || window.innerWidth),
        y: Math.random() * (canvas.height || window.innerHeight),
        vx: (Math.random() * 0.5 - 0.25),
        vy: (Math.random() * 0.5 - 0.25),
        size: Math.random() * 2 + 1,
        color: colors[Math.floor(Math.random() * colors.length)],
        alpha: Math.random() * 0.45 + 0.1,
      });
    }

    const draw = () => {
      if (!canvas || !ctx) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const mx = mouseRef.current.x;
      const my = mouseRef.current.y;

      // Render a subtle reactive futuristic mesh gradient spotlight at cursor coordinates
      if (mx > -500 && my > -500) {
        const glowRad = 220;
        const grad = ctx.createRadialGradient(mx, my, 0, mx, my, glowRad);
        grad.addColorStop(0, "rgba(99, 102, 241, 0.08)");
        grad.addColorStop(0.4, "rgba(139, 92, 246, 0.04)");
        grad.addColorStop(0.8, "rgba(244, 63, 94, 0.015)");
        grad.addColorStop(1, "rgba(0, 0, 0, 0)");
        ctx.beginPath();
        ctx.arc(mx, my, glowRad, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.fill();
      }

      // Update and Draw Particles
      particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;

        // Wrap boundaries safely
        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height;
        if (p.y > canvas.height) p.y = 0;

        // Interactive mouse repeller grid force
        let glowMultiplier = 1;
        if (mx > -500 && my > -500) {
          const dx = p.x - mx;
          const dy = p.y - my;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < 180) {
            const force = (180 - dist) / 180;
            // Push particles subtly away from center cursor
            p.x += (dx / dist) * force * 1.8;
            p.y += (dy / dist) * force * 1.8;
            glowMultiplier = 1 + force * 1.4;
          }
        }

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * (glowMultiplier > 1 ? 1.25 : 1), 0, Math.PI * 2);
        ctx.fillStyle = `${p.color}${Math.min(1, p.alpha * glowMultiplier)})`;
        ctx.fill();

        // Extra subtle energy halo for highlighted ones near cursor
        if (glowMultiplier > 1) {
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * 3.5, 0, Math.PI * 2);
          ctx.fillStyle = `${p.color}${p.alpha * 0.15})`;
          ctx.fill();
        }
      });

      // Render connectors lines and interactive cursor web threads
      for (let i = 0; i < particles.length; i++) {
        const p1 = particles[i];

        // Connect cursor directly to nearby nodes
        if (mx > -500 && my > -500) {
          const dx = p1.x - mx;
          const dy = p1.y - my;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 140) {
            const alphaVal = (1 - dist / 140) * 0.18;
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(mx, my);
            ctx.strokeStyle = `rgba(139, 92, 246, ${alphaVal})`;
            ctx.lineWidth = 0.65;
            ctx.stroke();
          }
        }

        for (let j = i + 1; j < particles.length; j++) {
          const p2 = particles[j];
          const dx = p1.x - p2.x;
          const dy = p1.y - p2.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < 100) {
            const alphaVal = (1 - dist / 100) * 0.14;
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.strokeStyle = `rgba(99, 102, 241, ${alphaVal})`;
            ctx.lineWidth = 0.55;
            ctx.stroke();
          }
        }
      }

      animationFrameId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("resize", resizeCanvas);
    };
  }, []);

  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Update ref immediately for canvas loop to evade state-triggered re-renders
    mouseRef.current = { x, y };
    
    // Update state for DOM orbs
    setMousePos({ x, y });
  };

  // Testimonials or Team Credits
  const stats = [
    { value: "482K+", label: "Battles Fought", color: "text-blue-500" },
    { value: "1.2M", label: "AI Quizzes Synthesized", color: "text-indigo-500" },
    { value: "24ms", label: "Low-Latency Sync", color: "text-rose-500" },
  ];

  const features = [
    {
      icon: <Cpu className="w-5 h-5 text-brand-cyan" />,
      title: "Generative AI Synthesis",
      description: "Harness Gemini to instantly compile custom trivia categories about any topic, technology, or lore in seconds.",
    },
    {
      icon: <Zap className="w-5 h-5 text-brand-purple" />,
      title: "Competitive Combos",
      description: "Score dynamic streak modifiers! Fire lightning-fast responses to trigger multipliers and climb live leaderboards.",
    },
    {
      icon: <Trophy className="w-5 h-5 text-brand-pink" />,
      title: "Real-Time Combat Logs",
      description: "Battle active, interactive challenger AI bots designed with unique response velocities and answering behavior.",
    },
  ];

  return (
    <div 
      className="relative min-h-screen bg-[#020203] text-zinc-100 overflow-hidden flex flex-col justify-between py-12 px-4 sm:px-6 lg:px-8"
      onMouseMove={handleMouseMove}
    >
      {/* Dynamic Interactive Particle Canvas Background Reacting to Mouse movements */}
      <canvas 
        ref={canvasRef} 
        className="absolute inset-0 pointer-events-none z-0 opacity-45 mix-blend-screen"
      />

      {/* Dynamic Ambient Blur Orbs */}
      <div 
        className="absolute pointer-events-none rounded-full w-[450px] h-[450px] bg-blue-600/20 blur-[120px] animate-aurora-glow-1"
        style={{ top: "10%", left: "15%" }}
      />
      <div 
        className="absolute pointer-events-none rounded-full w-[500px] h-[500px] bg-rose-600/10 blur-[130px] animate-aurora-glow-2"
        style={{ bottom: "15%", right: "12%" }}
      />

      {/* Grid Overlay */}
      <div className="absolute inset-0 laser-grid-bg pointer-events-none opacity-20" />

      {/* Mouse Tracking Aurora Ambient Glow Spot */}
      <div 
        className="absolute w-[600px] h-[600px] rounded-full bg-blue-500/5 pointer-events-none blur-[140px] -translate-x-1/2 -translate-y-1/2 transition-opacity duration-300"
        style={{ left: mousePos.x, top: mousePos.y }}
      />

      {/* Top Navigation Row */}
      <header className="relative max-w-7xl w-full mx-auto flex items-center justify-between z-20 bg-black/45 backdrop-blur-xl p-3 sm:p-4 border border-white/15 rounded-2xl">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="w-7 h-7 sm:w-8 sm:h-8 bg-blue-600 rounded flex items-center justify-center font-black italic text-base sm:text-lg shadow-[0_0_20px_rgba(37,99,235,0.4)]">Q</div>
          <span className="text-base sm:text-xl font-bold tracking-tighter uppercase text-zinc-100">Quiz<span className="text-blue-500">Master</span></span>
          <div className="hidden sm:inline-block px-2 py-0.5 rounded bg-white/5 border border-white/10 text-[10px] font-mono text-zinc-500">v2.0.4-ELITE</div>
        </div>

        <div className="flex items-center gap-3">
          <motion.button 
            id="nav-quick-play"
            onClick={onStartGuest}
            whileHover={{ scale: 1.05, backgroundColor: "rgba(255, 255, 255, 0.15)", borderColor: "rgba(255, 255, 255, 0.25)" }}
            whileTap={{ scale: 0.95 }}
            transition={{ type: "spring", stiffness: 400, damping: 15 }}
            className="px-3.5 py-1.5 sm:px-5 sm:py-2 rounded-xl text-xs sm:text-sm font-semibold border bg-white/5 text-zinc-100 transition-all duration-300 cursor-pointer flex items-center gap-1 sm:gap-1.5 animate-neon-border"
          >
            <UserCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-500" />
            Guest Play
          </motion.button>
        </div>
      </header>

      {/* Hero Section */}
      <main className="relative max-w-7xl w-full mx-auto my-auto grid lg:grid-cols-12 gap-12 items-center z-10 pt-8">
        <div className="lg:col-span-7 flex flex-col space-y-8 text-center lg:text-left">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="inline-flex items-center gap-2 self-center lg:self-start px-3 py-1.5 rounded-full bg-white/[0.04] border border-white/10 backdrop-blur-md"
          >
            <Sparkles className="w-4 h-4 text-blue-400 animate-pulse" />
            <span className="text-xs font-mono font-bold tracking-widest text-blue-400 uppercase">
              Now Unleashed: Gemini-Driven Custom Synthesizer
            </span>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1 }}
            className="space-y-4"
          >
            <h1 className="font-display text-3xl xs:text-5xl sm:text-6xl md:text-7xl font-black leading-[1.05] text-zinc-100 uppercase tracking-tight">
              <span className="tracking-[0.25em] block text-[10px] sm:text-xs font-mono text-blue-500 font-black mb-3">THE ELITE</span>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-400 to-rose-400">CHALLENGE</span> <br />
              <span className="tracking-wide text-zinc-100 font-extrabold">ARENA.</span>
            </h1>
            <p className="max-w-xl mx-auto lg:mx-0 text-zinc-400 text-sm md:text-lg leading-relaxed font-medium">
              Battle against the world's top 1% in real-time. Host customized quiz rooms generated live by Gemini, combat active AI contestant bots, and claim the podium in 60fps rank-swap matches.
            </p>
          </motion.div>
 
          {/* CTA Group */}
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.25 }}
            className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4"
          >
            <motion.button
              id="hero-primary-cta"
              onClick={onEnterDashboard}
              whileHover={{ scale: 1.05, backgroundColor: "rgba(244, 244, 245, 0.95)" }}
              whileTap={{ scale: 0.95 }}
              transition={{ type: "spring", stiffness: 400, damping: 15 }}
              className="w-full sm:w-auto px-6 py-3.5 sm:px-8 sm:py-4 bg-white text-black font-black uppercase text-xs sm:text-sm rounded-xl transition-all duration-300 flex items-center justify-center gap-3 shadow-[0_0_25px_rgba(255,255,255,0.2)] cursor-pointer animate-neon-border"
            >
              Enter Battle Arena
              <svg className="w-4 h-4 text-black stroke-[3]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M13 7l5 5m0 0l-5 5m5-5H6"/></svg>
            </motion.button>
            <motion.button
              id="hero-secondary-cta"
              onClick={onStartGuest}
              whileHover={{ scale: 1.05, backgroundColor: "rgba(255, 255, 255, 0.12)", borderColor: "rgba(255, 255, 255, 0.25)" }}
              whileTap={{ scale: 0.95 }}
              transition={{ type: "spring", stiffness: 400, damping: 15 }}
              className="w-full sm:w-auto px-6 py-3.5 sm:px-8 sm:py-4 bg-white/5 text-white font-black uppercase text-xs sm:text-sm rounded-xl transition-all duration-300 cursor-pointer flex items-center justify-center gap-2 animate-neon-border"
            >
              Host Private Match
            </motion.button>
          </motion.div>
 
          {/* Stats Badges */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, delay: 0.4 }}
            className="grid grid-cols-3 gap-2 xs:gap-4 sm:gap-6 pt-6 border-t border-white/5 max-w-md mx-auto lg:mx-0"
          >
            {stats.map((s, idx) => (
              <AnimatedCounter 
                key={idx}
                value={s.value}
                label={s.label}
                color={s.color}
              />
            ))}
          </motion.div>
        </div>

        {/* Live Leaderboard Preview Card Wrapper / Mockup */}
        <div className="lg:col-span-12 xl:col-span-5 relative w-full max-w-md mx-auto">
          <InteractiveTiltCard className="w-full">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="relative w-full aspect-square glass-panel rounded-3xl p-6 shadow-2xl shadow-blue-950/20 overflow-hidden"
            >
              {/* Shifting visual grid line */}
              <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-transparent via-blue-500/40 to-transparent animate-pulse" />

              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
                  <span className="text-[10px] font-mono font-bold text-zinc-500">LIVE ARENA TELEMETRY</span>
                </div>
                <span className="text-[10px] font-mono bg-blue-500/10 border border-blue-500/20 text-blue-400 px-2.5 py-1 rounded-full font-bold">LOBBY #8442</span>
              </div>

              <h3 className="text-sm font-bold text-zinc-300 uppercase tracking-wider mb-4 flex items-center gap-2 font-mono">
                <Zap className="w-4 h-4 text-zinc-500" />
                Active Contenders Ready
              </h3>

              {/* Simulated Live Player Queue */}
              <div className="space-y-3">
                {[
                  { rank: 1, name: "neon_framer", avatar: "⚡", points: "2,480 XP", current: "Streak x5", active: true },
                  { rank: 2, name: "react_reina", avatar: "👑", points: "1,950 XP", current: "Streak x3", active: true },
                  { rank: 3, name: "coder_slick", avatar: "🦊", points: "1,420 XP", current: "Thinking...", active: false },
                  { rank: 4, name: "guest_ninja", avatar: "🛡️", points: "810 XP", current: "Ready", active: true },
                ].map((p, idx) => (
                  <div 
                    key={idx} 
                    className={`flex items-center justify-between p-3 rounded-2xl border transition-all ${
                      idx === 0 
                        ? "bg-blue-600/10 border-blue-500/30 shadow-lg shadow-blue-500/5" 
                        : "bg-white/[0.02] border-white/5 hover:bg-white/[0.05]"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-sm text-slate-500 w-4">{p.rank}</span>
                      <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-xl shadow-inner">
                        {p.avatar}
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-white flex items-center gap-1.5">
                          {p.name}
                          {p.active && <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />}
                        </div>
                        <div className="text-xs text-slate-400 font-mono">{p.points}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${
                        idx === 0 ? "bg-blue-400/10 text-blue-400 border border-blue-400/20" : "bg-white/5 text-slate-400"
                      }`}>
                        {p.current}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Micro bottom status */}
              <div className="mt-5 pt-4 border-t border-white/5 text-center">
                <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest block font-bold">
                  PRESS TOURNAMENT KEY TO COMMENCE
                </span>
              </div>
            </motion.div>
          </InteractiveTiltCard>
        </div>
      </main>

      {/* Feature Grid Section wrapped in InteractiveTiltCard with staggered enters */}
      <section className="relative max-w-7xl w-full mx-auto grid md:grid-cols-3 gap-4 sm:gap-6 z-10 pt-12 pb-6 border-t border-white/5 mt-12 bg-transparent">
        {features.map((f, idx) => (
          <InteractiveTiltCard key={idx} className="w-full">
            <motion.div 
              initial={{ opacity: 0, y: 35 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.15 }}
              transition={{ duration: 0.7, delay: idx * 0.15 }}
              className="p-4 xs:p-6 rounded-3xl border border-white/10 bg-white/[0.03] hover:border-white/20 hover:bg-white/[0.05] transition-all duration-300 relative overflow-hidden group cursor-default h-full"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 blur-2xl group-hover:bg-blue-500/10 transition-colors pointer-events-none" />
              <div className="mb-4 inline-block p-3 rounded-xl bg-white/5 text-blue-400 group-hover:text-blue-300 transition-all">
                {f.icon}
              </div>
              <h4 className="font-display text-lg font-bold text-zinc-100 mb-2">{f.title}</h4>
              <p className="text-sm text-zinc-400 leading-relaxed font-medium">{f.description}</p>
            </motion.div>
          </InteractiveTiltCard>
        ))}
      </section>

      {/* High-Fidelity Animated Scroll Storytelling Section */}
      <section className="relative max-w-7xl w-full mx-auto z-10 py-16 border-t border-white/5 mt-12 text-center font-sans">
        <span className="text-[10px] font-mono font-bold tracking-[0.25em] text-indigo-400 uppercase">THE ARCHITECTURE OF IMPACT</span>
        <h2 className="text-3xl sm:text-5xl font-black uppercase tracking-tight text-white mt-1.5 mb-12">
          HOW THE ARENA OPERATES
        </h2>

        <div className="grid md:grid-cols-3 gap-8 relative">
          {[
            {
              step: "01",
              title: "INSTANT COMPILATION",
              tagline: "Gemini Orchestration Layer",
              desc: "Draft a completely unique quiz of any depth in under 3 seconds. Input any custom topic—cyberpunk lore, ancient history, complex programming—and watch high-performance schemas compile live.",
              animationDelay: 0.1,
              accent: "from-blue-500/20 to-indigo-500/5",
              borderAccent: "border-blue-500/20"
            },
            {
              step: "02",
              title: "DECIMAL PAYOUT DECAY",
              tagline: "Reactive Velocity Scoring",
              desc: "Points are lost by the millisecond. This hyper-calibrated reward vector penalizes delayed lock-ins while correct responders trigger powerful combos to climb ranks instantly.",
              animationDelay: 0.3,
              accent: "from-indigo-500/20 to-rose-500/5",
              borderAccent: "border-indigo-500/20"
            },
            {
              step: "03",
              title: "DYNAMIC CONTENDERS",
              tagline: "Organic Response Emulation",
              desc: "Contender bots do not execute instantly. They process options with organic response curves, displaying staggered lock-ins, variable streak exhaustion, and human error rates.",
              animationDelay: 0.5,
              accent: "from-rose-500/20 to-blue-500/5",
              borderAccent: "border-rose-500/20"
            }
          ].map((step, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.15 }}
              transition={{ duration: 0.8, delay: step.animationDelay }}
              className={`p-5 sm:p-8 rounded-3xl border ${step.borderAccent} bg-gradient-to-b ${step.accent} backdrop-blur-sm text-left relative overflow-hidden group`}
            >
              <div className="absolute top-4 right-6 text-6xl sm:text-7xl font-sans font-black text-white/5 select-none transition-all duration-300 group-hover:text-white/10">{step.step}</div>
              <span className="text-[9px] font-mono font-bold tracking-widest text-zinc-400 block uppercase mb-1">{step.tagline}</span>
              <h4 className="text-xl font-bold font-display text-white mb-4 tracking-tight uppercase">{step.title}</h4>
              <p className="text-xs text-zinc-300 leading-relaxed font-medium">{step.desc}</p>
              
              <div className="mt-6 h-1 w-full bg-white/5 rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  whileInView={{ width: "100%" }}
                  viewport={{ once: true }}
                  transition={{ duration: 1.5, delay: step.animationDelay + 0.3 }}
                  className="h-full bg-gradient-to-r from-blue-500 via-indigo-500 to-rose-500"
                />
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Gamified Arena Modifiers Expansion Section */}
      <section className="relative max-w-7xl w-full mx-auto z-10 py-12 border-t border-white/5 mt-6 mb-4">
        <div className="text-center mb-8">
          <span className="text-[10px] font-mono font-bold tracking-widest text-indigo-400 uppercase">Interactive Systems</span>
          <h3 className="text-2xl sm:text-3xl font-bold uppercase tracking-tight text-white mt-1">
            MULTIPLAYER MODIFIERS ACTIVATED
          </h3>
          <p className="text-xs text-zinc-400 max-w-md mx-auto mt-2 leading-relaxed">
            Every match is supercharged with automatic speed multipliers, state modifiers, and hyper-dynamic score calibrations.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { tag: "COMBO BREAK", desc: "Hitting 3 correct answers in rapid succession unlocks a 1.5x score modifier.", color: "border-amber-500/30 text-amber-400 bg-amber-500/5 hover:border-amber-500/50" },
            { tag: "DECAY WARNING", desc: "Delaying your response reduces potential points mathematically each millisecond.", color: "border-rose-500/30 text-rose-400 bg-rose-500/5 hover:border-rose-500/50" },
            { tag: "BOT VELOCITY", desc: "Artificial contender bots calculate answers with organic, dynamic speed limits.", color: "border-blue-500/30 text-blue-400 bg-blue-500/5 hover:border-blue-500/50" },
            { tag: "UTC PODIUMS", desc: "Live-staged rankings are broadcast on high-contrast esports grids.", color: "border-emerald-500/30 text-emerald-400 bg-emerald-500/5 hover:border-emerald-500/50" }
          ].map((card, key) => (
            <InteractiveTiltCard key={key} className="w-full">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true, amount: 0.1 }}
                className={`p-4 sm:p-5 rounded-2xl border ${card.color} backdrop-blur-md text-left transition-all relative overflow-hidden h-full`}
              >
                <div className="absolute top-0 right-0 w-16 h-16 bg-white/[0.01] rounded-full blur-xl pointer-events-none" />
                <div className="text-xs font-mono font-bold tracking-widest mb-1.5 uppercase opacity-90">{card.tag}</div>
                <p className="text-[11px] text-zinc-300 leading-relaxed font-medium">{card.desc}</p>
              </motion.div>
            </InteractiveTiltCard>
          ))}
        </div>
      </section>

      {/* Trust & Guarantee Footer */}
      <footer className="relative max-w-7xl w-full mx-auto z-10 pt-8 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4 text-zinc-500 text-[10px] font-mono font-bold uppercase tracking-wider text-center sm:text-left">
        <div>
          &copy; 2026 QuizMaster Esports Platform. All systems operational.
        </div>
        <div className="flex flex-wrap items-center justify-center sm:justify-end gap-2 sm:gap-4 mt-2 sm:mt-0">
          <span className="flex items-center gap-1.5 text-blue-400 select-none">
            <Shield className="w-3.5 h-3.5 text-blue-500" /> Secure Server Auth Sandbox
          </span>
          <span className="hidden sm:inline text-zinc-700">&middot;</span>
          <a 
            href="#" 
            onClick={(e) => { e.preventDefault(); }}
            className="text-zinc-400 hover:text-white transition-all text-[10px] font-bold hover:underline py-1 px-2 hover:bg-white/5 rounded-md duration-200 uppercase tracking-widest"
          >
            Terms of Play
          </a>
        </div>
      </footer>
    </div>
  );
}
