import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
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
import { TopCommandBar } from './components/TopCommandBar';
import { CreateActionHub } from './components/CreateActionHub';
import { SignalModal } from './components/SignalModal';
import { GuideModal } from './components/GuideModal';
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
  const navigate = useNavigate();
  const location = useLocation();
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [filterTag, setFilterTag] = useState('');
  const [mapMode, setMapModeState] = useState<'constellation' | 'earth'>(() => {
    return (localStorage.getItem('mapMode') as 'constellation' | 'earth') || 'earth';
  });
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showBonds, setShowBonds] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [activeTab, setActiveTab] = useState<'profile' | 'map' | 'thoughts'>('map');
  const [isCreateHubOpen, setIsCreateHubOpen] = useState(false);
  const [isSignalModalOpen, setIsSignalModalOpen] = useState(false);
  const [isAddingMemory, setIsAddingMemory] = useState(false);
  const [isUiVisible, setIsUiVisible] = useState(true);
  const fadeTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  // Auth Redirect Logic
  useEffect(() => {
    if (!loading) {
      if (user) {
        // If logged in and on login page, redirect to map
        if (location.pathname === '/login') {
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

  const handleTabChange = (tab: 'profile' | 'map' | 'thoughts') => {
    if (tab === 'thoughts') {
      setIsCreateHubOpen(true);
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

  const handleActionHub = (action: 'signal' | 'thought' | 'memory') => {
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
        <Route path="/login" element={
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#050510]">
            <div className="w-full max-w-md p-4">
              <Auth />
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
              onMyProfileClick={() => profile && setSelectedUser(profile)}
              onBondsClick={() => setShowBonds(true)}
              onNotificationsClick={() => setShowNotifications(true)}
              onSettingsClick={() => setShowSettings(true)}
              onSignOut={signOut}
              onSignInClick={() => navigate('/login')}
            />

            {/* Main Content */}
            <div className="flex-1 relative h-full">
              {mapMode === 'constellation' ? (
                <MapCanvas 
                  onUserClick={setSelectedUser} 
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
                  onUserClick={setSelectedUser} 
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

              {/* Unsaid Thoughts (Desktop: Floating Button, Mobile: Tab) */}
              <UnsaidThoughts 
                isOpen={activeTab === 'thoughts' ? true : undefined} 
                onClose={activeTab === 'thoughts' ? () => setActiveTab('map') : undefined} 
              />

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
          </>
        } />

        <Route path="*" element={<Navigate to="/map" replace />} />
      </Routes>
    </div>
  );
};

export default function App() {
  return (
    <Router>
      <AuthProvider>
        <MainApp />
      </AuthProvider>
    </Router>
  );
}
