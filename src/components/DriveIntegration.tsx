import React, { useState, useEffect } from 'react';
import { 
  Cloud, CloudLightning, Search, Folder, FileText, FileSpreadsheet, 
  FileImage, File, CheckCircle, RefreshCw, Play, Download, 
  LogOut, Shield, ArrowLeft, ArrowRight, Sparkles, HelpCircle, AlertTriangle
} from 'lucide-react';
import { soundManager } from '../utils/sound';
import { 
  subscribeToAuth, 
  signInWithGoogleDrive, 
  logoutGoogle, 
  listDriveFiles, 
  saveGameReportToDrive, 
  DriveFile 
} from '../utils/googleDrive';

interface DriveIntegrationProps {
  onBack: () => void;
  onLaunchDetective: (secretObject: string, fileNames: string[]) => void;
  onLaunchGuesser: (secretObject: string) => void;
  userCareerStats: any;
}

export default function DriveIntegration({ 
  onBack, 
  onLaunchDetective, 
  onLaunchGuesser,
  userCareerStats
}: DriveIntegrationProps) {
  const [googleUser, setGoogleUser] = useState<any>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [files, setFiles] = useState<DriveFile[]>([]);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'doc' | 'sheet' | 'image' | 'pdf'>('all');
  const [selectedFile, setSelectedFile] = useState<DriveFile | null>(null);

  // Exporter state
  const [exporting, setExporting] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);
  const [customMemo, setCustomMemo] = useState('');

  // Subscribe to auth updates
  useEffect(() => {
    const unsubscribe = subscribeToAuth((user, token) => {
      setGoogleUser(user);
      setAccessToken(token);
    });
    return () => unsubscribe();
  }, []);

  // Automatically fetch files when token becomes available
  useEffect(() => {
    if (accessToken) {
      fetchFiles();
    } else {
      setFiles([]);
      setSelectedFile(null);
    }
  }, [accessToken]);

  const fetchFiles = async () => {
    if (!accessToken) return;
    setLoadingFiles(true);
    setError(null);
    try {
      const driveFiles = await listDriveFiles(accessToken);
      setFiles(driveFiles);
      if (driveFiles.length > 0) {
        setSelectedFile(driveFiles[0]);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to sync with Google Drive.');
    } finally {
      setLoadingFiles(false);
    }
  };

  const handleConnect = async () => {
    soundManager.playClick();
    try {
      await signInWithGoogleDrive();
      soundManager.playWin();
    } catch (err: any) {
      alert(err.message || 'Authentication aborted or failed.');
    }
  };

  const handleDisconnect = async () => {
    soundManager.playClick();
    if (window.confirm('Disconnect your Google account from this session?')) {
      await logoutGoogle();
      soundManager.playLose();
    }
  };

  // Export Career Dossier
  const handleExportDossier = async () => {
    if (!accessToken) return;
    soundManager.playClick();

    const confirmed = window.confirm(
      "Confirm: This action will create a new file named 'GuessMe_Career_Dossier.txt' in your Google Drive root directory. Proceed?"
    );
    if (!confirmed) return;

    setExporting(true);
    setExportSuccess(false);

    try {
      const careerDetails = `
=========================================
🏆 GUESS ME IF YOU CAN - PLAYER DOSSIER
=========================================
Generated on: ${new Date().toLocaleString()}
Account Holder: ${googleUser?.displayName || 'Active Agent'}
Email Address: ${googleUser?.email || 'N/A'}

🎮 CAREER PROGRESSION:
-----------------------------------------
Level: ${userCareerStats?.level || 1}
Current XP: ${userCareerStats?.xp || 0}
Coin Wallet: ${userCareerStats?.coins || 0}

📊 STATISTICAL RATINGS:
-----------------------------------------
Matches Played: ${userCareerStats?.gamesPlayed || 0}
Matches Won: ${userCareerStats?.gamesWon || 0}
Win Rate: ${userCareerStats?.gamesPlayed ? Math.round((userCareerStats.gamesWon / userCareerStats.gamesPlayed) * 100) : 0}%
Deduction Accuracy: ${userCareerStats?.accuracy || 0}%

🌟 BADGES UNLOCKED:
-----------------------------------------
${userCareerStats?.achievements && userCareerStats.achievements.length > 0 
  ? userCareerStats.achievements.map((a: string) => `- ${a.toUpperCase().replace('_', ' ')}`).join('\n')
  : 'No badges unlocked yet.'}

📝 PERSONAL DEBRIEF MEMO:
-----------------------------------------
"${customMemo.trim() || 'No custom debrief submitted.'}"

=========================================
Thank you for playing Guess Me If You Can!
Secure Cloud Backup Portal.
=========================================
      `;

      await saveGameReportToDrive(
        accessToken, 
        'GuessMe_Career_Dossier.txt', 
        careerDetails
      );
      
      soundManager.playCoin();
      setExportSuccess(true);
      setCustomMemo('');
      setTimeout(() => setExportSuccess(false), 5000);
    } catch (err: any) {
      alert('Export failed: ' + err.message);
    } finally {
      setExporting(false);
    }
  };

  // Helper to determine icon by mimeType
  const getFileIcon = (mimeType: string) => {
    if (mimeType.includes('folder')) return <Folder className="w-5 h-5 text-amber-500" />;
    if (mimeType.includes('document') || mimeType.includes('text')) return <FileText className="w-5 h-5 text-blue-400" />;
    if (mimeType.includes('spreadsheet') || mimeType.includes('sheet')) return <FileSpreadsheet className="w-5 h-5 text-emerald-400" />;
    if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) return <FileText className="w-5 h-5 text-orange-400" />;
    if (mimeType.includes('pdf')) return <File className="w-5 h-5 text-rose-400" />;
    if (mimeType.includes('image')) return <FileImage className="w-5 h-5 text-violet-400" />;
    return <File className="w-5 h-5 text-gray-400" />;
  };

  const filteredFiles = files.filter(f => {
    const matchesSearch = f.name.toLowerCase().includes(search.toLowerCase());
    if (typeFilter === 'all') return matchesSearch;
    if (typeFilter === 'doc') return matchesSearch && (f.mimeType.includes('document') || f.mimeType.includes('text'));
    if (typeFilter === 'sheet') return matchesSearch && f.mimeType.includes('spreadsheet');
    if (typeFilter === 'image') return matchesSearch && f.mimeType.includes('image');
    if (typeFilter === 'pdf') return matchesSearch && f.mimeType.includes('pdf');
    return matchesSearch;
  });

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6 px-4 py-4 animate-fade-in">
      
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/5 pb-4">
        <button
          onClick={() => { soundManager.playClick(); onBack(); }}
          className="flex items-center gap-2 text-sm font-bold text-gray-400 hover:text-white transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" /> Exit Drive Mode
        </button>
        <div className="flex items-center gap-2">
          <span className="p-2 rounded-xl bg-gradient-to-br from-green-500/20 to-blue-500/20 border border-green-500/30 text-green-400">
            <Cloud className="w-4 h-4 animate-bounce" />
          </span>
          <span className="text-sm font-black uppercase tracking-wider text-white">Drive Mystery Lab</span>
        </div>
      </div>

      {!googleUser ? (
        /* CONNECT CARD STATE */
        <div className="max-w-xl mx-auto text-center py-12 px-6 glass-panel border border-white/5 rounded-3xl space-y-8 bg-gradient-to-b from-green-950/5 via-transparent to-transparent">
          <div className="space-y-4">
            <div className="inline-flex p-5 rounded-3xl bg-gradient-to-r from-green-500/10 via-yellow-500/10 to-blue-500/10 border border-green-500/20 shadow-[0_0_30px_rgba(34,197,94,0.1)]">
              <CloudLightning className="w-12 h-12 text-green-400" />
            </div>
            <h2 className="text-3xl font-black uppercase tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-green-400 via-yellow-400 to-blue-400">
              Google Drive Mystery Mode
            </h2>
            <p className="text-xs text-gray-400 leading-relaxed max-w-md mx-auto">
              Link your secure Workspace Drive. Select your actual documents, slides, or images and let the AI deduce them! You can also save career reports and play record sheets in your Drive.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-950/50 border border-white/5 text-left text-xs max-w-md mx-auto space-y-3">
            <div className="flex items-center gap-2 text-green-400 font-bold uppercase tracking-wider text-[10px]">
              <Shield className="w-3.5 h-3.5" /> Secure API Protocol
            </div>
            <p className="text-gray-400 leading-normal">
              Our application adheres to strict security constraints:
            </p>
            <ul className="list-disc list-inside text-gray-500 space-y-1 pl-1">
              <li>Access tokens remain cached in memory only.</li>
              <li>No document contents are downloaded or saved.</li>
              <li>Only filenames and formats are evaluated.</li>
            </ul>
          </div>

          <button
            onClick={handleConnect}
            className="px-8 py-3.5 rounded-xl bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-400 hover:to-emerald-500 text-slate-950 font-black tracking-wider uppercase text-xs shadow-[0_0_20px_rgba(34,197,94,0.3)] hover:shadow-[0_0_30px_rgba(34,197,94,0.5)] transition-all hover:scale-[1.03] active:scale-95 cursor-pointer flex items-center justify-center gap-2.5 mx-auto"
          >
            <Cloud className="w-4 h-4 fill-current" />
            Establish Secure Drive Link
          </button>
        </div>
      ) : (
        /* CONNECTED PANEL VIEW */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Column 1: Connected Profile & File list (Span 7) */}
          <div className="lg:col-span-7 space-y-4">
            
            {/* Google Profile connection state */}
            <div className="glass-panel p-4 rounded-2xl border border-white/5 flex items-center justify-between gap-4 bg-gradient-to-r from-emerald-950/10 to-transparent">
              <div className="flex items-center gap-3">
                {googleUser.photoURL ? (
                  <img 
                    src={googleUser.photoURL} 
                    alt="avatar" 
                    referrerPolicy="no-referrer"
                    className="w-10 h-10 rounded-xl border border-emerald-500/20"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center">
                    {googleUser.displayName?.charAt(0) || 'G'}
                  </div>
                )}
                <div className="min-w-0">
                  <div className="text-sm font-black text-white truncate">{googleUser.displayName}</div>
                  <div className="text-[10px] text-gray-400 truncate">{googleUser.email}</div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={fetchFiles}
                  disabled={loadingFiles}
                  className="p-2 rounded-lg bg-slate-900 border border-white/10 hover:bg-slate-800 text-gray-400 hover:text-white transition-colors cursor-pointer"
                  title="Resync files"
                >
                  <RefreshCw className={`w-4 h-4 ${loadingFiles ? 'animate-spin text-emerald-400' : ''}`} />
                </button>
                <button
                  onClick={handleDisconnect}
                  className="p-2 rounded-lg bg-slate-900 border border-white/10 hover:bg-red-950/20 hover:border-red-500/20 text-gray-400 hover:text-red-400 transition-colors cursor-pointer"
                  title="Disconnect Link"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Drive Explorer Grid */}
            <div className="glass-panel p-5 rounded-3xl border border-white/5 space-y-4">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-b border-white/5 pb-4">
                <h3 className="text-sm font-black uppercase tracking-wider text-white">Drive File Explorer</h3>
                
                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-500" />
                  <input
                    type="text"
                    placeholder="Search file name..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9 pr-4 py-1.5 rounded-xl bg-slate-950 border border-white/10 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-green-500 w-full sm:w-48 transition-all"
                  />
                </div>
              </div>

              {/* Type selection */}
              <div className="flex flex-wrap gap-1.5 bg-slate-950/50 p-1 rounded-xl border border-white/5">
                {[
                  { id: 'all', label: 'All Files' },
                  { id: 'doc', label: 'Docs' },
                  { id: 'sheet', label: 'Sheets' },
                  { id: 'image', label: 'Images' },
                  { id: 'pdf', label: 'PDFs' }
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => { soundManager.playClick(); setTypeFilter(tab.id as any); }}
                    className={`flex-1 px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all cursor-pointer ${
                      typeFilter === tab.id
                        ? 'bg-emerald-500/20 text-emerald-400 font-extrabold shadow-[0_0_10px_rgba(16,185,129,0.15)]'
                        : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* File list portal */}
              {loadingFiles ? (
                <div className="py-20 text-center space-y-2">
                  <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
                  <p className="text-[10px] uppercase tracking-widest font-bold text-gray-500">Querying Google Cloud Vault...</p>
                </div>
              ) : error ? (
                <div className="py-12 text-center space-y-3">
                  <AlertTriangle className="w-8 h-8 text-rose-500 mx-auto" />
                  <p className="text-xs text-gray-400 font-semibold">{error}</p>
                  <button 
                    onClick={fetchFiles} 
                    className="px-4 py-2 bg-slate-900 border border-white/10 hover:bg-slate-800 text-xs font-bold text-emerald-400 rounded-lg cursor-pointer"
                  >
                    Retry Query
                  </button>
                </div>
              ) : filteredFiles.length === 0 ? (
                <div className="py-16 text-center text-gray-500 text-xs">
                  No matches found. Upload some files to Google Drive!
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-2 max-h-[360px] overflow-y-auto pr-1">
                  {filteredFiles.map(file => {
                    const isSelected = selectedFile?.id === file.id;
                    return (
                      <div
                        key={file.id}
                        onClick={() => { soundManager.playClick(); setSelectedFile(file); }}
                        className={`p-3 rounded-xl border flex items-center justify-between gap-3 transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-emerald-500/10 border-emerald-500 text-emerald-300'
                            : 'bg-slate-900/40 border-white/5 hover:border-white/10 hover:bg-slate-900/80 text-gray-300'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          {getFileIcon(file.mimeType)}
                          <div className="min-w-0 text-left">
                            <div className="text-xs font-semibold truncate max-w-[280px] sm:max-w-[400px]">{file.name}</div>
                            <div className="text-[9px] text-gray-500 font-mono">
                              {file.createdTime ? new Date(file.createdTime).toLocaleDateString() : 'Unknown Date'}
                              {file.size && ` • ${(parseInt(file.size) / 1024).toFixed(1)} KB`}
                            </div>
                          </div>
                        </div>

                        {isSelected && (
                          <span className="text-[10px] font-bold uppercase text-emerald-400 tracking-wider bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                            Target Selected
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="text-[10px] text-gray-500 text-center font-mono border-t border-white/5 pt-3">
                Total Files Indexed: {files.length} • Synced dynamically with Google API v3
              </div>

            </div>

          </div>

          {/* Column 2: Selection details & Active Actions (Span 5) */}
          <div className="lg:col-span-5 space-y-6">
            
            {/* Target Display and Mode Launch */}
            <div className="glass-panel p-6 rounded-3xl border border-white/5 space-y-6 bg-gradient-to-b from-green-950/5 to-transparent">
              <div className="flex items-center gap-2 text-xs font-bold uppercase text-green-400 tracking-wider">
                <Sparkles className="w-4 h-4" /> Selected Target Info
              </div>

              {selectedFile ? (
                <div className="space-y-5">
                  <div className="bg-slate-950/60 p-4 rounded-xl border border-white/5 flex items-start gap-3">
                    {getFileIcon(selectedFile.mimeType)}
                    <div className="min-w-0 text-left space-y-1">
                      <div className="text-sm font-black text-white truncate max-w-[280px]">{selectedFile.name}</div>
                      <div className="text-[10px] font-mono text-gray-400 truncate">{selectedFile.mimeType}</div>
                      <div className="text-[9px] font-mono text-gray-500">
                        File ID: <span className="font-semibold text-gray-400">{selectedFile.id.substring(0, 10)}...</span>
                      </div>
                    </div>
                  </div>

                  {/* Mode Cards */}
                  <div className="grid grid-cols-1 gap-3 pt-2">
                    
                    {/* Action 1: Challenge AI Detective */}
                    <div 
                      onClick={() => {
                        const fileNames = files.map(f => f.name);
                        onLaunchDetective(selectedFile.name, fileNames);
                      }}
                      className="group border border-violet-500/20 hover:border-violet-500 bg-violet-950/5 hover:bg-violet-950/20 p-4 rounded-2xl cursor-pointer transition-all hover:shadow-[0_0_15px_rgba(139,92,246,0.15)] space-y-2 text-left"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-violet-400 uppercase tracking-widest bg-violet-500/10 border border-violet-500/20 px-2 py-0.5 rounded-full">
                          Neural Solver
                        </span>
                        <ArrowRight className="w-4 h-4 text-violet-400 group-hover:translate-x-1 transition-transform" />
                      </div>
                      <h4 className="text-sm font-black text-white">Challenge AI Detective</h4>
                      <p className="text-[11px] text-gray-400 leading-normal">
                        Hold this file name in your mind. The AI Detective will fetch filenames from your Drive and ask smart yes/no questions to guess it!
                      </p>
                    </div>

                    {/* Action 2: Guess AI's secret file */}
                    <div 
                      onClick={() => onLaunchGuesser(selectedFile.name)}
                      className="group border border-cyan-500/20 hover:border-cyan-500 bg-cyan-950/5 hover:bg-cyan-950/20 p-4 rounded-2xl cursor-pointer transition-all hover:shadow-[0_0_15px_rgba(6,182,212,0.15)] space-y-2 text-left"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-cyan-400 uppercase tracking-widest bg-cyan-500/10 border border-cyan-500/20 px-2 py-0.5 rounded-full">
                          Player Deduction
                        </span>
                        <ArrowRight className="w-4 h-4 text-cyan-400 group-hover:translate-x-1 transition-transform" />
                      </div>
                      <h4 className="text-sm font-black text-white">Guess the AI's Selected File</h4>
                      <p className="text-[11px] text-gray-400 leading-normal">
                        The AI will select a secret random file from your Drive. Ask up to 20 questions and guess which of your files it picked!
                      </p>
                    </div>

                  </div>
                </div>
              ) : (
                <div className="text-center py-12 text-gray-500 text-xs">
                  Select a Google Drive file to initiate custom tactical modes.
                </div>
              )}
            </div>

            {/* Google Drive Export Panel */}
            <div className="glass-panel p-6 rounded-3xl border border-white/5 space-y-4 text-left">
              <h3 className="text-sm font-black uppercase text-green-400 tracking-wider flex items-center gap-2">
                <Download className="w-4 h-4" /> Export Debrief to Drive
              </h3>
              <p className="text-xs text-gray-400 leading-relaxed">
                Save an official cyber scorecard/stats briefing containing your current levels, coin balance, win-rates, and unlocked achievements directly to your Google Drive folder.
              </p>

              <div className="space-y-3 pt-2">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1.5">Add Custom debrief notes (optional)</label>
                  <textarea
                    rows={2}
                    placeholder="E.g. Record session, note to self, custom summary..."
                    value={customMemo}
                    onChange={(e) => setCustomMemo(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-white/10 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-green-500 transition-all resize-none"
                  />
                </div>

                <button
                  onClick={handleExportDossier}
                  disabled={exporting}
                  className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black tracking-wider uppercase text-xs transition-all flex items-center justify-center gap-2 disabled:opacity-40 cursor-pointer hover:scale-[1.01]"
                >
                  {exporting ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Writing File to Drive Vault...</span>
                    </>
                  ) : (
                    <>
                      <Download className="w-3.5 h-3.5" />
                      <span>Export Career Dossier</span>
                    </>
                  )}
                </button>

                {exportSuccess && (
                  <div className="flex items-center gap-2 p-2.5 rounded-xl bg-emerald-950/40 border border-emerald-500/20 text-emerald-400 text-[10px] font-bold uppercase tracking-wider justify-center">
                    <CheckCircle className="w-3.5 h-3.5" />
                    <span>Dossier file saved successfully!</span>
                  </div>
                )}
              </div>
            </div>

          </div>

        </div>
      )}

    </div>
  );
}
