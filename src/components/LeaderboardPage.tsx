import React, { useState, useEffect } from 'react';
import { Trophy, ArrowLeft, Search, RefreshCw, Star, MapPin } from 'lucide-react';
import { soundManager } from '../utils/sound';

interface LeaderboardPageProps {
  onBack: () => void;
  currentUser: any;
}

interface LeaderboardEntry {
  id: string;
  username: string;
  level: number;
  xp: number;
  gamesWon: number;
  country: string;
}

export default function LeaderboardPage({ onBack, currentUser }: LeaderboardPageProps) {
  const [filter, setFilter] = useState<'global' | 'country' | 'friends'>('global');
  const [searchQuery, setSearchQuery] = useState('');
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  const fetchLeaderboard = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/leaderboard');
      const data = await response.json();
      if (response.ok) {
        setEntries(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    soundManager.playClick();
    fetchLeaderboard();
  };

  // Filter and search entries
  const filteredEntries = entries.filter(e => {
    const matchesSearch = e.username.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (filter === 'country') {
      return matchesSearch && e.country.toLowerCase() === currentUser.country.toLowerCase();
    }
    if (filter === 'friends') {
      // Mock friends list for AAA game completeness
      const mockFriends = ['QuantumVibe', 'ShadowBlade', currentUser.username];
      return matchesSearch && mockFriends.includes(e.username);
    }
    return matchesSearch;
  });

  const podiumData = entries.slice(0, 3);
  const trailingEntries = filteredEntries.slice(3);

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
          <span className="p-2 rounded-xl bg-yellow-500/10 border border-yellow-500/20 text-yellow-500">
            <Trophy className="w-4 h-4" />
          </span>
          <span className="text-sm font-black uppercase tracking-wider text-white font-sans">Global Arena Rankings</span>
        </div>
      </div>

      {/* Podium Illustration for Top 3 */}
      {podiumData.length >= 2 && !searchQuery && filter === 'global' && (
        <div className="grid grid-cols-3 gap-3 max-w-lg mx-auto items-end pt-6 pb-2 text-center">
          {/* Second Place (Left) */}
          <div className="glass-panel border-gray-400/10 p-4 rounded-2xl h-[160px] flex flex-col justify-between items-center relative order-1">
            <div className="absolute -top-5 text-2xl">🥈</div>
            <div className="text-3xl">🐉</div>
            <div className="space-y-0.5">
              <div className="text-xs font-black text-white truncate max-w-[80px]">{podiumData[1]?.username}</div>
              <div className="text-[10px] text-gray-400 uppercase">LVL {podiumData[1]?.level}</div>
            </div>
            <div className="px-2.5 py-1 rounded-full bg-slate-900 border border-white/5 text-[10px] font-black font-mono text-gray-300">
              {podiumData[1]?.xp} XP
            </div>
          </div>

          {/* First Place (Center) */}
          <div className="glass-panel border-yellow-500/25 p-5 rounded-2xl h-[190px] flex flex-col justify-between items-center relative order-2 shadow-[0_0_20px_rgba(234,179,8,0.15)]">
            <div className="absolute -top-6 text-3xl animate-bounce">👑</div>
            <div className="text-4xl">🌌</div>
            <div className="space-y-0.5">
              <div className="text-sm font-black text-yellow-400 truncate max-w-[100px]">{podiumData[0]?.username}</div>
              <div className="text-[10px] text-yellow-300 uppercase font-bold tracking-widest">Champion</div>
            </div>
            <div className="px-3 py-1 rounded-full bg-yellow-500/10 border border-yellow-500/20 text-xs font-black font-mono text-yellow-400 shadow-[0_0_10px_rgba(234,179,8,0.2)]">
              {podiumData[0]?.xp} XP
            </div>
          </div>

          {/* Third Place (Right) */}
          <div className="glass-panel border-amber-600/10 p-4 rounded-2xl h-[140px] flex flex-col justify-between items-center relative order-3">
            <div className="absolute -top-5 text-2xl">🥉</div>
            <div className="text-3xl">🥷</div>
            <div className="space-y-0.5">
              <div className="text-xs font-black text-white truncate max-w-[80px]">{podiumData[2]?.username}</div>
              <div className="text-[10px] text-gray-400 uppercase">LVL {podiumData[2]?.level}</div>
            </div>
            <div className="px-2.5 py-1 rounded-full bg-slate-900 border border-white/5 text-[10px] font-black font-mono text-gray-400">
              {podiumData[2]?.xp} XP
            </div>
          </div>
        </div>
      )}

      {/* Control panel and filters */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-950/40 p-3.5 rounded-2xl border border-white/5">
        {/* Category Tabs */}
        <div className="flex bg-slate-950 p-1 rounded-xl border border-white/5 w-full sm:w-auto">
          {['global', 'country', 'friends'].map((tab) => (
            <button
              key={tab}
              onClick={() => { soundManager.playClick(); setFilter(tab as any); }}
              className={`flex-1 sm:flex-initial px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                filter === tab
                  ? 'bg-yellow-500 text-slate-950 shadow-[0_0_10px_rgba(234,179,8,0.2)]'
                  : 'text-gray-400 hover:text-white bg-transparent'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Search & Refresh */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:flex-initial">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-500" />
            <input
              id="leaderboard-search-input"
              type="text"
              placeholder="Search combatant..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full sm:w-48 pl-9 pr-3 py-2 rounded-xl bg-slate-900 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-yellow-500 text-xs"
            />
          </div>
          <button
            id="refresh-leaderboard-btn"
            onClick={handleRefresh}
            className="p-2 rounded-xl border border-white/5 bg-slate-900 hover:bg-slate-800 text-gray-400 hover:text-white transition-all cursor-pointer flex items-center justify-center"
            title="Refresh ratings"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Leaderboard Table rows */}
      <div className="glass-panel rounded-2xl border border-white/5 overflow-hidden">
        <div className="grid grid-cols-12 gap-2 px-5 py-3 border-b border-white/5 bg-slate-950/40 text-[10px] font-black uppercase tracking-wider text-gray-400">
          <div className="col-span-2 sm:col-span-1">Rank</div>
          <div className="col-span-5 sm:col-span-5">Combatant</div>
          <div className="col-span-2 sm:col-span-2">Level</div>
          <div className="col-span-3 sm:col-span-2">Victory Wins</div>
          <div className="col-span-2 text-right hidden sm:block">XP Rating</div>
        </div>

        <div className="divide-y divide-white/5">
          {filteredEntries.length === 0 ? (
            <div className="text-center p-12 text-gray-500 italic text-sm">No combatant profiles match the chosen parameters.</div>
          ) : (
            filteredEntries.map((e, index) => {
              const rank = entries.findIndex(orig => orig.id === e.id) + 1;
              const isCurrentUser = e.id === currentUser.id;

              return (
                <div
                  key={e.id}
                  className={`grid grid-cols-12 gap-2 px-5 py-3.5 items-center transition-colors ${
                    isCurrentUser ? 'bg-yellow-500/10 border-l-2 border-yellow-500' : 'hover:bg-white/5'
                  }`}
                >
                  {/* Rank Column */}
                  <div className="col-span-2 sm:col-span-1 font-mono font-black text-sm">
                    {rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `#${rank}`}
                  </div>

                  {/* Profile Name & Country */}
                  <div className="col-span-5 sm:col-span-5 flex items-center gap-3">
                    <span className="text-2xl">
                      {rank === 1 ? '🌌' : rank === 2 ? '🐉' : rank === 3 ? '🥷' : '🧙‍♂️'}
                    </span>
                    <div className="min-w-0">
                      <div className="text-sm font-bold text-white truncate flex items-center gap-1">
                        {e.username}
                        {isCurrentUser && <Star className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />}
                      </div>
                      <div className="text-[10px] text-gray-500 flex items-center gap-0.5">
                        <MapPin className="w-3 h-3 text-red-500" /> {e.country}
                      </div>
                    </div>
                  </div>

                  {/* Level */}
                  <div className="col-span-2 sm:col-span-2">
                    <span className="text-xs font-bold text-gray-400 uppercase">LVL</span>{' '}
                    <span className="text-sm font-black text-white font-mono">{e.level}</span>
                  </div>

                  {/* Victory Wins */}
                  <div className="col-span-3 sm:col-span-2 text-sm font-black text-cyan-400 font-mono">
                    {e.gamesWon} <span className="text-[10px] text-gray-500 uppercase">Wins</span>
                  </div>

                  {/* XP column */}
                  <div className="col-span-2 text-right hidden sm:block">
                    <span className="px-2.5 py-1 rounded bg-slate-900 border border-white/5 text-xs font-black font-mono text-yellow-400 shadow-inner">
                      {e.xp} <span className="text-[9px] text-gray-500 uppercase font-sans">XP</span>
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

    </div>
  );
}
