import React, { useState } from 'react';
import { ArrowLeft, User as UserIcon, Coins, Trophy, Save, Sparkles, Check, Globe } from 'lucide-react';
import { soundManager } from '../utils/sound';

interface ProfilePageProps {
  user: any;
  onBack: () => void;
  onUpdateUser: (updatedUser: any) => void;
}

const AVATARS = ['🧙‍♂️', '🦸‍♂️', '🤖', '🥷', '🐱', '🦊', '🦄', '🦁', '🚀', '👽', '💀', '🍕', '🐉', '🌌', '🐯', '🐼', '🕶️', '👑'];

const ACHIEVEMENTS_DETAILS = [
  { id: 'first_win', title: 'First Victory', description: 'Win your first game', rewardCoins: 100, rewardXP: 100, icon: '🏆' },
  { id: 'ai_slayer', title: 'AI Slayer', description: 'Defeat the AI Guesser 3 times', rewardCoins: 200, rewardXP: 150, icon: '🤖' },
  { id: 'detective_master', title: 'Detective Master', description: 'Stump the AI Detective in under 20 questions', rewardCoins: 300, rewardXP: 250, icon: '🔍' },
  { id: 'coin_hoarder', title: 'Rich Guesser', description: 'Accumulate 1,000 coins', rewardCoins: 150, rewardXP: 100, icon: '💰' },
  { id: 'multitasker', title: 'Social Gamer', description: 'Play 5 multiplayer matches', rewardCoins: 250, rewardXP: 200, icon: '👥' },
  { id: 'nightmare_conqueror', title: 'Nightmare Conqueror', description: 'Solve a puzzle on Nightmare difficulty', rewardCoins: 500, rewardXP: 400, icon: '💀' },
];

export default function ProfilePage({ user, onBack, onUpdateUser }: ProfilePageProps) {
  const [username, setUsername] = useState(user.username);
  const [selectedAvatar, setSelectedAvatar] = useState(user.avatar);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || saving) return;

    soundManager.playClick();
    setSaving(true);
    setSaveSuccess(false);

    try {
      const response = await fetch(`/api/user/${user.id}/update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim(), avatar: selectedAvatar })
      });
      const data = await response.json();
      if (response.ok) {
        onUpdateUser(data);
        setSaveSuccess(true);
        soundManager.playLevelUp();
        setTimeout(() => setSaveSuccess(false), 3000);
      } else {
        alert(data.error);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const nextLevelXp = user.level * 500;
  const xpPercent = Math.min(100, (user.xp / nextLevelXp) * 100);

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6 px-4 py-4 animate-fade-in">
      
      {/* Header bar */}
      <div className="flex items-center justify-between border-b border-white/5 pb-4">
        <button
          onClick={() => { soundManager.playClick(); onBack(); }}
          className="flex items-center gap-2 text-sm font-bold text-gray-400 hover:text-white transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" /> Return Home
        </button>
        <div className="flex items-center gap-2">
          <span className="p-2 rounded-xl bg-violet-500/10 border border-violet-500/20 text-violet-400">
            <UserIcon className="w-4 h-4" />
          </span>
          <span className="text-sm font-black uppercase tracking-wider text-white">Identity Dossier</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
        
        {/* Left column: Customizer Form */}
        <div className="md:col-span-1 glass-panel p-6 rounded-2xl border border-white/5 space-y-6">
          <h3 className="text-sm font-black uppercase tracking-wider text-gray-300 pb-2 border-b border-white/5">Customization</h3>
          
          <form onSubmit={handleSave} className="space-y-4">
            <div className="flex flex-col items-center py-4 bg-slate-950/40 border border-white/5 rounded-2xl">
              <span className="text-5xl mb-2.5 p-3 rounded-2xl bg-slate-900 border border-white/10 shadow-inner">{selectedAvatar}</span>
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Selected Avatar</span>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1.5">Game Handle</label>
              <input
                id="profile-username-input"
                type="text"
                required
                maxLength={15}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/10 text-white focus:outline-none focus:border-violet-500 text-xs"
              />
            </div>

            {/* Avatar picker matrix */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">Change Avatar Icon</label>
              <div className="grid grid-cols-6 gap-1.5 bg-slate-950 p-3 rounded-xl border border-white/5 max-h-[160px] overflow-y-auto">
                {AVATARS.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => { soundManager.playClick(); setSelectedAvatar(emoji); }}
                    className={`text-xl p-1.5 rounded-lg transition-all hover:scale-110 cursor-pointer flex items-center justify-center ${
                      selectedAvatar === emoji
                        ? 'bg-violet-500/20 border border-violet-500/45 scale-105 shadow-inner'
                        : 'bg-transparent border border-transparent'
                    }`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>

            <button
              id="save-profile-btn"
              type="submit"
              disabled={saving}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white font-bold uppercase tracking-wider text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-[0_0_15px_rgba(139,92,246,0.25)]"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Saving...' : 'Commit Settings'}
            </button>

            {saveSuccess && (
              <div className="p-2 bg-emerald-950/20 border border-emerald-500/20 rounded-xl text-center text-[10px] font-bold uppercase tracking-wider text-emerald-400 flex items-center justify-center gap-1 animate-bounce">
                <Check className="w-3.5 h-3.5" /> Identity synchronised!
              </div>
            )}
          </form>
        </div>

        {/* Right column: Stats and achievements (Span 2) */}
        <div className="md:col-span-2 space-y-6">
          
          {/* XP & Level Panel */}
          <div className="glass-panel p-6 rounded-2xl border border-white/5 space-y-4">
            <div className="flex justify-between items-center">
              <div className="space-y-0.5">
                <span className="text-xs font-bold uppercase tracking-wider text-gray-400">Experience Rating</span>
                <div className="text-2xl font-black text-white">LEVEL {user.level}</div>
              </div>
              <span className="text-xs font-mono font-bold text-violet-400 bg-violet-950/25 px-2.5 py-1 rounded border border-violet-500/20">
                {user.xp} / {nextLevelXp} XP Rating
              </span>
            </div>

            <div className="w-full bg-slate-950 h-3 rounded-full overflow-hidden border border-white/5 shadow-inner">
              <div 
                className="bg-gradient-to-r from-violet-600 to-fuchsia-500 h-full rounded-full transition-all" 
                style={{ width: `${xpPercent}%` }}
              ></div>
            </div>
          </div>

          {/* Core Analytics Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="glass-panel p-4 rounded-xl border border-white/5 text-center space-y-1 bg-slate-900/40">
              <span className="text-[10px] text-gray-500 uppercase tracking-widest font-black">Games played</span>
              <div className="text-lg font-black text-white">{user.gamesPlayed}</div>
            </div>
            <div className="glass-panel p-4 rounded-xl border border-white/5 text-center space-y-1 bg-slate-900/40">
              <span className="text-[10px] text-gray-500 uppercase tracking-widest font-black">Matches won</span>
              <div className="text-lg font-black text-emerald-400">{user.gamesWon}</div>
            </div>
            <div className="glass-panel p-4 rounded-xl border border-white/5 text-center space-y-1 bg-slate-900/40">
              <span className="text-[10px] text-gray-500 uppercase tracking-widest font-black">Deduction Acc</span>
              <div className="text-lg font-black text-cyan-400">{user.accuracy}%</div>
            </div>
            <div className="glass-panel p-4 rounded-xl border border-white/5 text-center space-y-1 bg-slate-900/40 flex flex-col items-center justify-center">
              <span className="text-[10px] text-gray-500 uppercase tracking-widest font-black flex items-center gap-1"><Coins className="w-3.5 h-3.5 text-yellow-500" /> Wallet</span>
              <div className="text-lg font-black text-yellow-400">{user.coins}</div>
            </div>
          </div>

          {/* Grid of Achievements */}
          <div className="glass-panel p-6 rounded-2xl border border-white/5 space-y-4">
            <h3 className="text-sm font-black uppercase tracking-wider text-gray-300 pb-2 border-b border-white/5 flex items-center justify-between">
              <span>Achievements Grid</span>
              <Trophy className="w-4 h-4 text-yellow-400" />
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {ACHIEVEMENTS_DETAILS.map((ach) => {
                const unlocked = user.achievements.includes(ach.id);
                return (
                  <div
                    key={ach.id}
                    className={`flex items-start gap-3.5 p-3.5 rounded-xl border transition-all ${
                      unlocked
                        ? 'bg-violet-950/15 border-violet-500/30'
                        : 'bg-slate-900/30 border-white/5 opacity-50'
                    }`}
                  >
                    <span className="text-3xl p-2 rounded-xl bg-slate-950/60 border border-white/5">{ach.icon}</span>
                    <div className="space-y-0.5 min-w-0">
                      <div className="text-xs font-bold text-white truncate flex items-center gap-1.5">
                        {ach.title}
                        {unlocked && <Sparkles className="w-3.5 h-3.5 text-yellow-400" />}
                      </div>
                      <p className="text-[10px] text-gray-400 leading-relaxed">{ach.description}</p>
                      <div className="flex items-center gap-2 pt-1 font-mono text-[9px] font-bold">
                        <span className="text-yellow-400">+ {ach.rewardCoins} Coins</span>
                        <span className="text-violet-400">+ {ach.rewardXP} XP</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
