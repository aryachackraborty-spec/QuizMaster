import { useState, useEffect } from "react";
import LandingScreen from "./components/LandingScreen";
import AuthScreen from "./components/AuthScreen";
import DashboardScreen from "./components/DashboardScreen";
import QuizRoomScreen from "./components/QuizRoomScreen";
import LiveGameArena from "./components/LiveGameArena";
import ResultsScreen from "./components/ResultsScreen";
import { Player, Room } from "./types";
import { auth, db } from "./lib/firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";

type ScreenState = "landing" | "auth" | "dashboard" | "room" | "game" | "results";

export default function App() {
  const [screen, setScreen] = useState<ScreenState>("landing");
  const [username, setUsername] = useState<string>("");
  const [avatar, setAvatar] = useState<string>("⚡");
  
  // Game session context
  const [lobbyMode, setLobbyMode] = useState<"create" | "join">("create");
  const [activeRoomCode, setActiveRoomCode] = useState<string>("");
  const [activePlayer, setActivePlayer] = useState<Player | null>(null);
  const [completedRoom, setCompletedRoom] = useState<Room | null>(null);

  // Sync session profiles from Firebase Auth real-time
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        // Listen directly to user document profile sync
        const userRef = doc(db, "users", user.uid);
        const unsubProfile = onSnapshot(userRef, (docSnap) => {
          if (docSnap.exists()) {
            const stats = docSnap.data();
            setUsername(stats.username || "Contender");
            setAvatar(stats.avatar || "⚡");
            setScreen("dashboard");
          } else {
            setUsername(user.displayName || "Contender");
            setAvatar("⚡");
            setScreen("dashboard");
          }
        }, (err) => console.log("Profile state listener delay..."));
        
        return () => unsubProfile();
      } else {
        // Only reset to landing if we are not in Local Sandbox Bypass Mode
        if (localStorage.getItem("quizmaster_bypass") !== "true") {
          setUsername("");
          setAvatar("⚡");
          setScreen("landing");
        } else {
          // Keep active bypassed username & avatar from local state
          const savedUser = localStorage.getItem("quizmaster_username") || "Contender_Guest";
          const savedAvatar = localStorage.getItem("quizmaster_avatar") || "⚡";
          setUsername(savedUser);
          setAvatar(savedAvatar);
          setScreen("dashboard");
        }
      }
    });

    return () => unsubscribe();
  }, []);

  // Set successfullyauthenticated identities
  const handleAuthSuccess = (name: string, pAvatar: string, bypass: boolean = false) => {
    setUsername(name);
    setAvatar(pAvatar);
    if (bypass) {
      localStorage.setItem("quizmaster_bypass", "true");
      localStorage.setItem("quizmaster_username", name);
      localStorage.setItem("quizmaster_avatar", pAvatar);
    } else {
      localStorage.removeItem("quizmaster_bypass");
    }
    setScreen("dashboard");
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (err) {
      console.error("Logout failure: ", err);
    }
    localStorage.removeItem("quizmaster_bypass");
    localStorage.removeItem("quizmaster_username");
    localStorage.removeItem("quizmaster_avatar");
    setUsername("");
    setAvatar("⚡");
    setScreen("landing");
  };

  // Launch Create Room View
  const handleNavigateCreate = () => {
    setLobbyMode("create");
    setScreen("room");
  };

  // Launch Join Room View
  const handleNavigateJoin = () => {
    setLobbyMode("join");
    setScreen("room");
  };

  // Transition to Live Arena
  const handleGameStarted = (code: string, player: Player) => {
    setActiveRoomCode(code);
    setActivePlayer(player);
    setScreen("game");
  };

  // Transition to Final Results
  const handleGameEnded = (endedRoom: Room) => {
    setCompletedRoom(endedRoom);
    setScreen("results");
  };

  // Trigger Replay
  const handleReplay = () => {
    setLobbyMode("create");
    setScreen("room");
  };

  return (
    <div className="min-h-screen bg-[#090a10] text-white">
      {screen === "landing" && (
        <LandingScreen 
          onStartGuest={() => setScreen("auth")} 
          onEnterDashboard={() => {
            if (username) {
              setScreen("dashboard");
            } else {
              setScreen("auth");
            }
          }}
        />
      )}

      {screen === "auth" && (
        <AuthScreen 
          onSuccess={handleAuthSuccess} 
          onBack={() => setScreen("landing")} 
        />
      )}

      {screen === "dashboard" && (
        <DashboardScreen 
          username={username}
          avatar={avatar}
          onNavigateCreate={handleNavigateCreate}
          onNavigateJoin={handleNavigateJoin}
          onLogout={handleLogout}
        />
      )}

      {screen === "room" && (
        <QuizRoomScreen 
          username={username}
          avatar={avatar}
          initialMode={lobbyMode}
          onBackToDashboard={() => setScreen("dashboard")}
          onGameStarted={handleGameStarted}
        />
      )}

      {screen === "game" && activePlayer && (
        <LiveGameArena 
          roomCode={activeRoomCode}
          currentPlayer={activePlayer}
          onGameEnded={handleGameEnded}
        />
      )}

      {screen === "results" && activePlayer && completedRoom && (
        <ResultsScreen 
          roomCode={activeRoomCode}
          currentPlayer={activePlayer}
          room={completedRoom}
          onReplay={handleReplay}
          onBackToDashboard={() => setScreen("dashboard")}
        />
      )}
    </div>
  );
}
