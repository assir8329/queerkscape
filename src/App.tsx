import React, { useState } from 'react';
import { AuthProvider, useAuth, UserProfile } from './contexts/AuthContext';
import { Auth } from './components/Auth';
import { MapCanvas } from './components/MapCanvas';
import { EarthMap } from './components/EarthMap';
import { ProfileModal } from './components/ProfileModal';
import { Notifications } from './components/Notifications';
import { BondsModal } from './components/BondsModal';
import { SettingsModal } from './components/SettingsModal';
import { Onboarding } from './components/Onboarding';
import { Sidebar } from './components/Sidebar';
import { UnsaidThoughts } from './components/UnsaidThoughts';
import { BottomNav } from './components/BottomNav';
import { Search, Sparkles, Star, LogIn, X, Loader2, Globe } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { db } from './firebase';
import { serverTimestamp, collection, onSnapshot } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from './lib/firestore-errors';

const DAILY_PROMPTS = [
  "What made you smile today?",
  "What's a small win you had recently?",
  "What are you looking forward to?",
  "Send a signal to the universe...",
  "What's something you're grateful for?",
];

const getDailyPrompt = () => {
  const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 1000 / 60 / 60 / 24);
  return DAILY_PROMPTS[dayOfYear % DAILY_PROMPTS.length];
};

const MainApp: React.FC = () => {
  const { user, profile, loading, signOut, updateProfile } = useAuth();
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [filterTag, setFilterTag] = useState('');
  const [showPromptInput, setShowPromptInput] = useState(false);
  const [promptResponse, setPromptResponse] = useState('');
  const [mapMode, setMapModeState] = useState<'constellation' | 'earth'>(() => {
    return (localStorage.getItem('mapMode') as 'constellation' | 'earth') || 'earth';
  });
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showBonds, setShowBonds] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const [activeTab, setActiveTab] = useState<'profile' | 'map' | 'thoughts'>('map');

  const setMapMode = (mode: 'constellation' | 'earth') => {
    setMapModeState(mode);
    localStorage.setItem('mapMode', mode);
  };

  React.useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'users'), (snapshot) => {
      const usersData = snapshot.docs.map(doc => doc.data() as UserProfile);
      setAllUsers(usersData);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'users');
    });
    return () => unsubscribe();
  }, []);

  const dailyPrompt = getDailyPrompt();

  const handlePromptSubmit = async () => {
    if (!promptResponse.trim()) return;
    await updateProfile({
      signal: promptResponse,
      signalUpdatedAt: serverTimestamp()
    });
    setShowPromptInput(false);
    setPromptResponse('');
  };

  const handleTabChange = (tab: 'profile' | 'map' | 'thoughts') => {
    setActiveTab(tab);
    if (tab === 'profile') {
      if (profile) {
        setSelectedUser(profile);
      } else {
        setShowAuth(true);
        setActiveTab('map'); // Revert if not logged in
      }
    } else if (tab === 'map') {
      if (activeTab === 'profile' && selectedUser?.uid === profile?.uid) {
        setSelectedUser(null);
      }
    } else if (tab === 'thoughts') {
      setSelectedUser(null);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-[#050510] flex items-center justify-center z-[9999]">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
        >
          <Loader2 className="w-12 h-12 text-purple-500" />
        </motion.div>
      </div>
    );
  }

  return (
    <div className="w-screen h-screen overflow-hidden bg-[#050510] relative font-sans flex">
      {user && !profile?.onboarded && <Onboarding />}
      
      {/* Sidebar (Desktop Only) */}
      <Sidebar 
        profile={profile} 
        mapMode={mapMode} 
        setMapMode={setMapMode} 
        onMyProfileClick={() => profile && setSelectedUser(profile)}
        onBondsClick={() => setShowBonds(true)}
        onNotificationsClick={() => setShowNotifications(true)}
        onSettingsClick={() => setShowSettings(true)}
        onSignOut={signOut}
        onSignInClick={() => setShowAuth(true)}
      />

      {/* Main Content */}
      <div className="flex-1 relative h-full">
        {mapMode === 'constellation' ? (
          <MapCanvas onUserClick={setSelectedUser} filterTag={filterTag} />
        ) : (
          <EarthMap users={allUsers} currentUser={profile} onUserClick={setSelectedUser} filterTag={filterTag} />
        )}
        
        {/* Unified Top Bar Container */}
        <div className="absolute top-6 left-6 right-6 z-30 flex flex-col md:flex-row items-center justify-between gap-4 pointer-events-none">
          
          {/* Daily Prompt - Only for logged in users */}
          <div className="flex flex-col items-center md:items-start gap-3 w-full md:w-auto pointer-events-auto">
            {user && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white/5 backdrop-blur-md border border-white/10 rounded-full px-6 py-2.5 flex items-center gap-3 shadow-lg transition-all hover:bg-white/10 cursor-pointer group" 
                onClick={() => setShowPromptInput(!showPromptInput)}
              >
                <Sparkles className="w-4 h-4 text-yellow-400 group-hover:scale-110 transition-transform" />
                <span className="text-white/80 text-sm font-medium">{dailyPrompt}</span>
              </motion.div>
            )}

            <AnimatePresence>
              {showPromptInput && user && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95, y: -10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: -10 }}
                  className="bg-[#1a1a2e]/95 backdrop-blur-xl border border-white/10 rounded-2xl p-4 shadow-2xl w-full max-w-md flex flex-col gap-3"
                >
                  <textarea
                    value={promptResponse}
                    onChange={(e) => setPromptResponse(e.target.value)}
                    placeholder="Share your answer..."
                    className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white placeholder:text-white/30 focus:outline-none focus:border-purple-500 resize-none h-24 text-sm transition-all"
                    maxLength={100}
                  />
                  <div className="flex justify-end gap-2">
                    <button onClick={() => setShowPromptInput(false)} className="px-4 py-2 text-white/50 hover:text-white text-sm transition-colors">Cancel</button>
                    <button onClick={handlePromptSubmit} className="px-6 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-sm font-bold transition-all shadow-[0_0_15px_rgba(168,85,247,0.4)] active:scale-95">Release Signal</button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Search and Actions */}
          <div className="flex items-center gap-3 w-full md:w-auto justify-center md:justify-end pointer-events-auto">
            {!user && (
              <button
                onClick={() => setShowAuth(true)}
                className="bg-purple-600 hover:bg-purple-500 text-white px-6 py-2.5 rounded-full text-sm font-bold flex items-center gap-2 transition-all shadow-[0_0_15px_rgba(168,85,247,0.4)] active:scale-95"
              >
                <LogIn className="w-4 h-4" />
                <span className="hidden sm:inline">Join the Scape</span>
                <span className="sm:hidden">Join</span>
              </button>
            )}
            
            <div className="relative w-full max-w-[16rem] sm:w-72">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
              <input
                type="text"
                placeholder="Filter by tag or vibe"
                value={filterTag}
                onChange={(e) => setFilterTag(e.target.value)}
                className="w-full bg-white/5 backdrop-blur-md border border-white/10 rounded-full py-2.5 pl-11 pr-4 text-white placeholder:text-white/30 focus:outline-none focus:border-purple-500 transition-all shadow-lg text-sm"
              />
            </div>
            
            {user && (
              <div className="flex gap-2">
                <button
                  onClick={() => setMapMode(mapMode === 'constellation' ? 'earth' : 'constellation')}
                  className="md:hidden p-2.5 bg-white/5 hover:bg-white/10 backdrop-blur-md border border-white/10 rounded-full transition-all shadow-lg text-white"
                  title={mapMode === 'constellation' ? "Switch to Ground View" : "Switch to Sky View"}
                >
                  <Globe className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setFilterTag(filterTag === 'favorites' ? '' : 'favorites')}
                  className={`p-2.5 backdrop-blur-md border rounded-full transition-all shadow-lg ${filterTag === 'favorites' ? 'bg-yellow-400/20 text-yellow-400 border-yellow-400/50' : 'bg-white/5 text-white border-white/10 hover:bg-white/10'}`}
                  title="Show Favorites"
                >
                  <Star className={`w-4 h-4 ${filterTag === 'favorites' ? 'fill-yellow-400' : ''}`} />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Unsaid Thoughts (Desktop: Floating Button, Mobile: Tab) */}
        <UnsaidThoughts 
          isOpen={activeTab === 'thoughts' ? true : undefined} 
          onClose={activeTab === 'thoughts' ? () => setActiveTab('map') : undefined} 
        />

        {showAuth && (
          <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
            <div className="relative w-full max-w-md">
              <button 
                onClick={() => setShowAuth(false)}
                className="absolute -top-12 right-0 p-2 text-white/50 hover:text-white transition-colors"
              >
                <X className="w-8 h-8" />
              </button>
              <Auth />
            </div>
          </div>
        )}

        <Notifications 
          isOpen={showNotifications} 
          onClose={() => setShowNotifications(false)} 
        />

        <BondsModal
          isOpen={showBonds}
          onClose={() => setShowBonds(false)}
          onUserClick={setSelectedUser}
        />

        <SettingsModal
          isOpen={showSettings}
          onClose={() => setShowSettings(false)}
        />

        {selectedUser && (
          <ProfileModal
            user={selectedUser}
            onClose={() => {
              setSelectedUser(null);
              if (activeTab === 'profile') {
                setActiveTab('map');
              }
            }}
            onBondsClick={() => setShowBonds(true)}
            onNotificationsClick={() => setShowNotifications(true)}
            onSettingsClick={() => setShowSettings(true)}
            onSignOut={signOut}
          />
        )}
      </div>

      {/* Bottom Navigation (Mobile Only) */}
      <BottomNav activeTab={activeTab} setActiveTab={handleTabChange} />
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}
