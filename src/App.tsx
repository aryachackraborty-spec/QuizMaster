import { useState, useEffect } from "react";
import LandingScreen from "./components/LandingScreen";
import AuthScreen from "./components/AuthScreen";
import DashboardScreen from "./components/DashboardScreen";
import QuizRoomScreen from "./components/QuizRoomScreen";
import LiveGameArena from "./components/LiveGameArena";
import ResultsScreen from "./components/ResultsScreen";
import { Player, Room } from "./types";

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

  // Sync session profiles from localStorage
  useEffect(() => {
    const savedUser = localStorage.getItem("quizmaster_username");
    const savedAvatar = localStorage.getItem("quizmaster_avatar");
    if (savedUser) {
      setUsername(savedUser);
      setAvatar(savedAvatar || "⚡");
      setScreen("dashboard");
    }
  }, []);

  // Set successfullyauthenticated identities
  const handleAuthSuccess = (name: string, pAvatar: string) => {
    setUsername(name);
    setAvatar(pAvatar);
    localStorage.setItem("quizmaster_username", name);
    localStorage.setItem("quizmaster_avatar", pAvatar);
    setScreen("dashboard");
  };

  const handleLogout = () => {
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
