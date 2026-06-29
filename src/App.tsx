import React, { useState, useEffect } from 'react';
import { 
  Gamepad2, Trophy, User as UserIcon, Settings, Coins, LogOut, Swords, Cpu, Sparkles 
} from 'lucide-react';
import { soundManager } from './utils/sound';
import AuthModal from './components/AuthModal';
import SoundToggle from './components/SoundToggle';
import LandingPage from './components/LandingPage';
import AIGuesserGame from './components/AIGuesserGame';
import AIDetectiveGame from './components/AIDetectiveGame';
import MultiplayerGame from './components/MultiplayerGame';
import LeaderboardPage from './components/LeaderboardPage';
import ProfilePage from './components/ProfilePage';
import AdminPanel from './components/AdminPanel';

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [currentView, setCurrentView] = useState<'home' | 'ai-guesser' | 'ai-detective' | 'multiplayer' | 'leaderboard' | 'profile' | 'admin'>('home');
  const [checkingAuth, setCheckingAuth] = useState(true);

  // Load session from local storage and sync with server
  useEffect(() => {
    const savedUserId = localStorage.getItem('guess_me_userId');
    if (savedUserId) {
      fetch(`/api/user/${savedUserId}`)
        .then(res => {
          if (res.ok) return res.json();
          throw new Error('Not found');
        })
        .then(data => {
          if (data && !data.isBanned) {
            setUser(data);
          } else {
            localStorage.removeItem('guess_me_userId');
          }
        })
        .catch(() => {
          localStorage.removeItem('guess_me_userId');
        })
        .finally(() => setCheckingAuth(false));
    } else {
      setCheckingAuth(false);
    }
  }, []);

  const handleLogin = (loggedInUser: any) => {
    setUser(loggedInUser);
    localStorage.setItem('guess_me_userId', loggedInUser.id);
    setCurrentView('home');
  };

  const handleLogout = () => {
    soundManager.playClick();
    localStorage.removeItem('guess_me_userId');
    setUser(null);
    setCurrentView('home');
  };

  const handleUpdateUser = (updatedUser: any) => {
    setUser(updatedUser);
  };

  const triggerClaimDaily = () => {
    if (user) {
      fetch(`/api/user/${user.id}`)
        .then(res => res.json())
        .then(data => {
          setUser(data);
        });
    }
  };

  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-[#0b0c10] flex flex-col items-center justify-center text-gray-400 space-y-3 font-sans">
        <div className="w-10 h-10 border-2 border-violet-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-xs uppercase tracking-widest font-bold">Synchronizing Neural Workspace...</p>
      </div>
    );
  }

  if (!user) {
    // Show auth screen
    return (
      <div className="min-h-screen bg-[#0b0c10] relative overflow-hidden flex items-center justify-center">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(139,92,246,0.12),transparent)] pointer-events-none"></div>
        <div className="absolute inset-0 grid-bg pointer-events-none"></div>
        <AuthModal onLogin={handleLogin} userEmail="rajdeep3780@gmail.com" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0b0c10] text-gray-200 flex flex-col relative font-sans">
      
      {/* Background decoration */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(6,182,212,0.06),rgba(139,92,246,0.04),transparent)] pointer-events-none"></div>
      <div className="absolute inset-0 grid-bg pointer-events-none"></div>

      {/* Futuristic Navigation Topbar */}
      <header className="sticky top-0 z-40 bg-[#0d111c]/80 backdrop-blur-md border-b border-white/5 px-6 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          
          {/* Logo Title */}
          <div 
            onClick={() => { soundManager.playClick(); setCurrentView('home'); }}
            className="flex items-center gap-2.5 cursor-pointer hover:opacity-95 transition-opacity"
          >
            <div className="p-2 bg-gradient-to-br from-cyan-500 to-violet-600 rounded-xl shadow-[0_0_15px_rgba(139,92,246,0.3)]">
              <Swords className="w-5 h-5 text-white" />
            </div>
            <span className="hidden sm:block font-black text-sm uppercase tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-fuchsia-400">
              Guess Me If You Can
            </span>
          </div>

          {/* Quick Stats & Navigation */}
          <div className="flex items-center gap-3 md:gap-5">
            
            {/* Nav tabs bar */}
            <nav className="flex items-center gap-1">
              <button
                onClick={() => { soundManager.playClick(); setCurrentView('home'); }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                  currentView === 'home' 
                    ? 'bg-violet-500/10 text-violet-400 border border-violet-500/25' 
                    : 'text-gray-400 hover:text-white border border-transparent'
                }`}
              >
                Lobby
              </button>
              <button
                onClick={() => { soundManager.playClick(); setCurrentView('leaderboard'); }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                  currentView === 'leaderboard' 
                    ? 'bg-violet-500/10 text-violet-400 border border-violet-500/25' 
                    : 'text-gray-400 hover:text-white border border-transparent'
                }`}
              >
                Ratings
              </button>
              <button
                onClick={() => { soundManager.playClick(); setCurrentView('profile'); }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                  currentView === 'profile' 
                    ? 'bg-violet-500/10 text-violet-400 border border-violet-500/25' 
                    : 'text-gray-400 hover:text-white border border-transparent'
                }`}
              >
                Profile
              </button>
              {user.id === 'google_rajdeep' && (
                <button
                  onClick={() => { soundManager.playClick(); setCurrentView('admin'); }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                    currentView === 'admin' 
                      ? 'bg-red-500/10 text-red-400 border border-red-500/25' 
                      : 'text-gray-400 hover:text-red-300 border border-transparent'
                  }`}
                >
                  Admin
                </button>
              )}
            </nav>

            <div className="h-5 w-[1px] bg-white/10 hidden sm:block"></div>

            {/* Wallet status */}
            <div className="flex items-center gap-2 bg-slate-900/60 px-3.5 py-1.5 rounded-xl border border-white/5 font-mono shadow-inner">
              <Coins className="w-4 h-4 text-yellow-500" />
              <span className="text-xs font-black text-yellow-400">{user.coins}</span>
            </div>

            <div className="h-5 w-[1px] bg-white/10"></div>

            {/* Sound & Logout Actions */}
            <div className="flex items-center gap-2">
              <SoundToggle />
              <button
                onClick={handleLogout}
                className="p-2.5 rounded-xl bg-slate-900/60 border border-white/5 text-gray-400 hover:text-red-400 hover:bg-red-950/20 hover:border-red-500/20 transition-all cursor-pointer"
                title="Sign out of match"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>

          </div>

        </div>
      </header>

      {/* Main Body view portals */}
      <main className="flex-1 z-10 py-6">
        {currentView === 'home' && (
          <LandingPage 
            user={user} 
            onSelectMode={setCurrentView} 
            onClaimDaily={triggerClaimDaily}
          />
        )}
        {currentView === 'ai-guesser' && (
          <AIGuesserGame 
            user={user} 
            onBack={() => setCurrentView('home')} 
            onUpdateUser={handleUpdateUser}
          />
        )}
        {currentView === 'ai-detective' && (
          <AIDetectiveGame 
            user={user} 
            onBack={() => setCurrentView('home')} 
            onUpdateUser={handleUpdateUser}
          />
        )}
        {currentView === 'multiplayer' && (
          <MultiplayerGame 
            user={user} 
            onBack={() => setCurrentView('home')} 
            onUpdateUser={handleUpdateUser}
          />
        )}
        {currentView === 'leaderboard' && (
          <LeaderboardPage 
            currentUser={user} 
            onBack={() => setCurrentView('home')} 
          />
        )}
        {currentView === 'profile' && (
          <ProfilePage 
            user={user} 
            onBack={() => setCurrentView('home')} 
            onUpdateUser={handleUpdateUser}
          />
        )}
        {currentView === 'admin' && (
          <AdminPanel 
            onBack={() => setCurrentView('home')} 
          />
        )}
      </main>

      {/* Cyberpunk Footer */}
      <footer className="border-t border-white/5 py-4 text-center text-[10px] text-gray-500 uppercase tracking-widest bg-[#06080d]/60 z-10 font-mono">
        Guess Me If You Can © 2026 • Workspace Secure Hub • Server Port 3000
      </footer>

    </div>
  );
}
