import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Sparkles, Trophy, Eye, EyeOff, Key, User, Mail, ArrowRight, UserPlus, Fingerprint, HelpCircle } from "lucide-react";
import { auth, googleProvider } from "../lib/firebase";
import { 
  signInAnonymously, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signInWithPopup
} from "firebase/auth";
import { getOrCreateUserProfile } from "../lib/firebaseService";

interface AuthScreenProps {
  onSuccess: (username: string, avatar: string, bypass?: boolean) => void;
  onBack: () => void;
}

const AVAILABLE_AVATARS = ["⚡", "👑", "🦊", "👽", "🚀", "🐼", "🦄", "🛡️", "🎮", "🥋", "💀", "🧬", "🧪", "🍕", "🧙‍♂️", "🤖"];

export default function AuthScreen({ onSuccess, onBack }: AuthScreenProps) {
  const [activeTab, setActiveTab] = useState<"login" | "signup">("login");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [selectedAvatar, setSelectedAvatar] = useState("⚡");
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const [isOperationNotAllowed, setIsOperationNotAllowed] = useState(false);

  // Form submit handler with Live Firebase Integration
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    const targetUsername = username.trim();
    if (!targetUsername && activeTab === "signup") {
      setErrorMsg("Please choose a contestant username.");
      return;
    }

    if (activeTab === "signup" && !email.includes("@")) {
      setErrorMsg("Please enter a valid developer email.");
      return;
    }

    if (password.length < 5) {
      setErrorMsg("Combat keyword/password must be at least 5 characters.");
      return;
    }

    setLoading(true);
    setIsOperationNotAllowed(false);

    try {
      if (activeTab === "signup") {
        // 1. Create actual Email / Password account
        try {
          const userCredential = await createUserWithEmailAndPassword(auth, email.trim(), password);
          const user = userCredential.user;
          // Create profile document
          await getOrCreateUserProfile(user.uid, targetUsername, selectedAvatar);
          setLoading(false);
          onSuccess(targetUsername, selectedAvatar);
        } catch (signupErr: any) {
          if (signupErr.code === "auth/operation-not-allowed") {
            console.warn("Firebase Email/Password Auth is disabled on this project. Diverting seamlessly to Local Sandbox mode.");
            setLoading(false);
            onSuccess(targetUsername, selectedAvatar, true);
            return;
          }
          throw signupErr;
        }
      } else {
        // 2. User Login tab
        try {
          const userCredential = await signInWithEmailAndPassword(auth, email.trim(), password);
          const user = userCredential.user;
          // Retrieve exist stats profile
          const profile = await getOrCreateUserProfile(user.uid, "Contender", "⚡");
          setLoading(false);
          onSuccess(profile.username, profile.avatar);
        } catch (loginErr: any) {
          if (loginErr.code === "auth/operation-not-allowed") {
            console.warn("Firebase Email/Password login is disabled on this project. Diverting to Local Sandbox mode.");
            const tempUser = email.split("@")[0] || "Contender";
            setLoading(false);
            onSuccess(tempUser, "⚡", true);
            return;
          }
          throw loginErr;
        }
      }
    } catch (err: any) {
      setLoading(false);
      console.error("Authentication action failed:", err);
      if (err.code === "auth/operation-not-allowed") {
        setIsOperationNotAllowed(true);
        setErrorMsg("Authentication action failed: This sign-in method is not enabled in your Firebase project.");
      } else if (err.code === "auth/email-already-in-use") {
        setErrorMsg("Email is already registered. Sync via login.");
      } else if (err.code === "auth/invalid-credential" || err.code === "auth/wrong-password" || err.code === "auth/user-not-found") {
        setErrorMsg("Invalid credentials. Verify codenames and retry.");
      } else {
        setErrorMsg(err.message || "Failing connection to server neural synthesizer.");
      }
    }
  };

  // Google sign-in handler (standard configured Firebase Provider)
  const handleGoogleSignIn = async () => {
    setIsOperationNotAllowed(false);
    setErrorMsg("");
    setLoading(true);
    try {
      const userCredential = await signInWithPopup(auth, googleProvider);
      const user = userCredential.user;
      
      const targetUsername = user.displayName || `coder_${user.uid.substring(0, 5)}`;
      const profile = await getOrCreateUserProfile(user.uid, targetUsername, "👑");
      setLoading(false);
      onSuccess(profile.username, profile.avatar);
    } catch (err: any) {
      setLoading(false);
      console.error("Google authentication failed: ", err);
      if (err.code === "auth/operation-not-allowed") {
        setIsOperationNotAllowed(true);
        setErrorMsg("Google Sign-In is not enabled on your Firebase project.");
      } else if (err.code === "auth/popup-blocked") {
        setErrorMsg("Authentication popup was blocked by your browser. Please allow popups or use Google Login in a new tab.");
      } else {
        setErrorMsg(err.message || "Failed to authenticate with Google.");
      }
    }
  };

  // Sandbox bypass to bypass client-side authentication errors
  const handleBypassSignIn = () => {
    const targetUsername = username.trim() || `sandbox_coder_${Math.floor(Math.random() * 9000) + 1000}`;
    onSuccess(targetUsername, selectedAvatar, true);
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
          {(["login", "signup"] as const).map((tab) => (
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
              {tab}
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

        <div className="relative my-6 animate-fade-in-slow">
          <div className="absolute inset-0 flex items-center" aria-hidden="true">
            <div className="w-full border-t border-white/10" />
          </div>
          <div className="relative flex justify-center text-[10px] uppercase font-mono font-bold">
            <span className="bg-[#020203] px-2.5 text-zinc-500">Or Instant Access</span>
          </div>
        </div>

        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={loading}
          className="w-full py-3.5 bg-zinc-900/60 hover:bg-zinc-800 text-white border border-white/10 hover:border-white/20 hover:scale-[1.01] transition-all font-mono uppercase text-xs rounded-xl cursor-pointer flex items-center justify-center gap-2.5 tracking-wide shadow-md active:scale-95"
        >
          {loading ? (
            <span className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
          ) : (
            <>
              <svg className="w-4 h-4 text-blue-400 animate-pulse" viewBox="0 0 24 24">
                <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Sign In with Google
            </>
          )}
        </button>

        <div className="mt-3.5 text-center">
          <button
            type="button"
            onClick={handleBypassSignIn}
            className="text-[10px] font-mono text-zinc-500 hover:text-blue-400 hover:underline tracking-wide transition-all uppercase font-semibold cursor-pointer"
          >
            ⚡ Sandbox Bypass (Enter local dev mode)
          </button>
        </div>

        {isOperationNotAllowed && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            className="mt-6 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-2xl text-xs space-y-3 text-zinc-300"
          >
            <div className="flex items-center gap-2 font-mono font-bold text-yellow-400">
              <HelpCircle className="w-4 h-4 text-yellow-500 shrink-0" />
              <span>HOW TO RESOLVE AUTH ERROR:</span>
            </div>
            <p className="font-mono text-[10px] leading-relaxed">
              Firebase returned <code className="text-rose-400 bg-black/40 px-1.5 py-0.5 rounded font-bold">auth/operation-not-allowed</code> because the chosen auth provider is currently disabled in your cloud project.
            </p>

            <div className="mt-1 pt-2 pb-2.5 border-y border-white/5 space-y-1.5">
              <span className="block text-[10px] font-mono text-zinc-400 font-bold uppercase">Option A: Bypass Authentication & Play Instantly</span>
              <button
                type="button"
                onClick={handleBypassSignIn}
                className="w-full py-2.5 bg-gradient-to-r from-cyan-600/30 to-blue-600/30 hover:from-cyan-600/50 hover:to-blue-600/50 border border-cyan-500/40 hover:border-cyan-400 text-cyan-300 font-mono text-[10px] uppercase rounded-lg font-bold tracking-wide transition-all cursor-pointer shadow-lg active:scale-95"
              >
                ⚡ Enter App via Local Sandbox Bypass
              </button>
            </div>

            <span className="block text-[10px] font-mono text-zinc-400 font-semibold uppercase">Option B: Enable in Firebase Console</span>
            <ol className="list-decimal pl-4 font-mono text-[10px] space-y-1.5 leading-relaxed text-zinc-400">
              <li>
                Open the <a href="https://console.firebase.google.com/" target="_blank" rel="noreferrer" className="text-blue-400 hover:text-blue-300 underline font-semibold">Firebase Console</a>.
              </li>
              <li>Select your active project for this application.</li>
              <li>In the left side menu under Build, click <strong>Authentication</strong>.</li>
              <li>Go to the <strong>Sign-in method</strong> tab.</li>
              <li>Click <strong>Add new provider</strong>, locate <strong>Anonymous</strong> or <strong>Email/Password</strong>, and enable them.</li>
              <li>Click <strong>Save</strong> to authorize access and then restart the signup/lobby queue!</li>
            </ol>
          </motion.div>
        )}

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
