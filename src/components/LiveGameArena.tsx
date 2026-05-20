import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Zap, Flame, Trophy, Cpu, Sliders, MessageSquare, Timer, Sparkles, 
  HelpCircle, ChevronRight, CheckCircle2, AlertTriangle, AlertCircle, RotateCw
} from "lucide-react";
import { Room, Player, QuizQuestion } from "../types";

interface LiveGameArenaProps {
  roomCode: string;
  currentPlayer: Player;
  onGameEnded: (room: Room) => void;
}

interface FloatingEmoji {
  id: string;
  emoji: string;
  x: number; // percent horizontal
  yStart: number;
}

const EMOJIGRUP = ["🔥", "🤯", "💀", "🚀", "🎉", "🎮"];

export default function LiveGameArena({ roomCode, currentPlayer, onGameEnded }: LiveGameArenaProps) {
  const [room, setRoom] = useState<Room | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState<QuizQuestion | null>(null);
  const [timeSpent, setTimeSpent] = useState(0);
  const [timerPulse, setTimerPulse] = useState(false);

  // Reaction Engine states
  const [floatingEmojis, setFloatingEmojis] = useState<FloatingEmoji[]>([]);
  
  // Timing variables
  const lastTimeRef = useRef<number>(Date.now());
  const tickTimerRef = useRef<any>(null);

  // Sync Room data with backend
  const syncRoom = async () => {
    try {
      const response = await fetch(`/api/rooms/${roomCode}`);
      const data = await response.json();
      if (data.success) {
        setRoom(data.room);

        // Transition out of game to Results if status became Ended
        if (data.room.status === "ended") {
          onGameEnded(data.room);
          return;
        }

        // Detect if Question changed from Server index
        const qIndex = data.room.currentQuestionIndex;
        if (qIndex >= 0 && qIndex < data.room.questions.length) {
          const fetchedQ = data.room.questions[qIndex];
          if (!currentQuestion || currentQuestion.id !== fetchedQ.id) {
            // New question arrived! Reset client answer states
            setCurrentQuestion(fetchedQ);
            setSelectedAnswer(null);
            setHasSubmitted(false);
            setTimeSpent(0);
            lastTimeRef.current = Date.now();
          }
        }

        // Synchronize Server Reactions into our local floating emitter
        const serverReactions = data.room.reactions || [];
        const now = Date.now();
        // Emit active server reactions fired in the last 1.8 seconds that aren't already drawn
        serverReactions.forEach((rx: any) => {
          if (now - rx.timestamp < 1800) {
            setFloatingEmojis((prev) => {
              if (prev.some((e) => e.id === rx.id)) return prev;
              return [
                ...prev,
                {
                  id: rx.id,
                  emoji: rx.emoji,
                  x: Math.floor(Math.random() * 60) + 20, // keep centered mainly
                  yStart: 100,
                },
              ];
            });
          }
        });
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Immediate initial load + fast synchronization loop
  useEffect(() => {
    syncRoom();
    const interval = setInterval(syncRoom, 1500);
    return () => clearInterval(interval);
  }, [roomCode, currentQuestion]);

  // Client Tick timer effect
  useEffect(() => {
    if (!room || room.status !== "active" || hasSubmitted) return;

    tickTimerRef.current = setInterval(() => {
      setTimeSpent((prev) => {
        const nextVal = prev + 100;
        // If elapsed limit, force submit empty / incorrect on timeout
        const maxTime = (currentQuestion?.timeLimit || 15) * 1000;
        if (nextVal >= maxTime) {
          clearInterval(tickTimerRef.current);
          handleAnswerSubmit(-1); // timeout submission
          return maxTime;
        }
        return nextVal;
      });
    }, 100);

    return () => clearInterval(tickTimerRef.current);
  }, [room, hasSubmitted, currentQuestion]);

  // Handle Answer Selection
  const handleAnswerSubmit = async (optionIndex: number) => {
    if (hasSubmitted || !currentQuestion) return;
    clearInterval(tickTimerRef.current);
    setSelectedAnswer(optionIndex);
    setHasSubmitted(true);

    const submissionMs = Date.now() - lastTimeRef.current;
    
    try {
      await fetch(`/api/rooms/${roomCode}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          playerId: currentPlayer.id,
          optionIndex,
          timeSpentMs: submissionMs,
        }),
      });
      // Force sync right away to fetch scores
      setTimeout(syncRoom, 400);
    } catch (err) {
      console.error(err);
    }
  };

  // Next Question trigger (by anyone, but usually hosted)
  const handleNextQuestion = async () => {
    try {
      await fetch(`/api/rooms/${roomCode}/next`, { method: "POST" });
      setSelectedAnswer(null);
      setHasSubmitted(false);
      setTimeSpent(0);
      syncRoom();
    } catch (err) {
      console.error(err);
    }
  };

  // Fire Reaction immediately to backend
  const handleFireEmoji = async (emoji: string) => {
    // Optimistic local spawn
    const localId = `local-rx-${Date.now()}-${Math.random()}`;
    setFloatingEmojis((prev) => [
      ...prev,
      {
        id: localId,
        emoji,
        x: Math.floor(Math.random() * 60) + 20,
        yStart: 100,
      },
    ]);

    try {
      await fetch(`/api/rooms/${roomCode}/reaction`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          emoji,
          userId: currentPlayer.id,
          username: currentPlayer.username,
        }),
      });
    } catch (err) {
      console.error(err);
    }
  };

  // Garbage collect emojis that have floated away
  useEffect(() => {
    if (floatingEmojis.length === 0) return;
    const timeout = setTimeout(() => {
      setFloatingEmojis((prev) => prev.slice(Math.max(0, prev.length - 20)));
    }, 1800);
    return () => clearTimeout(timeout);
  }, [floatingEmojis]);

  // Tracking previous scores for score update popups & halos
  const [prevScores, setPrevScores] = useState<Record<string, number>>({});
  const [activePointSplashes, setActivePointSplashes] = useState<Array<{ id: string; playerId: string; amount: number }>>([]);
  const [glowPlayers, setGlowPlayers] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!room) return;
    const newScores = { ...prevScores };
    let changed = false;
    
    room.players.forEach((p) => {
      const prev = prevScores[p.id];
      if (prev !== undefined && p.score > prev) {
        changed = true;
        const diff = p.score - prev;
        
        // Spawn floating points float
        const splashId = `splash-${p.id}-${Date.now()}-${Math.random()}`;
        setActivePointSplashes((splashes) => [
          ...splashes,
          { id: splashId, playerId: p.id, amount: diff }
        ]);
        
        // Pulse glow halo
        setGlowPlayers((glow) => ({ ...glow, [p.id]: true }));
        setTimeout(() => {
          setGlowPlayers((glow) => ({ ...glow, [p.id]: false }));
        }, 1800);

        // Delete splash
        setTimeout(() => {
          setActivePointSplashes((splashes) => splashes.filter((s) => s.id !== splashId));
        }, 1800);
      }
      newScores[p.id] = p.score;
    });

    if (changed || Object.keys(prevScores).length === 0) {
      setPrevScores(newScores);
    }
  }, [room?.players]);

  if (!room || !currentQuestion) {
    return (
      <div className="min-h-screen bg-[#020203] text-zinc-100 flex flex-col justify-center items-center font-mono">
        <RotateCw className="w-8 h-8 animate-spin text-blue-500 mb-4" />
        <span>BOOTING MATCH MATRIX... SYNCING STREAMS</span>
      </div>
    );
  }

  const limitSeconds = currentQuestion.timeLimit || 15;
  const timerRatio = Math.max(0, 1 - (timeSpent / (limitSeconds * 1000)));
  const remainingSeconds = Math.ceil(((limitSeconds * 1000) - timeSpent) / 1000);
  const isEmergency = remainingSeconds <= 5;

  // Find user's active player values in synchronized list
  const activeMe = room.players.find((p) => p.id === currentPlayer.id) || currentPlayer;
  const sortedPlayers = [...room.players].sort((a, b) => b.score - a.score);

  return (
    <div className={`relative min-h-screen bg-[#020203] text-zinc-100 py-8 px-4 sm:px-6 lg:px-8 overflow-hidden flex flex-col justify-between transition-colors duration-300 ${isEmergency && !hasSubmitted ? "bg-red-950/20" : ""}`}>
      
      {/* Dynamic ambient urgency halos */}
      {isEmergency && !hasSubmitted && (
        <div className="absolute inset-0 border-[6px] border-red-500/10 pointer-events-none animate-pulse z-40" />
      )}
      <div className="absolute rounded-full w-[450px] h-[450px] bg-blue-600/10 blur-[120px] top-10 left-10 pointer-events-none" />
      <div className="absolute rounded-full w-[450px] h-[450px] bg-rose-600/10 blur-[120px] bottom-10 right-10 pointer-events-none" />
      <div className="absolute inset-0 laser-grid-bg pointer-events-none opacity-15" />

      {/* FLOATING ATMOSPHERIC REACTION CANVAS LAYER */}
      <div className="absolute inset-0 pointer-events-none z-30 overflow-hidden">
        <AnimatePresence>
          {floatingEmojis.map((val) => (
            <motion.div
              key={val.id}
              initial={{ y: "100vh", opacity: 0, x: `${val.x}%`, scale: 0.8 }}
              animate={{ 
                y: "-15vh", 
                opacity: [0, 1, 1, 0],
                scale: [0.8, 1.3, 1.3, 0.9],
                x: [`${val.x}%`, `${val.x + (Math.sin(val.x) * 10)}%`]
              }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1.8, ease: "easeOut" }}
              className="absolute text-4xl select-none transform-gpu"
            >
              {val.emoji}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Top Header Panel */}
      <header className="relative max-w-7xl w-full mx-auto flex items-center justify-between gap-4 z-20 bg-black/45 border border-white/10 p-4 rounded-2xl backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-600/20 border border-blue-500/30 rounded-xl">
            <Cpu className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <h1 className="text-sm font-sans font-bold leading-none uppercase tracking-tight text-zinc-100">{room.quizTitle}</h1>
            <span className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest mt-1 block font-bold">Q.INDEX: {room.currentQuestionIndex + 1}/{room.questions.length} | LOBBY {roomCode}</span>
          </div>
        </div>

        {/* Dynamic Combo Bar Indicator */}
        {activeMe.streak > 1 && (
          <motion.div 
            initial={{ scale: 0.9 }}
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ repeat: Infinity, duration: 1 }}
            className="hidden sm:flex items-center gap-2 bg-amber-400/10 border border-amber-400/35 px-4 py-2 rounded-xl text-amber-500"
          >
            <Flame className="w-4 h-4 text-amber-500 animate-bounce" />
            <span className="text-xs font-mono font-bold uppercase tracking-wider">COMBO STREAK x{activeMe.streak}</span>
          </motion.div>
        )}

        <div className="flex items-center gap-3">
          <span className="text-sm font-mono text-slate-400 font-bold">{activeMe.score} <span className="text-slate-600">PTS</span></span>
        </div>
      </header>

      {/* Main Gameplay Core Panel */}
      <main className="relative max-w-7xl w-full mx-auto grid lg:grid-cols-12 gap-6 items-center my-6 z-10 font-sans">
        
        {/* Left Area: Live status tags reflecting bot progress */}
        <div className="lg:col-span-3 space-y-3 order-2 lg:order-1">
          <span className="font-mono text-[9px] text-zinc-500 uppercase tracking-widest block font-bold">LIVE LEADERBOARD PLACEMENTS</span>
          
          <div className="space-y-2 max-h-[350px] overflow-y-auto pr-1">
            <AnimatePresence initial={false}>
              {sortedPlayers.map((p, index) => {
                const isSelf = p.id === currentPlayer.id;
                const hasAnswered = p.lastAnswerTime !== undefined;
                const isGlowing = glowPlayers[p.id];
                const rank = index + 1;

                // Border styles based on position
                let positionBorderClass = "border-white/5 bg-white/[0.01]";
                let rankLabel = `#${rank}`;
                let scoreColor = "text-slate-500";
                
                if (rank === 1) {
                  positionBorderClass = "border-yellow-500/30 bg-yellow-500/5 shadow-[0_0_15px_rgba(234,179,8,0.05)]";
                  rankLabel = "🥇";
                  scoreColor = "text-yellow-500/90 font-bold";
                } else if (rank === 2) {
                  positionBorderClass = "border-zinc-300/30 bg-zinc-300/5 shadow-[0_0_12px_rgba(212,212,216,0.04)]";
                  rankLabel = "🥈";
                  scoreColor = "text-zinc-300/90 font-bold";
                } else if (rank === 3) {
                  positionBorderClass = "border-amber-700/30 bg-amber-700/5 shadow-[0_0_10px_rgba(180,83,9,0.03)]";
                  rankLabel = "🥉";
                  scoreColor = "text-amber-600/90 font-bold";
                }

                if (isGlowing) {
                  positionBorderClass = "border-emerald-500 bg-emerald-500/10 shadow-[0_0_20px_rgba(16,185,129,0.2)]";
                }

                return (
                  <motion.div 
                    key={p.id}
                    layoutId={`player-${p.id}`}
                    layout
                    transition={{ type: "spring", stiffness: 350, damping: 28 }}
                    className={`p-3 rounded-2xl border flex items-center justify-between transition-all duration-300 relative overflow-visible ${positionBorderClass}`}
                  >
                    {/* Score Splash Float Accumulator */}
                    <AnimatePresence>
                      {activePointSplashes
                        .filter((s) => s.playerId === p.id)
                        .map((s) => (
                          <motion.span
                            key={s.id}
                            initial={{ opacity: 0, y: 12, scale: 0.8 }}
                            animate={{ opacity: 1, y: -22, scale: 1.1 }}
                            exit={{ opacity: 0, y: -32, scale: 0.9 }}
                            transition={{ duration: 1.2, ease: "easeOut" }}
                            className="absolute right-4 top-2 text-[10px] font-mono font-black text-emerald-400 bg-emerald-950 border border-emerald-500/40 py-0.5 px-2 rounded-full shadow-[0_0_12px_rgba(16,185,129,0.4)] z-50 pointer-events-none"
                          >
                            +{s.amount} XP ⚡
                          </motion.span>
                        ))}
                    </AnimatePresence>

                    <div className="flex items-center gap-2">
                      <span className="text-sm font-mono font-black w-6 text-slate-500 text-center">{rankLabel}</span>
                      <span className="text-xl inline-block select-none">{p.avatar}</span>
                      <div className="text-left leading-none">
                        <div className="text-xs font-semibold max-w-[100px] truncate flex items-center gap-1">
                          {p.username}
                          {isSelf && <span className="text-[10px] text-blue-400 font-mono font-bold">(You)</span>}
                        </div>
                        <span className={`text-[9px] font-mono mt-1 block ${scoreColor}`}>{p.score} pts</span>
                      </div>
                    </div>

                    <div>
                      {hasAnswered ? (
                        <span className="text-[8px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">Locked In</span>
                      ) : (
                        <span className="text-[8px] font-mono text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider animate-pulse">Thinking</span>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </div>

        {/* Center Arena: Question Cards & Answers Selection */}
        <div className="lg:col-span-6 space-y-6 order-1 lg:order-2">
          
          {/* Circular Countdown Progress dial */}
          <div className="flex justify-center items-center pb-2">
            <div className="relative w-16 h-16 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90">
                <circle 
                  cx="32" 
                  cy="32" 
                  r="28" 
                  stroke="rgba(255,255,255,0.05)" 
                  strokeWidth="3.5" 
                  fill="transparent" 
                />
                <motion.circle 
                  cx="32" 
                  cy="32" 
                  r="28" 
                  stroke={isEmergency ? "#ef4444" : "#3b82f6"} 
                  strokeWidth="3.5" 
                  fill="transparent" 
                  strokeDasharray={`${2 * Math.PI * 28}`}
                  strokeDashoffset={`${2 * Math.PI * 28 * (1 - timerRatio)}`}
                />
              </svg>
              <div className={`absolute text-xl font-display font-bold leading-none ${isEmergency ? "text-red-500 scale-110 animate-ping absolute" : "text-white"}`}>
                {remainingSeconds}
              </div>
              {/* Extra fallback text so user never gets confused */}
              <div className="absolute text-xl font-display font-bold leading-none">
                {remainingSeconds}
              </div>
            </div>
          </div>

          <motion.div 
            key={currentQuestion.id}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-panel rounded-3xl p-6 md:p-8 border border-white/10 shadow-2xl space-y-6"
          >
            {/* Question Text block */}
            <h3 className="text-lg md:text-xl font-display font-medium leading-relaxed text-center">
              {currentQuestion.text}
            </h3>

            {/* Answer Options Grid */}
            <div className="grid grid-cols-1 gap-3.5 pt-2">
              {currentQuestion.options.map((option, idx) => {
                const isSelected = selectedAnswer === idx;
                const showExplanation = hasSubmitted || room.timer === 0;
                const isCorrectIndex = idx === currentQuestion.correctIndex;

                let btnStyles = "bg-white/[0.02] border-white/5 hover:bg-white/[0.04] hover:border-white/10";
                
                if (isSelected) {
                  // Pre-submission style
                  btnStyles = "bg-blue-600/15 border-blue-500 text-blue-400 neon-border-blue scale-[0.99]";
                }

                if (showExplanation) {
                  if (isCorrectIndex) {
                    btnStyles = "bg-emerald-500/15 border-emerald-500 text-emerald-400 font-bold neon-border-cyan";
                  } else if (isSelected) {
                    btnStyles = "bg-red-500/15 border-red-500 text-red-400 scale-[0.99]";
                  } else {
                    btnStyles = "bg-white/[0.01] border-white/5 opacity-40";
                  }
                }

                return (
                  <button
                    key={idx}
                    id={`answer-option-${idx}`}
                    disabled={hasSubmitted || room.timer === 0}
                    onClick={() => handleAnswerSubmit(idx)}
                    className={`w-full text-left p-4.5 rounded-3xl border text-sm font-medium transition-all transform duration-150 relative overflow-hidden flex items-center justify-between ${btnStyles} ${!hasSubmitted ? "cursor-pointer active:scale-[0.985]" : "cursor-default"}`}
                  >
                    <span>{option}</span>
                    {showExplanation && isCorrectIndex && (
                      <span className="text-emerald-400 font-mono text-[10px] bg-emerald-500/10 px-2 py-0.5 rounded-full font-bold">CORRECT</span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Explanatory Trivia reveal block */}
            <AnimatePresence>
              {(hasSubmitted || room.timer === 0) && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="p-4 bg-white/[0.02] border border-white/5 rounded-3xl space-y-1"
                >
                  <div className="flex items-center gap-1.5 text-xs text-blue-400 font-mono font-bold leading-none">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>NEURAL ARCHIVIST TRIVIA REVEAL:</span>
                  </div>
                  <p className="text-xs text-zinc-350 leading-relaxed font-sans mt-1">
                    {currentQuestion.explanation}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          {/* Next Question Control (Visible once user answered, or timer ends) */}
          {(hasSubmitted || room.timer === 0) && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex justify-center"
            >
              <button
                id="live-btn-next-question"
                onClick={handleNextQuestion}
                className="px-8 py-3.5 bg-white text-black font-black uppercase text-xs rounded-xl hover:scale-105 transition-transform cursor-pointer flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(255,255,255,0.1)]"
              >
                <span>Advance to Next Arena Question</span>
                <ChevronRight className="w-4 h-4 stroke-[3]" />
              </button>
            </motion.div>
          )}

        </div>

        {/* Right Area: Combative Logs Activity streams */}
        <div className="lg:col-span-3 space-y-4 order-3">
          <span className="font-mono text-[10px] text-slate-500 uppercase tracking-wider block">ARENA SIGNAL LOG</span>

          <div className="p-4 bg-white/[0.01] border border-white/5 rounded-2xl h-[300px] flex flex-col justify-between">
            <div className="space-y-2 overflow-y-auto max-h-[200px] pr-1 flex-1">
              {room.activityFeed.slice(-6).map((feed, idx) => (
                <div key={idx} className="text-[10px] font-mono text-slate-400 leading-normal border-l border-white/5 pl-2">
                  {feed}
                </div>
              ))}
            </div>
            <div className="pt-3 border-t border-white/5 text-[9px] font-mono text-slate-500 text-center leading-normal uppercase">
              Signals sync continuously via low latency REST pooling.
            </div>
          </div>
        </div>

      </main>

      {/* Atmospheric Reaction Launcher Deck Controls */}
      <footer className="relative max-w-xl w-full mx-auto z-20 bg-white/[0.02] border border-white/5 px-4 py-3 sm:px-6 sm:py-4 rounded-3xl backdrop-blur-md flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4 mt-4">
        <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest block font-bold">EMIT ATMOSPHERIC REACTION</span>
        
        <div className="flex gap-1.5 sm:gap-2.5">
          {EMOJIGRUP.map((emoji) => (
            <button
              key={emoji}
              onClick={() => handleFireEmoji(emoji)}
              className="w-9 h-9 sm:w-11 sm:h-11 flex items-center justify-center text-base sm:text-xl rounded-xl bg-white/[0.03] border border-white/5 hover:border-white/10 hover:bg-white/10 active:scale-90 transition-all cursor-pointer select-none"
            >
              {emoji}
            </button>
          ))}
        </div>
      </footer>

    </div>
  );
}
