import React, { useState, useEffect } from 'react';
import { ArrowLeft, Settings, ShieldAlert, Trash2, Plus, RefreshCw, Users, Database } from 'lucide-react';
import { soundManager } from '../utils/sound';

interface AdminPanelProps {
  onBack: () => void;
}

interface UserSummary {
  id: string;
  username: string;
  level: number;
  gamesPlayed: number;
  isBanned: boolean;
}

interface AdminStats {
  totalUsers: number;
  activeRooms: number;
  bannedUsers: number;
  categoriesCount: number;
  usersList: UserSummary[];
}

export default function AdminPanel({ onBack }: AdminPanelProps) {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [newCategory, setNewCategory] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/stats');
      const data = await response.json();
      if (response.ok) {
        setStats(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleBanToggle = async (userId: string, currentBanState: boolean) => {
    soundManager.playClick();
    try {
      const response = await fetch('/api/admin/ban', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: userId, ban: !currentBanState })
      });
      if (response.ok) {
        fetchStats();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategory.trim()) return;
    
    soundManager.playClick();
    try {
      const response = await fetch('/api/admin/category', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category: newCategory.trim() })
      });
      if (response.ok) {
        setNewCategory('');
        fetchStats();
        soundManager.playCoin();
      }
    } catch (err) {
      console.error(err);
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
          <ArrowLeft className="w-4 h-4" /> Exit Control Panel
        </button>
        <div className="flex items-center gap-2">
          <span className="p-2 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500">
            <Settings className="w-4 h-4" />
          </span>
          <span className="text-sm font-black uppercase tracking-wider text-white">Central Admin Panel</span>
        </div>
      </div>

      {loading && !stats ? (
        <div className="text-center p-12 text-gray-500 flex items-center justify-center gap-2">
          <RefreshCw className="w-4 h-4 animate-spin" /> Querying core statistics...
        </div>
      ) : stats ? (
        <div className="space-y-6">
          
          {/* Quick Metrics panel */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="glass-panel p-5 rounded-2xl border border-white/5 space-y-1 bg-slate-900/40">
              <span className="text-[10px] text-gray-500 uppercase tracking-widest font-black">Total Users</span>
              <div className="text-xl font-black text-white">{stats.totalUsers}</div>
            </div>
            <div className="glass-panel p-5 rounded-2xl border border-white/5 space-y-1 bg-slate-900/40">
              <span className="text-[10px] text-gray-500 uppercase tracking-widest font-black">Active Lobbies</span>
              <div className="text-xl font-black text-cyan-400">{stats.activeRooms}</div>
            </div>
            <div className="glass-panel p-5 rounded-2xl border border-white/5 space-y-1 bg-slate-900/40">
              <span className="text-[10px] text-gray-500 uppercase tracking-widest font-black">Banned Profiles</span>
              <div className="text-xl font-black text-red-400">{stats.bannedUsers}</div>
            </div>
            <div className="glass-panel p-5 rounded-2xl border border-white/5 space-y-1 bg-slate-900/40">
              <span className="text-[10px] text-gray-500 uppercase tracking-widest font-black">Total Categories</span>
              <div className="text-xl font-black text-violet-400">{stats.categoriesCount}</div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
            
            {/* User Profile Listings (Span 2) */}
            <div className="md:col-span-2 glass-panel rounded-2xl border border-white/5 overflow-hidden">
              <div className="px-5 py-3 border-b border-white/5 bg-slate-950/40 flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-gray-300 flex items-center gap-2">
                  <Users className="w-4 h-4 text-violet-400" /> User Directory
                </span>
                <button
                  onClick={fetchStats}
                  className="p-1.5 rounded-lg hover:bg-white/5 text-gray-400 hover:text-white cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="divide-y divide-white/5 max-h-[360px] overflow-y-auto">
                {stats.usersList.map((user) => (
                  <div key={user.id} className="p-4 flex items-center justify-between hover:bg-white/5 transition-all">
                    <div className="space-y-1">
                      <div className="text-sm font-bold text-white flex items-center gap-1.5">
                        {user.username}
                        {user.isBanned && <span className="text-[9px] font-black uppercase px-1.5 rounded bg-red-500/10 text-red-400 border border-red-500/20">Banned</span>}
                      </div>
                      <div className="text-[10px] text-gray-400 uppercase font-mono font-bold">LVL {user.level} • {user.gamesPlayed} GAMES PLAYED</div>
                    </div>

                    <button
                      id={`ban-btn-${user.id}`}
                      onClick={() => handleBanToggle(user.id, user.isBanned)}
                      className={`px-3 py-1.5 rounded-xl font-bold uppercase tracking-wider text-[10px] transition-all cursor-pointer ${
                        user.isBanned
                          ? 'bg-emerald-950/30 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/10'
                          : 'bg-red-950/30 border border-red-500/20 text-red-400 hover:bg-red-500/10'
                      }`}
                    >
                      {user.isBanned ? 'Unban User' : 'Ban User'}
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Category addition control panel (Span 1) */}
            <div className="md:col-span-1 space-y-6">
              
              {/* Add Category Card */}
              <div className="glass-panel p-5 rounded-2xl border border-white/5 space-y-4">
                <h3 className="text-xs font-black uppercase tracking-wider text-gray-300 flex items-center gap-1.5">
                  <Database className="w-4 h-4 text-cyan-400" /> Category Manager
                </h3>

                <form onSubmit={handleAddCategory} className="space-y-3">
                  <input
                    id="admin-category-input"
                    type="text"
                    required
                    placeholder="New Category name..."
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500 text-xs"
                  />
                  <button
                    id="add-category-btn"
                    type="submit"
                    className="w-full py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold uppercase tracking-wider text-[10px] transition-all cursor-pointer flex items-center justify-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> Append Category
                  </button>
                </form>
              </div>

              {/* Security Banner info */}
              <div className="p-4 rounded-xl bg-red-950/10 border border-red-500/10 space-y-2 text-[11px] text-red-300">
                <div className="flex items-center gap-1.5 font-bold uppercase tracking-widest">
                  <ShieldAlert className="w-4 h-4" /> Admin Sandbox Authority
                </div>
                <p className="leading-relaxed">
                  As Workspace Administrator, all actions committed above are directly propagated to the synchronized file-based cache (`db.json`) instantly. Use caution when issuing bans.
                </p>
              </div>

            </div>

          </div>

        </div>
      ) : (
        <div className="text-center text-gray-500">Failed to load statistics database.</div>
      )}

    </div>
  );
}
