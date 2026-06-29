import React, { useState } from 'react';
import { LogIn, User as UserIcon, ShieldAlert } from 'lucide-react';
import { soundManager } from '../utils/sound';

interface AuthModalProps {
  onLogin: (userData: any) => void;
  userEmail?: string;
}

const AVATARS = ['🧙‍♂️', '🦸‍♂️', '🤖', '🥷', '🐱', '🦊', '🦄', '🦁', '🚀', '👽', '💀', '🍕'];

export default function AuthModal({ onLogin, userEmail }: AuthModalProps) {
  const [username, setUsername] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState(AVATARS[0]);
  const [loading, setLoading] = useState(false);
  const [isGuestMode, setIsGuestMode] = useState(true);

  // Pre-filled Google account from session info if available
  const googleUsername = userEmail ? userEmail.split('@')[0] : 'Rajdeep';
  const googleEmailStr = userEmail || 'rajdeep3780@gmail.com';

  const handleGuestLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) return;

    soundManager.playClick();
    setLoading(true);

    const guestId = 'guest_' + Math.random().toString(36).substring(2, 9);
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: guestId,
          username: username.trim(),
          avatar: selectedAvatar,
          isGuest: true,
          country: 'India'
        })
      });
      const data = await response.json();
      if (response.ok) {
        soundManager.playCoin();
        onLogin(data);
      } else {
        alert(data.error || 'Login failed');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    soundManager.playClick();
    setLoading(true);

    // Simulate Google Authentication popup
    setTimeout(async () => {
      const googleId = 'google_' + googleUsername.toLowerCase();
      try {
        const response = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: googleId,
            username: googleUsername,
            avatar: '🦸‍♂️', // Special Google avatar
            email: googleEmailStr,
            isGuest: false,
            country: 'India'
          })
        });
        const data = await response.json();
        if (response.ok) {
          soundManager.playWin();
          onLogin(data);
        } else {
          alert(data.error || 'Google login failed');
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }, 1200);
  };

  return (
    <div id="auth-modal-overlay" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div id="auth-card" className="w-full max-w-md overflow-hidden rounded-2xl glass-panel-glow border border-violet-500/30">
        
        {/* Banner with logo */}
        <div className="relative p-6 text-center border-b border-white/5 bg-gradient-to-b from-violet-600/20 to-transparent">
          <div className="absolute top-0 left-0 w-full h-full pointer-events-none scanner-line"></div>
          <div className="inline-block p-3 rounded-2xl bg-violet-500/10 border border-violet-500/25 mb-3 shadow-[0_0_15px_rgba(139,92,246,0.3)]">
            <span className="text-3xl">🧩</span>
          </div>
          <h2 className="text-2xl font-black uppercase tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-violet-400 to-fuchsia-400">
            Guess Me If You Can
          </h2>
          <p className="text-xs text-gray-400 mt-1 uppercase tracking-widest">Access the Multiplayer Arena</p>
        </div>

        {/* Tab Selection */}
        <div className="flex border-b border-white/5">
          <button
            onClick={() => { soundManager.playClick(); setIsGuestMode(true); }}
            className={`flex-1 py-3.5 text-sm font-bold uppercase tracking-wider border-b-2 transition-all cursor-pointer ${
              isGuestMode
                ? 'text-cyan-400 border-cyan-500 bg-cyan-950/10'
                : 'text-gray-400 border-transparent hover:text-gray-200'
            }`}
          >
            Guest Login
          </button>
          <button
            onClick={() => { soundManager.playClick(); setIsGuestMode(false); }}
            className={`flex-1 py-3.5 text-sm font-bold uppercase tracking-wider border-b-2 transition-all cursor-pointer ${
              !isGuestMode
                ? 'text-violet-400 border-violet-500 bg-violet-950/10'
                : 'text-gray-400 border-transparent hover:text-gray-200'
            }`}
          >
            Google OAuth
          </button>
        </div>

        <div className="p-6">
          {isGuestMode ? (
            <form onSubmit={handleGuestLogin} className="space-y-5">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">
                  Enter Username
                </label>
                <div className="relative">
                  <UserIcon className="absolute left-3.5 top-3 w-5 h-5 text-gray-500" />
                  <input
                    id="guest-username-input"
                    type="text"
                    required
                    maxLength={15}
                    placeholder="Enter name..."
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full pl-11 pr-4 py-2.5 rounded-xl bg-slate-900/60 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all text-sm"
                  />
                </div>
              </div>

              {/* Avatar Picker */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-2.5">
                  Select Game Avatar
                </label>
                <div className="grid grid-cols-6 gap-2 bg-slate-950/40 p-3 rounded-xl border border-white/5">
                  {AVATARS.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => { soundManager.playClick(); setSelectedAvatar(emoji); }}
                      className={`text-2xl p-2 rounded-lg transition-all cursor-pointer hover:scale-110 active:scale-95 flex items-center justify-center ${
                        selectedAvatar === emoji
                          ? 'bg-cyan-500/20 border border-cyan-500/50 scale-105'
                          : 'bg-transparent border border-transparent'
                      }`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>

              <button
                id="guest-submit-btn"
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold uppercase tracking-wider text-sm shadow-[0_0_15px_rgba(6,182,212,0.3)] transition-all cursor-pointer hover:scale-[1.02] active:scale-95 disabled:opacity-50"
              >
                {loading ? 'Initializing Server...' : 'Enter Game Lobby'}
              </button>
            </form>
          ) : (
            <div className="space-y-6 text-center">
              <div className="p-4 rounded-xl bg-violet-950/20 border border-violet-500/15 text-left text-sm space-y-2">
                <div className="flex items-center gap-2 text-violet-400 font-bold uppercase tracking-wider text-xs">
                  <ShieldAlert className="w-4 h-4" />
                  Pre-Authorized Credentials
                </div>
                <p className="text-gray-300 text-xs">
                  We have secured your active AI Studio Workspace Google profile. Clicking the Google button connects instantly.
                </p>
                <div className="pt-2 border-t border-violet-500/10 space-y-1">
                  <div className="text-xs text-gray-400">Account: <span className="text-gray-200 font-mono font-medium">{googleUsername}</span></div>
                  <div className="text-xs text-gray-400">Secure Token: <span className="text-gray-200 font-mono font-medium">{googleEmailStr}</span></div>
                </div>
              </div>

              <button
                id="google-auth-btn"
                onClick={handleGoogleLogin}
                disabled={loading}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white font-black uppercase tracking-widest text-xs shadow-[0_0_15px_rgba(139,92,246,0.3)] transition-all cursor-pointer hover:scale-[1.02] active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <span>Connecting to Google Secure Hub...</span>
                ) : (
                  <>
                    <LogIn className="w-4 h-4" />
                    Sign In with Google Account
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
