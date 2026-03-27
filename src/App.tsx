import React, { useState, useEffect } from 'react';
import { Analytics } from '@vercel/analytics/react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth, UserProfile } from './contexts/AuthContext';
import { Auth } from './components/Auth';
import { MapCanvas } from './components/MapCanvas';
import { EarthMap } from './components/EarthMap';
import { ProfileModal } from './components/ProfileModal';
import { SiklabInbox } from './components/SiklabInbox';
import { SettingsModal } from './components/SettingsModal';
import { Onboarding } from './components/Onboarding';
import { Sidebar } from './components/Sidebar';
import { UnsaidThoughts } from './components/UnsaidThoughts';
import { BottomNav } from './components/BottomNav';
import { TopCommandBar } from './components/TopCommandBar';
import { CreateActionHub } from './components/CreateActionHub';
import { SignalModal } from './components/SignalModal';
import { GuideModal } from './components/GuideModal';
import { WelcomePage } from './components/WelcomePage';
import { Search, Sparkles, Star, LogIn, X, Loader2, Globe, Plus, CircleHelp } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { db } from './firebase';
import { serverTimestamp, collection, onSnapshot, query, where } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from './lib/firestore-errors';

const DAILY_PROMPTS = [
  "What made you smile today?",
  "What's a small win you had recently?",
  "What are you looking forward to?",
  "Share your presence with the universe...",
  "What's something you're grateful for?",
];

const getDailyPrompt = () => {
  const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 1000 / 60 / 60 / 24);
  return DAILY_PROMPTS[dayOfYear % DAILY_PROMPTS.length];
};

import { RightPanel } from './components/RightPanel';
import { CreateActionHubContent } from './components/CreateActionHubContent';
import { UnsaidThoughtsContent } from './components/UnsaidThoughtsContent';

const MainApp: React.FC = () => {
  const { user, profile, loading, signOut, updateProfile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [filterTag, setFilterTag] = useState('');
  const [mapMode, setMapModeState] = useState<'constellation' | 'earth'>(() => {
    return (localStorage.getItem('mapMode') as 'constellation' | 'earth') || 'earth';
  });
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [showSiklab, setShowSiklab] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [activeTab, setActiveTab] = useState<'profile' | 'map' | 'siklab' | 'thoughts'>('map');
  const [hasNewSignals, setHasNewSignals] = useState(false);
  const [isCreateHubOpen, setIsCreateHubOpen] = useState(false);
  const [isSignalModalOpen, setIsSignalModalOpen] = useState(false);
  const [siklabTargetUser, setSiklabTargetUser] = useState<UserProfile | null>(null);
  const [isAddingMemory, setIsAddingMemory] = useState(false);
  const [isUiVisible, setIsUiVisible] = useState(true);
  const fadeTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  // Right Panel State
  const [rightPanelType, setRightPanelType] = useState<'create' | 'thoughts' | null>(null);
  const [rightPanelData, setRightPanelData] = useState<any>(null);

  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Auth Redirect Logic
  useEffect(() => {
    if (!loading) {
      if (user) {
        // If logged in and on login page or welcome page, redirect to map
        if (location.pathname === '/login' || location.pathname === '/') {
          navigate('/map', { replace: true });
        }
      }
      // Removed the redirection to /login for guest users
    }
  }, [user, loading, location.pathname, navigate]);

  const handleMapInteraction = () => {
    setIsUiVisible(false);
    if (fadeTimeoutRef.current) clearTimeout(fadeTimeoutRef.current);
    fadeTimeoutRef.current = setTimeout(() => {
      setIsUiVisible(true);
    }, 2000);
  };

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

  const handlePromptSubmit = async (response: string) => {
    if (!response.trim()) return;
    await updateProfile({
      signal: response,
      signalUpdatedAt: serverTimestamp()
    });
  };

  useEffect(() => {
    if (!profile) return;
    const q = query(
      collection(db, 'interactions'),
      where('toUid', '==', profile.uid),
      where('read', '==', false)
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setHasNewSignals(!snapshot.empty);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'interactions');
    });
    return () => unsubscribe();
  }, [profile]);

  const handleTabChange = (tab: 'profile' | 'map' | 'siklab' | 'thoughts') => {
    if (tab === 'thoughts') {
      setIsCreateHubOpen(true);
      return;
    }
    if (tab === 'siklab') {
      setShowSiklab(true);
      setActiveTab('siklab');
      return;
    }
    setActiveTab(tab);
    if (tab === 'profile') {
      if (profile) {
        setSelectedUser(profile);
      } else {
        navigate('/login');
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

  const handleUserClick = (userProfile: UserProfile) => {
    setSelectedUser(userProfile);
  };

  const handleActionHub = (action: 'signal' | 'thought' | 'memory') => {
    setIsCreateHubOpen(false);
    if (!user && (action === 'signal' || action === 'memory')) {
      navigate('/login');
      return;
    }

    if (isMobile) {
      switch (action) {
        case 'signal':
          setIsSignalModalOpen(true);
          break;
        case 'thought':
          setActiveTab('thoughts');
          break;
        case 'memory':
          setIsAddingMemory(true);
          break;
      }
    } else {
      // Desktop actions
      if (action === 'thought') {
        setRightPanelType('thoughts');
      } else if (action === 'signal') {
        setIsSignalModalOpen(true);
      } else if (action === 'memory') {
        setIsAddingMemory(true);
      }
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
      <GuideModal />
      
      <Routes>
        <Route path="/" element={<WelcomePage />} />
        
        <Route path="/login" element={
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#050510]">
            <div className="w-full max-w-md p-4">
              <Auth onClose={() => navigate('/map')} />
            </div>
          </div>
        } />
        
        <Route path="/map" element={
          <>
            {user && !profile?.onboarded && <Onboarding />}
            
            {/* Sidebar (Desktop Only) */}
            <Sidebar 
              profile={profile} 
              mapMode={mapMode} 
              setMapMode={setMapMode} 
              onMyProfileClick={() => {
                if (profile) {
                  setSelectedUser(profile);
                } else {
                  navigate('/login');
                }
              }}
              onBondsClick={() => {
                setShowSiklab(true);
                // We can potentially set a tab here if needed, but Siklab handles its own tabs
              }}
              onNotificationsClick={() => setShowSiklab(true)}
              onSettingsClick={() => setShowSettings(true)}
              onThoughtsClick={() => {
                if (isMobile) {
                  setActiveTab('thoughts');
                } else {
                  setRightPanelType('thoughts');
                }
              }}
              onPinMemoryClick={() => {
                if (!user) {
                  navigate('/login');
                  return;
                }
                setIsAddingMemory(!isAddingMemory);
              }}
              isAddingMemory={isAddingMemory}
              onCreateClick={() => {
                if (isMobile) {
                  setIsCreateHubOpen(true);
                } else {
                  setRightPanelType('create');
                }
              }}
              onSignOut={signOut}
              onSignInClick={() => navigate('/login')}
              hasNewSignals={hasNewSignals}
            />

            {/* Main Content */}
            <div className="flex-1 relative h-full flex min-w-0">
              <div className="flex-1 relative h-full">
                {mapMode === 'constellation' ? (
                  <MapCanvas 
                    onUserClick={handleUserClick} 
                    filterTag={filterTag}
                    setFilterTag={setFilterTag}
                    mapMode={mapMode}
                    setMapMode={setMapMode}
                    isUiVisible={isUiVisible}
                    onInteraction={handleMapInteraction}
                  />
                ) : (
                  <EarthMap 
                    users={allUsers}
                    currentUser={profile}
                    onUserClick={handleUserClick} 
                    filterTag={filterTag}
                    setFilterTag={setFilterTag}
                    mapMode={mapMode}
                    setMapMode={setMapMode}
                    isUiVisible={isUiVisible}
                    onInteraction={handleMapInteraction}
                    isAddingMemory={isAddingMemory}
                    setIsAddingMemory={setIsAddingMemory}
                  />
                )}
                
                <TopCommandBar 
                  user={user}
                  profile={profile}
                  filterTag={filterTag}
                  setFilterTag={setFilterTag}
                  dailyPrompt={dailyPrompt}
                  onPromptSubmit={handlePromptSubmit}
                  isVisible={isUiVisible}
                />

                {/* Mobile Guide Button */}
                {isMobile && (
                  <div className="fixed top-6 right-6 z-50 pointer-events-none">
                    <motion.button
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ 
                        opacity: isUiVisible ? 1 : 0.2,
                        scale: isUiVisible ? 1 : 0.9,
                        y: isUiVisible ? 0 : -5
                      }}
                      onClick={() => window.dispatchEvent(new CustomEvent('open-guide'))}
                      className="pointer-events-auto w-10 h-10 glass rounded-full flex items-center justify-center text-white/40 hover:text-white transition-all active:scale-90 shadow-2xl border border-white/10"
                    >
                      <CircleHelp size={20} />
                    </motion.button>
                  </div>
                )}

                {/* Unsaid Thoughts (Mobile only modal) */}
                {isMobile && (
                  <UnsaidThoughts 
                    isOpen={activeTab === 'thoughts' ? true : undefined} 
                    onClose={activeTab === 'thoughts' ? () => setActiveTab('map') : undefined} 
                  />
                )}

                <SiklabInbox 
                  isOpen={showSiklab} 
                  onClose={() => {
                    setShowSiklab(false);
                    setSiklabTargetUser(null);
                    if (activeTab === 'siklab') setActiveTab('map');
                  }} 
                  initialUser={siklabTargetUser}
                  onUserClick={(user) => {
                    setSelectedUser(user);
                    setShowSiklab(false);
                  }}
                />

                <SettingsModal
                  isOpen={showSettings}
                  onClose={() => setShowSettings(false)}
                />

                <CreateActionHub 
                  isOpen={isCreateHubOpen}
                  onClose={() => setIsCreateHubOpen(false)}
                  onAction={handleActionHub}
                />

                <SignalModal 
                  isOpen={isSignalModalOpen}
                  onClose={() => setIsSignalModalOpen(false)}
                  dailyPrompt={dailyPrompt}
                  onSubmit={handlePromptSubmit}
                />

                {/* Profile Modal (All Devices) */}
                {selectedUser && (
                  <ProfileModal
                    user={selectedUser}
                    onClose={() => {
                      setSelectedUser(null);
                      if (activeTab === 'profile') {
                        setActiveTab('map');
                      }
                    }}
                    onSettingsClick={() => setShowSettings(true)}
                    onChatClick={(user) => {
                      setSiklabTargetUser(user);
                      setShowSiklab(true);
                      setSelectedUser(null);
                    }}
                    onSignOut={signOut}
                  />
                )}
              </div>

              {/* Right Context Panel (Desktop only) */}
              {!isMobile && (
                <RightPanel
                  isOpen={rightPanelType !== null}
                  onClose={() => setRightPanelType(null)}
                  title={
                    rightPanelType === 'create' ? 'Maglikha' :
                    rightPanelType === 'thoughts' ? 'Bulong' : ''
                  }
                >
                  {rightPanelType === 'create' && (
                    <CreateActionHubContent onAction={handleActionHub} />
                  )}
                  {rightPanelType === 'thoughts' && (
                    <UnsaidThoughtsContent />
                  )}
                </RightPanel>
              )}
            </div>

            {/* Bottom Navigation (Mobile Only) */}
            <BottomNav 
              activeTab={activeTab} 
              setActiveTab={handleTabChange} 
              hasNewSignals={hasNewSignals}
            />
          </>
        } />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
};

export default function App() {
  return (
    <Router>
      <AuthProvider>
        <MainApp />
        <Analytics />
      </AuthProvider>
    </Router>
  );
}
