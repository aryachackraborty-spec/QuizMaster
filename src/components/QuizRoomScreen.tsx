import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Plus, ArrowLeft, Cpu, Shield, Sparkles, Sliders, Play, DoorOpen, 
  RotateCw, ArrowRight, CheckCircle2, AlertTriangle, MessageSquare, Copy 
} from "lucide-react";
import { Room, Player } from "../types";
import { subscribeToRoomMultiplayer } from "../lib/firebaseService";
import { auth } from "../lib/firebase";

interface QuizRoomScreenProps {
  username: string;
  avatar: string;
  initialMode: "create" | "join";
  onBackToDashboard: () => void;
  onGameStarted: (roomCode: string, player: Player) => void;
}

const TEMPLATES = [
  { id: "silicon-valley", title: "Silicon Valley Giants", desc: "Tech history, investment lore, and startup pivots", icon: "🏢", difficulty: "Medium" },
  { id: "web-engine", title: "Elite Web Engineering", desc: "Critical paint paths, fiber algorithms, browser engines", icon: "🌐", difficulty: "Hard" },
  { id: "cyberpunk", title: "Cyberpunk Tech & Hacks", desc: "Neural augmentation, deep Net lore, digital combat", icon: "🦾", difficulty: "Medium" },
];

export default function QuizRoomScreen({ username, avatar, initialMode, onBackToDashboard, onGameStarted }: QuizRoomScreenProps) {
  const [subview, setSubview] = useState<"create" | "join" | "lobby">(initialMode);
  
  // Create state parameters
  const [createMode, setCreateMode] = useState<"template" | "ai">("template");
  const [selectedTemplate, setSelectedTemplate] = useState("silicon-valley");
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiDifficulty, setAiDifficulty] = useState<"Easy" | "Medium" | "Hard">("Medium");
  const [generating, setGenerating] = useState(false);
  const [errorHeader, setErrorHeader] = useState("");

  // Join state parameters
  const [joinCode, setJoinCode] = useState("");
  const [joining, setJoining] = useState(false);

  // Active Lobby State
  const [currentRoom, setCurrentRoom] = useState<Room | null>(null);
  const [myPlayerProfile, setMyPlayerProfile] = useState<Player | null>(null);
  const [starting, setStarting] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  // Lobby Sync real-time Subscribe Effect
  useEffect(() => {
    if (subview !== "lobby" || !currentRoom) return;

    const unsubscribe = subscribeToRoomMultiplayer(
      currentRoom.code,
      (updatedRoom) => {
        setCurrentRoom(updatedRoom);
        
        // Find my profile inside updated players list
        const me = updatedRoom.players.find((p) => p.username === username);
        if (me) {
          setMyPlayerProfile(me);
          // Check if game status transitioned to Active externally
          if (updatedRoom.status === "active") {
            onGameStarted(updatedRoom.code, me);
          }
        }
      },
      (err) => console.error("Lobby subscription error: ", err)
    );

    return () => unsubscribe();
  }, [subview, currentRoom?.code, username, onGameStarted]);

  // Handle Create Room
  const handleCreateRoom = async () => {
    setErrorHeader("");
    setGenerating(true);

    try {
      const response = await fetch("/api/rooms/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: createMode,
          templateId: selectedTemplate,
          category: createMode === "ai" ? aiPrompt : "",
          difficulty: aiDifficulty,
          customPrompt: aiPrompt,
          creatorUsername: username,
          quizTitle: createMode === "ai" ? `AI Synthesis: ${aiPrompt || "The Cosmos"}` : "",
        }),
      });

      const data = await response.json();
      if (data.success) {
        setCurrentRoom(data.room);
        // Find creator in player pool
        const me = data.room.players.find((p: Player) => !p.isBot);
        setMyPlayerProfile(me || null);
        setSubview("lobby");
      } else {
        setErrorHeader(data.error || "Generation grid failed.");
      }
    } catch (err) {
      setErrorHeader("Failing connection to server neural synthesizer.");
    } finally {
      setGenerating(false);
    }
  };

  // Handle Join Room
  const handleJoinRoom = async () => {
    if (joinCode.length < 4) return;
    setErrorHeader("");
    setJoining(true);

    try {
      const response = await fetch(`/api/rooms/${joinCode}/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, avatar }),
      });

      const data = await response.json();
      if (data.success) {
        setCurrentRoom(data.room);
        setMyPlayerProfile(data.player);
        setSubview("lobby");
      } else {
        setErrorHeader(data.error || "Room registration failed.");
      }
    } catch (err) {
      setErrorHeader("Neural grid lookup error.");
    } finally {
      setJoining(false);
    }
  };

  // Trigger Start Game (Admin)
  const handleStartGame = async () => {
    if (!currentRoom) return;
    setStarting(true);

    try {
      const response = await fetch(`/api/rooms/${currentRoom.code}/start`, {
        method: "POST",
      });
      const data = await response.json();
      if (data.success && myPlayerProfile) {
        onGameStarted(currentRoom.code, myPlayerProfile);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setStarting(false);
    }
  };

  // Copy Code to Clipboard easily
  const handleCopyCode = () => {
    if (!currentRoom) return;
    navigator.clipboard.writeText(currentRoom.code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  return (
    <div className="relative min-h-screen bg-[#020203] text-zinc-100 py-12 px-4 sm:px-6 lg:px-8 overflow-hidden flex flex-col justify-center">
      {/* Dynamic ambient effects */}
      <div className="absolute rounded-full w-[450px] h-[450px] bg-blue-600/15 blur-[130px] top-10 left-10 animate-aurora-glow-1 pointer-events-none" />
      <div className="absolute rounded-full w-[450px] h-[450px] bg-rose-600/10 blur-[130px] bottom-10 right-10 animate-aurora-glow-2 pointer-events-none" />
      <div className="absolute inset-0 laser-grid-bg pointer-events-none opacity-20" />

      <div className="relative max-w-4xl w-full mx-auto z-10">
        
        {/* VIEW 1: CREATE ROOM */}
        {subview === "create" && (
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="glass-panel rounded-3xl p-8 border border-white/10 shadow-2xl space-y-6"
          >
            {/* Header row */}
            <div className="flex items-center justify-between pb-4 border-b border-white/5">
              <button
                onClick={onBackToDashboard}
                className="flex items-center gap-2 text-xs font-mono text-zinc-400 hover:text-white cursor-pointer font-bold"
              >
                <ArrowLeft className="w-4 h-4" /> BACK TO CONTROL HUB
              </button>
              <div className="text-right">
                <span className="text-[10px] font-mono text-blue-400 uppercase tracking-widest font-bold">SYNTHESIST NODE</span>
              </div>
            </div>

            <div className="space-y-2">
              <h2 className="text-2xl font-display font-bold text-zinc-100 uppercase tracking-tight flex items-center gap-3">
                <Plus className="w-7 h-7 text-blue-500" /> Configure Arena Lobby
              </h2>
              <p className="text-xs text-zinc-400">Assemble an active quiz lobby. Select from calibrated libraries or trigger AI synthesis.</p>
            </div>

            {errorHeader && (
              <div className="p-4 bg-red-500/15 border border-red-500/30 text-xs font-mono text-red-400 rounded-xl flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" /> {errorHeader}
              </div>
            )}

            {/* Selector creation Mode Tabs */}
            <div className="flex bg-white/[0.03] border border-white/10 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setCreateMode("template")}
                className={`flex-1 py-3 text-xs uppercase tracking-wider font-mono font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-2 ${
                  createMode === "template" ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20" : "text-slate-400 hover:text-white"
                }`}
              >
                🏆 Pre-defined Library
              </button>
              <button
                type="button"
                onClick={() => setCreateMode("ai")}
                className={`flex-1 py-3 text-xs uppercase tracking-wider font-mono font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-2 ${
                  createMode === "ai" ? "bg-blue-600/20 border border-blue-500 text-white shadow-lg" : "text-slate-400 hover:text-white"
                }`}
              >
                <Cpu className="w-4 h-4 text-blue-400 animate-pulse" /> Gemini AI Synthesizer
              </button>
            </div>

            {/* OPTION A: PREDEFINED TEMPLATE SELECTION */}
            {createMode === "template" && (
              <div className="grid md:grid-cols-3 gap-4">
                {TEMPLATES.map((t) => (
                  <div
                    key={t.id}
                    onClick={() => setSelectedTemplate(t.id)}
                    className={`relative p-5 rounded-3xl border transition-all cursor-pointer flex flex-col justify-between h-44 ${
                      selectedTemplate === t.id
                        ? "bg-blue-600/10 border-blue-500 neon-border-blue"
                        : "bg-white/[0.02] border-white/5 hover:bg-white/[0.04] hover:border-white/10"
                    }`}
                  >
                    <div className="space-y-2">
                      <span className="text-3xl">{t.icon}</span>
                      <h4 className="font-sans font-bold text-base text-zinc-100 uppercase tracking-tight">{t.title}</h4>
                      <p className="text-xs text-zinc-400 leading-normal">{t.desc}</p>
                    </div>
                    <div className="flex justify-between items-center pt-2 border-t border-white/5">
                      <span className="text-[10px] font-mono text-zinc-500 font-bold">DIFFICULTY</span>
                      <span className="text-[10px] font-mono text-blue-400 font-bold uppercase">{t.difficulty}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* OPTION B: AI GENERATIVE SCHEMA MODULE */}
            {createMode === "ai" && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-4 p-5 bg-white/[0.02] border border-white/10 rounded-3xl"
              >
                <div className="flex items-center gap-2 mb-2 font-mono">
                  <Sparkles className="w-5 h-5 text-blue-400 animate-pulse" />
                  <span className="text-xs font-bold text-blue-400 tracking-wider">GEMINI SYNTHESIS INPUT MATRIX</span>
                </div>
                
                <div>
                  <label className="block text-xs font-mono uppercase text-zinc-400 tracking-wider mb-2 font-bold">
                    Describe any Category, Codebase, or Lore
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={70}
                    placeholder="e.g. Next.js 15 Server Actions, Valorant Agent Abilities, MCU Phase 4 Trivia..."
                    value={aiPrompt}
                    onChange={(e) => setAiPrompt(e.target.value)}
                    className="w-full bg-white/[0.02] border border-white/10 rounded-xl py-3.5 px-4 text-sm text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 transition-all placeholder:text-zinc-700 font-medium"
                  />
                </div>

                {/* Difficulty selector neon buttons */}
                <div>
                  <label className="block text-xs font-mono uppercase text-zinc-400 tracking-wider mb-2 font-bold">
                    Target Difficulty Calibration
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    {["Easy", "Medium", "Hard"].map((diff) => (
                      <button
                        key={diff}
                        type="button"
                        onClick={() => setAiDifficulty(diff as any)}
                        className={`py-2.5 rounded-xl font-mono text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                          aiDifficulty === diff
                            ? "bg-blue-600/20 border border-blue-500 text-blue-400 shadow-sm shadow-blue-500/15"
                            : "bg-white/[0.01] border border-white/5 text-slate-400 hover:text-white"
                        }`}
                      >
                        {diff}
                      </button>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {/* Launch Action */}
            <button
              id="room-create-submit"
              onClick={handleCreateRoom}
              disabled={generating || (createMode === "ai" && !aiPrompt)}
              className="w-full py-4 bg-white text-black font-black uppercase text-xs rounded-xl hover:scale-105 transition-transform cursor-pointer flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(255,255,255,0.1)]"
            >
              {generating ? (
                <>
                  <RotateCw className="w-5 h-5 animate-spin text-slate-900" />
                  <span>Synthesizing Arena with Gemini AI...</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-current text-black" />
                  <span>Deploy and Seed Match Lobby</span>
                </>
              )}
            </button>
          </motion.div>
        )}

        {/* VIEW 2: JOIN ROOM CODE ENTRY */}
        {subview === "join" && (
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="glass-panel rounded-3xl p-8 border border-white/10 shadow-2xl max-w-md mx-auto space-y-6"
          >
            {/* Header row */}
            <div className="flex items-center justify-between pb-4 border-b border-white/5">
              <button
                onClick={onBackToDashboard}
                className="flex items-center gap-2 text-xs font-mono text-zinc-500 hover:text-white cursor-pointer font-bold"
              >
                <ArrowLeft className="w-4 h-4" /> BACK
              </button>
              <span className="text-[10px] font-mono text-blue-400 uppercase tracking-widest font-bold">GATEWAY ACTIVE</span>
            </div>

            <div className="text-center space-y-2">
              <div className="inline-flex p-3 rounded-2xl bg-blue-500/15 border border-blue-500/35 text-blue-400 mx-auto">
                <DoorOpen className="w-6 h-6" />
              </div>
              <h2 className="text-xl font-bold font-sans uppercase tracking-tight text-zinc-100">Enter Arena Code</h2>
              <p className="text-xs text-zinc-400">Key in the 4-digit room token generated by your tournament coordinator.</p>
            </div>

            {errorHeader && (
              <div className="p-3.5 bg-red-500/10 border border-red-500/20 text-xs text-red-400 font-mono rounded-xl flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" /> {errorHeader}
              </div>
            )}

            {/* Stylized code input */}
            <div>
              <input
                id="join-code-input"
                type="text"
                maxLength={4}
                required
                placeholder="ABCD"
                value={joinCode.toUpperCase()}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                className="w-full text-center bg-white/[0.02] border-2 border-white/10 rounded-2xl py-4 text-3xl font-display font-medium tracking-[0.4em] text-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all placeholder:text-zinc-850 font-sans"
              />
            </div>

            {/* Launch Join */}
            <button
              id="room-join-submit"
              onClick={handleJoinRoom}
              disabled={joining || joinCode.length < 4}
              className="w-full py-4 bg-white text-black font-black uppercase text-xs rounded-xl hover:scale-105 transition-transform cursor-pointer flex items-center justify-center gap-1.5 shadow-[0_0_20px_rgba(255,255,255,0.1)]"
            >
              {joining ? (
                <RotateCw className="w-5 h-5 animate-spin text-slate-900" />
              ) : (
                <>
                  <span>Breach Match Lobbies</span>
                  <ArrowRight className="w-4 h-4 stroke-[3]" />
                </>
              )}
            </button>
          </motion.div>
        )}

        {/* VIEW 3: WAITING LOBBY QUEUE ROOM */}
        {subview === "lobby" && currentRoom && (
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="grid lg:grid-cols-12 gap-8"
          >
            {/* Left Box: Room Details + Player Queue */}
            <div className="lg:col-span-8 glass-panel rounded-3xl p-8 border border-white/10 shadow-2xl space-y-6">
              
              {/* Room details header */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-white/5">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono bg-blue-500/10 text-blue-400 px-2.5 py-1 rounded-full border border-blue-500/20 font-bold uppercase tracking-wider">
                      {currentRoom.category}
                    </span>
                    <span className="text-[10px] font-mono bg-zinc-800 text-zinc-350 px-2.5 py-1 rounded-full border border-white/10 font-bold uppercase tracking-wider">
                      {currentRoom.difficulty}
                    </span>
                  </div>
                  <h2 className="text-xl font-display font-bold text-zinc-100 uppercase tracking-tight mt-3">{currentRoom.quizTitle}</h2>
                  <p className="text-xs text-zinc-400 mt-1">{currentRoom.description}</p>
                </div>

                {/* Styled invite code trigger badge */}
                <div 
                  onClick={handleCopyCode}
                  className="bg-white/[0.03] border border-white/10 hover:border-blue-500 p-3 rounded-2xl flex items-center gap-3 cursor-pointer group transition-all"
                >
                  <div className="text-left leading-none font-mono">
                    <span className="text-[9px] text-zinc-500 block uppercase tracking-widest font-bold">ROOM TOKEN</span>
                    <span className="text-xl font-bold font-sans text-white mt-1.5 tracking-wider block">{currentRoom.code}</span>
                  </div>
                  <div className="p-2 bg-white/5 rounded-xl text-slate-400 group-hover:text-blue-400 transition-all">
                    {copiedCode ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  </div>
                </div>
              </div>

              {/* Lobby List Queue */}
              <div className="space-y-4">
                <div className="flex items-center justify-between font-mono text-xs font-bold">
                  <span className="text-zinc-500 uppercase tracking-wider flex items-center gap-2">
                    Arena Match Lobby Queue ({currentRoom.players.length}/6)
                  </span>
                  <span className="text-zinc-550 uppercase tracking-widest">60 FPS REAL-TIME SYNC</span>
                </div>

                <div className="grid sm:grid-cols-2 gap-3">
                  {currentRoom.players.map((p) => {
                    const isMyAccount = p.id === myPlayerProfile?.id;
                    return (
                      <div 
                        key={p.id}
                        className={`p-3.5 rounded-3xl border flex items-center justify-between ${
                          isMyAccount 
                            ? "bg-blue-600/10 border-blue-500/40" 
                            : p.isBot 
                              ? "bg-white/[0.01] border-white/5 opacity-80" 
                              : "bg-white/[0.02] border-white/10"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                           <span className="text-2xl">{p.avatar}</span>
                          <div>
                            <span className="text-sm font-semibold flex items-center gap-1.5 text-white">
                              {p.username}
                              {isMyAccount && <span className="text-[9px] font-mono text-blue-400 bg-blue-500/15 px-1.5 py-0.5 rounded font-bold">YOU</span>}
                            </span>
                            <span className="text-[10px] font-mono text-zinc-500 font-bold">{p.isBot ? "challenger_bot" : "contender"}</span>
                          </div>
                        </div>

                        <div>
                          <span className={`text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                            p.isReady ? "bg-emerald-500/10 text-emerald-400" : "bg-amber-500/10 text-amber-400"
                          }`}>
                            {p.isReady ? "READY" : "WAITING"}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Action Start Host Controls */}
              <div className="pt-4 border-t border-white/5 flex gap-4">
                <button
                  onClick={() => setSubview("create")}
                  className="px-5 py-4 rounded-xl text-xs font-mono border border-white/10 hover:border-white/20 hover:bg-white/5 text-slate-400 hover:text-white transition-all cursor-pointer uppercase tracking-wider"
                >
                  Configure New Room
                </button>
                <button
                  id="room-start-match"
                  onClick={handleStartGame}
                  disabled={starting || currentRoom.players.length < 1}
                  className="flex-1 py-4 bg-white text-black font-black uppercase text-xs rounded-xl hover:scale-105 transition-transform cursor-pointer flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(255,255,255,0.1)] active:scale-95"
                >
                  <Play className="w-5 h-5 fill-current text-black stroke-[3]" />
                  <span>ACTIVATE COMBAT MATRIX</span>
                </button>
              </div>

            </div>

            {/* Right Box: Arena Combat Activity Logs & Chat logs */}
            <div className="lg:col-span-4 glass-panel rounded-3xl p-6 border border-white/10 flex flex-col justify-between h-[510px]">
              <div className="space-y-4">
                <div className="flex items-center gap-2 pb-3 border-b border-white/5 font-mono font-bold">
                  <MessageSquare className="w-4 h-4 text-blue-400" />
                  <span className="text-xs text-blue-400 uppercase tracking-wider">ARENA TRANSMISSION SIGNALS</span>
                </div>

                {/* Messages Feed scrolling */}
                <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
                  {currentRoom.activityFeed.map((f, i) => (
                    <div key={i} className="text-xs font-mono text-zinc-400 leading-relaxed border-l border-white/10 pl-2.5">
                      <span className="text-zinc-600 font-mono text-[9px] block mb-0.5">[{new Date().toLocaleTimeString()}]</span>
                      <span>{f}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="text-[9px] font-mono text-zinc-500 text-center leading-normal uppercase font-bold">
                Active contestants simulate live rounds upon matrix boot. Ready your fingers.
              </div>
            </div>
          </motion.div>
        )}

      </div>
    </div>
  );
}
