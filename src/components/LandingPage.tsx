import React, { useState } from 'react';
import { 
  Cpu, Users, Trophy, User as UserIcon, Settings, Calendar, Play, Sparkles, Coins, Gift, Swords, Gamepad2, Skull, Cloud
} from 'lucide-react';
import { soundManager } from '../utils/sound';

interface LandingPageProps {
  user: any;
  onSelectMode: (mode: 'ai-guesser' | 'ai-detective' | 'multiplayer' | 'leaderboard' | 'profile' | 'admin' | 'drive') => void;
  onClaimDaily: () => void;
}

export default function LandingPage({ user, onSelectMode, onClaimDaily }: LandingPageProps) {
  const [claiming, setClaiming] = useState(false);
  const today = new Date().toISOString().split('T')[0];
  const hasClaimedToday = user.lastClaimedDaily === today;

  const handleClaim = async () => {
    if (hasClaimedToday || claiming) return;
    setClaiming(true);
    soundManager.playClick();
    try {
      const response = await fetch(`/api/user/${user.id}/claim-daily`, {
        method: 'POST'
      });
      const data = await response.json();
      if (response.ok) {
        onClaimDaily();
      } else {
        alert(data.error);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setClaiming(false);
    }
  };

  const menuItems = [
    {
      id: 'ai-guesser',
      title: 'AI Guesser',
      desc: 'The AI conceals a secret item. Question it in real-time & decode the target.',
      icon: <Sparkles className="w-8 h-8 text-cyan-400 group-hover:scale-110 transition-transform" />,
      tag: 'vs AI Game Master',
      badge: 'Interactive',
      color: 'border-cyan-500/20 hover:border-cyan-500/50 hover:shadow-[0_0_20px_rgba(6,182,212,0.15)] bg-cyan-950/5',
      accent: 'text-cyan-400',
      actionText: 'Launch Game'
    },
    {
      id: 'ai-detective',
      title: 'AI Detective',
      desc: 'Formulate a target item. Can our specialized neural agent decode your secret?',
      icon: <Cpu className="w-8 h-8 text-violet-400 group-hover:scale-110 transition-transform" />,
      tag: 'AI vs Player',
      badge: 'Advanced AI',
      color: 'border-violet-500/20 hover:border-violet-500/50 hover:shadow-[0_0_20px_rgba(139,92,246,0.15)] bg-violet-950/5',
      accent: 'text-violet-400',
      actionText: 'Challenge AI'
    },
    {
      id: 'multiplayer',
      title: 'Multiplayer Arena',
      desc: 'Form high-octane custom lobbies. Host & referee, or join with friends using code.',
      icon: <Users className="w-8 h-8 text-fuchsia-400 group-hover:scale-110 transition-transform" />,
      tag: 'Real-time Rooms',
      badge: 'Live PVP',
      color: 'border-fuchsia-500/20 hover:border-fuchsia-500/50 hover:shadow-[0_0_20px_rgba(217,70,239,0.15)] bg-fuchsia-950/5',
      accent: 'text-fuchsia-400',
      actionText: 'Join Arena'
    },
    {
      id: 'drive',
      title: 'Drive Mystery',
      desc: 'Connect your Google Drive and guess/stump the AI using your actual workspace files!',
      icon: <Cloud className="w-8 h-8 text-emerald-400 group-hover:scale-110 transition-transform" />,
      tag: 'Workspace OAuth',
      badge: 'New Mode',
      color: 'border-emerald-500/20 hover:border-emerald-500/50 hover:shadow-[0_0_20px_rgba(16,185,129,0.15)] bg-emerald-950/5',
      accent: 'text-emerald-400',
      actionText: 'Browse Drive'
    }
  ];

  return (
    <div className="w-full max-w-7xl mx-auto space-y-8 animate-fade-in px-4 py-6">
      
      {/* Banner / Title Panel */}
      <div className="relative overflow-hidden rounded-3xl glass-panel p-8 border border-white/5 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="absolute top-0 left-0 w-full h-full pointer-events-none scanner-line"></div>
        <div className="absolute -right-20 -bottom-20 w-80 h-80 bg-violet-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute -left-20 -top-20 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="space-y-4 text-center md:text-left z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-500/10 border border-violet-500/25 text-violet-300 text-xs font-bold uppercase tracking-widest pulsate-glow">
            <Swords className="w-3.5 h-3.5" />
            Season 1 Live
          </div>
          <h1 className="text-4xl md:text-5xl font-black uppercase tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-violet-400 to-fuchsia-400 leading-tight">
            Guess Me If You Can
          </h1>
          <p className="text-gray-400 max-w-xl text-sm md:text-base leading-relaxed">
            Unleash your cognitive power. Play yes/no challenges against the smart Gemini game agent or test your wits with live group matches!
          </p>
          <div className="flex flex-wrap gap-3 justify-center md:justify-start">
            <button
              onClick={() => { soundManager.playClick(); onSelectMode('ai-guesser'); }}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 font-bold uppercase tracking-wider text-xs shadow-[0_0_15px_rgba(6,182,212,0.35)] transition-all flex items-center gap-2 cursor-pointer hover:scale-[1.02] active:scale-95"
            >
              <Play className="w-4 h-4 fill-white" /> Quick Play Now
            </button>
            <button
              onClick={() => { soundManager.playClick(); onSelectMode('multiplayer'); }}
              className="px-6 py-2.5 rounded-xl bg-slate-800 border border-white/10 hover:bg-slate-700 font-bold uppercase tracking-wider text-xs transition-all flex items-center gap-2 cursor-pointer hover:scale-[1.02] active:scale-95"
            >
              <Gamepad2 className="w-4 h-4 text-violet-400" /> Create Lobby
            </button>
          </div>
        </div>

        {/* Quick Profile Panel */}
        <div className="w-full md:w-80 glass-panel-glow border border-violet-500/20 p-6 rounded-2xl space-y-4 z-10">
          <div className="flex items-center gap-4">
            <div className="text-4xl p-3 rounded-2xl bg-violet-500/10 border border-violet-500/20">{user.avatar}</div>
            <div className="space-y-1">
              <div className="text-lg font-black text-white truncate max-w-[150px]">{user.username}</div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-violet-400 font-bold uppercase tracking-wider">LVL {user.level}</span>
                <div className="w-24 bg-slate-900/80 h-1.5 rounded-full overflow-hidden">
                  <div 
                    className="bg-violet-500 h-full rounded-full transition-all" 
                    style={{ width: `${(user.xp / (user.level * 500)) * 100}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 text-center pt-3 border-t border-white/5">
            <div className="bg-slate-900/40 p-2.5 rounded-xl border border-white/5">
              <div className="text-xs text-gray-400">XP Points</div>
              <div className="text-sm font-black text-white">{user.xp}</div>
            </div>
            <div className="bg-slate-900/40 p-2.5 rounded-xl border border-white/5 flex flex-col items-center justify-center">
              <div className="text-xs text-gray-400 flex items-center gap-1 justify-center"><Coins className="w-3.5 h-3.5 text-yellow-500" /> Coins</div>
              <div className="text-sm font-black text-yellow-400">{user.coins}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid Options */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Play Modes Selection (Span 2) */}
        <div className="lg:col-span-2 space-y-6">
          <h2 className="text-xl font-black uppercase tracking-wider text-gray-300 flex items-center gap-2">
            <Gamepad2 className="w-5 h-5 text-violet-400" /> Game Mode Selection
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {menuItems.map((item) => (
              <div
                key={item.id}
                onClick={() => { soundManager.playClick(); onSelectMode(item.id as any); }}
                className={`group border rounded-2xl p-6 transition-all duration-300 flex flex-col justify-between cursor-pointer ${item.color}`}
              >
                <div className="space-y-4">
                  <div className="flex items-start justify-between">
                    <div className="p-3 rounded-xl bg-slate-900 border border-white/5 shadow-inner">
                      {item.icon}
                    </div>
                    <span className={`text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full bg-slate-900 border border-white/5 ${item.accent}`}>
                      {item.badge}
                    </span>
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-white group-hover:text-cyan-300 transition-colors">{item.title}</h3>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mt-1">{item.tag}</p>
                    <p className="text-xs text-gray-400 mt-2.5 leading-relaxed">{item.desc}</p>
                  </div>
                </div>

                <div className="pt-6 mt-6 border-t border-white/5 flex items-center justify-between text-xs font-bold uppercase tracking-wider text-gray-300 group-hover:text-white">
                  <span>{item.actionText}</span>
                  <Play className={`w-3.5 h-3.5 fill-current ${item.accent}`} />
                </div>
              </div>
            ))}
          </div>

          {/* Daily Rewards Grid */}
          <div className="glass-panel p-6 rounded-2xl border border-white/5 flex flex-col md:flex-row items-center justify-between gap-6 bg-gradient-to-r from-violet-950/10 to-transparent">
            <div className="flex items-center gap-4">
              <div className="p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/20 text-yellow-400">
                <Gift className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <h3 className="font-black text-white text-base">Daily Login Rewards</h3>
                <p className="text-xs text-gray-400">Claim your daily credits. Log in tomorrow for progressive multipliers!</p>
              </div>
            </div>

            <button
              id="claim-reward-btn"
              onClick={handleClaim}
              disabled={hasClaimedToday || claiming}
              className={`px-6 py-3 rounded-xl font-bold uppercase tracking-wider text-xs transition-all flex items-center gap-2 cursor-pointer ${
                hasClaimedToday
                  ? 'bg-emerald-950/40 border border-emerald-800/40 text-emerald-400 opacity-60 cursor-not-allowed'
                  : 'bg-yellow-500 hover:bg-yellow-400 text-slate-900 shadow-[0_0_15px_rgba(234,179,8,0.35)] hover:scale-[1.02] active:scale-95'
              }`}
            >
              {hasClaimedToday ? 'Claimed Today' : claiming ? 'Processing...' : 'Claim 100 Coins'}
            </button>
          </div>
        </div>

        {/* Sidebar panels (Span 1) */}
        <div className="space-y-6">
          
          {/* Achievements Sneak */}
          <div className="glass-panel p-6 rounded-2xl border border-white/5 space-y-4">
            <h3 className="text-base font-black uppercase tracking-wider text-gray-300 flex items-center justify-between">
              <span>Achievements</span>
              <Trophy className="w-4 h-4 text-yellow-400" />
            </h3>
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-950/40 border border-white/5">
                <span className="text-2xl">🏆</span>
                <div className="space-y-1 min-w-0">
                  <div className="text-xs font-bold text-white truncate">First Victory</div>
                  <div className="text-[10px] text-gray-400">Win your first game</div>
                </div>
                {user.achievements.includes('first_win') ? (
                  <span className="ml-auto text-emerald-400 text-xs font-bold">UNLOCKED</span>
                ) : (
                  <span className="ml-auto text-gray-600 text-xs font-bold">LOCKED</span>
                )}
              </div>

              <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-950/40 border border-white/5">
                <span className="text-2xl">🤖</span>
                <div className="space-y-1 min-w-0">
                  <div className="text-xs font-bold text-white truncate">AI Slayer</div>
                  <div className="text-[10px] text-gray-400">Defeat AI Guesser 3 times</div>
                </div>
                {user.achievements.includes('ai_slayer') ? (
                  <span className="ml-auto text-emerald-400 text-xs font-bold">UNLOCKED</span>
                ) : (
                  <span className="ml-auto text-gray-600 text-xs font-bold">LOCKED</span>
                )}
              </div>
            </div>
            <button
              onClick={() => { soundManager.playClick(); onSelectMode('profile'); }}
              className="w-full text-center text-xs font-bold text-violet-400 hover:text-violet-300 hover:underline pt-2 cursor-pointer"
            >
              View All Achievements
            </button>
          </div>

          {/* Mini-Leaderboard */}
          <div className="glass-panel p-6 rounded-2xl border border-white/5 space-y-4">
            <h3 className="text-base font-black uppercase tracking-wider text-gray-300 flex items-center justify-between">
              <span>Top Players</span>
              <Trophy className="w-4 h-4 text-yellow-400" />
            </h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between p-2 rounded-lg hover:bg-white/5 transition-colors">
                <div className="flex items-center gap-2.5">
                  <span className="text-xs font-bold text-yellow-500 font-mono w-4">1</span>
                  <span className="text-sm">🌌</span>
                  <span className="text-sm font-semibold truncate max-w-[100px]">QuantumVibe</span>
                </div>
                <span className="text-xs text-violet-400 font-mono font-bold">7800 XP</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg hover:bg-white/5 transition-colors">
                <div className="flex items-center gap-2.5">
                  <span className="text-xs font-bold text-gray-400 font-mono w-4">2</span>
                  <span className="text-sm">🐉</span>
                  <span className="text-sm font-semibold truncate max-w-[100px]">HyperBeast</span>
                </div>
                <span className="text-xs text-violet-400 font-mono font-bold">4200 XP</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg hover:bg-white/5 transition-colors">
                <div className="flex items-center gap-2.5">
                  <span className="text-xs font-bold text-amber-600 font-mono w-4">3</span>
                  <span className="text-sm">🥷</span>
                  <span className="text-sm font-semibold truncate max-w-[100px]">ShadowBlade</span>
                </div>
                <span className="text-xs text-violet-400 font-mono font-bold">2100 XP</span>
              </div>
            </div>
            <button
              onClick={() => { soundManager.playClick(); onSelectMode('leaderboard'); }}
              className="w-full text-center text-xs font-bold text-cyan-400 hover:text-cyan-300 hover:underline pt-2 cursor-pointer"
            >
              Open Global Rankings
            </button>
          </div>

        </div>

      </div>

    </div>
  );
}
