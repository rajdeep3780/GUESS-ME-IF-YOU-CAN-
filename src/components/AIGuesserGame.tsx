import React, { useState, useEffect, useRef } from 'react';
import { 
  ArrowLeft, HelpCircle, Send, CheckCircle, AlertTriangle, RefreshCw, Sparkles, Timer, MessageSquare, ShieldAlert
} from 'lucide-react';
import { soundManager } from '../utils/sound';

interface AIGuesserGameProps {
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

const DIFFICULTIES = ['Easy', 'Medium', 'Hard', 'Impossible', 'Nightmare'];

interface QAPair {
  q: string;
  a: 'Yes' | 'No';
  comment: string;
}

export default function AIGuesserGame({ user, onBack, onUpdateUser }: AIGuesserGameProps) {
  // Config state
  const [category, setCategory] = useState('Random 😈');
  const [difficulty, setDifficulty] = useState('Medium');
  const [gameState, setGameState] = useState<'setup' | 'playing' | 'victory' | 'defeat'>('setup');
  
  // Active game state
  const [secretObject, setSecretObject] = useState('');
  const [revealedCategory, setRevealedCategory] = useState('');
  const [maxQuestions, setMaxQuestions] = useState(20);
  const [questionsLeft, setQuestionsLeft] = useState(20);
  const [history, setHistory] = useState<QAPair[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState('');
  const [currentGuess, setCurrentGuess] = useState('');
  const [isAsking, setIsAsking] = useState(false);
  const [isGuessing, setIsGuessing] = useState(false);
  const [clue, setClue] = useState('');
  
  // Timer state
  const [timeLeft, setTimeLeft] = useState(300); // 5 minutes standard
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const historyEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (gameState === 'playing') {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current!);
            setGameState('defeat');
            soundManager.playLose();
            return 0;
          }
          if (prev < 15) {
            soundManager.playTick(); // tick warning
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [gameState]);

  useEffect(() => {
    historyEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history]);

  const handleStartGame = async () => {
    soundManager.playClick();
    setIsAsking(true);

    try {
      const response = await fetch('/api/ai/guesser/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, category: CATEGORY_MAP[category] || category, difficulty })
      });
      const data = await response.json();
      if (response.ok) {
        setSecretObject(data.secretObject);
        setRevealedCategory(data.category);
        setMaxQuestions(data.maxQuestions);
        setQuestionsLeft(data.maxQuestions);
        setHistory([]);
        setTimeLeft(difficulty === 'Nightmare' ? 90 : difficulty === 'Impossible' ? 120 : 300);
        setClue('');
        setGameState('playing');
        soundManager.playCoin();
      } else {
        alert(data.error);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsAsking(false);
    }
  };

  const handleAskQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentQuestion.trim() || isAsking || questionsLeft <= 0) return;

    soundManager.playClick();
    const qText = currentQuestion.trim();
    setCurrentQuestion('');
    setIsAsking(true);

    // Optimistic question push with loading indicator state if needed, but we keep it simple
    try {
      const response = await fetch('/api/ai/guesser/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          secretObject,
          category: revealedCategory,
          question: qText,
          difficulty
        })
      });
      const data = await response.json();
      if (response.ok) {
        setHistory(prev => [...prev, { q: qText, a: data.answer, comment: data.comment }]);
        setQuestionsLeft(prev => {
          const next = prev - 1;
          if (next <= 0) {
            setGameState('defeat');
            soundManager.playLose();
          }
          return next;
        });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsAsking(false);
    }
  };

  const handleMakeGuess = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentGuess.trim() || isGuessing) return;

    soundManager.playClick();
    const guessText = currentGuess.trim();
    setIsGuessing(true);

    try {
      const response = await fetch('/api/ai/guesser/guess', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          secretObject,
          guess: guessText,
          category: revealedCategory
        })
      });
      const data = await response.json();
      if (response.ok) {
        if (data.correct) {
          // Player won! Calculate reward multipliers
          const mults: Record<string, number> = {
            'Easy': 1, 'Medium': 1.5, 'Hard': 2, 'Impossible': 3, 'Nightmare': 4
          };
          const mult = mults[difficulty] || 1.5;
          const questionsUsed = maxQuestions - questionsLeft + 1;
          const accuracyMultiplier = Math.max(10, 100 - (questionsUsed * 4));
          
          const xpEarned = Math.round(100 * mult);
          const coinsEarned = Math.round(50 * mult);

          // Update user rewards
          const rewardResponse = await fetch(`/api/user/${user.id}/reward`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              won: true,
              xpEarned,
              coinsEarned,
              accuracy: accuracyMultiplier
            })
          });
          const rData = await rewardResponse.json();
          if (rewardResponse.ok) {
            onUpdateUser(rData.user);
          }

          setGameState('victory');
          soundManager.playWin();
        } else {
          // Wrong guess
          soundManager.playLose();
          setClue(data.clue || 'Incorrect! Try checking your line of logic.');
          setQuestionsLeft(prev => {
            const next = prev - 2; // heavier penalty for wrong guesses
            if (next <= 0) {
              setGameState('defeat');
              soundManager.playLose();
              return 0;
            }
            return next;
          });
          setCurrentGuess('');
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsGuessing(false);
    }
  };

  const handleGiveUp = () => {
    soundManager.playClick();
    setGameState('defeat');
    soundManager.playLose();
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6 px-4 py-4 animate-fade-in">
      
      {/* Header bar */}
      <div className="flex items-center justify-between border-b border-white/5 pb-4">
        <button
          onClick={() => { soundManager.playClick(); onBack(); }}
          className="flex items-center gap-2 text-sm font-bold text-gray-400 hover:text-white transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" /> Exit Mode
        </button>
        <div className="flex items-center gap-2">
          <span className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
            <Sparkles className="w-4 h-4" />
          </span>
          <span className="text-sm font-black uppercase tracking-wider text-white">AI Guesser Match</span>
        </div>
      </div>

      {gameState === 'setup' ? (
        <div className="glass-panel p-8 rounded-3xl border border-white/5 space-y-8 max-w-xl mx-auto">
          <div className="text-center space-y-3">
            <span className="text-4xl">🤖</span>
            <h2 className="text-2xl font-black uppercase tracking-wider text-white">Configure AI Battle</h2>
            <p className="text-xs text-gray-400">Select categories & difficulties. Gemini will formulate a target object tailored for you.</p>
          </div>

          <div className="space-y-4">
            {/* Category selection */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">Category</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => { soundManager.playClick(); setCategory(cat); }}
                    className={`py-3 px-2 text-xs rounded-xl border font-semibold transition-all cursor-pointer flex flex-col items-center justify-center gap-1.5 ${
                      category === cat
                        ? 'bg-cyan-500/20 border-cyan-500 text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.15)] scale-[1.02]'
                        : 'bg-slate-900/60 border-white/5 text-gray-400 hover:bg-slate-800/80 hover:border-white/10'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Difficulty selection */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">Difficulty</label>
              <div className="grid grid-cols-5 gap-2">
                {DIFFICULTIES.map((diff) => (
                  <button
                    key={diff}
                    onClick={() => { soundManager.playClick(); setDifficulty(diff); }}
                    className={`py-2 text-[10px] rounded-xl border font-bold uppercase tracking-wider transition-all cursor-pointer ${
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

          <button
            onClick={handleStartGame}
            disabled={isAsking}
            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-black uppercase tracking-widest text-xs shadow-[0_0_20px_rgba(6,182,212,0.35)] transition-all cursor-pointer hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-2"
          >
            {isAsking ? <RefreshCw className="w-4 h-4 animate-spin" /> : 'Initialize Neural Grid'}
          </button>
        </div>
      ) : gameState === 'playing' ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
          
          {/* Game Stats & Actions Dashboard */}
          <div className="md:col-span-1 space-y-4">
            <div className="glass-panel p-5 rounded-2xl border border-white/5 space-y-4">
              <div className="flex items-center justify-between border-b border-white/5 pb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-gray-400">Time Clock</span>
                <div className="flex items-center gap-1.5 text-red-400 font-mono font-bold text-sm">
                  <Timer className="w-4 h-4" />
                  {formatTime(timeLeft)}
                </div>
              </div>

              <div className="border-b border-white/5 pb-3.5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-gray-400">Questions left</span>
                  <div className="text-base font-black text-cyan-400 font-mono text-glow-blue">
                    {questionsLeft} <span className="text-xs text-gray-500">/ {maxQuestions}</span>
                  </div>
                </div>
                {/* Visual segmented HUD meter */}
                <div className="h-2 w-full bg-slate-950 rounded-full overflow-hidden border border-white/5 p-[1px] flex gap-0.5">
                  {Array.from({ length: maxQuestions }).map((_, i) => {
                    const isActive = i < questionsLeft;
                    return (
                      <div
                        key={i}
                        className={`h-full flex-1 rounded-sm transition-all duration-300 ${
                          isActive
                            ? questionsLeft <= 3
                              ? 'bg-rose-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]'
                              : questionsLeft <= 6
                              ? 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]'
                              : 'bg-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.5)]'
                            : 'bg-slate-900/60'
                        }`}
                      />
                    );
                  })}
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Target Category</span>
                <div className="text-sm font-black text-white">{revealedCategory}</div>
              </div>

              <div className="space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Selected Difficulty</span>
                <div className="text-xs font-bold text-violet-400 uppercase tracking-widest">{difficulty}</div>
              </div>
            </div>

            {/* Guesser Command Console */}
            <div className="glass-panel p-5 rounded-2xl border border-white/5 space-y-4">
              <h3 className="text-xs font-black uppercase tracking-wider text-gray-300">Submit Direct Guess</h3>
              <p className="text-[10px] text-gray-400">Note: An incorrect guess incurs a <span className="text-red-400 font-bold">-2 Question Penalty</span>!</p>
              
              <form onSubmit={handleMakeGuess} className="space-y-2">
                <input
                  id="guesser-guess-input"
                  type="text"
                  required
                  placeholder="Is it a..."
                  value={currentGuess}
                  onChange={(e) => setCurrentGuess(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900/60 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-violet-500 text-sm"
                />
                <button
                  id="submit-guess-btn"
                  type="submit"
                  disabled={isGuessing || !currentGuess.trim()}
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white font-bold uppercase tracking-wider text-xs transition-all cursor-pointer hover:scale-[1.02]"
                >
                  {isGuessing ? 'Verifying semantic...' : 'Assert Final Guess'}
                </button>
              </form>

              {clue && (
                <div className="p-3 rounded-xl bg-red-950/20 border border-red-500/20 text-[11px] text-red-300 flex items-start gap-2 animate-bounce">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0 text-red-400" />
                  <div>
                    <span className="font-bold">Neural Clue: </span>
                    {clue}
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={handleGiveUp}
              className="w-full py-3.5 rounded-xl bg-red-950/20 border border-red-800/40 text-red-400 font-bold uppercase tracking-wider text-xs hover:bg-red-900/30 transition-all cursor-pointer"
            >
              Forfeit / Show Target Object
            </button>
          </div>

          {/* Interactive Neural Conversation Log */}
          <div className="md:col-span-2 glass-panel rounded-2xl border border-white/5 flex flex-col h-[520px]">
            
            {/* Header */}
            <div className="px-5 py-3.5 border-b border-white/5 flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-400">Decision Logs</span>
              <span className="flex items-center gap-1 text-[10px] text-emerald-400 bg-emerald-950/30 px-2 py-0.5 rounded border border-emerald-500/20 font-bold uppercase">
                ● Neural Link active
              </span>
            </div>

            {/* Conversation Log body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {history.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-3">
                  <span className="text-3xl animate-bounce">💬</span>
                  <p className="text-sm text-gray-400 font-semibold">Ready for queries.</p>
                  <p className="text-xs text-gray-500 max-w-xs">Formulate inquiries that can be answered with a Yes, No, or Sometimes (e.g., "Is it made of plastic?", "Is it alive?").</p>
                </div>
              ) : (
                history.map((item, idx) => (
                  <div key={idx} className="space-y-2.5 animate-fade-in">
                    {/* Player Query */}
                    <div className="flex justify-end">
                      <div className="bg-slate-900 border border-white/10 px-4 py-2.5 rounded-2xl rounded-tr-none max-w-[80%] text-sm text-white">
                        <span className="text-[10px] block text-cyan-400 font-bold uppercase tracking-wider mb-0.5">Player Question</span>
                        {item.q}
                      </div>
                    </div>

                    {/* AI Answer */}
                    <div className="flex justify-start">
                      <div className="bg-violet-950/20 border border-violet-500/15 px-4 py-3 rounded-2xl rounded-tl-none max-w-[80%] space-y-1.5">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-violet-400 font-bold uppercase tracking-wider">Gemini System</span>
                          <span className={`text-[10px] font-black uppercase px-1.5 rounded ${
                            item.a === 'Yes' ? 'bg-emerald-500/20 text-emerald-400' :
                            item.a === 'No' ? 'bg-rose-500/20 text-rose-400' : 'bg-amber-500/20 text-amber-400'
                          }`}>
                            {item.a}
                          </span>
                        </div>
                        <p className="text-xs text-gray-300 italic">"{item.comment}"</p>
                      </div>
                    </div>
                  </div>
                ))
              )}
              {isAsking && (
                <div className="flex justify-start animate-pulse">
                  <div className="bg-violet-950/10 border border-violet-500/5 px-4 py-2.5 rounded-2xl rounded-tl-none text-xs text-violet-400 flex items-center gap-2">
                    <RefreshCw className="w-3 h-3 animate-spin" /> Neural pathways synthesizing...
                  </div>
                </div>
              )}
              <div ref={historyEndRef} />
            </div>

            {/* Input Form footer */}
            <form onSubmit={handleAskQuestion} className="p-4 border-t border-white/5 bg-slate-950/40 flex items-center gap-3">
              <input
                id="ask-question-input"
                type="text"
                required
                disabled={isAsking || questionsLeft <= 0}
                placeholder="Ex: Is it a physical object? Is it living?..."
                value={currentQuestion}
                onChange={(e) => setCurrentQuestion(e.target.value)}
                className="flex-1 px-4.5 py-3 rounded-xl bg-slate-900/90 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500 text-sm transition-all focus:ring-1 focus:ring-cyan-500/30"
              />
              <button
                id="send-question-btn"
                type="submit"
                disabled={isAsking || !currentQuestion.trim() || questionsLeft <= 0}
                className="relative px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black tracking-wider uppercase text-xs transition-all duration-200 hover:scale-[1.05] active:scale-95 disabled:opacity-40 disabled:pointer-events-none hover:shadow-[0_0_20px_rgba(6,182,212,0.6)] flex items-center gap-1.5 cursor-pointer"
              >
                <span>Ask</span>
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>

        </div>
      ) : (
        /* End game screens (Victory/Defeat) */
        <div className="glass-panel p-8 rounded-3xl border border-white/5 max-w-lg mx-auto text-center space-y-6 animate-scale-up">
          {gameState === 'victory' ? (
            <>
              <div className="inline-block p-4 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.2)]">
                <CheckCircle className="w-12 h-12" />
              </div>
              <div className="space-y-2">
                <h2 className="text-3xl font-black uppercase tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-400">
                  Target Identified
                </h2>
                <p className="text-xs text-gray-400 uppercase tracking-widest">Victory Achieved</p>
              </div>

              <div className="bg-slate-950/40 border border-white/5 p-4 rounded-2xl space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Secret Object</span>
                <div className="text-xl font-black text-white">{secretObject}</div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-center">
                <div className="bg-emerald-950/10 border border-emerald-500/20 p-3 rounded-xl">
                  <div className="text-[10px] font-bold uppercase text-emerald-400">Coins Awarded</div>
                  <div className="text-lg font-black text-white">+ {Math.round(50 * (difficulty === 'Nightmare' ? 4 : difficulty === 'Impossible' ? 3 : difficulty === 'Hard' ? 2 : 1))}</div>
                </div>
                <div className="bg-violet-950/10 border border-violet-500/20 p-3 rounded-xl">
                  <div className="text-[10px] font-bold uppercase text-violet-400">XP Gained</div>
                  <div className="text-lg font-black text-white">+ {Math.round(100 * (difficulty === 'Nightmare' ? 4 : difficulty === 'Impossible' ? 3 : difficulty === 'Hard' ? 2 : 1))}</div>
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="inline-block p-4 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 shadow-[0_0_20px_rgba(239,68,68,0.2)]">
                <AlertTriangle className="w-12 h-12" />
              </div>
              <div className="space-y-2">
                <h2 className="text-3xl font-black uppercase tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-rose-500">
                  Neural Breach
                </h2>
                <p className="text-xs text-gray-400 uppercase tracking-widest">Match Defeat</p>
              </div>

              <div className="bg-slate-950/40 border border-white/5 p-4 rounded-2xl space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">The Secret Object was</span>
                <div className="text-xl font-black text-white">{secretObject}</div>
              </div>
            </>
          )}

          <div className="pt-4 flex gap-3">
            <button
              onClick={() => { soundManager.playClick(); setGameState('setup'); }}
              className="flex-1 py-3 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-bold uppercase tracking-wider text-xs transition-all cursor-pointer"
            >
              Play Again
            </button>
            <button
              onClick={() => { soundManager.playClick(); onBack(); }}
              className="flex-1 py-3 rounded-xl bg-slate-800 border border-white/10 hover:bg-slate-700 text-white font-bold uppercase tracking-wider text-xs transition-all cursor-pointer"
            >
              Exit Arena
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
