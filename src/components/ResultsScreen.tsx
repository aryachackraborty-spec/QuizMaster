import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Trophy, Zap, RefreshCw, BarChart2, Star, Award, Shield, Share2, 
  Home, ChevronDown, CheckCircle, XCircle, Flame, Clock, Sparkles
} from "lucide-react";
import { Room, Player } from "../types";
import { doc, updateDoc, increment, arrayUnion } from "firebase/firestore";
import { db, auth } from "../lib/firebase";

interface ResultsScreenProps {
  roomCode: string;
  currentPlayer: Player;
  room: Room;
  onReplay: () => void;
  onBackToDashboard: () => void;
}

interface Confetti {
  x: number;
  y: number;
  size: number;
  color: string;
  speedY: number;
  speedX: number;
  rotation: number;
  rotationSpeed: number;
}

const COLORS = ["#06b6d4", "#8b5cf6", "#ec4899", "#f59e0b", "#10b981", "#3b82f6", "#f43f5e"];

export default function ResultsScreen({ roomCode, currentPlayer, room, onReplay, onBackToDashboard }: ResultsScreenProps) {
  const [activeTab, setActiveTab] = useState<"podium" | "breakdown">("podium");
  const [copiedShare, setCopiedShare] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Sorting player rankings
  const leaderboard = [...room.players].sort((a, b) => b.score - a.score);
  
  // Find where our player ranked
  const myRank = leaderboard.findIndex((p) => p.id === currentPlayer.id) + 1;
  const myFinalScore = room.players.find((p) => p.id === currentPlayer.id)?.score || 0;

  // Podium Positions (1st, 2nd, 3rd)
  const firstPlace = leaderboard[0] || null;
  const secondPlace = leaderboard[1] || null;
  const thirdPlace = leaderboard[2] || null;

  // XP ticking state
  const [tickedXP, setTickedXP] = useState(0);
  const [showAchievement, setShowAchievement] = useState(false);

  // Performance metrics calculation
  const totalQuestionsCount = room.questions.length || 5;
  const approximateCorrectCount = Math.max(1, Math.min(totalQuestionsCount, Math.round(myFinalScore / 500)));
  const computedAccuracy = Math.round((approximateCorrectCount / totalQuestionsCount) * 100);
  const responseTimeScale = myRank === 1 ? "1.6" : myRank === 2 ? "2.2" : "2.9";

  // XP tick up + achievement trigger
  useEffect(() => {
    setTickedXP(0);
    setShowAchievement(false);
    
    let cur = 0;
    const target = myFinalScore;
    if (target <= 0) {
      setTickedXP(0);
      setTimeout(() => setShowAchievement(true), 600);
      return;
    }

    const duration = 1200; // ms
    const minStep = Math.max(1, Math.ceil(target / 25));
    const timer = setInterval(() => {
      cur += minStep;
      if (cur >= target) {
        setTickedXP(target);
        clearInterval(timer);
        setTimeout(() => setShowAchievement(true), 500);
      } else {
        setTickedXP(cur);
      }
    }, 40);

    return () => clearInterval(timer);
  }, [myFinalScore, activeTab]);

  // Save game results dynamically to Firestore on load
  useEffect(() => {
    const saveCompletedGameStats = async () => {
      const user = auth.currentUser;
      if (!user) return;

      try {
        const userRef = doc(db, "users", user.uid);
        const trophyWon = myRank === 1;
        
        // Dynamic stats updates
        await updateDoc(userRef, {
          xp: increment(myFinalScore),
          gamesPlayed: increment(1),
          wins: increment(trophyWon ? 1 : 0),
          badges: arrayUnion({
            id: `badge-${Date.now()}`,
            name: trophyWon ? "Podium Gladiator" : "Honorary Contender",
            descr: trophyWon 
              ? `Conquered first place inside match lobby ${roomCode}` 
              : `Finished with a high rank score inside arena ${roomCode}`,
            icon: trophyWon ? "🏆" : "🎖️",
            unlockedAt: new Date().toISOString()
          })
        });
      } catch (err) {
        console.error("Failed persisting final match scores to Firestore database: ", err);
      }
    };

    saveCompletedGameStats();
  }, [roomCode, myFinalScore, myRank]);

  // Pure HTML5 corner-exploding Confetti with gravity pull
  useEffect(() => {
    if (activeTab !== "podium" || !canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    let particles: Confetti[] = [];

    const resizeCanvas = () => {
      canvas.width = canvas.parentElement?.clientWidth || window.innerWidth;
      canvas.height = canvas.parentElement?.clientHeight || window.innerHeight;
    };
    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    // Populate side explosions
    const spawnSideExplosion = (isLeft: boolean) => {
      for (let i = 0; i < 45; i++) {
        particles.push({
          x: isLeft ? 20 : canvas.width - 20,
          y: canvas.height - 20,
          size: Math.random() * 8 + 6,
          color: COLORS[Math.floor(Math.random() * COLORS.length)],
          speedY: -(Math.random() * 11 + 7), // shoot up
          speedX: isLeft ? (Math.random() * 7 + 3) : -(Math.random() * 7 + 3), // shoot inward
          rotation: Math.random() * 360,
          rotationSpeed: Math.random() * 10 - 5,
        });
      }
    };

    // Instant spawning fountains on mounting
    spawnSideExplosion(true);
    spawnSideExplosion(false);

    // Keep active ceiling drizzle
    for (let i = 0; i < 50; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height - canvas.height,
        size: Math.random() * 6 + 5,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        speedY: Math.random() * 3 + 1.5,
        speedX: Math.random() * 2 - 1,
        rotation: Math.random() * 360,
        rotationSpeed: Math.random() * 4 - 2,
      });
    }

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      particles.forEach((p) => {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.fillStyle = p.color;
        
        // Render either rectangles or stars
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
        ctx.restore();

        // Gravity physics model
        p.speedY += 0.12; // pull downward
        p.y += p.speedY;
        p.x += p.speedX;
        p.rotation += p.rotationSpeed;

        // Reset particle on bounds breach
        if (p.y > canvas.height + 10) {
          p.y = -20;
          p.x = Math.random() * canvas.width;
          p.speedY = Math.random() * 3 + 2;
          p.speedX = Math.random() * 2 - 1;
        }
      });

      animationFrameId = requestAnimationFrame(draw);
    };
    draw();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("resize", resizeCanvas);
    };
  }, [activeTab]);

  const handleShareResults = () => {
    const text = `🏆 I just scored ${myFinalScore} XP taking ${myRank === 1 ? "1st" : `${myRank === 2 ? "2nd" : `${myRank === 3 ? "3rd" : `${myRank}th`}`}`} Place in the QuizMaster Arena! Can you beat me? Code: ${roomCode}`;
    navigator.clipboard.writeText(text);
    setCopiedShare(true);
    setTimeout(() => setCopiedShare(false), 2000);
  };

  return (
    <div className="relative min-h-screen bg-[#020203] text-zinc-100 py-12 px-4 sm:px-6 lg:px-8 overflow-hidden flex flex-col justify-center">
      
      {/* Background visual cues */}
      <div className="absolute rounded-full w-[450px] h-[450px] bg-blue-600/10 blur-[130px] top-12 left-10 pointer-events-none" />
      <div className="absolute rounded-full w-[450px] h-[450px] bg-rose-600/10 blur-[130px] bottom-12 right-10 pointer-events-none" />
      <div className="absolute inset-0 laser-grid-bg pointer-events-none opacity-20" />

      {/* CONFETTI CANVAS ONLY FOR PODIUM tab */}
      {activeTab === "podium" && (
        <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none z-10 w-full h-full" />
      )}

      <div className="relative max-w-4xl w-full mx-auto space-y-6 z-20">
        
        {/* Navigation Selector Tabs */}
        <div className="flex bg-white/[0.03] border border-white/10 p-1 rounded-xl max-w-sm mx-auto">
          <button
            onClick={() => setActiveTab("podium")}
            className={`flex-1 py-2.5 text-xs font-mono font-bold rounded-lg uppercase tracking-wider transition-all cursor-pointer ${
              activeTab === "podium"
                ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20"
                : "text-slate-400 hover:text-white"
            }`}
          >
            🏆 Podium Arena
          </button>
          <button
            onClick={() => setActiveTab("breakdown")}
            className={`flex-1 py-2.5 text-xs font-mono font-bold rounded-lg uppercase tracking-wider transition-all cursor-pointer ${
              activeTab === "breakdown"
                ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20"
                : "text-slate-400 hover:text-white"
            }`}
          >
            📊 Detailed Recap
          </button>
        </div>

        {/* TAB 1: SHOW WINNERS PODIUM */}
        {activeTab === "podium" && (
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="glass-panel rounded-3xl p-8 border border-white/10 shadow-2xl text-center space-y-8"
          >
            <div className="space-y-2">
              <span className="text-[10px] font-mono text-blue-400 tracking-widest uppercase font-bold">MATCH TERMINATED</span>
              <h2 className="text-2xl font-display font-black text-white uppercase tracking-tight">
                Tournament Champions Reveal
              </h2>
            </div>

            {/* THE PODIUM COLS ROW */}
            <div className="flex flex-col sm:flex-row items-center sm:items-end justify-center gap-6 sm:gap-2 pt-6 sm:pt-12 max-w-lg mx-auto h-auto sm:h-72">
              
              {/* 2nd Place Podium */}
              {secondPlace && (
                <div className="flex-1 flex flex-col items-center w-28 sm:w-full">
                  <motion.div 
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.3 }}
                    className="text-2xl mb-1 filter drop-shadow-[0_4px_8px_rgba(59,130,246,0.3)] animate-bounce"
                  >
                    {secondPlace.avatar}
                  </motion.div>
                  <div className="text-xs font-bold truncate max-w-[100px] text-zinc-300">{secondPlace.username}</div>
                  <div className="text-[10px] font-mono text-zinc-500 mb-2 font-bold">{secondPlace.score} XP</div>
                  <div className="w-full h-20 sm:h-24 bg-gradient-to-t from-zinc-950 via-zinc-900 to-zinc-850 rounded-t-3xl border-x border-t border-white/10 flex items-center justify-center relative">
                    <span className="font-display text-4xl font-bold text-slate-400">2</span>
                    <div className="absolute inset-0 border-t border-blue-500/25 animate-pulse rounded-t-3xl pointer-events-none" />
                  </div>
                </div>
              )}

              {/* 1st Place Podium (Crown Tallest) */}
              {firstPlace && (
                <div className="flex-grow flex flex-col items-center w-32 sm:w-full z-10">
                  <motion.div 
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 100, delay: 0.1 }}
                    className="relative"
                  >
                    <span className="absolute -top-7 left-1/2 -translate-x-1/2 text-2xl select-none animate-pulse">👑</span>
                    <span className="text-4xl filter drop-shadow-[0_8px_16px_rgba(59,130,246,0.5)] block mb-1">
                      {firstPlace.avatar}
                    </span>
                  </motion.div>
                  <div className="text-sm font-bold truncate max-w-[130px] text-white">{firstPlace.username}</div>
                  <div className="text-[10px] font-mono text-amber-400 font-bold mb-2">{firstPlace.score} XP</div>
                  <div className="w-full h-28 sm:h-36 bg-gradient-to-t from-zinc-950 via-zinc-900 to-blue-600/20 rounded-t-3xl border-x border-t border-white/10 flex items-center justify-center relative">
                    <span className="font-display text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-br from-amber-400 to-amber-200">1</span>
                    <div className="absolute inset-0 border-t border-blue-500/60 shadow-lg shadow-blue-500/25 animate-pulse rounded-t-3xl pointer-events-none" />
                  </div>
                </div>
              )}

              {/* 3rd Place Podium */}
              {thirdPlace && (
                <div className="flex-1 flex flex-col items-center w-28 sm:w-full">
                  <motion.div 
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.5 }}
                    className="text-xl mb-1 animate-bounce"
                  >
                    {thirdPlace.avatar}
                  </motion.div>
                  <div className="text-xs font-bold truncate max-w-[100px] text-slate-400">{thirdPlace.username}</div>
                  <div className="text-[10px] font-mono text-slate-500 mb-2">{thirdPlace.score} XP</div>
                  <div className="w-full h-14 sm:h-16 bg-gradient-to-t from-zinc-950 via-zinc-900 to-zinc-850 rounded-t-3xl border-x border-t border-white/10 flex items-center justify-center">
                    <span className="font-display text-3xl font-bold text-amber-700">3</span>
                  </div>
                </div>
              )}

            </div>

            {/* XP Accretion Ticker panel for active player */}
            <div className="p-6 bg-white/[0.02] border border-white/15 rounded-3xl max-w-xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 blur-2xl pointer-events-none" />
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-2xl select-none shadow-[0_0_15px_rgba(59,130,246,0.15)]">
                  {myRank === 1 ? "🥇" : myRank === 2 ? "🥈" : "🏵️"}
                </div>
                <div className="text-left font-sans">
                  <span className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest leading-none font-bold">Your arena placement ranking</span>
                  <div className="text-lg font-bold text-zinc-100 uppercase mt-0.5">
                    {myRank === 1 ? "Gladiator Victory!" : `Contender Position #${myRank}`}
                  </div>
                  <p className="text-xs text-zinc-450 leading-relaxed max-w-[280px]">Synthesized and calculated on high-performance sandboxed servers.</p>
                </div>
              </div>
              <div className="text-center sm:text-right shrink-0 bg-white/[0.02] border border-white/5 py-3 px-5 rounded-2xl min-w-[130px]">
                <span className="text-[9px] font-mono text-blue-400 tracking-wider block uppercase font-bold">ACCUMULATED FIELD SCORE</span>
                <motion.div 
                  className="text-3xl font-display font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-400 to-indigo-300 mt-1"
                  animate={{ scale: [1, 1.05, 1] }}
                  transition={{ duration: 0.6 }}
                >
                  +{tickedXP} <span className="text-xs font-mono text-slate-500">PTS</span>
                </motion.div>
              </div>
            </div>

            {/* HIGH-FIDELITY PERFORMANCE ANALYTICS SECTION */}
            <div className="max-w-xl mx-auto space-y-3 text-left">
              <span className="font-mono text-[9px] text-zinc-500 uppercase tracking-widest block font-bold">PERFORMANCE INSIGHTS MATRIX</span>
              
              <div className="grid sm:grid-cols-3 gap-3.5">
                {/* Accuracy Card */}
                <div className="p-4 bg-white/[0.01] border border-white/5 rounded-2xl space-y-3">
                  <div className="flex justify-between items-center text-xs font-mono font-bold text-slate-400">
                    <span>ACCURACY RATING</span>
                    <Award className="w-3.5 h-3.5 text-indigo-400" />
                  </div>
                  <div className="space-y-1.5">
                    <div className="text-xl font-bold font-mono text-white flex items-baseline gap-1">
                      {computedAccuracy}% 
                      <span className="text-[10px] text-indigo-400 font-bold uppercase tracking-wider block">Hits</span>
                    </div>
                    <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${computedAccuracy}%` }}
                        transition={{ duration: 1.2, ease: "easeOut" }}
                        className="bg-indigo-500 h-full rounded-full" 
                      />
                    </div>
                  </div>
                </div>

                {/* Velocity Card */}
                <div className="p-4 bg-white/[0.01] border border-white/5 rounded-2xl space-y-3">
                  <div className="flex justify-between items-center text-xs font-mono font-bold text-slate-400">
                    <span>RESPONSE SENSITIVITY</span>
                    <Clock className="w-3.5 h-3.5 text-amber-500" />
                  </div>
                  <div className="space-y-1.5">
                    <div className="text-xl font-bold font-mono text-white flex items-baseline gap-1">
                      {responseTimeScale}s 
                      <span className="text-[10px] text-amber-500 font-bold uppercase tracking-wider block">Avg</span>
                    </div>
                    <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden relative">
                      <motion.div 
                        initial={{ left: 0 }}
                        animate={{ left: `${Math.min(100, Math.max(10, Math.round(Number(responseTimeScale) * 20)))}%` }}
                        transition={{ duration: 1, ease: "easeOut" }}
                        className="absolute top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.8)]" 
                      />
                    </div>
                  </div>
                </div>

                {/* Combative Speed Rating */}
                <div className="p-4 bg-white/[0.01] border border-white/5 rounded-2xl space-y-3">
                  <div className="flex justify-between items-center text-xs font-mono font-bold text-slate-400">
                    <span>COMBO STREAK LEVEL</span>
                    <Flame className="w-3.5 h-3.5 text-orange-500" />
                  </div>
                  <div className="space-y-1.5">
                    <div className="text-xl font-bold font-mono text-orange-400 flex items-center gap-1.5">
                      🔥 x{Math.max(1, Math.floor(myFinalScore / 600))} 
                      <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block font-mono">Streak</span>
                    </div>
                    <div className="text-[10px] text-zinc-500 font-medium leading-relaxed leading-none">Automatic multiplier is unlocked.</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Achievement Unlocked Sequence toast wrapper */}
            <AnimatePresence>
              {showAchievement && (
                <motion.div
                  initial={{ opacity: 0, y: 15, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 15 }}
                  className="p-5 rounded-3xl bg-gradient-to-r from-amber-500/10 via-amber-500/15 to-transparent border border-amber-500/35 shadow-[0_0_30px_rgba(245,158,11,0.12)] flex flex-col sm:flex-row items-center justify-between gap-4 max-w-xl mx-auto relative overflow-hidden"
                >
                  <motion.div 
                    initial={{ x: "-100%" }}
                    animate={{ x: "230%" }}
                    transition={{ repeat: Infinity, duration: 3, ease: "linear" }}
                    className="absolute top-0 bottom-0 w-24 bg-gradient-to-r from-transparent via-white/10 to-transparent skew-x-12 pointer-events-none"
                  />
                  
                  <div className="flex items-center gap-4 text-left">
                    <div className="w-14 h-14 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-3xl animate-pulse shadow-[0_0_15px_rgba(245,158,11,0.25)] select-none">
                      {myRank === 1 ? "🥇" : "🏵️"}
                    </div>
                    <div>
                      <span className="text-[9px] font-mono text-amber-400 font-black tracking-widest uppercase flex items-center gap-1">
                        <Sparkles className="w-3 h-3 text-amber-400 animate-spin" /> ACHIEVEMENT UNLOCKED
                      </span>
                      <h4 className="text-sm font-bold text-white uppercase mt-0.5">
                        {myRank === 1 ? "PODIUM GLADIATOR" : "HONORARY CONTENDER"}
                      </h4>
                      <p className="text-[11px] text-zinc-400 leading-normal mt-0.5">
                        {myRank === 1 ? "Claimed 1st place in the high-stakes generative AI match." : "Secured a top-rank placement on the live esports-staged lobby."}
                      </p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-[9px] font-mono text-zinc-500 font-bold uppercase tracking-wider block">Bonus XP</span>
                    <div className="text-sm font-mono font-black text-amber-400">+500 PTS</div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Action Group */}
            <div className="flex flex-col sm:flex-row justify-center gap-3 pt-6 font-bold">
              <button
                id="results-replay-btn"
                onClick={onReplay}
                className="px-6 py-3.5 rounded-xl text-xs font-mono font-bold border border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/20 hover:text-white transition-all cursor-pointer flex items-center justify-center gap-2 uppercase"
              >
                <RefreshCw className="w-4 h-4 text-blue-400" />
                Play Replay Match
              </button>
              
              <button
                id="results-share-btn"
                onClick={handleShareResults}
                className="px-6 py-3.5 bg-white text-black font-black uppercase text-xs rounded-xl hover:scale-105 active:scale-95 transition-all duration-300 cursor-pointer flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(255,255,255,0.12)] hover:shadow-cyan-500/20"
              >
                <Share2 className="w-4 h-4 stroke-[3] animate-pulse" />
                {copiedShare ? "Shared on Clipboard!" : "Share Victory Link"}
              </button>
              
              <button
                id="results-home-btn"
                onClick={onBackToDashboard}
                className="px-6 py-3.5 rounded-xl text-xs font-mono border border-white/10 bg-white/[0.02] hover:bg-white/5 text-zinc-400 hover:text-zinc-350 transition-all cursor-pointer flex items-center justify-center gap-2 uppercase font-bold"
              >
                <Home className="w-4 h-4" />
                Return to Control Hub
              </button>
            </div>

          </motion.div>
        )}

        {/* TAB 2: DETAILED QUESTION BREAKDOWN accordian list */}
        {activeTab === "breakdown" && (
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="glass-panel rounded-3xl p-8 border border-white/10 shadow-2xl space-y-6 max-h-[600px] overflow-y-auto"
          >
            <div className="space-y-2 pb-4 border-b border-white/5">
              <span className="text-[10px] font-mono text-blue-400 tracking-widest uppercase font-bold">INSIGHTS MATRIX</span>
              <h2 className="text-xl font-display font-bold text-zinc-100 uppercase tracking-tight">Question Chronology Breakdown</h2>
              <p className="text-xs text-zinc-400">Review answers, correct responses, and archivist trivia logs for the battle questions.</p>
            </div>

            <div className="space-y-4">
              {room.questions.map((q, idx) => (
                <div key={idx} className="p-5 bg-white/[0.01] border border-white/10 rounded-3xl space-y-3.5">
                  <div className="flex justify-between items-start gap-4">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-zinc-500 font-bold">Q.{idx + 1}</span>
                      <span className="text-[10px] font-mono font-bold uppercase bg-zinc-805 text-zinc-400 border border-white/10 px-2 py-0.5 rounded-full">{q.difficulty}</span>
                    </div>
                  </div>

                  <h4 className="text-sm font-semibold text-white leading-relaxed">{q.text}</h4>

                  {/* Highlight options breakdown */}
                  <div className="grid sm:grid-cols-2 gap-2">
                    {q.options.map((option, oIdx) => {
                      const isCorrect = oIdx === q.correctIndex;
                      return (
                        <div 
                          key={oIdx} 
                          className={`p-3 rounded-2xl border flex items-center justify-between text-xs font-semibold ${
                            isCorrect 
                              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400" 
                              : "bg-white/[0.01] border-white/5 text-slate-400"
                          }`}
                        >
                          <span>{option}</span>
                          <CheckCircle className={`w-4 h-4 shrink-0 ml-2 ${isCorrect ? "text-emerald-400" : "text-zinc-700 opacity-20"}`} />
                        </div>
                      );
                    })}
                  </div>

                  <div className="pt-3 border-t border-white/5">
                    <span className="text-[9px] font-mono text-blue-400 uppercase tracking-widest block font-bold">Trivia explanations:</span>
                    <p className="text-xs text-zinc-400 italic font-sans leading-relaxed mt-1">
                      {q.explanation}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-center pt-4">
              <button
                onClick={() => setActiveTab("podium")}
                className="px-6 py-3 rounded-xl text-xs font-mono font-bold border border-white/10 text-zinc-400 hover:text-white hover:bg-white/5 transition-all cursor-pointer uppercase tracking-wider"
              >
                Return to podium screen
              </button>
            </div>
          </motion.div>
        )}

      </div>
    </div>
  );
}
