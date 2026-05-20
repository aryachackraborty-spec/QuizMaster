import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  collection, 
  getDocs, 
  query, 
  orderBy, 
  limit, 
  onSnapshot,
  serverTimestamp,
  arrayUnion,
  increment,
  runTransaction
} from "firebase/firestore";
import { db, auth, handleFirestoreError, OperationType } from "./firebase";
import { Room, Player, UserStats, QuizQuestion } from "../types";

export const INITIAL_USER_STATS = {
  xp: 120,
  level: 1,
  streakDays: 1,
  gamesPlayed: 0,
  correctAnswersRate: 0,
  badges: [
    { id: "b3", name: "Gemini Pioneer", description: "Played custom Generated quiz", icon: "🧠", rarity: "legendary" as "common" | "rare" | "epic" | "legendary" }
  ],
  achievements: [
    { id: "a1", name: "Synthesizer Pilot", target: 5, progress: 1, icon: "🤖" },
    { id: "a2", name: "Perfect compilation", target: 10, progress: 0, icon: "🎯" },
    { id: "a3", name: "Streak Legend", target: 10, progress: 1, icon: "🔥" },
  ]
};

// 1. User Profile Operations (ABAC Guarded)
export async function getOrCreateUserProfile(uid: string, defaultUsername: string, defaultAvatar: string): Promise<UserStats> {
  const userRef = doc(db, "users", uid);
  try {
    const snap = await getDoc(userRef);
    if (snap.exists()) {
      return snap.data() as UserStats;
    } else {
      const newUserProfile: UserStats = {
        username: defaultUsername || `candidate_${uid.substring(0, 5)}`,
        avatar: defaultAvatar || "⚡",
        ...INITIAL_USER_STATS
      };
      
      const payload = {
        uid,
        ...newUserProfile,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      await setDoc(userRef, payload);
      return newUserProfile;
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `users/${uid}`);
  }
}

export async function updateUserStats(uid: string, xpGain: number, isWin: boolean, correctAnswersCount: number, totalQuestions: number) {
  const userRef = doc(db, "users", uid);
  try {
    await runTransaction(db, async (transaction) => {
      const snap = await transaction.get(userRef);
      if (!snap.exists()) return;
      const data = snap.data();
      const currentXp = (data.xp || 0) + xpGain;
      const currentLevel = Math.floor(Math.sqrt(currentXp / 100)) + 1; // 100 XP = lvl 1, 400 XP = lvl 2, etc.
      const gamesPlayed = (data.gamesPlayed || 0) + 1;
      
      // Calculate running correct rate
      const prevRate = data.correctAnswersRate || 0;
      const newRate = Math.round(((prevRate * (gamesPlayed - 1)) + ((correctAnswersCount / (totalQuestions || 1)) * 100)) / gamesPlayed);
      
      const coinsEarned = Math.floor(xpGain / 10) + (isWin ? 50 : 10);

      // Simple achievement updates
      const achievementsObj = (data.achievements || []).map((ach: any) => {
        if (ach.id === "a1") { // Synthesizer progress
          return { ...ach, progress: Math.min(ach.target, (ach.progress || 0) + 1) };
        }
        if (ach.id === "a3" && isWin) { // Streak
          return { ...ach, progress: Math.min(ach.target, (ach.progress || 0) + 1) };
        }
        return ach;
      });

      transaction.update(userRef, {
        xp: currentXp,
        level: currentLevel,
        gamesPlayed: gamesPlayed,
        correctAnswersRate: newRate,
        coins: increment(coinsEarned),
        achievements: achievementsObj,
        updatedAt: new Date().toISOString()
      });
    });
  } catch (err) {
    console.error("Failed to update user tournament statistics:", err);
  }
}

// 2. Global Leaderboard Retrieval (Indexed Query Strategy)
export async function getGlobalLeaderboard(): Promise<UserStats[]> {
  const usersRef = collection(db, "users");
  const q = query(usersRef, orderBy("xp", "desc"), limit(20));
  try {
    const snap = await getDocs(q);
    const leaders: UserStats[] = [];
    snap.forEach((doc) => {
      leaders.push(doc.data() as UserStats);
    });
    return leaders;
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, "users");
  }
}

// 3. Real-time Lobbies Integration (onSnapshot WS Listener Cleanup)
export function subscribeToRoomMultiplayer(
  roomCode: string, 
  onUpdate: (room: Room) => void,
  onError: (err: Error) => void
) {
  const roomRef = doc(db, "rooms", roomCode);
  const playersRef = collection(db, "rooms", roomCode, "players");

  let latestRoomDoc: any = null;
  let latestPlayersList: Player[] = [];

  const triggerUpdate = () => {
    if (!latestRoomDoc) return;
    const fullRoom: Room = {
      ...latestRoomDoc,
      players: latestPlayersList
    };
    onUpdate(fullRoom);
  };

  const unsubRoom = onSnapshot(roomRef, (snapshot) => {
    if (snapshot.exists()) {
      latestRoomDoc = snapshot.data();
      triggerUpdate();
    }
  }, (err) => {
    console.error("Firestore onSnapshot Room error:", err);
    onError(err);
  });

  const unsubPlayers = onSnapshot(playersRef, (snapshot) => {
    const list: Player[] = [];
    snapshot.forEach((pDoc) => {
      list.push(pDoc.data() as Player);
    });
    latestPlayersList = list.sort((a, b) => b.score - a.score); // Highest scores first
    triggerUpdate();
  }, (err) => {
    console.error("Firestore onSnapshot Players error:", err);
    onError(err);
  });

  return () => {
    unsubRoom();
    unsubPlayers();
  };
}

// 4. Lobby Presence and Connection Logic
export async function createMultiplayerRoomOnFirestore(roomCode: string, roomData: Omit<Room, "players">) {
  const roomRef = doc(db, "rooms", roomCode);
  try {
    await setDoc(roomRef, {
      ...roomData,
      createdAt: new Date().toISOString()
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `rooms/${roomCode}`);
  }
}

export async function joinMultiplayerPlayerOnFirestore(roomCode: string, player: Player) {
  const playerRef = doc(db, "rooms", roomCode, "players", player.id);
  const roomRef = doc(db, "rooms", roomCode);
  try {
    await setDoc(playerRef, {
      ...player,
      joinedAt: new Date().toISOString()
    });
    // Add join message to dynamic activity log feed
    await updateDoc(roomRef, {
      activityFeed: arrayUnion(`${player.avatar} ${player.username} breached the arena lobby in real-time!`),
      lastUpdate: Date.now()
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `rooms/${roomCode}/players/${player.id}`);
  }
}

export async function submitMultiplayerReactionBurst(roomCode: string, emoji: string, userId: string, username: string) {
  const roomRef = doc(db, "rooms", roomCode);
  const reaction = {
    id: `react-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    emoji,
    userId,
    username,
    timestamp: Date.now()
  };
  try {
    // Read current reactions, limit and append
    const snap = await getDoc(roomRef);
    if (snap.exists()) {
      const roomData = snap.data();
      const reactions = roomData.reactions || [];
      const updatedReactions = [...reactions, reaction].slice(-25); // Limit cache size
      await updateDoc(roomRef, {
        reactions: updatedReactions,
        lastUpdate: Date.now()
      });
    }
  } catch (err) {
    console.error("Reaction emit failed: ", err);
  }
}
