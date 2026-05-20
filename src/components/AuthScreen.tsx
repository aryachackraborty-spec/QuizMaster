import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Sparkles, Trophy, Eye, EyeOff, Key, User, Mail, ArrowRight, UserPlus, Fingerprint } from "lucide-react";

interface AuthScreenProps {
  onSuccess: (username: string, avatar: string) => void;
  onBack: () => void;
}

const AVAILABLE_AVATARS = ["⚡", "👑", "🦊", "👽", "🚀", "🐼", "🦄", "🛡️", "🎮", "🥋", "💀", "🧬", "🧪", "🍕", "🧙‍♂️", "🤖"];

export default function AuthScreen({ onSuccess, onBack }: AuthScreenProps) {
  const [activeTab, setActiveTab] = useState<"login" | "signup" | "guest">("guest");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [selectedAvatar, setSelectedAvatar] = useState("⚡");
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [loading, setLoading] = useState(false);

  // Form submit handler
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    const targetUsername = username.trim() || (activeTab === "guest" ? `guest_${Math.floor(Math.random() * 9000) + 1000}` : "");
    if (!targetUsername && activeTab !== "login") {
      setErrorMsg("Please choose a contestant username.");
      return;
    }

    if (activeTab === "signup" && !email.includes("@")) {
      setErrorMsg("Please enter a valid developer email.");
      return;
    }

    if ((activeTab === "login" || activeTab === "signup") && password.length < 5) {
      setErrorMsg("Combat keyword/password must be at least 5 characters.");
      return;
    }

    setLoading(true);

    // Simulate short network delay for hackathon performance feel
    setTimeout(() => {
      setLoading(false);
      onSuccess(targetUsername || "admin_contender", selectedAvatar);
    }, 1000);
  };

  return (
    <div className="relative min-h-screen bg-[#020203] text-zinc-100 flex flex-col justify-center items-center py-12 px-4 sm:px-6 lg:px-8 overflow-hidden">
      {/* Background Orbs */}
      <div className="absolute pointer-events-none rounded-full w-[350px] h-[350px] bg-blue-600/20 blur-[100px] animate-aurora-glow-1 top-10 left-15" />
      <div className="absolute pointer-events-none rounded-full w-[350px] h-[350px] bg-rose-600/10 blur-[100px] animate-aurora-glow-2 bottom-10 right-15" />
      <div className="absolute inset-0 laser-grid-bg pointer-events-none opacity-20" />

      {/* Floating Header */}
      <div className="absolute top-8 flex items-center gap-2 cursor-pointer z-25" onClick={onBack}>
        <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center font-black italic text-lg shadow-[0_0_20px_rgba(37,99,235,0.4)]">Q</div>
        <span className="font-display text-lg font-bold">Quiz<span className="text-blue-500">Master</span> Arena</span>
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="relative max-w-md w-full glass-panel rounded-3xl p-8 border border-white/10 shadow-2xl z-10"
      >
        {/* Neon Glow Highlights */}
        <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-blue-500/60 to-transparent" />

        {/* Brand visual header */}
        <div className="text-center mb-6">
          <div className="inline-flex p-3 rounded-2xl bg-blue-500/15 border border-blue-500/35 text-blue-400 mb-3">
            <Fingerprint className="w-6 h-6 animate-pulse" />
          </div>
          <h2 className="text-2xl font-bold font-display uppercase tracking-tight text-zinc-100">Contender Sync</h2>
          <p className="text-xs font-mono text-zinc-500 uppercase font-bold mt-1">Unlock server stats & achievement cabinet</p>
        </div>

        {/* Tab Selector */}
        <div className="flex bg-white/[0.03] border border-white/10 p-1 rounded-xl mb-6">
          {(["guest", "login", "signup"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => {
                setActiveTab(tab);
                setErrorMsg("");
              }}
              className={`flex-1 py-2 text-xs font-mono font-medium rounded-lg uppercase tracking-wider transition-all cursor-pointer ${
                activeTab === tab
                  ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              {tab === "guest" ? "Guest Play" : tab}
            </button>
          ))}
        </div>

        {errorMsg && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4 p-3.5 bg-brand-pink/10 border border-brand-pink/30 text-xs text-brand-pink rounded-xl flex items-center gap-2"
          >
            <span className="w-2 h-2 rounded-full bg-brand-pink animate-ping" />
            <span className="font-mono">{errorMsg}</span>
          </motion.div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <AnimatePresence mode="wait">
            {activeTab === "guest" && (
              <motion.div
                key="guest-form"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                className="space-y-4"
              >
                <div>
                  <label className="block text-xs font-mono uppercase text-slate-400 tracking-wider mb-2">
                    Hero Username (Optional)
                  </label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input
                      type="text"
                      placeholder="e.g. hackathon_king"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="w-full bg-white/[0.02] border border-white/10 rounded-xl py-3 pl-11 pr-4 text-sm text-white focus:outline-none focus:border-brand-cyan focus:ring-1 focus:ring-brand-cyan/20 transition-all placeholder:text-slate-600"
                    />
                  </div>
                </div>

                {/* Avatar Picker GRID */}
                <div>
                  <label className="block text-xs font-mono uppercase text-slate-400 tracking-wider mb-2">
                    Select Identity Sigil / Avatar
                  </label>
                  <div className="grid grid-cols-4 xs:grid-cols-6 sm:grid-cols-8 gap-1.5 sm:gap-2 p-2.5 sm:p-3 bg-white/[0.02] border border-white/5 rounded-2xl justify-items-center">
                    {AVAILABLE_AVATARS.map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => setSelectedAvatar(emoji)}
                        className={`w-8 h-8 xs:w-9 xs:h-9 flex items-center justify-center text-base xs:text-lg rounded-xl transition-all hover:bg-white/5 active:scale-95 cursor-pointer ${
                          selectedAvatar === emoji
                            ? "bg-blue-600/20 border border-blue-500 shadow-md shadow-blue-500/10 scale-110"
                            : "border border-transparent"
                        }`}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === "login" && (
              <motion.div
                key="login-form"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                className="space-y-4"
              >
                <div>
                  <label className="block text-xs font-mono uppercase text-slate-400 tracking-wider mb-2">
                    Email or Codename
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input
                      type="email"
                      required
                      placeholder="developers@silicon.valley"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-white/[0.02] border border-white/10 rounded-xl py-3 pl-11 pr-4 text-sm text-white focus:outline-none focus:border-brand-cyan focus:ring-1 focus:ring-brand-cyan/20 transition-all placeholder:text-slate-600"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-mono uppercase text-slate-400 tracking-wider mb-2">
                    Keyword Password
                  </label>
                  <div className="relative">
                    <Key className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full bg-white/[0.02] border border-white/10 rounded-xl py-3 pl-11 pr-11 text-sm text-white focus:outline-none focus:border-brand-cyan focus:ring-1 focus:ring-brand-cyan/20 transition-all placeholder:text-slate-600"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-white transition-all cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === "signup" && (
              <motion.div
                key="signup-form"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                className="space-y-4"
              >
                <div>
                  <label className="block text-xs font-mono uppercase text-slate-400 tracking-wider mb-2">
                    Contender Handle
                  </label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input
                      type="text"
                      required
                      placeholder="framer_god"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="w-full bg-white/[0.02] border border-white/10 rounded-xl py-3 pl-11 pr-4 text-sm text-white focus:outline-none focus:border-brand-cyan focus:ring-1 focus:ring-brand-cyan/20 transition-all placeholder:text-slate-600"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-mono uppercase text-slate-400 tracking-wider mb-2">
                    Developer Email
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input
                      type="email"
                      required
                      placeholder="you@framer.vision"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-white/[0.02] border border-white/10 rounded-xl py-3 pl-11 pr-4 text-sm text-white focus:outline-none focus:border-brand-cyan focus:ring-1 focus:ring-brand-cyan/20 transition-all placeholder:text-slate-600"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-mono uppercase text-slate-400 tracking-wider mb-2">
                    Secure Password
                  </label>
                  <div className="relative">
                    <Key className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full bg-white/[0.02] border border-white/10 rounded-xl py-3 pl-11 pr-11 text-sm text-white focus:outline-none focus:border-brand-cyan focus:ring-1 focus:ring-brand-cyan/20 transition-all placeholder:text-slate-600"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-white transition-all cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Micro avatar picker for signup too */}
                <div>
                  <label className="block text-xs font-mono uppercase text-slate-400 tracking-wider mb-2">
                    Sigil Avatar
                  </label>
                  <div className="flex gap-2 p-2 bg-white/[0.02] border border-white/5 rounded-xl justify-between overflow-x-auto">
                    {AVAILABLE_AVATARS.slice(0, 8).map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => setSelectedAvatar(emoji)}
                        className={`w-8 h-8 flex items-center justify-center text-sm rounded-lg transition-all hover:bg-white/5 cursor-pointer ${
                          selectedAvatar === emoji ? "bg-blue-600/30 border border-blue-500" : ""
                        }`}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Action Button */}
          <button
            id="auth-submit-btn"
            type="submit"
            disabled={loading}
            className="w-full mt-6 py-4 bg-white text-black font-black uppercase text-xs rounded-xl hover:scale-105 transition-transform cursor-pointer flex items-center justify-center gap-2 tracking-wide shadow-[0_0_20px_rgba(255,255,255,0.1)]"
          >
            {loading ? (
              <span className="w-5 h-5 border-2 border-slate-900/20 border-t-slate-950 rounded-full animate-spin" />
            ) : (
              <>
                {activeTab === "guest" && (
                  <>
                    <Sparkles className="w-4 h-4 text-amber-500 fill-amber-500 animate-pulse" />
                    Initiate Guest Sequence
                  </>
                )}
                {activeTab === "login" && (
                  <>
                    <Fingerprint className="w-4 h-4 text-zinc-800" />
                    Sync Profile Core
                  </>
                )}
                {activeTab === "signup" && (
                  <>
                    <UserPlus className="w-4 h-4 text-zinc-800" />
                    Establish Contender ID
                  </>
                )}
                <ArrowRight className="w-4 h-4 stroke-[3]" />
              </>
            )}
          </button>
        </form>

        <div className="mt-6 pt-5 border-t border-white/5 text-center">
          <button
            type="button"
            id="auth-back-btn"
            onClick={onBack}
            className="text-xs font-mono text-slate-500 hover:text-slate-400 transition-all cursor-pointer uppercase tracking-wider"
          >
            &larr; Return to main portal
          </button>
        </div>
      </motion.div>
    </div>
  );
}
