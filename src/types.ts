export interface QuizQuestion {
  id: string;
  text: string;
  options: string[];
  correctIndex: number;
  difficulty: "easy" | "medium" | "hard";
  timeLimit: number;
  explanation: string;
}

export interface Player {
  id: string;
  username: string;
  avatar: string;
  score: number;
  streak: number;
  comboCount: number;
  isBot: boolean;
  isReady: boolean;
  lastAnswerTime?: number;
  lastAnswerCorrect?: boolean;
}

export interface Room {
  code: string;
  quizTitle: string;
  description: string;
  difficulty: string;
  category: string;
  status: "lobby" | "active" | "ended";
  questions: QuizQuestion[];
  players: Player[];
  currentQuestionIndex: number;
  timer: number;
  reactions: Array<{
    id: string;
    emoji: string;
    userId: string;
    username: string;
    timestamp: number;
  }>;
  activityFeed: string[];
}

export interface UserStats {
  username: string;
  avatar: string;
  xp: number;
  level: number;
  streakDays: number;
  gamesPlayed: number;
  correctAnswersRate: number; // percentage
  badges: Array<{ id: string; name: string; description: string; icon: string; rarity: "common" | "rare" | "epic" | "legendary" }>;
  achievements: Array<{ id: string; name: string; target: number; progress: number; icon: string }>;
}
