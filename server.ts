import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";
import { initializeApp } from "firebase/app";
import { initializeFirestore, doc, setDoc, updateDoc, collection } from "firebase/firestore";
import firebaseConfig from "./firebase-applet-config.json";

dotenv.config();

// Initialize Firebase App & Firestore Database on custom backend server
const firebaseApp = initializeApp(firebaseConfig);
const db = initializeFirestore(firebaseApp, {
  experimentalForceLongPolling: true,
}, firebaseConfig.firestoreDatabaseId);

// Initialize the Google GenAI SDK with recommended precautions
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || "",
  httpOptions: {
    headers: {
      "User-Agent": "aistudio-build",
    },
  },
});

const app = express();
const PORT = 3000;

app.use(express.json());

// Type Declarations
interface QuizQuestion {
  id: string;
  text: string;
  options: string[];
  correctIndex: number;
  difficulty: "easy" | "medium" | "hard";
  timeLimit: number;
  explanation: string;
}

interface Player {
  id: string;
  username: string;
  avatar: string; // Emoji or asset name
  score: number;
  streak: number;
  comboCount: number;
  isBot: boolean;
  isReady: boolean;
  lastAnswerTime?: number; // ms taken to answer
  lastAnswerCorrect?: boolean;
  joinedAt?: string;
}

interface Room {
  code: string;
  quizTitle: string;
  description: string;
  difficulty: string;
  category: string;
  status: "lobby" | "active" | "ended";
  questions: QuizQuestion[];
  players: Player[];
  currentQuestionIndex: number;
  timer: number; // Current count down
  reactions: { id: string; emoji: string; userId: string; username: string; timestamp: number }[];
  activityFeed: string[];
  lastUpdate: number;
  hostId?: string;
  createdAt?: string;
}

// Global In-Memory Room Store
const rooms = new Map<string, Room>();

// Helper to sync local room memory state to Firestore in real-time (Scalable hybrid strategy)
async function syncRoomStateToFirestore(roomCode: string) {
  const room = rooms.get(roomCode);
  if (!room) return;

  try {
    const roomRef = doc(db, "rooms", roomCode);
    const { players, ...roomMetadata } = room;

    // 1. Write core room parameters
    await setDoc(roomRef, {
      ...roomMetadata,
      hostId: roomMetadata.hostId || "system",
      createdAt: roomMetadata.createdAt || new Date().toISOString()
    });

    // 2. Write player positions in players subcollection for massive scale
    const playerPromises = players.map((p) => {
      const playerRef = doc(db, "rooms", roomCode, "players", p.id);
      return setDoc(playerRef, {
        ...p,
        joinedAt: p.joinedAt || new Date().toISOString()
      });
    });
    await Promise.all(playerPromises);
  } catch (err) {
    console.error(`Error syncing room ${roomCode} to Firestore: `, err);
  }
}

// Background Server loop for lock-step realtime game tick updates to Firestore
setInterval(() => {
  rooms.forEach(async (room, roomCode) => {
    if (room.status !== "active") return;

    if (room.timer > 0) {
      room.timer -= 1;
      room.lastUpdate = Date.now();

      // Bot turn simulation: If timer starts to drop, let Bots randomly pick answers!
      if (room.timer <= 11) {
        room.players.forEach((p) => {
          if (p.isBot && p.lastAnswerTime === undefined) {
            const q = room.questions[room.currentQuestionIndex];
            const botSkill = Math.random(); // Bot accuracy based on dice roll
            const isCorrect = botSkill > 0.3; // 70% accuracy
            const selectedIdx = isCorrect ? q.correctIndex : (q.correctIndex + Math.floor(Math.random() * 3) + 1) % 4;

            p.lastAnswerTime = Math.floor(Math.random() * 6000) + 1500; // takes 1.5 - 7.5s to respond
            p.lastAnswerCorrect = isCorrect;

            if (isCorrect) {
              p.streak = (p.streak || 0) + 1;
              p.comboCount = (p.comboCount || 0) + 1;
              const speedBonus = Math.max(50, Math.floor((15000 - p.lastAnswerTime) / 100));
              const streakBonus = Math.min(100, (p.streak || 1) * 15);
              const points = 500 + speedBonus + streakBonus;
              p.score += points;
            } else {
              p.streak = 0;
              p.comboCount = 0;
            }
          }
        });
      }

      // Sync ticking states to Firestore database
      try {
        const roomRef = doc(db, "rooms", roomCode);
        await updateDoc(roomRef, {
          timer: room.timer,
          lastUpdate: room.lastUpdate
        });

        // Sync bots subcollections
        const botPlayers = room.players.filter(p => p.isBot);
        const botPromises = botPlayers.map((bot) => {
          const playerRef = doc(db, "rooms", roomCode, "players", bot.id);
          return setDoc(playerRef, {
            ...bot,
            joinedAt: bot.joinedAt || new Date().toISOString()
          });
        });
        await Promise.all(botPromises);
      } catch (err) {
        console.error(`Failed ticking room ${roomCode} inside Firestore:`, err);
      }
    }
  });
}, 1000);

// High-Quality Default Quizzes
const DEFAULT_QUIZZES: Record<string, { title: string; description: string; category: string; difficulty: string; questions: QuizQuestion[] }> = {
  "silicon-valley": {
    title: "Silicon Valley Giants",
    description: "Are you ready to pitch investors or mock them? Test your startup lore.",
    category: "Startup Lore & History",
    difficulty: "Medium",
    questions: [
      {
        id: "sv-1",
        text: "Which company's original name was 'Cadabra' before being evolved to its current globally recognized brand?",
        options: ["e-Bay", "Amazon", "Oracle", "Netflix"],
        correctIndex: 1,
        difficulty: "easy",
        timeLimit: 15,
        explanation: "Jeff Bezos renamed the company to Amazon after a lawyer misheard 'Cadabra' as 'Cadaver'.",
      },
      {
        id: "sv-2",
        text: "In 2006, Google acquired YouTube for what stock-transaction valuation?",
        options: ["$500 Million", "$1.65 Billion", "$3.2 Billion", "$10 Billion"],
        correctIndex: 1,
        difficulty: "medium",
        timeLimit: 15,
        explanation: "YouTube was purchased for $1.65 billion in an all-stock deal, now widely seen as one of the best acquisitions in tech.",
      },
      {
        id: "sv-3",
        text: "Which iconic design firm is credited with designing the original Apple Macintosh housing and mouse?",
        options: ["Pentagram", "Frog Design", "IDEO", "Landor"],
        correctIndex: 1,
        difficulty: "hard",
        timeLimit: 15,
        explanation: "Hartmut Esslinger's Frog Design developed the legendary 'Snow White' design language for Apple in the 1980s.",
      },
      {
        id: "sv-4",
        text: "Which startup originally launched as 'Burbn', a location-sharing app with photo-filtering capabilities?",
        options: ["Snapchat", "Foursquare", "Pinterest", "Instagram"],
        correctIndex: 3,
        difficulty: "easy",
        timeLimit: 15,
        explanation: "Kevin Systrom and Mike Krieger pivot-pushed Burbn to focus purely on high-contrast photography, rebranding it raw Instagram.",
      },
      {
        id: "sv-5",
        text: "Who was Stripe's first outside investor, backing them with $20,000 in early 2010?",
        options: ["Peter Thiel", "Y Combinator", "Paul Graham", "Sequoia Capital"],
        correctIndex: 1,
        difficulty: "hard",
        timeLimit: 15,
        explanation: "Y Combinator (specifically Paul Graham's advice/funding) formally backed John and Patrick Collison during their beta days.",
      },
    ],
  },
  "web-engine": {
    title: "Elite Web Engineering",
    description: "Deep-dive browser mechanics, rendering trees, V8 runtime, and concurrent states.",
    category: "Frontend Architecture",
    difficulty: "Hard",
    questions: [
      {
        id: "we-1",
        text: "What does the browser do during the 'Reflow' (Layout) phase of the critical rendering path?",
        options: [
          "Calculates color gradients and paint coordinates",
          "Computes sizing selectors and media queries",
          "Calculates geometric sizes and layout bounds of nodes",
          "Generates the raw document fragment tree"
        ],
        correctIndex: 2,
        difficulty: "medium",
        timeLimit: 15,
        explanation: "Reflow is the heavy pipeline process where the browser computes exact physical sizes and viewport bounding coordinates of elements.",
      },
      {
        id: "we-2",
        text: "In React's fiber architecture, what is the primary benefit of Concurrent Mode?",
        options: [
          "Enabling WebAssembly binary compilation inside the DOM",
          "Ability to pause, prioritize, and resume rendering work",
          "Bypassing the standard single-threaded event loop",
          "Direct hardware GPU rendering for styling elements"
        ],
        correctIndex: 1,
        difficulty: "hard",
        timeLimit: 20,
        explanation: "Concurrent Mode allows React to interrupt low-priority rendering tasks to handle interactive keypress or touch events instantly.",
      },
      {
        id: "we-3",
        text: "Which styling rule prevents both the display of the HTML component and excludes it from generating a layout box entirely?",
        options: [
          "visibility: hidden",
          "opacity: 0",
          "display: none",
          "transform: scale(0)"
        ],
        correctIndex: 2,
        difficulty: "easy",
        timeLimit: 15,
        explanation: "`display: none` completely deletes the component from the rendering layout box structure, unlike static visibility rules.",
      },
      {
        id: "we-4",
        text: "In the V8 engine, which component is the high-performance optimizing JIT compiler that converts bytecode to machine code?",
        options: ["Ignition", "TurboFan", "Sparkplug", "Liftoff"],
        correctIndex: 1,
        difficulty: "hard",
        timeLimit: 15,
        explanation: "TurboFan compiles optimized bytecode generated by Ignition into blazing fast, direct native machine code.",
      },
    ],
  },
  "cyberpunk": {
    title: "Cyberpunk Lore & Tech",
    description: "Augment your neural links. Hack mainframe database segments with zero lag.",
    category: "Gaming & Lore",
    difficulty: "Medium",
    questions: [
      {
        id: "cp-1",
        text: "In the Cyberpunk tabletop universe, what is the name of the legendary solo who assaulted Arasaka Tower in 2023?",
        options: ["Morgan Blackhand", "Johnny Silverhand", "Rogue Amendiares", "Kerry Eurodyne"],
        correctIndex: 1,
        difficulty: "easy",
        timeLimit: 15,
        explanation: "Johnny Silverhand, alongside Morgan Blackhand, famously attacked Arasaka Tower with a pocket nuclear device in 2023.",
      },
      {
        id: "cp-2",
        text: "Which cyberware brand is synonymous with ultra-fast, time-dilation reflex boosters in Night City?",
        options: ["Sandevistan", "Gorilla Arms", "Kereznikov", "Subdermal Armor"],
        correctIndex: 0,
        difficulty: "medium",
        timeLimit: 15,
        explanation: "The Sandevistan is an active operating system implant that accelerates manual reflexes, dilating external perception of time.",
      },
      {
        id: "cp-3",
        text: "Who is the legendary Netrunner who bypassed the original Blackwall and wrote the data krash of 2022?",
        options: ["Alt Cunningham", "Rache Bartmoss", "Spider Murphy", "Lucy Kushinada"],
        correctIndex: 1,
        difficulty: "hard",
        timeLimit: 15,
        explanation: "Rache Bartmoss unleashed the DATAKRASH in 2022, destroying 78% of the old Net and birthing the need for the Blackwall.",
      },
    ],
  },
};

// Host AI Bot Names and Avatars
const BOT_TEMPLATES = [
  { username: "neon_framer", avatar: "⚡" },
  { username: "coder_slick", avatar: "🦊" },
  { username: "pixel_samurai", avatar: "🛡️" },
  { username: "v8_ignition", avatar: "🔥" },
  { username: "react_reina", avatar: "👑" },
  { username: "silicon_bandit", avatar: "🤠" },
  { username: "esports_giggle", avatar: "🎮" },
  { username: "main_thread_killer", avatar: "💀" },
];

// Helper to generate unique room code (4 character uppercase alphanumeric)
function generateRoomCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// REST Api Endpoints

// Server API health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", geminiConfigured: !!process.env.GEMINI_API_KEY });
});

// Create Room (with templates OR AI Generation!)
app.post("/api/rooms/create", async (req, res) => {
  try {
    const { mode, category, difficulty, customPrompt, quizTitle, templateId, creatorUsername } = req.body;
    const roomCode = generateRoomCode();

    let title = quizTitle || "Custom Quiz Lobbies";
    let desc = "Futuristic arena challenge. Beat the high scores!";
    let selectedQuestions: QuizQuestion[] = [];
    let actualCategory = category || "General Knowledge";
    let actualDiff = difficulty || "Medium";

    if (mode === "template" && templateId && DEFAULT_QUIZZES[templateId]) {
      const template = DEFAULT_QUIZZES[templateId];
      title = template.title;
      desc = template.description;
      actualCategory = template.category;
      actualDiff = template.difficulty;
      selectedQuestions = JSON.parse(JSON.stringify(template.questions));
    } else if (mode === "ai") {
      // AI Gen Mode using @google/genai
      if (!process.env.GEMINI_API_KEY) {
        // Fallback to template if Gemini API key lacks
        const fallback = DEFAULT_QUIZZES["silicon-valley"];
        title = `AI Generated: ${category || "General Knowledge"}`;
        desc = `AI generation offline mode. Seeded beautiful ${category || "general"} questions instead.`;
        actualCategory = category || "Tech History";
        actualDiff = difficulty || "Medium";
        selectedQuestions = JSON.parse(JSON.stringify(fallback.questions));
      } else {
        // Real-time server side AI generation using gemini-3.5-flash
        const systemPrompt = `You are the master brain of QuizMaster, an esports-inspired hyper-engaging multiplayer arena gamified platform. 
Your job is to generate exactly 5 custom trivia questions on the requested category/topic: "${category || customPrompt}".
The difficulty rating must target: "${difficulty || "Medium"}".
Optimize questions to be intensely engaging, educational, and fun. Avoid boring, standard options. Ensure explanations include mindblowing facts.`;

        const responseSchema = {
          type: Type.OBJECT,
          properties: {
            quizTitle: {
              type: Type.STRING,
              description: "A short, catchy, action-packed title for this generated quiz (no more than 35 characters)"
            },
            quizDescription: {
              type: Type.STRING,
              description: "A highly engaging hook/description sentence summarizing what the topic covers"
            },
            questions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  text: { type: Type.STRING, description: "The quiz question itself (maximum 110 characters)" },
                  options: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                    description: "Exactly 4 options, highly competitive, plausible but distinct"
                  },
                  correctIndex: { type: Type.INTEGER, description: "The 0-based index of the correct option (0, 1, 2, or 3)" },
                  explanation: { type: Type.STRING, description: "An eye-opening real-world trivia fact or explanation" }
                },
                required: ["text", "options", "correctIndex", "explanation"]
              }
            }
          },
          required: ["quizTitle", "quizDescription", "questions"]
        };

        const modelsToTry = ["gemini-2.5-flash", "gemini-flash-latest", "gemini-3.5-flash", "gemini-3.1-flash-lite"];
        let response = null;
        let lastError = null;

        for (const model of modelsToTry) {
          try {
            console.log(`Attempting AI synthesis using model: ${model}...`);
            response = await ai.models.generateContent({
              model: model,
              contents: `Create an elite trivia set about: ${category || customPrompt || "General Knowledge Engineering and Startups"}. Difficulty constraint: ${difficulty || "Medium"}.`,
              config: {
                systemInstruction: systemPrompt,
                responseMimeType: "application/json",
                responseSchema: responseSchema,
              },
            });
            if (response && response.text) {
              console.log(`Success! Synthesized arena with model: ${model}`);
              break;
            }
          } catch (err: any) {
            console.error(`Synthesis failed using model ${model}:`, err.message || err);
            lastError = err;
          }
        }

        let isOfflineFallback = false;
        if (!response || !response.text) {
          console.warn("AI synthesis failed or permission was denied. Triggering smart offline procedural quiz fallback...");
          isOfflineFallback = true;
          const lowercaseCategory = (category || customPrompt || "").toLowerCase();
          let templateKey = "silicon-valley";
          if (lowercaseCategory.includes("cyber") || lowercaseCategory.includes("hack") || lowercaseCategory.includes("game") || lowercaseCategory.includes("punk")) {
            templateKey = "cyberpunk";
          } else if (lowercaseCategory.includes("web") || lowercaseCategory.includes("code") || lowercaseCategory.includes("program") || lowercaseCategory.includes("js") || lowercaseCategory.includes("react") || lowercaseCategory.includes("frontend") || lowercaseCategory.includes("engineering")) {
            templateKey = "web-engine";
          }
          
          const fallback = DEFAULT_QUIZZES[templateKey];
          title = `Staged: ${category || fallback.title}`;
          desc = `Offline synthesis active due to API grid permissions. Selected questions on ${fallback.category}.`;
          selectedQuestions = JSON.parse(JSON.stringify(fallback.questions)).map((q: any, i: number) => ({
            ...q,
            id: `ai-q-fallback-${i}`,
            difficulty: (difficulty || q.difficulty || "medium").toLowerCase()
          }));
        } else {
          try {
            const rawText = response.text || "{}";
            const parsed = JSON.parse(rawText.trim());

            title = parsed.quizTitle || parsed.title || title;
            desc = parsed.quizDescription || parsed.desc || parsed.description || desc;
            selectedQuestions = (parsed.questions || []).map((q: any, i: number) => ({
              id: `ai-q-${i}`,
              text: q.text,
              options: q.options,
              correctIndex: Number(q.correctIndex),
              difficulty: (difficulty || "medium").toLowerCase() as any,
              timeLimit: 15,
              explanation: q.explanation,
            }));
          } catch (jsonErr) {
            console.error("Failed to parse JSON response from AI synthesis. Using fallback.", jsonErr);
            isOfflineFallback = true;
          }
        }

        if (isOfflineFallback || selectedQuestions.length === 0) {
          if (selectedQuestions.length === 0) {
            const fallback = DEFAULT_QUIZZES["silicon-valley"];
            title = `Staged: Silicon Valley Lore`;
            desc = "Offline synthesis active due to API parsing grid. Playing silicon valley giants.";
            selectedQuestions = JSON.parse(JSON.stringify(fallback.questions));
          }
        }
      }
    } else {
      // General Free-form or Fallback
      const fallback = DEFAULT_QUIZZES["silicon-valley"];
      selectedQuestions = JSON.parse(JSON.stringify(fallback.questions));
    }

    // Seed Room
    const room: Room = {
      code: roomCode,
      quizTitle: title,
      description: desc,
      category: actualCategory,
      difficulty: actualDiff,
      status: "lobby",
      questions: selectedQuestions,
      players: [],
      currentQuestionIndex: -1,
      timer: 0,
      reactions: [],
      activityFeed: ["Room created successfully in AI Arena!"],
      lastUpdate: Date.now(),
    };

    // Add creator to room if username provided
    if (creatorUsername) {
      room.players.push({
        id: "creator-" + Date.now().toString(36),
        username: creatorUsername,
        avatar: "⚡",
        score: 0,
        streak: 0,
        comboCount: 0,
        isBot: false,
        isReady: true,
      });
    }

    // Automatically seed 3 cool BOT challengers to join the competitive party
    const shuffledBots = [...BOT_TEMPLATES].sort(() => 0.5 - Math.random());
    const botCount = Math.floor(Math.random() * 2) + 3; // 3 or 4 bots
    for (let j = 0; j < botCount; j++) {
      const b = shuffledBots[j];
      room.players.push({
        id: `bot-${j}-${Date.now().toString(36)}`,
        username: `${b.username}`,
        avatar: b.avatar,
        score: 0,
        streak: 0,
        comboCount: 0,
        isBot: true,
        isReady: true,
      });
      room.activityFeed.push(`Challenger ${b.avatar} ${b.username} slotted into custom lobby!`);
    }

    rooms.set(roomCode, room);
    await syncRoomStateToFirestore(roomCode);
    res.json({ success: true, roomCode, room });
  } catch (error: any) {
    console.error("AI Room Creation Error: ", error);
    res.status(500).json({ success: false, error: error.message || "Failed to launch room." });
  }
});

// Get Room State
app.get("/api/rooms/:code", (req, res) => {
  const code = req.params.code.toUpperCase();
  const room = rooms.get(code);
  if (!room) {
    return res.status(404).json({ success: false, error: "Lobby Room not found" });
  }

  // Active Timer Tick Simulation if status is Active
  if (room.status === "active" && room.timer > 0) {
    const elapsed = Math.floor((Date.now() - room.lastUpdate) / 1000);
    if (elapsed >= 1) {
      room.timer = Math.max(0, room.timer - elapsed);
      room.lastUpdate = Date.now();

      // Bot Turn simulation: If timer starts to drop, let Bots randomly pick answers!
      if (room.timer <= 11) {
        room.players.forEach((p) => {
          if (p.isBot && p.lastAnswerTime === undefined) {
            // Seed bot answer
            const q = room.questions[room.currentQuestionIndex];
            const botSkill = Math.random(); // Bot accuracy based on dice roll
            const isCorrect = botSkill > 0.3; // 70% accuracy
            const selectedIdx = isCorrect ? q.correctIndex : (q.correctIndex + Math.floor(Math.random() * 3) + 1) % 4;

            p.lastAnswerTime = Math.floor(Math.random() * 6000) + 1500; // takes 1.5 - 7.5s to respond
            p.lastAnswerCorrect = isCorrect;

            if (isCorrect) {
              p.streak = (p.streak || 0) + 1;
              p.comboCount = (p.comboCount || 0) + 1;
              const speedBonus = Math.max(50, Math.floor((15000 - p.lastAnswerTime) / 100));
              const streakBonus = Math.min(100, (p.streak || 1) * 15);
              const points = 500 + speedBonus + streakBonus;
              p.score += points;
            } else {
              p.streak = 0;
              p.comboCount = 0;
            }
          }
        });
      }
    }
  }

  res.json({ success: true, room });
});

// Join Room
app.post("/api/rooms/:code/join", async (req, res) => {
  const code = req.params.code.toUpperCase();
  const { username, avatar } = req.body;
  const room = rooms.get(code);

  if (!room) {
    return res.status(404).json({ success: false, error: "Lobby Room not found." });
  }
  if (room.status !== "lobby") {
    return res.status(400).json({ success: false, error: "Game already underway." });
  }

  const existingPlayer = room.players.find((p) => p.username.toLowerCase() === username.toLowerCase());
  if (existingPlayer) {
    return res.json({ success: true, player: existingPlayer, room });
  }

  const newPlayer: Player = {
    id: `player-${Date.now().toString(36)}`,
    username,
    avatar: avatar || "🚀",
    score: 0,
    streak: 0,
    comboCount: 0,
    isBot: false,
    isReady: true,
  };

  room.players.push(newPlayer);
  room.activityFeed.push(`${avatar || "🎮"} ${username} breached the arena lobby!`);
  room.lastUpdate = Date.now();

  await syncRoomStateToFirestore(code);

  res.json({ success: true, player: newPlayer, room });
});

// Trigger Start Game
app.post("/api/rooms/:code/start", async (req, res) => {
  const code = req.params.code.toUpperCase();
  const room = rooms.get(code);

  if (!room) {
    return res.status(404).json({ success: false, error: "Room not found." });
  }

  room.status = "active";
  room.currentQuestionIndex = 0;
  room.timer = room.questions[0].timeLimit || 15;
  room.lastUpdate = Date.now();

  // Reset answer states for next round
  room.players.forEach((p) => {
    p.lastAnswerTime = undefined;
    p.lastAnswerCorrect = undefined;
  });

  room.activityFeed.push("🎯 Arena Combat Activated! Round 1 initiated.");

  await syncRoomStateToFirestore(code);

  res.json({ success: true, room });
});

// Submit Answer
app.post("/api/rooms/:code/submit", async (req, res) => {
  const code = req.params.code.toUpperCase();
  const { playerId, optionIndex, timeSpentMs } = req.body;
  const room = rooms.get(code);

  if (!room) {
    return res.status(404).json({ success: false, error: "Room not found." });
  }

  const player = room.players.find((p) => p.id === playerId);
  if (!player) {
    return res.status(404).json({ success: false, error: "Contestant not registered." });
  }

  const currentQ = room.questions[room.currentQuestionIndex];
  const isCorrect = optionIndex === currentQ.correctIndex;

  player.lastAnswerTime = timeSpentMs || 3000;
  player.lastAnswerCorrect = isCorrect;

  if (isCorrect) {
    player.streak += 1;
    player.comboCount += 1;

    // Award Points: Base 500, dynamic Speed Bonus (up to 500 for instant answer), Streak Bonus (up to 150)
    const maxTime = (currentQ.timeLimit || 15) * 1000;
    const rawRatio = Math.max(0, Math.min(1, 1 - (timeSpentMs / maxTime)));
    const speedBonus = Math.floor(rawRatio * 500);
    const streakBonus = Math.min(150, player.streak * 20);

    const matchPoints = 500 + speedBonus + streakBonus;
    player.score += matchPoints;

    room.activityFeed.push(
      `🔥 ${player.username} scored correct answers! Combo x${player.streak} (+${matchPoints} pts)`
    );
  } else {
    player.streak = 0;
    player.comboCount = 0;
    room.activityFeed.push(`💀 Oh no! ${player.username} broke their score combo.`);
  }

  room.lastUpdate = Date.now();

  await syncRoomStateToFirestore(code);

  res.json({ success: true, matches: isCorrect, correctIndex: currentQ.correctIndex, player, room });
});

// Submit Reaction Burst
app.post("/api/rooms/:code/reaction", async (req, res) => {
  const code = req.params.code.toUpperCase();
  const { emoji, userId, username } = req.body;
  const room = rooms.get(code);

  if (!room) {
    return res.status(404).json({ success: false, error: "Room not found." });
  }

  const reaction = {
    id: `react-${Date.now()}-${Math.random()}`,
    emoji,
    userId,
    username,
    timestamp: Date.now(),
  };

  room.reactions.push(reaction);

  // Keep last 15 reactions only to optimize memory
  if (room.reactions.length > 25) {
    room.reactions.shift();
  }

  await syncRoomStateToFirestore(code);

  res.json({ success: true, reaction });
});

// Force Advance to Next Question / End
app.post("/api/rooms/:code/next", async (req, res) => {
  const code = req.params.code.toUpperCase();
  const room = rooms.get(code);

  if (!room) {
    return res.status(404).json({ success: false, error: "Room not found." });
  }

  const nextIndex = room.currentQuestionIndex + 1;
  if (nextIndex >= room.questions.length) {
    room.status = "ended";
    room.activityFeed.push("🏁 Tournament completed. Stand up on the Victory Podium!");
  } else {
    room.currentQuestionIndex = nextIndex;
    room.timer = room.questions[nextIndex].timeLimit || 15;
    room.lastUpdate = Date.now();

    // Reset bot states and player speeds for the upcoming question
    room.players.forEach((p) => {
      p.lastAnswerTime = undefined;
      p.lastAnswerCorrect = undefined;
    });

    room.activityFeed.push(`🎯 Arena Advanced! Welcoming Question ${nextIndex + 1}`);
  }

  await syncRoomStateToFirestore(code);

  res.json({ success: true, room });
});

// Serve Vite SPA files in production or hook local Vite Server in development
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
    console.log("Vite dev server mounted as middleware successfully.");
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
    console.log("Serving static pre-built production bundles from: ", distPath);
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server listening at: http://localhost:${PORT}`);
  });
}

startServer();
