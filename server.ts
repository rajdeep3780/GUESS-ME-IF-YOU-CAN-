import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { GoogleGenAI } from '@google/genai';
import path from 'path';
import fs from 'fs';
import dns from 'dns';
import dotenv from 'dotenv';

dotenv.config();

// Ensure the local database exists
const DB_PATH = path.resolve('db.json');

interface User {
  id: string;
  username: string;
  avatar: string;
  level: number;
  xp: number;
  coins: number;
  gamesPlayed: number;
  gamesWon: number;
  accuracy: number;
  achievements: string[];
  lastClaimedDaily: string | null;
  country: string;
  isBanned?: boolean;
}

interface Achievement {
  id: string;
  title: string;
  description: string;
  rewardCoins: number;
  rewardXP: number;
  icon: string;
}

interface Room {
  code: string;
  name: string;
  hostId: string;
  hostName: string;
  category: string;
  difficulty: string;
  secretObject: string;
  status: 'lobby' | 'playing' | 'ended';
  players: { id: string; username: string; avatar: string; score: number; isReady: boolean }[];
  questions: { id: string; askerName: string; text: string; answer: 'Yes' | 'No' | 'Sometimes' | null; skipped?: boolean }[];
  maxQuestions: number;
  questionCount: number;
  timerDuration: number; // in seconds
  timeLeft: number;
  activePlayerId: string | null;
  winnerName?: string;
  chat: { sender: string; text: string; time: string; system?: boolean }[];
}

const DEFAULT_ACHIEVEMENTS: Achievement[] = [
  { id: 'first_win', title: 'First Victory', description: 'Win your first game', rewardCoins: 100, rewardXP: 100, icon: '🏆' },
  { id: 'ai_slayer', title: 'AI Slayer', description: 'Defeat the AI Guesser 3 times', rewardCoins: 200, rewardXP: 150, icon: '🤖' },
  { id: 'detective_master', title: 'Detective Master', description: 'Stump the AI Detective in under 20 questions', rewardCoins: 300, rewardXP: 250, icon: '🔍' },
  { id: 'coin_hoarder', title: 'Rich Guesser', description: 'Accumulate 1,000 coins', rewardCoins: 150, rewardXP: 100, icon: '💰' },
  { id: 'multitasker', title: 'Social Gamer', description: 'Play 5 multiplayer matches', rewardCoins: 250, rewardXP: 200, icon: '👥' },
  { id: 'nightmare_conqueror', title: 'Nightmare Conqueror', description: 'Solve a puzzle on Nightmare or Impossible difficulty', rewardCoins: 500, rewardXP: 400, icon: '💀' },
];

const DEFAULT_CATEGORIES = [
  'Objects', 'Animals', 'Places', 'Countries', 'Movies', 'Games', 
  'Food', 'Technology', 'Science', 'Sports', 'Space', 'History', 'Random'
];

// Initialize DB structure
let db: {
  users: Record<string, User>;
  leaderboard: { id: string; username: string; level: number; xp: number; gamesWon: number; country: string }[];
  categories: string[];
  dailyChallenges: { date: string; category: string; difficulty: string; hint: string; objectName: string }[];
} = {
  users: {},
  leaderboard: [],
  categories: DEFAULT_CATEGORIES,
  dailyChallenges: []
};

// Load or Save DB helper
function loadDB() {
  try {
    if (fs.existsSync(DB_PATH)) {
      const data = fs.readFileSync(DB_PATH, 'utf-8');
      db = JSON.parse(data);
    } else {
      // Seed some mock leaderboard profiles to look alive immediately
      db.users = {
        'mock1': { id: 'mock1', username: 'HyperBeast', avatar: '🐉', level: 14, xp: 4200, coins: 1450, gamesPlayed: 54, gamesWon: 32, accuracy: 59, achievements: ['first_win', 'ai_slayer'], lastClaimedDaily: null, country: 'USA' },
        'mock2': { id: 'mock2', username: 'ShadowBlade', avatar: '🥷', level: 9, xp: 2100, coins: 890, gamesPlayed: 28, gamesWon: 15, accuracy: 53, achievements: ['first_win'], lastClaimedDaily: null, country: 'Canada' },
        'mock3': { id: 'mock3', username: 'QuantumVibe', avatar: '🌌', level: 21, xp: 7800, coins: 3400, gamesPlayed: 98, gamesWon: 61, accuracy: 62, achievements: ['first_win', 'ai_slayer', 'detective_master', 'coin_hoarder'], lastClaimedDaily: null, country: 'UK' },
        'mock4': { id: 'mock4', username: 'NeonGamer', avatar: '🎮', level: 5, xp: 1200, coins: 450, gamesPlayed: 12, gamesWon: 6, accuracy: 50, achievements: ['first_win'], lastClaimedDaily: null, country: 'Japan' },
      };
      updateLeaderboard();
      saveDB();
    }
  } catch (err) {
    console.error('Error reading database file:', err);
  }
}

function saveDB() {
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error saving database file:', err);
  }
}

function updateLeaderboard() {
  db.leaderboard = Object.values(db.users)
    .filter(u => !u.isBanned)
    .map(u => ({
      id: u.id,
      username: u.username,
      level: u.level,
      xp: u.xp,
      gamesWon: u.gamesWon,
      country: u.country
    }))
    .sort((a, b) => b.xp - a.xp)
    .slice(0, 50);
}

loadDB();

// Initialize Gemini Client
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || 'MOCK_KEY',
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

// Helper for calling Gemini with retry and fallback models
async function askGemini(prompt: string, systemInstruction?: string, isJson: boolean = false): Promise<string> {
  if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === 'MY_GEMINI_API_KEY' || process.env.GEMINI_API_KEY === 'MOCK_KEY') {
    // Elegant simulation if no valid key is provided
    console.warn('Using simulation mode: GEMINI_API_KEY is not set or placeholder.');
    return simulateAiResponse(prompt, systemInstruction, isJson);
  }

  const modelsToTry = [
    'gemini-3.5-flash',
    'gemini-3.1-flash-lite',
    'gemini-flash-latest'
  ];

  for (const model of modelsToTry) {
    let delayMs = 500;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const response = await ai.models.generateContent({
          model: model,
          contents: prompt,
          config: {
            systemInstruction,
            responseMimeType: isJson ? 'application/json' : undefined,
          }
        });
        if (response.text) {
          return response.text;
        }
      } catch (error: any) {
        console.warn(`Attempt ${attempt} for model ${model} failed. Error: ${error.message || error}`);
        if (attempt < 3) {
          await new Promise(resolve => setTimeout(resolve, delayMs));
          delayMs *= 2; // exponential backoff
        }
      }
    }
  }

  console.warn('All Gemini models failed or returned empty. Falling back to simulated response.');
  return simulateAiResponse(prompt, systemInstruction, isJson);
}

// Simulated AI responses in case of missing keys
function simulateAiResponse(prompt: string, system?: string, isJson?: boolean): string {
  if (isJson) {
    if (system?.includes('AI Detective')) {
      // Detective wants next question
      const randomQuestions = [
        "Is your object something that is typically used indoors?",
        "Can your object be held easily with one hand?",
        "Is your object an animal or living organism?",
        "Does your object require electricity or batteries to run?",
        "Is it commonly found in a typical household?",
        "Is it heavier than a standard laptop?",
        "Is it made mostly of metal or plastic?",
        "Is your object something you can consume (eat or drink)?"
      ];
      const q = randomQuestions[Math.floor(Math.random() * randomQuestions.length)];
      return JSON.stringify({
        type: 'question',
        text: q,
        reasoning: 'Analyzing common traits of objects.'
      });
    } else {
      // Guesser game: Yes/No answers
      const answers = ['Yes', 'No'];
      const randomAnswer = answers[Math.floor(Math.random() * 2)];
      return JSON.stringify({
        answer: randomAnswer,
        comment: "Interesting question! My algorithmic pathways suggest a " + randomAnswer + "."
      });
    }
  }

  // Raw text simulation
  if (prompt.toLowerCase().includes('select a secret')) {
    const randomObjects = ['Smartphone', 'Coffee Mug', 'Elephant', 'Eiffel Tower', 'Pizza', 'Notebook', 'Soccer Ball', 'Astronaut Helmet', 'Microscope', 'Violin'];
    return randomObjects[Math.floor(Math.random() * randomObjects.length)];
  }

  return "Yes";
}

// In-Memory active rooms state
const rooms: Record<string, Room> = {};

// Express setup
const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

app.use(express.json());

// --- REST API API ENDPOINTS ---

// Check server status
app.get('/api/status', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// User Auth endpoint
app.post('/api/auth/login', (req, res) => {
  const { id, username, email, isGuest, avatar, country } = req.body;
  if (!id) {
    return res.status(400).json({ error: 'Missing ID' });
  }

  let user = db.users[id];
  if (!user) {
    // Setup new user profile
    user = {
      id,
      username: username || `Guesser_${Math.floor(1000 + Math.random() * 9000)}`,
      avatar: avatar || ['🧙‍♂️', '🦸‍♂️', '🐱', '🤖', '🦊', '🦄', '🦁', '🐻', '🍕', '🚀'][Math.floor(Math.random() * 10)],
      level: 1,
      xp: 0,
      coins: 200, // starting gift
      gamesPlayed: 0,
      gamesWon: 0,
      accuracy: 0,
      achievements: [],
      lastClaimedDaily: null,
      country: country || 'Earth'
    };
    db.users[id] = user;
    updateLeaderboard();
    saveDB();
  }

  if (user.isBanned) {
    return res.status(403).json({ error: 'This user account has been banned by an admin.' });
  }

  res.json(user);
});

// Get profile stats
app.get('/api/user/:id', (req, res) => {
  const user = db.users[req.params.id];
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json(user);
});

// Update Profile Customizations
app.post('/api/user/:id/update', (req, res) => {
  const user = db.users[req.params.id];
  if (!user) return res.status(404).json({ error: 'User not found' });
  
  const { username, avatar } = req.body;
  if (username) user.username = username;
  if (avatar) user.avatar = avatar;

  updateLeaderboard();
  saveDB();
  res.json(user);
});

// Claim Daily Rewards
app.post('/api/user/:id/claim-daily', (req, res) => {
  const user = db.users[req.params.id];
  if (!user) return res.status(404).json({ error: 'User not found' });

  const today = new Date().toISOString().split('T')[0];
  if (user.lastClaimedDaily === today) {
    return res.status(400).json({ error: 'Daily reward already claimed today.' });
  }

  user.lastClaimedDaily = today;
  user.coins += 100; // award coins
  user.xp += 50; // award bonus XP
  
  // Level up check
  const nextLevelXp = user.level * 500;
  if (user.xp >= nextLevelXp) {
    user.level += 1;
  }

  saveDB();
  res.json({ success: true, user });
});

// Get leaderboards
app.get('/api/leaderboard', (req, res) => {
  res.json(db.leaderboard);
});

// --- AI MODES ENDPOINTS ---

// AI Guesser Start
app.post('/api/ai/guesser/start', async (req, res) => {
  const { userId, category, difficulty } = req.body;
  if (!userId) return res.status(400).json({ error: 'Missing userId' });

  let selectedCategory = category || 'Random';
  if (selectedCategory === 'Random') {
    const list = db.categories.filter(c => c !== 'Random');
    selectedCategory = list[Math.floor(Math.random() * list.length)];
  }

  const diff = difficulty || 'Medium';
  const limits: Record<string, number> = {
    'Easy': 25,
    'Medium': 20,
    'Hard': 15,
    'Impossible': 10,
    'Nightmare': 5
  };
  const maxQuestions = limits[diff] || 20;

  // Ask AI to pick a secret object
  const pickPrompt = `Select a secret single-word or very short phrase object, place, food, movie, country or animal. 
  It must belong to the category: "${selectedCategory}". 
  The player's difficulty setting is "${diff}". Adjust the obscurity/difficulty of the selected object accordingly (Easy = very famous, Nightmare = obscure or conceptual).
  Respond with ONLY the exact name of the object. No punctuation, no wrapping, no extra sentences.`;

  const system = `You are a strict database selector. Output only the word or short name of the chosen object.`;
  const secretObject = await askGemini(pickPrompt, system);
  const cleanedSecret = secretObject.replace(/[".']/g, '').trim();

  res.json({
    secretObject: cleanedSecret, // Send to client, client should keep it hidden or Server can keep state (we will allow client to store it in game session for simple routing, or we keep it)
    maxQuestions,
    category: selectedCategory,
    difficulty: diff
  });
});

// AI Guesser Ask Question
app.post('/api/ai/guesser/ask', async (req, res) => {
  const { secretObject, category, question, difficulty } = req.body;
  if (!secretObject || !question) {
    return res.status(400).json({ error: 'Missing parameters' });
  }

  const prompt = `The secret item is: "${secretObject}".
  The category of the secret item is: "${category}".
  The current difficulty is: "${difficulty}".
  The player asks this question to try to deduce the secret item: "${question}".
  
  Your response must be in JSON with these properties:
  - "answer": Must be exactly "Yes" or "No".
  - "comment": A short, witty, and highly engaging 1-sentence comment as a snarky Game Master (under 12 words). Do not give away the answer directly.
  `;

  const system = `You are the witty, slightly snarky Game Master of a guessing game. You strictly answer questions about the secret object with "Yes" or "No". Under no circumstances can you answer "Sometimes" or give any vague answers. You must be 100% consistent and logical based on real-world facts of "${secretObject}". Respond only with valid JSON matching the schema.`;
  const jsonResponse = await askGemini(prompt, system, true);

  try {
    const parsed = JSON.parse(jsonResponse);
    // Strict clean-up to guarantee 'Yes' or 'No'
    if (parsed.answer !== 'Yes' && parsed.answer !== 'No') {
      parsed.answer = 'No';
    }
    res.json(parsed);
  } catch (e) {
    // If JSON parsing fails, fallback
    res.json({
      answer: 'No',
      comment: 'An interesting query... I cannot give you a straight answer.'
    });
  }
});

// AI Guesser Validate Guess
app.post('/api/ai/guesser/guess', async (req, res) => {
  const { secretObject, guess, category } = req.body;
  if (!secretObject || !guess) {
    return res.status(400).json({ error: 'Missing parameters' });
  }

  const cleanSecret = secretObject.toLowerCase().trim();
  const cleanGuess = guess.toLowerCase().trim();

  // Basic direct match
  if (cleanSecret === cleanGuess || cleanSecret.includes(cleanGuess) && cleanGuess.length > 3) {
    return res.json({ correct: true, confidence: 100 });
  }

  // Otherwise, use smart semantic comparison
  const prompt = `The secret target word is: "${secretObject}".
  The player's guess is: "${guess}".
  The category is: "${category}".
  
  Does this guess refer to the exact same object or target, or is it a very close synonym that should be counted as correct?
  Respond with a JSON object containing:
  - "correct": boolean (true if the guess is correct/synonymous, false otherwise)
  - "clue": a short, witty hint (under 10 words) highlighting why it is incorrect or slightly off, without directly spoiling the answer.
  `;

  const system = `You are a precise referee. Decide if the player's guess matches the secret target semantically. Respond in valid JSON only.`;
  const jsonResponse = await askGemini(prompt, system, true);

  try {
    const parsed = JSON.parse(jsonResponse);
    res.json(parsed);
  } catch (e) {
    res.json({ correct: false, clue: 'Not quite! Try thinking outside the box.' });
  }
});

// AI Detective Ask (Next AI question or final guess)
app.post('/api/ai/detective/ask', async (req, res) => {
  const { category, difficulty, history } = req.body; // history: Array of { q: string, a: string }
  
  const historyText = history.map((h: any, idx: number) => `Q${idx+1}: ${h.q} -> Answer: ${h.a}`).join('\n');
  const questionCount = history.length;

  const prompt = `You are the AI Detective. Your goal is to deduce the secret object that the player has selected.
  The category is "${category}" and the difficulty level is "${difficulty}".
  We have asked ${questionCount} questions so far.
  Here is the question & answer history:
  ${historyText || 'No questions asked yet.'}

  Now, you must decide your next step. You can either:
  1. Ask another yes/no question to narrow down the target.
  2. Make a final guess (if you have strong confidence, or if we are approaching the 20 questions limit).

  Your response must be in valid JSON with these exact properties:
  - "type": "question" or "guess"
  - "text": The text of your question (e.g. "Is it electronic?") or your final guess (e.g. "Is it a smartphone?")
  - "reasoning": A brief developer note explaining your logical progression.
  `;

  const system = `You are an elite, highly intelligent detective playing a guessing game. You must ask highly optimal questions (using binary search style queries) to narrow down the secret item, or make a guess if confident. Respond ONLY in valid JSON.`;
  const jsonResponse = await askGemini(prompt, system, true);

  try {
    const parsed = JSON.parse(jsonResponse);
    res.json(parsed);
  } catch (e) {
    res.json({
      type: 'question',
      text: 'Is it something you can touch physically?',
      reasoning: 'Fallback question due to parsing issue.'
    });
  }
});

// Update user stats (XP, coins, games count)
app.post('/api/user/:id/reward', (req, res) => {
  const user = db.users[req.params.id];
  if (!user) return res.status(404).json({ error: 'User not found' });

  const { won, xpEarned, coinsEarned, accuracy } = req.body;
  
  user.gamesPlayed += 1;
  if (won) {
    user.gamesWon += 1;
  }
  
  user.xp += xpEarned || 0;
  user.coins += coinsEarned || 0;

  // Level calculation (each level is level * 500 XP)
  const prevLevel = user.level;
  while (user.xp >= user.level * 500) {
    user.xp -= user.level * 500;
    user.level += 1;
  }

  // Update achievements
  if (user.gamesWon >= 1 && !user.achievements.includes('first_win')) {
    user.achievements.push('first_win');
    user.coins += 100;
  }
  if (user.coins >= 1000 && !user.achievements.includes('coin_hoarder')) {
    user.achievements.push('coin_hoarder');
    user.coins += 150;
  }

  // Set average accuracy
  if (accuracy) {
    user.accuracy = Math.round(((user.accuracy * (user.gamesPlayed - 1)) + accuracy) / user.gamesPlayed);
  }

  updateLeaderboard();
  saveDB();
  res.json({ success: true, user, leveledUp: user.level > prevLevel });
});


// --- ADMIN ENDPOINTS ---

// Admin Stats
app.get('/api/admin/stats', (req, res) => {
  const totalUsers = Object.keys(db.users).length;
  const activeMultiplayerRooms = Object.keys(rooms).length;
  const bannedUsers = Object.values(db.users).filter(u => u.isBanned).length;

  res.json({
    totalUsers,
    activeRooms: activeMultiplayerRooms,
    bannedUsers,
    categoriesCount: db.categories.length,
    usersList: Object.values(db.users).map(u => ({ id: u.id, username: u.username, level: u.level, isBanned: !!u.isBanned, gamesPlayed: u.gamesPlayed }))
  });
});

// Admin Ban User
app.post('/api/admin/ban', (req, res) => {
  const { id, ban } = req.body;
  const user = db.users[id];
  if (!user) return res.status(404).json({ error: 'User not found' });

  user.isBanned = !!ban;
  updateLeaderboard();
  saveDB();
  res.json({ success: true, user });
});

// Admin Add Category
app.post('/api/admin/category', (req, res) => {
  const { category } = req.body;
  if (!category) return res.status(400).json({ error: 'Missing category' });

  if (!db.categories.includes(category)) {
    db.categories.push(category);
    saveDB();
  }
  res.json({ success: true, categories: db.categories });
});


// --- MULTIPLAYER ROOM SOCKET.IO HANDLERS ---

io.on('connection', (socket) => {
  console.log(`Socket connected: ${socket.id}`);

  // User joins with profile setup
  socket.on('register', ({ userId, username }) => {
    socket.data.userId = userId;
    socket.data.username = username;
  });

  // Create Room
  socket.on('create-room', ({ roomName, category, difficulty, secretObject, hostId, hostName, hostAvatar }) => {
    const roomCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    
    const limits: Record<string, number> = {
      'Easy': 25, 'Medium': 20, 'Hard': 15, 'Impossible': 10, 'Nightmare': 5
    };
    const maxQuestions = limits[difficulty] || 20;

    const newRoom: Room = {
      code: roomCode,
      name: roomName || `${hostName}'s Lobby`,
      hostId,
      hostName,
      category,
      difficulty,
      secretObject: secretObject.trim(),
      status: 'lobby',
      players: [{ id: hostId, username: hostName, avatar: hostAvatar, score: 0, isReady: true }],
      questions: [],
      maxQuestions,
      questionCount: 0,
      timerDuration: 60,
      timeLeft: 60,
      activePlayerId: hostId,
      chat: [{ sender: 'System', text: `Room created by ${hostName}. Share Code: ${roomCode}`, time: new Date().toLocaleTimeString(), system: true }]
    };

    rooms[roomCode] = newRoom;
    socket.join(roomCode);
    socket.data.roomCode = roomCode;

    socket.emit('room-created', newRoom);
    console.log(`Room created: ${roomCode} by ${hostId}`);
  });

  // Join Room
  socket.on('join-room', ({ roomCode, userId, username, avatar }) => {
    const room = rooms[roomCode];
    if (!room) {
      return socket.emit('join-error', 'Room not found.');
    }
    if (room.status !== 'lobby') {
      return socket.emit('join-error', 'Game already started in this room.');
    }
    if (room.players.some(p => p.id === userId)) {
      // Re-joining player
      socket.join(roomCode);
      socket.data.roomCode = roomCode;
      return socket.emit('room-joined', room);
    }

    const newPlayer = { id: userId, username, avatar, score: 0, isReady: false };
    room.players.push(newPlayer);
    room.chat.push({
      sender: 'System',
      text: `${username} joined the lobby!`,
      time: new Date().toLocaleTimeString(),
      system: true
    });

    socket.join(roomCode);
    socket.data.roomCode = roomCode;

    io.to(roomCode).emit('room-updated', room);
    socket.emit('room-joined', room);
  });

  // Toggle Ready
  socket.on('toggle-ready', ({ roomCode, userId }) => {
    const room = rooms[roomCode];
    if (!room) return;

    const player = room.players.find(p => p.id === userId);
    if (player) {
      player.isReady = !player.isReady;
      io.to(roomCode).emit('room-updated', room);
    }
  });

  // Start Multiplayer Game
  socket.on('start-game', ({ roomCode }) => {
    const room = rooms[roomCode];
    if (!room) return;

    room.status = 'playing';
    room.chat.push({
      sender: 'System',
      text: `The game has started! Host selected a secret ${room.category}. Good luck guessing!`,
      time: new Date().toLocaleTimeString(),
      system: true
    });

    // Pick first active player (not host)
    const guessers = room.players.filter(p => p.id !== room.hostId);
    if (guessers.length > 0) {
      room.activePlayerId = guessers[0].id;
    } else {
      room.activePlayerId = room.hostId; // fallback
    }

    io.to(roomCode).emit('game-started', room);
  });

  // Submit Question (from Guesser)
  socket.on('ask-question', ({ roomCode, askerId, askerName, text }) => {
    const room = rooms[roomCode];
    if (!room) return;

    const qId = Math.random().toString(36).substring(2, 9);
    const newQuestion = { id: qId, askerName, text, answer: null };
    room.questions.push(newQuestion);
    room.questionCount += 1;

    room.chat.push({
      sender: 'Game',
      text: `${askerName} asked: "${text}"`,
      time: new Date().toLocaleTimeString(),
      system: true
    });

    io.to(roomCode).emit('room-updated', room);
    io.to(roomCode).emit('question-pending', newQuestion);
  });

  // Host Answers Question
  socket.on('answer-question', ({ roomCode, qId, answer }) => {
    const room = rooms[roomCode];
    if (!room) return;

    const q = room.questions.find(quest => quest.id === qId);
    if (q) {
      q.answer = answer;
      
      room.chat.push({
        sender: 'Host',
        text: `Host answered: "${answer}" to "${q.text}"`,
        time: new Date().toLocaleTimeString(),
        system: true
      });

      // Pass turn to next guesser
      const guessers = room.players.filter(p => p.id !== room.hostId);
      if (guessers.length > 1) {
        const currentIdx = guessers.findIndex(g => g.id === room.activePlayerId);
        const nextIdx = (currentIdx + 1) % guessers.length;
        room.activePlayerId = guessers[nextIdx].id;
      }

      io.to(roomCode).emit('room-updated', room);
      io.to(roomCode).emit('question-answered', { qId, answer });
    }
  });

  // Skip Turn / Question
  socket.on('skip-question', ({ roomCode, qId }) => {
    const room = rooms[roomCode];
    if (!room) return;

    const q = room.questions.find(quest => quest.id === qId);
    if (q) {
      q.answer = null;
      q.skipped = true;
      
      room.chat.push({
        sender: 'System',
        text: `Question: "${q.text}" was skipped/ignored.`,
        time: new Date().toLocaleTimeString(),
        system: true
      });

      // Pass turn
      const guessers = room.players.filter(p => p.id !== room.hostId);
      if (guessers.length > 1) {
        const currentIdx = guessers.findIndex(g => g.id === room.activePlayerId);
        const nextIdx = (currentIdx + 1) % guessers.length;
        room.activePlayerId = guessers[nextIdx].id;
      }

      io.to(roomCode).emit('room-updated', room);
    }
  });

  // Submit Guess
  socket.on('submit-guess', ({ roomCode, playerId, playerName, guess }) => {
    const room = rooms[roomCode];
    if (!room) return;

    const isCorrect = guess.toLowerCase().trim() === room.secretObject.toLowerCase().trim();

    room.chat.push({
      sender: playerName,
      text: `Guessed: "${guess}"`,
      time: new Date().toLocaleTimeString(),
      system: false
    });

    if (isCorrect) {
      room.status = 'ended';
      room.winnerName = playerName;
      
      // Update scores
      const winner = room.players.find(p => p.id === playerId);
      if (winner) {
        winner.score += 500;
      }

      room.chat.push({
        sender: 'System',
        text: `🎉 CORRECT! ${playerName} guessed the secret object: "${room.secretObject}"!`,
        time: new Date().toLocaleTimeString(),
        system: true
      });

      io.to(roomCode).emit('game-ended', { room, winnerId: playerId, winnerName: playerName, secretObject: room.secretObject });
    } else {
      room.chat.push({
        sender: 'System',
        text: `❌ Incorrect guess by ${playerName}: "${guess}"`,
        time: new Date().toLocaleTimeString(),
        system: true
      });
      socket.emit('guess-wrong', { guess, message: 'Incorrect! Keep questioning!' });
      io.to(roomCode).emit('room-updated', room);
    }
  });

  // Emoji Reactions
  socket.on('send-reaction', ({ roomCode, senderName, emoji }) => {
    io.to(roomCode).emit('reaction-received', { senderName, emoji });
  });

  // Chat message
  socket.on('send-chat', ({ roomCode, sender, text }) => {
    const room = rooms[roomCode];
    if (!room) return;

    const newMsg = { sender, text, time: new Date().toLocaleTimeString() };
    room.chat.push(newMsg);
    io.to(roomCode).emit('chat-updated', room.chat);
  });

  // Leave room
  socket.on('leave-room', ({ roomCode, userId }) => {
    const room = rooms[roomCode];
    if (!room) return;

    room.players = room.players.filter(p => p.id !== userId);
    room.chat.push({
      sender: 'System',
      text: `${socket.data.username || 'A player'} has left the room.`,
      time: new Date().toLocaleTimeString(),
      system: true
    });

    if (room.players.length === 0 || room.hostId === userId) {
      // Room empty or host left -> delete room
      delete rooms[roomCode];
      console.log(`Room closed: ${roomCode}`);
    } else {
      // Re-assign host if host left
      if (room.hostId === userId) {
        room.hostId = room.players[0].id;
        room.hostName = room.players[0].username;
      }
      io.to(roomCode).emit('room-updated', room);
    }
    socket.leave(roomCode);
  });

  socket.on('disconnect', () => {
    console.log(`Socket disconnected: ${socket.id}`);
    const roomCode = socket.data.roomCode;
    const userId = socket.data.userId;
    
    if (roomCode && userId) {
      const room = rooms[roomCode];
      if (room) {
        room.players = room.players.filter(p => p.id !== userId);
        if (room.players.length === 0) {
          delete rooms[roomCode];
        } else {
          io.to(roomCode).emit('room-updated', room);
        }
      }
    }
  });
});


// --- INTEGRATE VITE FOR PRODUCTION & DEVELOPMENT ENVIRONMENT ---

const PORT = 3000;

async function start() {
  if (process.env.NODE_ENV !== 'production') {
    // Dynamically import Vite server and run as a middleware in Express
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    
    app.use(vite.middlewares);
    console.log('Vite Dev Middleware integrated.');
  } else {
    // Serve static files in production
    app.use(express.static(path.resolve('dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve('dist/index.html'));
    });
    console.log('Serving production build assets.');
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Guess Me If You Can server listening on port ${PORT}`);
  });
}

start();
