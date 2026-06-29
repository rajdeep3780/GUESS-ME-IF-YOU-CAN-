import React, { useState, useEffect, useRef } from 'react';
import { 
  ArrowLeft, Cpu, HelpCircle, Send, CheckCircle, AlertTriangle, RefreshCw, Sparkles, MessageSquare
} from 'lucide-react';
import { soundManager } from '../utils/sound';

interface AIDetectiveGameProps {
  user: any;
  onBack: () => void;
  onUpdateUser: (updatedUser: any) => void;
  preseededSecretObject?: string;
  preseededCategory?: string;
  driveFileListContext?: string[];
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

interface HistoryItem {
  q: string;
  a: string;
}

export default function AIDetectiveGame({ 
  user, 
  onBack, 
  onUpdateUser,
  preseededSecretObject,
  preseededCategory,
  driveFileListContext
}: AIDetectiveGameProps) {
  // Config state
  const [category, setCategory] = useState('Objects 📦');
  const [difficulty, setDifficulty] = useState('Medium');
  const [secretObject, setSecretObject] = useState('');
  const [gameState, setGameState] = useState<'setup' | 'playing' | 'victory' | 'defeat'>('setup'); // victory/defeat refers to PLAYER'S result (i.e. player stumped AI = victory, AI guessed correctly = defeat)

  // Game state
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [aiResponse, setAiResponse] = useState<{ type: 'question' | 'guess'; text: string; reasoning: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [rounds, setRounds] = useState(0);
  const maxRounds = 20;

  const historyEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    historyEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history, loading]);

  // Bootstrap from preseeded Google Drive file if available
  useEffect(() => {
    if (preseededSecretObject) {
      setSecretObject(preseededSecretObject);
      setCategory(preseededCategory || 'Google Drive File 💾');
      setHistory([]);
      setRounds(0);
      setGameState('playing');
      setLoading(true);

      fetch('/api/ai/detective/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          category: preseededCategory || 'Google Drive File 💾', 
          difficulty, 
          history: [],
          driveFileList: driveFileListContext
        })
      })
      .then(res => res.json())
      .then(data => {
        setAiResponse(data);
      })
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
    }
  }, [preseededSecretObject, preseededCategory, driveFileListContext]);

  const handleStartGame = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!secretObject.trim()) return;

    soundManager.playClick();
    setHistory([]);
    setRounds(0);
    setGameState('playing');
    setLoading(true);

    try {
      // Fetch AI's first question
      const response = await fetch('/api/ai/detective/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          category: CATEGORY_MAP[category] || category, 
          difficulty, 
          history: [],
          driveFileList: driveFileListContext 
        })
      });
      const data = await response.json();
      if (response.ok) {
        setAiResponse(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAnswer = async (answer: 'Yes' | 'No' | 'Correct') => {
    if (loading || !aiResponse) return;
    soundManager.playClick();

    const currentQ = aiResponse.text;
    
    if (answer === 'Correct') {
      // AI guessed correctly! Player lost (stumped: false). Update rewards.
      soundManager.playLose();
      
      const xpEarned = 20; // smaller consolation reward
      const rewardResponse = await fetch(`/api/user/${user.id}/reward`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          won: false,
          xpEarned,
          coinsEarned: 5,
          accuracy: 0
        })
      });
      const rData = await rewardResponse.json();
      if (rewardResponse.ok) {
        onUpdateUser(rData.user);
      }

      setGameState('defeat');
      return;
    }

    const updatedHistory = [...history, { q: currentQ, a: answer }];
    setHistory(updatedHistory);
    const nextRounds = rounds + 1;
    setRounds(nextRounds);

    if (nextRounds >= maxRounds) {
      // Player successfully stumped the AI! Player wins!
      soundManager.playWin();

      // Update reward with high coin bonus
      const xpEarned = 250;
      const coinsEarned = 150;
      const rewardResponse = await fetch(`/api/user/${user.id}/reward`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          won: true,
          xpEarned,
          coinsEarned,
          accuracy: 100
        })
      });
      const rData = await rewardResponse.json();
      if (rewardResponse.ok) {
        onUpdateUser(rData.user);
      }

      setGameState('victory');
      return;
    }

    // Otherwise, fetch AI's next move
    setLoading(true);
    try {
      const response = await fetch('/api/ai/detective/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          category: CATEGORY_MAP[category] || category, 
          difficulty, 
          history: updatedHistory,
          driveFileList: driveFileListContext 
        })
      });
      const data = await response.json();
      if (response.ok) {
        setAiResponse(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
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
          <span className="p-2 rounded-xl bg-violet-500/10 border border-violet-500/20 text-violet-400 animate-pulse">
            <Cpu className="w-4 h-4" />
          </span>
          <span className="text-sm font-black uppercase tracking-wider text-white">AI Detective Arena</span>
        </div>
      </div>

      {gameState === 'setup' ? (
        <form onSubmit={handleStartGame} className="glass-panel p-8 rounded-3xl border border-white/5 space-y-6 max-w-xl mx-auto">
          <div className="text-center space-y-3">
            <span className="text-4xl">🕵️‍♂️</span>
            <h2 className="text-2xl font-black uppercase tracking-wider text-white">Challenge AI Detective</h2>
            <p className="text-xs text-gray-400">Choose a secret object. Gemini AI will ask up to 20 highly optimal questions to discover it.</p>
          </div>

          <div className="space-y-4">
            {/* Secret object choice */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">My Secret Object</label>
              <input
                id="detective-secret-input"
                type="text"
                required
                placeholder="e.g. Smartphone, Mount Everest, Pizza..."
                value={secretObject}
                onChange={(e) => setSecretObject(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-violet-500 text-sm"
              />
              <p className="text-[10px] text-gray-500 mt-1.5 uppercase tracking-wider">🔒 Stored in client memory. Never revealed to AI during queries.</p>
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
                    className={`py-2.5 px-2 text-xs rounded-xl border font-semibold transition-all cursor-pointer text-center ${
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

            {/* Difficulty */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">Difficulty</label>
              <div className="grid grid-cols-3 gap-2">
                {['Easy', 'Medium', 'Hard'].map((diff) => (
                  <button
                    key={diff}
                    type="button"
                    onClick={() => { soundManager.playClick(); setDifficulty(diff); }}
                    className={`py-2 text-xs rounded-xl border font-bold uppercase tracking-wider transition-all cursor-pointer ${
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
            id="start-detective-btn"
            type="submit"
            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white font-black uppercase tracking-widest text-xs shadow-[0_0_20px_rgba(139,92,246,0.35)] transition-all cursor-pointer hover:scale-[1.02] active:scale-95 flex items-center justify-center"
          >
            Deploy Detective Agent
          </button>
        </form>
      ) : gameState === 'playing' ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
          
          {/* Active stats panel */}
          <div className="md:col-span-1 glass-panel p-5 rounded-2xl border border-white/5 space-y-4">
            <h3 className="text-xs font-black uppercase tracking-wider text-gray-300 pb-2 border-b border-white/5">Detective Status</h3>
            
            <div className="flex items-center justify-between border-b border-white/5 pb-2.5">
              <span className="text-xs text-gray-400 uppercase tracking-widest font-bold">Questions Asked</span>
              <span className="text-sm font-black text-violet-400 font-mono">{rounds} <span className="text-xs text-gray-500">/ {maxRounds}</span></span>
            </div>

            <div className="space-y-1 border-b border-white/5 pb-2.5">
              <span className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">Category Hint</span>
              <div className="text-sm font-black text-white">{category}</div>
            </div>

            <div className="space-y-1">
              <span className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">Your Secret Item</span>
              <div className="text-sm font-black text-emerald-400 font-mono bg-emerald-950/20 px-2.5 py-1 rounded border border-emerald-500/10 inline-block">
                {secretObject}
              </div>
            </div>
          </div>

          {/* Interactive Chat interface */}
          <div className="md:col-span-2 glass-panel rounded-2xl border border-white/5 flex flex-col h-[520px]">
            <div className="px-5 py-3 border-b border-white/5 flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-400">Interrogation Logs</span>
              <span className="text-[10px] text-violet-400 bg-violet-950/30 px-2 py-0.5 rounded border border-violet-500/20 font-bold uppercase">
                Detective Live
              </span>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {history.map((h, idx) => (
                <div key={idx} className="space-y-2.5 animate-fade-in">
                  {/* AI Question */}
                  <div className="flex justify-start">
                    <div className="bg-slate-900 border border-white/10 px-4 py-2.5 rounded-2xl rounded-tl-none max-w-[80%] text-sm text-white">
                      <span className="text-[10px] block text-violet-400 font-bold uppercase tracking-wider mb-0.5">Detective Question</span>
                      {h.q}
                    </div>
                  </div>

                  {/* Player Answer */}
                  <div className="flex justify-end">
                    <div className="bg-cyan-950/20 border border-cyan-500/15 px-4 py-2 rounded-2xl rounded-tr-none text-sm text-cyan-300 font-bold">
                      {h.a}
                    </div>
                  </div>
                </div>
              ))}

              {/* Current Pending Move */}
              {!loading && aiResponse && (
                <div className="space-y-3 animate-slide-up">
                  <div className="flex justify-start">
                    <div className="bg-violet-900/10 border border-violet-500/20 px-4 py-3.5 rounded-2xl rounded-tl-none max-w-[80%] space-y-2">
                      <span className="text-[10px] block text-violet-400 font-bold uppercase tracking-wider">
                        {aiResponse.type === 'guess' ? '🚨 ULTIMATE GUESS' : '🔍 Current Question'}
                      </span>
                      <p className="text-sm font-semibold text-white italic">"{aiResponse.text}"</p>
                      
                      {aiResponse.reasoning && (
                        <p className="text-[10px] text-gray-500 pt-1.5 border-t border-violet-500/5 font-mono">
                          🧠 Reasoning: {aiResponse.reasoning}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Response Options */}
                  <div className="flex flex-wrap gap-2 pt-2 justify-start max-w-[90%]">
                    {aiResponse.type === 'guess' ? (
                      <>
                        <button
                          id="answer-gotit-btn"
                          onClick={() => handleAnswer('Correct')}
                          className="px-4 py-2 text-xs rounded-xl font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition-all cursor-pointer"
                        >
                          🎉 YES! You Got It!
                        </button>
                        <button
                          id="answer-no-gotit-btn"
                          onClick={() => handleAnswer('No')}
                          className="px-4 py-2 text-xs rounded-xl font-bold bg-rose-500/10 border border-rose-500/30 text-rose-400 hover:bg-rose-500/20 transition-all cursor-pointer"
                        >
                          ❌ No, Incorrect Guess
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          id="answer-yes-btn"
                          onClick={() => handleAnswer('Yes')}
                          className="px-4 py-2 text-xs rounded-xl font-bold bg-slate-900 border border-emerald-500/30 hover:bg-emerald-500/10 text-emerald-400 transition-all cursor-pointer"
                        >
                          Yes
                        </button>
                        <button
                          id="answer-no-btn"
                          onClick={() => handleAnswer('No')}
                          className="px-4 py-2 text-xs rounded-xl font-bold bg-slate-900 border border-rose-500/30 hover:bg-rose-500/10 text-rose-400 transition-all cursor-pointer"
                        >
                          No
                        </button>
                      </>
                    )}
                  </div>
                </div>
              )}

              {loading && (
                <div className="flex justify-start animate-pulse">
                  <div className="bg-violet-950/10 border border-violet-500/5 px-4 py-2.5 rounded-2xl rounded-tl-none text-xs text-violet-400 flex items-center gap-2">
                    <RefreshCw className="w-3 h-3 animate-spin" /> Detective analyzing evidence...
                  </div>
                </div>
              )}

              <div ref={historyEndRef} />
            </div>
          </div>

        </div>
      ) : (
        /* End game results (Stumped AI vs AI Guessed) */
        <div className="glass-panel p-8 rounded-3xl border border-white/5 max-w-lg mx-auto text-center space-y-6 animate-scale-up">
          {gameState === 'victory' ? (
            <>
              <div className="inline-block p-4 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.2)]">
                <CheckCircle className="w-12 h-12" />
              </div>
              <div className="space-y-2">
                <h2 className="text-3xl font-black uppercase tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-400">
                  AI Stumped!
                </h2>
                <p className="text-xs text-gray-400 uppercase tracking-widest">You successfully eluded the detective</p>
              </div>

              <div className="bg-slate-950/40 border border-white/5 p-4 rounded-2xl space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Your Undiscovered Item</span>
                <div className="text-xl font-black text-white">{secretObject}</div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-center">
                <div className="bg-emerald-950/10 border border-emerald-500/20 p-3 rounded-xl">
                  <div className="text-[10px] font-bold uppercase text-emerald-400 font-semibold">Coins Awarded</div>
                  <div className="text-lg font-black text-white">+ 150</div>
                </div>
                <div className="bg-violet-950/10 border border-violet-500/20 p-3 rounded-xl">
                  <div className="text-[10px] font-bold uppercase text-violet-400 font-semibold">XP Gained</div>
                  <div className="text-lg font-black text-white">+ 250</div>
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="inline-block p-4 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 shadow-[0_0_20px_rgba(239,68,68,0.2)]">
                <AlertTriangle className="w-12 h-12" />
              </div>
              <div className="space-y-2">
                <h2 className="text-3xl font-black uppercase tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-rose-500 to-red-500">
                  AI Solved It!
                </h2>
                <p className="text-xs text-gray-400 uppercase tracking-widest">The detective deduced your secret item</p>
              </div>

              <div className="bg-slate-950/40 border border-white/5 p-4 rounded-2xl space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Target Guessed</span>
                <div className="text-xl font-black text-white">{secretObject}</div>
              </div>

              <div className="bg-violet-950/10 border border-violet-500/10 p-3.5 rounded-xl text-xs text-violet-300 italic">
                "Another mystery solved! My neural deduction pathways are flawless."
              </div>
            </>
          )}

          <div className="pt-4 flex gap-3">
            <button
              onClick={() => { soundManager.playClick(); setGameState('setup'); setSecretObject(''); }}
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
