import React, { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { 
  ArrowLeft, Users, Send, Key, Play, Sparkles, CheckCircle2, RefreshCw, Volume2, Shield, Flame, Trash2, X
} from 'lucide-react';
import { soundManager } from '../utils/sound';

interface MultiplayerGameProps {
  user: any;
  onBack: () => void;
  onUpdateUser: (updatedUser: any) => void;
}

const CATEGORY_MAP: Record<string, string> = {
  'Animals 🐶': 'Animals',
  'Objects 📦': 'Objects',
  'Countries 🌍': 'Countries',
  'Games 🎮': 'Games',
  'Movies 🎬': 'Movies',
  'Science 🔬': 'Science',
  'Random 😈': 'Random'
};

const CATEGORIES = ['Animals 🐶', 'Objects 📦', 'Countries 🌍', 'Games 🎮', 'Movies 🎬', 'Science 🔬', 'Random 😈'];

interface Player {
  id: string;
  username: string;
  avatar: string;
  score: number;
  isReady: boolean;
}

interface Question {
  id: string;
  askerName: string;
  text: string;
  answer: 'Yes' | 'No' | null;
  skipped?: boolean;
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
  players: Player[];
  questions: Question[];
  maxQuestions: number;
  questionCount: number;
  activePlayerId: string | null;
  winnerName?: string;
  chat: { sender: string; text: string; time: string; system?: boolean }[];
}

export default function MultiplayerGame({ user, onBack, onUpdateUser }: MultiplayerGameProps) {
  const [view, setView] = useState<'selection' | 'create' | 'join' | 'room'>('selection');
  
  // Create Form State
  const [roomName, setRoomName] = useState('');
  const [category, setCategory] = useState('Objects 📦');
  const [difficulty, setDifficulty] = useState('Medium');
  const [secretObject, setSecretObject] = useState('');
  
  // Join Form State
  const [joinCode, setJoinCode] = useState('');
  
  // Active Socket Room state
  const [room, setRoom] = useState<Room | null>(null);
  const [chatMsg, setChatMsg] = useState('');
  const [questionText, setQuestionText] = useState('');
  const [guessText, setGuessText] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [reactions, setReactions] = useState<{ id: number; name: string; emoji: string }[]>([]);

  const socketRef = useRef<Socket | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Connect to same origin
    const socket = io({
      autoConnect: true,
      transports: ['websocket', 'polling']
    });
    socketRef.current = socket;

    socket.emit('register', { userId: user.id, username: user.username });

    // Socket Event Receivers
    socket.on('room-created', (newRoom: Room) => {
      setRoom(newRoom);
      setView('room');
      soundManager.playCoin();
    });

    socket.on('room-joined', (joinedRoom: Room) => {
      setRoom(joinedRoom);
      setView('room');
      soundManager.playCoin();
    });

    socket.on('join-error', (msg: string) => {
      setErrorMsg(msg);
      soundManager.playLose();
    });

    socket.on('room-updated', (updatedRoom: Room) => {
      setRoom(updatedRoom);
    });

    socket.on('game-started', (startedRoom: Room) => {
      setRoom(startedRoom);
      soundManager.playWin();
    });

    socket.on('question-pending', (question: Question) => {
      soundManager.playTick();
    });

    socket.on('question-answered', ({ qId, answer }) => {
      soundManager.playCoin();
    });

    socket.on('guess-wrong', ({ guess, message }) => {
      soundManager.playLose();
      alert(`Wrong Guess: "${guess}". Keep seeking questions!`);
    });

    socket.on('reaction-received', ({ senderName, emoji }) => {
      // Trigger floating reaction animation
      const id = Date.now() + Math.random();
      setReactions(prev => [...prev, { id, name: senderName, emoji }]);
      setTimeout(() => {
        setReactions(prev => prev.filter(r => r.id !== id));
      }, 4000);
    });

    socket.on('chat-updated', (chatFeed) => {
      setRoom(prev => prev ? { ...prev, chat: chatFeed } : null);
    });

    socket.on('game-ended', ({ room: endedRoom, winnerId, winnerName, secretObject }) => {
      setRoom(endedRoom);
      soundManager.playWin();

      // If we are the winner, award us multiplayer points
      if (winnerId === user.id) {
        fetch(`/api/user/${user.id}/reward`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ won: true, xpEarned: 300, coinsEarned: 100, accuracy: 100 })
        })
          .then(res => res.json())
          .then(data => {
            if (data.success) onUpdateUser(data.user);
          });
      } else {
        // Participation points
        fetch(`/api/user/${user.id}/reward`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ won: false, xpEarned: 50, coinsEarned: 10, accuracy: 0 })
        })
          .then(res => res.json())
          .then(data => {
            if (data.success) onUpdateUser(data.user);
          });
      }
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [room?.chat]);

  const handleCreateRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomName.trim() || !secretObject.trim()) return;
    soundManager.playClick();
    
    socketRef.current?.emit('create-room', {
      roomName: roomName.trim(),
      category: CATEGORY_MAP[category] || category,
      difficulty,
      secretObject: secretObject.trim(),
      hostId: user.id,
      hostName: user.username,
      hostAvatar: user.avatar
    });
  };

  const handleJoinRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCode.trim()) return;
    soundManager.playClick();
    setErrorMsg('');

    socketRef.current?.emit('join-room', {
      roomCode: joinCode.trim().toUpperCase(),
      userId: user.id,
      username: user.username,
      avatar: user.avatar
    });
  };

  const handleLeaveRoom = () => {
    soundManager.playClick();
    if (room) {
      socketRef.current?.emit('leave-room', { roomCode: room.code, userId: user.id });
    }
    setRoom(null);
    setView('selection');
  };

  const handleToggleReady = () => {
    soundManager.playClick();
    if (room) {
      socketRef.current?.emit('toggle-ready', { roomCode: room.code, userId: user.id });
    }
  };

  const handleStartGame = () => {
    soundManager.playClick();
    if (room) {
      socketRef.current?.emit('start-game', { roomCode: room.code });
    }
  };

  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatMsg.trim() || !room) return;
    soundManager.playClick();

    socketRef.current?.emit('send-chat', {
      roomCode: room.code,
      sender: user.username,
      text: chatMsg.trim()
    });
    setChatMsg('');
  };

  const handleSendReaction = (emoji: string) => {
    soundManager.playClick();
    if (room) {
      socketRef.current?.emit('send-reaction', {
        roomCode: room.code,
        senderName: user.username,
        emoji
      });
    }
  };

  const handleAskQuestion = (e: React.FormEvent) => {
    e.preventDefault();
    if (!questionText.trim() || !room) return;
    soundManager.playClick();

    socketRef.current?.emit('ask-question', {
      roomCode: room.code,
      askerId: user.id,
      askerName: user.username,
      text: questionText.trim()
    });
    setQuestionText('');
  };

  const handleHostAnswer = (qId: string, answer: 'Yes' | 'No' | 'Sometimes') => {
    soundManager.playClick();
    if (room) {
      socketRef.current?.emit('answer-question', {
        roomCode: room.code,
        qId,
        answer
      });
    }
  };

  const handleHostSkip = (qId: string) => {
    soundManager.playClick();
    if (room) {
      socketRef.current?.emit('skip-question', { roomCode: room.code, qId });
    }
  };

  const handleMakeGuess = (e: React.FormEvent) => {
    e.preventDefault();
    if (!guessText.trim() || !room) return;
    soundManager.playClick();

    socketRef.current?.emit('submit-guess', {
      roomCode: room.code,
      playerId: user.id,
      playerName: user.username,
      guess: guessText.trim()
    });
    setGuessText('');
  };

  const isHost = room?.hostId === user.id;
  const isMyTurn = room?.activePlayerId === user.id;
  const allPlayersReady = room?.players.every(p => p.isReady);

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6 px-4 py-4 animate-fade-in relative min-h-[600px]">
      
      {/* Floating emoji reaction space */}
      <div className="absolute inset-0 pointer-events-none z-40 overflow-hidden">
        {reactions.map((react) => (
          <div
            key={react.id}
            className="absolute bottom-20 left-1/2 -translate-x-1/2 flex flex-col items-center animate-bounce-float pointer-events-none bg-slate-900/90 px-3 py-1.5 rounded-full border border-violet-500/30 shadow-[0_0_15px_rgba(139,92,246,0.3)]"
            style={{
              animation: 'floatUp 3.5s forwards ease-out',
              left: `${40 + Math.random() * 20}%`
            }}
          >
            <span className="text-2xl">{react.emoji}</span>
            <span className="text-[9px] font-bold uppercase tracking-wider text-gray-400 font-mono">{react.name}</span>
          </div>
        ))}
      </div>

      <style>{`
        @keyframes floatUp {
          0% { transform: translateY(0) scale(0.6); opacity: 1; }
          100% { transform: translateY(-400px) scale(1.1); opacity: 0; }
        }
      `}</style>

      {/* Header bar */}
      <div className="flex items-center justify-between border-b border-white/5 pb-4">
        {view === 'room' ? (
          <button
            onClick={handleLeaveRoom}
            className="flex items-center gap-2 text-sm font-bold text-red-400 hover:text-red-300 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" /> Abandon Room
          </button>
        ) : (
          <button
            onClick={() => { soundManager.playClick(); onBack(); }}
            className="flex items-center gap-2 text-sm font-bold text-gray-400 hover:text-white transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" /> Main Menu
          </button>
        )}
        <div className="flex items-center gap-2">
          <span className="p-2 rounded-xl bg-fuchsia-500/10 border border-fuchsia-500/20 text-fuchsia-400">
            <Users className="w-4 h-4" />
          </span>
          <span className="text-sm font-black uppercase tracking-wider text-white">Multiplayer Arena</span>
        </div>
      </div>

      {view === 'selection' ? (
        <div className="max-w-2xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6 pt-6">
          {/* Create Room Box */}
          <div className="glass-panel border-violet-500/15 p-6 rounded-3xl flex flex-col justify-between space-y-6">
            <div className="space-y-3 text-center md:text-left">
              <span className="text-3xl">🔑</span>
              <h3 className="text-lg font-black uppercase tracking-wider text-white">Forge Custom Lobby</h3>
              <p className="text-xs text-gray-400">Set custom categories, difficulty restrictions, and define a secret target item for your friends.</p>
            </div>
            <button
              id="goto-create-room-btn"
              onClick={() => { soundManager.playClick(); setView('create'); }}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white font-bold uppercase tracking-wider text-xs shadow-[0_0_15px_rgba(139,92,246,0.25)] transition-all cursor-pointer"
            >
              Host Match
            </button>
          </div>

          {/* Join Room Box */}
          <div className="glass-panel border-cyan-500/15 p-6 rounded-3xl flex flex-col justify-between space-y-6">
            <div className="space-y-3 text-center md:text-left">
              <span className="text-3xl">🎫</span>
              <h3 className="text-lg font-black uppercase tracking-wider text-white">Join Private Room</h3>
              <p className="text-xs text-gray-400">Enter your shared room code to immediately log into your companion's private lobby.</p>
            </div>
            <button
              id="goto-join-room-btn"
              onClick={() => { soundManager.playClick(); setView('join'); }}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold uppercase tracking-wider text-xs shadow-[0_0_15px_rgba(6,182,212,0.25)] transition-all cursor-pointer"
            >
              Join Room
            </button>
          </div>
        </div>
      ) : view === 'create' ? (
        <form onSubmit={handleCreateRoom} className="glass-panel p-8 rounded-3xl border border-white/5 space-y-5 max-w-xl mx-auto">
          <div className="text-center space-y-2">
            <h3 className="text-xl font-black uppercase tracking-wider text-white">Lobby Setup Console</h3>
            <p className="text-xs text-gray-400">Formulate the host parameters below.</p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1.5">Lobby Name</label>
              <input
                id="host-lobby-name"
                type="text"
                required
                placeholder="e.g. Speed Guessers Pro"
                value={roomName}
                onChange={(e) => setRoomName(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-violet-500 text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1.5">The Secret Object (To be guessed)</label>
              <input
                id="host-secret-object"
                type="text"
                required
                placeholder="e.g. Electric Guitar"
                value={secretObject}
                onChange={(e) => setSecretObject(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-violet-500 text-xs"
              />
              <p className="text-[9px] text-gray-500 mt-1 uppercase tracking-wider">🔒 Hidden from other players. You will act as the Game Master / Referee.</p>
            </div>

            {/* Category selection */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-2.5">Category</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => { soundManager.playClick(); setCategory(cat); }}
                    className={`py-2 px-2 text-xs rounded-xl border font-semibold transition-all cursor-pointer text-center ${
                      category === cat
                        ? 'bg-violet-500/20 border-violet-500 text-violet-400 shadow-[0_0_15px_rgba(139,92,246,0.15)] scale-[1.02]'
                        : 'bg-slate-900/60 border-white/5 text-gray-400 hover:bg-slate-800/80 hover:border-white/10'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Difficulty Preset */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">Difficulty Preset</label>
              <div className="grid grid-cols-4 gap-2">
                {['Easy', 'Medium', 'Hard', 'Impossible'].map((diff) => (
                  <button
                    key={diff}
                    type="button"
                    onClick={() => { soundManager.playClick(); setDifficulty(diff); }}
                    className={`py-2 text-[10px] rounded-xl border font-bold uppercase tracking-wider transition-all cursor-pointer text-center ${
                      difficulty === diff
                        ? 'bg-violet-500/20 border-violet-500 text-violet-400 shadow-[0_0_15px_rgba(139,92,246,0.15)]'
                        : 'bg-slate-900/60 border-white/5 text-gray-400 hover:bg-slate-800'
                    }`}
                  >
                    {diff}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              id="host-submit-create-btn"
              type="submit"
              className="flex-1 py-3 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-bold uppercase tracking-wider text-xs transition-all cursor-pointer"
            >
              Forge Lobby
            </button>
            <button
              type="button"
              onClick={() => setView('selection')}
              className="flex-1 py-3 rounded-xl bg-slate-800 border border-white/10 text-white font-bold uppercase tracking-wider text-xs transition-all cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </form>
      ) : view === 'join' ? (
        <form onSubmit={handleJoinRoom} className="glass-panel p-8 rounded-3xl border border-white/5 space-y-5 max-w-sm mx-auto">
          <div className="text-center space-y-2">
            <h3 className="text-xl font-black uppercase tracking-wider text-white">Join Private Lobby</h3>
            <p className="text-xs text-gray-400">Acquire the room code from your host.</p>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">Room Code</label>
            <div className="relative">
              <Key className="absolute left-3 top-3 w-4 h-4 text-gray-500" />
              <input
                id="join-code-input"
                type="text"
                required
                maxLength={6}
                placeholder="XXXXXX"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900 border border-white/10 text-white font-mono uppercase tracking-widest placeholder-gray-600 focus:outline-none focus:border-cyan-500 text-sm text-center"
              />
            </div>
            {errorMsg && <p className="text-[10px] text-red-400 font-bold uppercase tracking-wide mt-2 text-center">❌ {errorMsg}</p>}
          </div>

          <div className="flex gap-3 pt-2">
            <button
              id="join-submit-btn"
              type="submit"
              className="flex-1 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold uppercase tracking-wider text-xs transition-all cursor-pointer"
            >
              Enter Lobby
            </button>
            <button
              type="button"
              onClick={() => setView('selection')}
              className="flex-1 py-2.5 rounded-xl bg-slate-800 border border-white/10 text-white font-bold uppercase tracking-wider text-xs transition-all cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </form>
      ) : room ? (
        /* Dynamic Game Room View */
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          
          {/* Left: Players List / Scoreboard */}
          <div className="lg:col-span-1 space-y-4">
            <div className="glass-panel p-5 rounded-2xl border border-white/5 space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-white/5">
                <span className="text-xs font-bold uppercase tracking-wider text-gray-400">Players Lobby</span>
                <span className="text-xs text-violet-400 font-bold font-mono">{room.players.length} online</span>
              </div>

              <div className="space-y-2.5">
                {room.players.map((p) => (
                  <div key={p.id} className="flex items-center justify-between p-2 rounded-xl bg-slate-900/60 border border-white/5">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="text-2xl">{p.avatar}</span>
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-white truncate flex items-center gap-1">
                          {p.username}
                          {p.id === room.hostId && <Shield className="w-3 h-3 text-violet-400" />}
                          {room.status === 'playing' && room.activePlayerId === p.id && <Flame className="w-3 h-3 text-red-500 animate-pulse" />}
                        </div>
                        <div className="text-[10px] text-gray-500 font-mono font-bold">SCORE: {p.score}</div>
                      </div>
                    </div>
                    {room.status === 'lobby' && (
                      <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded ${
                        p.isReady ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                      }`}>
                        {p.isReady ? 'Ready' : 'Not Ready'}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Room Info details */}
            <div className="glass-panel p-5 rounded-2xl border border-white/5 space-y-3 text-xs text-gray-400">
              <div className="flex justify-between"><span className="font-semibold uppercase tracking-wider text-[10px]">Lobby Name:</span> <span className="text-white font-bold">{room.name}</span></div>
              <div className="flex justify-between">
                <span className="font-semibold uppercase tracking-wider text-[10px]">Room Code:</span> 
                <span className="text-cyan-400 font-black font-mono tracking-widest bg-cyan-950/20 border border-cyan-500/20 px-2 py-0.5 rounded">{room.code}</span>
              </div>
              <div className="flex justify-between"><span className="font-semibold uppercase tracking-wider text-[10px]">Category:</span> <span className="text-white font-bold">{room.category}</span></div>
              <div className="flex justify-between"><span className="font-semibold uppercase tracking-wider text-[10px]">Difficulty:</span> <span className="text-violet-400 font-bold uppercase">{room.difficulty}</span></div>
              {isHost && (
                <div className="p-2.5 rounded-xl bg-violet-950/20 border border-violet-500/15 text-[10px] text-violet-300">
                  👑 You are Host. The secret target is: <span className="text-white font-bold font-mono">{room.secretObject}</span>
                </div>
              )}
            </div>
          </div>

          {/* Center: Main Action Panel */}
          <div className="lg:col-span-2 space-y-4">
            {room.status === 'lobby' ? (
              <div className="glass-panel p-8 rounded-2xl border border-white/5 text-center space-y-6">
                <span className="text-5xl animate-pulse">🎮</span>
                <div className="space-y-2">
                  <h3 className="text-xl font-black text-white uppercase tracking-wider">Lobby Deployment Pending</h3>
                  <p className="text-xs text-gray-400">Waiting for players to ready up. Host can deploy when all combatants are synchronized.</p>
                </div>

                <div className="flex gap-3 justify-center">
                  {!isHost && (
                    <button
                      id="toggle-ready-btn"
                      onClick={handleToggleReady}
                      className={`px-8 py-3 rounded-xl font-bold uppercase tracking-wider text-xs transition-all cursor-pointer ${
                        room.players.find(p => p.id === user.id)?.isReady
                          ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-[0_0_15px_rgba(16,185,129,0.3)]'
                          : 'bg-slate-800 border border-white/10 text-gray-300 hover:bg-slate-700'
                      }`}
                    >
                      {room.players.find(p => p.id === user.id)?.isReady ? 'Ready Check Active' : 'Toggle Ready'}
                    </button>
                  )}

                  {isHost && (
                    <button
                      id="host-start-match-btn"
                      onClick={handleStartGame}
                      disabled={!allPlayersReady || room.players.length < 2}
                      className={`px-8 py-3 rounded-xl font-bold uppercase tracking-wider text-xs transition-all cursor-pointer flex items-center gap-2 ${
                        allPlayersReady && room.players.length >= 2
                          ? 'bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white shadow-[0_0_15px_rgba(139,92,246,0.35)]'
                          : 'bg-slate-800 border border-white/5 text-gray-600 cursor-not-allowed'
                      }`}
                    >
                      <Play className="w-4 h-4" /> Start Battle Array
                    </button>
                  )}
                </div>
                {!allPlayersReady && <p className="text-[10px] text-amber-500 font-bold uppercase">⚠️ Synchronization halted. Some players are not ready.</p>}
                {room.players.length < 2 && <p className="text-[10px] text-amber-500 font-bold uppercase">⚠️ Multi-agent matches require at least 2 players.</p>}
              </div>
            ) : room.status === 'playing' ? (
              <div className="space-y-4">
                {/* Active Question Panel */}
                <div className="glass-panel p-5 rounded-2xl border border-white/5 space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-white/5 text-xs text-gray-400">
                    <span className="font-bold uppercase">Queries: {room.questionCount} / {room.maxQuestions}</span>
                    <span className="font-mono text-cyan-400 font-bold">Category: {room.category}</span>
                  </div>

                  {/* Turn Status Alert */}
                  <div className={`p-3 rounded-xl border text-xs font-bold text-center ${
                    isMyTurn 
                      ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400 shadow-inner' 
                      : 'bg-slate-900 border-white/5 text-gray-400'
                  }`}>
                    {isHost ? '👑 YOU ARE REFEREEING (Answer Pending Queries)' : isMyTurn ? '🔥 YOUR TURN! Ask a Yes/No question or guess the item.' : '⏳ Companion player formulating query...'}
                  </div>

                  {/* Active Question Logs */}
                  <div className="space-y-3 max-h-[220px] overflow-y-auto">
                    {room.questions.length === 0 ? (
                      <p className="text-center text-xs text-gray-500 py-6 italic">No questions proposed yet. Active turn player can launch query below.</p>
                    ) : (
                      room.questions.map((q) => (
                        <div key={q.id} className="p-3 rounded-xl bg-slate-950/40 border border-white/5 space-y-1.5 text-xs">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-gray-300">{q.askerName} asked:</span>
                            <span className={`font-black uppercase px-2 py-0.5 rounded text-[10px] ${
                              q.answer === 'Yes' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                              q.answer === 'No' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' :
                              q.skipped ? 'bg-slate-800 text-gray-500' : 'bg-violet-500/10 text-violet-400 border border-violet-500/20 animate-pulse'
                            }`}>
                              {q.answer ? q.answer : q.skipped ? 'Skipped' : 'Awaiting Answer'}
                            </span>
                          </div>
                          <p className="text-white italic">"{q.text}"</p>

                          {/* Host Controls */}
                          {isHost && q.answer === null && !q.skipped && (
                            <div className="flex flex-wrap gap-1.5 pt-2 border-t border-white/5">
                              <button
                                id={`host-yes-${q.id}`}
                                onClick={() => handleHostAnswer(q.id, 'Yes')}
                                className="px-3 py-1 bg-emerald-500/20 hover:bg-emerald-500/40 text-emerald-400 border border-emerald-500/30 font-bold uppercase text-[9px] rounded cursor-pointer"
                              >
                                Yes
                              </button>
                              <button
                                id={`host-no-${q.id}`}
                                onClick={() => handleHostAnswer(q.id, 'No')}
                                className="px-3 py-1 bg-rose-500/20 hover:bg-rose-500/40 text-rose-400 border border-rose-500/30 font-bold uppercase text-[9px] rounded cursor-pointer"
                              >
                                No
                              </button>
                              <button
                                id={`host-skip-${q.id}`}
                                onClick={() => handleHostSkip(q.id)}
                                className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-gray-400 font-bold uppercase text-[9px] rounded cursor-pointer ml-auto"
                              >
                                Skip
                              </button>
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Question Input Form / Guess Form */}
                {!isHost && isMyTurn && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Ask Question Form */}
                    <form onSubmit={handleAskQuestion} className="glass-panel p-4 rounded-xl border border-white/5 space-y-2.5">
                      <span className="text-[10px] font-black uppercase text-cyan-400 tracking-wider">Ask Yes/No Question</span>
                      <div className="flex gap-2">
                        <input
                          id="multi-ask-input"
                          type="text"
                          required
                          placeholder="e.g. Is it edible?"
                          value={questionText}
                          onChange={(e) => setQuestionText(e.target.value)}
                          className="flex-1 px-3 py-2 rounded-lg bg-slate-900 border border-white/10 text-white placeholder-gray-600 focus:outline-none text-xs"
                        />
                        <button
                          id="multi-ask-submit"
                          type="submit"
                          className="px-3 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded-lg cursor-pointer flex items-center justify-center"
                        >
                          Send
                        </button>
                      </div>
                    </form>

                    {/* Submit Guess Form */}
                    <form onSubmit={handleMakeGuess} className="glass-panel p-4 rounded-xl border border-white/5 space-y-2.5">
                      <span className="text-[10px] font-black uppercase text-violet-400 tracking-wider">Submit Target Guess</span>
                      <div className="flex gap-2">
                        <input
                          id="multi-guess-input"
                          type="text"
                          required
                          placeholder="e.g. Electric Guitar"
                          value={guessText}
                          onChange={(e) => setGuessText(e.target.value)}
                          className="flex-1 px-3 py-2 rounded-lg bg-slate-900 border border-white/10 text-white placeholder-gray-600 focus:outline-none text-xs"
                        />
                        <button
                          id="multi-guess-submit"
                          type="submit"
                          className="px-3 py-2 bg-violet-600 hover:bg-violet-500 text-white font-bold rounded-lg cursor-pointer flex items-center justify-center"
                        >
                          Guess
                        </button>
                      </div>
                    </form>
                  </div>
                )}
              </div>
            ) : (
              /* Game Ended State */
              <div className="glass-panel p-8 rounded-2xl border border-white/5 text-center space-y-6">
                <div className="inline-block p-3.5 rounded-full bg-yellow-500/10 border border-yellow-500/20 text-yellow-400">
                  <CheckCircle2 className="w-10 h-10 animate-bounce" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-xl font-black text-white uppercase tracking-wider">Match Concluded</h3>
                  <p className="text-xs text-gray-400">Winning Guesser: <span className="text-cyan-400 font-bold">{room.winnerName || 'No One (Questions exhausted)'}</span></p>
                </div>

                <div className="bg-slate-950/50 p-4 rounded-xl border border-white/5 inline-block max-w-sm mx-auto space-y-1">
                  <span className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">The Secret Target Word was</span>
                  <div className="text-lg font-black text-white">{room.secretObject}</div>
                </div>

                <div className="flex gap-3 justify-center">
                  {isHost && (
                    <button
                      id="host-rematch-btn"
                      onClick={() => {
                        soundManager.playClick();
                        // Let host re-lobby the room
                        socketRef.current?.emit('leave-room', { roomCode: room.code, userId: user.id });
                        setView('create');
                      }}
                      className="px-6 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-bold text-xs uppercase tracking-wider transition-all cursor-pointer"
                    >
                      Rematch Setup
                    </button>
                  )}
                  <button
                    onClick={handleLeaveRoom}
                    className="px-6 py-2.5 rounded-xl bg-slate-800 border border-white/10 text-white font-bold text-xs uppercase tracking-wider transition-all cursor-pointer"
                  >
                    Lobby Exit
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Right: Live Chat Box & Emojis */}
          <div className="lg:col-span-1 space-y-4">
            {/* Live Chat Panel */}
            <div className="glass-panel rounded-2xl border border-white/5 flex flex-col h-[340px]">
              <div className="px-4 py-2 border-b border-white/5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Team Comms Feed</span>
              </div>

              {/* Feed lists */}
              <div className="flex-1 overflow-y-auto p-4 space-y-2">
                {room.chat.map((msg, idx) => (
                  <div key={idx} className={`text-xs ${msg.system ? 'text-gray-500 font-medium italic' : 'text-white'}`}>
                    {msg.system ? (
                      <span>{msg.text}</span>
                    ) : (
                      <p>
                        <span className="font-bold text-cyan-400">{msg.sender}:</span> {msg.text}
                      </p>
                    )}
                  </div>
                ))}
                <div ref={chatEndRef} />
              </div>

              {/* Chat Input form */}
              <form onSubmit={handleSendChat} className="p-3 border-t border-white/5 flex gap-1.5">
                <input
                  id="multi-chat-input"
                  type="text"
                  required
                  placeholder="Type message..."
                  value={chatMsg}
                  onChange={(e) => setChatMsg(e.target.value)}
                  className="flex-1 px-2.5 py-1.5 rounded-lg bg-slate-900 border border-white/5 text-white placeholder-gray-600 focus:outline-none text-xs"
                />
                <button
                  id="multi-chat-send"
                  type="submit"
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-bold cursor-pointer"
                >
                  Send
                </button>
              </form>
            </div>

            {/* Emoji reaction grid panel */}
            <div className="glass-panel p-4 rounded-2xl border border-white/5 space-y-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block">Flash Reactions</span>
              <div className="grid grid-cols-5 gap-1.5 text-center">
                {['🔥', '👍', '😂', '🎉', '💩', '🤯', '💀', '👽', '👑', '🚨'].map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => handleSendReaction(emoji)}
                    className="p-1.5 bg-slate-900/60 border border-white/5 hover:border-violet-500/40 rounded-lg hover:scale-110 active:scale-95 transition-all text-lg cursor-pointer"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          </div>

        </div>
      ) : (
        <div className="text-center p-12 text-gray-500">Connecting to arena server...</div>
      )}

    </div>
  );
}
