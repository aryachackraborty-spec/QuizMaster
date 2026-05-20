import { useState } from "react";
import { motion } from "motion/react";
import { 
  Trophy, Zap, Flame, Calendar, Plus, DoorOpen, Award, ArrowUpRight, 
  ChevronRight, CircleDot, RefreshCw, BarChart2, Star
} from "lucide-react";
import { UserStats } from "../types";

interface DashboardScreenProps {
  username: string;
  avatar: string;
  onNavigateCreate: () => void;
  onNavigateJoin: () => void;
  onLogout: () => void;
}

// Initial User statistics configuration
const INITIAL_STATS: UserStats = {
  username: "Contender",
  avatar: "⚡",
  xp: 4320,
  level: 8,
  streakDays: 7,
  gamesPlayed: 18,
  correctAnswersRate: 85,
  badges: [
    { id: "b1", name: "Speed Demon", description: "Answered within 1.5s", icon: "⚡", rarity: "rare" },
    { id: "b2", name: "V8 Optimizer", description: "Perfect score in Web Trivia", icon: "🦊", rarity: "epic" },
    { id: "b3", name: "Gemini Pioneer", description: "Played custom Generated quiz", icon: "🧠", rarity: "legendary" },
    { id: "b4", name: "Gladiator", description: "Won 5 games consecutively", icon: "🛡️", rarity: "common" },
  ],
  achievements: [
    { id: "a1", name: "Synthesizer Pilot", target: 5, progress: 4, icon: "🤖" },
    { id: "a2", name: "Perfect compilation", target: 10, progress: 8, icon: "🎯" },
    { id: "a3", name: "Streak Legend", target: 10, progress: 7, icon: "🔥" },
  ],
};

const HISTORY_LOGS = [
  { room: "Silicon Valley Giants", date: "Today", rank: "1st Place", score: "4,620 XP", status: "win" },
  { room: "Elite Web Engineering", date: "Yesterday", rank: "2nd Place", score: "3,810 XP", status: "runnerup" },
  { room: "Cyberpunk Lore", date: "3 days ago", rank: "4th Place", score: "1,200 XP", status: "loss" },
];

export default function DashboardScreen({ username, avatar, onNavigateCreate, onNavigateJoin, onLogout }: DashboardScreenProps) {
  const [stats] = useState<UserStats>({
    ...INITIAL_STATS,
    username,
    avatar,
  });

  // Calculate percentage of level-up
  const nextLevelXp = 5000;
  const currLevelBaseXp = 4000;
  const levelPercentage = ((stats.xp - currLevelBaseXp) / (nextLevelXp - currLevelBaseXp)) * 100;

  return (
    <div className="relative min-h-screen bg-[#020203] text-zinc-100 py-12 px-4 sm:px-6 lg:px-8 overflow-hidden">
      {/* Dynamic Aura background orbs */}
      <div className="absolute rounded-full w-[400px] h-[400px] bg-blue-600/15 blur-[120px] top-[10%] left-[5%] animate-aurora-glow-1 pointer-events-none" />
      <div className="absolute rounded-full w-[450px] h-[450px] bg-rose-600/10 blur-[130px] bottom-[15%] right-[5%] animate-aurora-glow-2 pointer-events-none" />
      <div className="absolute inset-0 laser-grid-bg pointer-events-none opacity-20" />

      <div className="relative max-w-7xl w-full mx-auto space-y-8 z-10">
        {/* Navigation Header */}
        <header className="flex flex-col sm:flex-row items-center justify-between gap-4 pb-6 border-b border-white/5 bg-black/45 backdrop-blur-xl p-4 border border-white/5 rounded-2xl">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center font-black italic text-lg shadow-[0_0_20px_rgba(37,99,235,0.4)]">Q</div>
            <div>
              <span className="font-display text-lg font-bold uppercase tracking-tight text-zinc-100">
                Quiz<span className="text-blue-500">Master</span> Hub
              </span>
              <p className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest font-bold">Esports lobby portal</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3 bg-white/[0.03] border border-white/10 p-2.5 rounded-2xl">
              <span className="text-2xl">{stats.avatar}</span>
              <div className="text-left">
                <div className="text-sm font-semibold leading-none">{stats.username}</div>
                <div className="text-[10px] font-mono text-blue-400 mt-1 uppercase font-bold">LVL {stats.level} AGENT</div>
              </div>
            </div>
            <button
              id="dashboard-logout"
              onClick={onLogout}
              className="px-4 py-2 text-xs font-mono text-zinc-500 hover:text-white border border-white/10 hover:border-white/20 hover:bg-white/5 rounded-xl transition-all cursor-pointer font-bold"
            >
              LOGOUT
            </button>
          </div>
        </header>

        {/* Bento Grid Layout Area */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Column Left: High stakes CTAs + Profile Progression Summary */}
          <div className="lg:col-span-4 flex flex-col gap-6">
            {/* Action Card: Deploy AI Quiz */}
            <div className="relative glass-panel rounded-3xl p-6 overflow-hidden border border-white/10 group">
              <div className="absolute -right-12 -top-12 w-32 h-32 bg-blue-600/10 blur-2xl group-hover:scale-125 transition-all duration-300" />
              <div className="relative z-10 space-y-4">
                <div className="p-3 w-fit rounded-xl bg-blue-500/15 border border-blue-500/35 text-blue-400">
                  <Plus className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-display text-lg font-bold uppercase text-zinc-100 tracking-tight">Synthesize Quiz Room</h3>
                  <p className="text-xs text-zinc-400 mt-1 leading-relaxed">Configure an arena matches lobby using custom prompt inputs or Gemini AI compilers.</p>
                </div>
                <button
                  id="dashboard-btn-create"
                  onClick={onNavigateCreate}
                  className="w-full py-3.5 bg-white text-black font-black uppercase text-xs rounded-xl hover:scale-105 transition-transform flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(255,255,255,0.1)] cursor-pointer"
                >
                  Create Match Room
                  <ArrowUpRight className="w-4 h-4 stroke-[3]" />
                </button>
              </div>
            </div>

            {/* Action Card: Join Room Code */}
            <div className="relative glass-panel rounded-3xl p-6 overflow-hidden border border-white/10 group">
              <div className="absolute -right-12 -top-12 w-32 h-32 bg-indigo-600/10 blur-2xl group-hover:scale-125 transition-all duration-300" />
              <div className="relative z-10 space-y-4">
                <div className="p-3 w-fit rounded-xl bg-indigo-500/15 border border-indigo-500/35 text-indigo-400">
                  <DoorOpen className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-display text-lg font-bold uppercase text-zinc-100 tracking-tight font-sans">Enter Game Code</h3>
                  <p className="text-xs text-zinc-400 mt-1 leading-relaxed">Hook into a teammate's active session or participate in esports quiz matches.</p>
                </div>
                <button
                  id="dashboard-btn-join"
                  onClick={onNavigateJoin}
                  className="w-full py-3.5 bg-white/5 border border-white/10 text-white font-black uppercase text-xs rounded-xl hover:bg-white/10 hover:border-white/20 transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  Join via Room Code
                  <ChevronRight className="w-4 h-4 text-blue-400 stroke-[3]" />
                </button>
              </div>
            </div>

            {/* Core Stats Bento Item (Flame Streak & Played Counters) */}
            <div className="glass-panel rounded-3xl p-6 border border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-2xl bg-amber-400/10 text-amber-500">
                  <Flame className="w-6 h-6 animate-pulse" />
                </div>
                <div>
                  <div className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest leading-none font-bold">Answering Streak</div>
                  <div className="text-xl font-bold font-sans mt-1">{stats.streakDays} Days Strong</div>
                </div>
              </div>
              <div className="h-10 w-[1px] bg-white/10" />
              <div className="text-right">
                <div className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest leading-none font-bold">Combat Ratio</div>
                <div className="text-sm font-bold font-mono text-blue-400 mt-1">{stats.correctAnswersRate}% Acc</div>
              </div>
            </div>
          </div>

          {/* Column Center & Right: XP Progression Charts and Badge Rack */}
          <div className="lg:col-span-8 space-y-6">
            {/* XP Progression Bar Card */}
            <div className="glass-panel rounded-3xl p-6 border border-white/10 space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                <div>
                  <div className="text-[10px] font-mono text-indigo-400 uppercase tracking-widest font-bold">AGENT XP ACCUMULATION</div>
                  <h3 className="text-lg font-bold mt-1 max-sm:text-md uppercase tracking-tight text-zinc-100">Level {stats.level} &mdash; Arena Gladiator</h3>
                </div>
                <div className="text-right">
                  <span className="text-sm font-mono text-slate-300 font-bold">{stats.xp}</span>
                  <span className="text-xs font-mono text-zinc-500"> / {nextLevelXp} XP</span>
                </div>
              </div>

              {/* Progress Bar Container */}
              <div className="w-full h-3 bg-white/[0.02] border border-white/15 rounded-full overflow-hidden p-[2px]">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${levelPercentage}%` }}
                  transition={{ duration: 1.2, ease: "easeOut" }}
                  className="h-full rounded-full bg-gradient-to-r from-blue-500 via-indigo-500 to-rose-500"
                />
              </div>

              <div className="flex justify-between items-center text-[10px] font-mono font-bold text-zinc-500 uppercase tracking-wider">
                <span>LVL {stats.level}</span>
                <span className="text-blue-400">{Math.floor(nextLevelXp - stats.xp)} XP more until Rank Up</span>
                <span>LVL {stats.level + 1}</span>
              </div>
            </div>

            {/* Performance Chart & History Split */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Custom SVG Line Performance Curve (Mimics D3) */}
              <div className="glass-panel rounded-3xl p-6 border border-white/10 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between font-mono font-bold">
                    <div className="text-[10px] text-blue-400 uppercase tracking-wider">Scoring Stability</div>
                    <BarChart2 className="w-4 h-4 text-zinc-500" />
                  </div>
                  <h4 className="font-display text-sm font-bold text-slate-200 mt-1 uppercase tracking-tight">Accuracy Trajectory</h4>
                </div>

                {/* Styled SVG Chart */}
                <div className="relative h-32 w-full my-4">
                  <svg className="w-full h-full" viewBox="0 0 100 40" preserveAspectRatio="none">
                    <defs>
                      <linearGradient id="chartGlow" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.4" />
                        <stop offset="100%" stopColor="#4f46e5" stopOpacity="0" />
                      </linearGradient>
                    </defs>
                    {/* Horizontal Guidelines */}
                    <line x1="0" y1="10" x2="100" y2="10" stroke="#ffffff" strokeWidth="0.05" strokeDasharray="1,1" />
                    <line x1="0" y1="20" x2="100" y2="20" stroke="#ffffff" strokeWidth="0.05" strokeDasharray="1,1" />
                    <line x1="0" y1="30" x2="100" y2="30" stroke="#ffffff" strokeWidth="0.05" strokeDasharray="1,1" />

                    {/* Gradient Area under curve */}
                    <path 
                      d="M 0 35 Q 20 28, 40 22 T 80 12 T 100 8 L 100 40 L 0 40 Z" 
                      fill="url(#chartGlow)" 
                    />

                    {/* Accurate SVG Line */}
                    <path 
                      d="M 0 35 Q 20 28, 40 22 T 80 12 T 100 8" 
                      fill="none" 
                      stroke="url(#chartLineGrad)" 
                      strokeWidth="0.75" 
                    />
                    <linearGradient id="chartLineGrad" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#3b82f6" />
                      <stop offset="50%" stopColor="#4f46e5" />
                      <stop offset="100%" stopColor="#f43f5e" />
                    </linearGradient>

                    {/* Node Data Markers */}
                    <circle cx="40" cy="22" r="1" fill="#4f46e5" className="animate-pulse" />
                    <circle cx="80" cy="12" r="1" fill="#f43f5e" className="animate-pulse" />
                    <circle cx="100" cy="8" r="1.2" fill="#3b82f6" />
                  </svg>
                  <div className="absolute top-2 left-2 text-[8px] font-mono text-zinc-500 font-bold">100% CORRECT</div>
                  <div className="absolute bottom-2 left-2 text-[8px] font-mono text-zinc-500 font-bold">0% ACC</div>
                </div>

                <div className="flex items-center justify-between text-[11px] font-mono text-zinc-500 font-bold">
                  <span>Match 1</span>
                  <span>Match {stats.gamesPlayed} (Current)</span>
                </div>
              </div>

              {/* Tournament History Ledger */}
              <div className="glass-panel rounded-3xl p-6 border border-white/10 space-y-4">
                <div className="flex items-center justify-between font-mono font-bold">
                  <div className="text-[10px] text-zinc-400 uppercase tracking-wider">Tournament Ledger</div>
                  <span className="text-[10px] text-zinc-550">{stats.gamesPlayed} match sessions</span>
                </div>
                <h4 className="font-display text-sm font-bold text-slate-200 leading-none uppercase tracking-tight">Activity History</h4>

                <div className="space-y-3">
                  {HISTORY_LOGS.map((item, idx) => (
                    <div 
                      key={idx} 
                      className="flex items-center justify-between p-2.5 bg-white/[0.01] border border-white/5 rounded-xl hover:bg-white/[0.03] transition-all"
                    >
                      <div className="space-y-0.5">
                        <div className="text-xs font-semibold text-white">{item.room}</div>
                        <div className="text-[9px] font-mono text-zinc-500 font-bold">{item.date} &middot; {item.score}</div>
                      </div>
                      <div className="text-right">
                        <span className={`text-[9px] font-mono font-bold uppercase tracking-widest px-2 py-1 rounded border ${
                          item.status === "win" 
                            ? "bg-blue-400/10 text-blue-400 border-blue-500/20" 
                            : item.status === "runnerup" 
                              ? "bg-indigo-400/10 text-indigo-400 border-indigo-500/20" 
                              : "bg-slate-800/40 text-slate-500 border-white/5"
                        }`}>
                          {item.rank}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Achievement Cabinet Drawer / Bento Grid Panel */}
            <div className="glass-panel rounded-3xl p-6 border border-white/10 space-y-4">
              <div className="flex justify-between items-center">
                <div className="text-[10px] font-mono text-blue-400 uppercase tracking-wider font-bold">Cabinet Unlock Status</div>
                <div className="flex items-center gap-1">
                  <Award className="w-3.5 h-3.5 text-amber-400" />
                  <span className="text-xs font-mono text-amber-400 font-bold">{stats.badges.length} Obtained</span>
                </div>
              </div>
              <h4 className="font-display text-sm font-bold uppercase tracking-tight text-zinc-100">Cabinet of Achievements</h4>

              {/* Badge visual shelf */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {stats.badges.map((b) => (
                  <div 
                    key={b.id} 
                    className="p-4 bg-white/[0.02] hover:bg-white/[0.04] border border-white/10 rounded-3xl flex flex-col items-center text-center space-y-2 transition-all hover:scale-105"
                  >
                    <span className="text-3xl filter drop-shadow-[0_4px_10px_rgba(59,130,246,0.35)]">{b.icon}</span>
                    <div>
                      <div className="text-xs font-semibold text-white leading-tight">{b.name}</div>
                      <div className="text-[9px] font-mono text-zinc-500 mt-1 uppercase leading-none font-bold">{b.rarity}</div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Achievements Track progressions */}
              <div className="pt-4 border-t border-white/5 grid sm:grid-cols-3 gap-4">
                {stats.achievements.map((a) => (
                  <div key={a.id} className="space-y-1.5 p-3 rounded-xl bg-white/[0.01] border border-white/5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400 flex items-center gap-1">
                        <span>{a.icon}</span>
                        <span className="font-semibold text-[11px] truncate">{a.name}</span>
                      </span>
                      <span className="font-mono text-[10px] text-zinc-500 font-bold">{a.progress}/{a.target}</span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-blue-600" 
                        style={{ width: `${(a.progress / a.target) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
