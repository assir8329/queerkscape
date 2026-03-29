import React from 'react';
import { Star, Globe, MessageSquare, Plus, Orbit } from 'lucide-react';
import { motion } from 'motion/react';
import { useAuth } from '../contexts/AuthContext';
import { getHexColor } from '../lib/colors';

interface BottomNavProps {
  activeTab: 'buklod' | 'mundo' | 'kalawakan' | 'siklab' | 'sambit';
  setActiveTab: (tab: 'buklod' | 'mundo' | 'kalawakan' | 'siklab' | 'sambit') => void;
  unreadSignalsCount?: number;
  unreadUgnayanCount?: number;
}

export const BottomNav: React.FC<BottomNavProps> = ({ activeTab, setActiveTab, unreadSignalsCount = 0, unreadUgnayanCount = 0 }) => {
  const { profile } = useAuth();
  const userVibeColor = profile ? getHexColor(profile.color) : '#a855f7';

  const handleMapToggle = () => {
    if (activeTab === 'mundo') {
      setActiveTab('kalawakan');
    } else if (activeTab === 'kalawakan') {
      setActiveTab('mundo');
    } else {
      // Default to mundo if coming from another tab
      setActiveTab('mundo');
    }
  };

  const isMapActive = activeTab === 'mundo' || activeTab === 'kalawakan';

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-black/40 backdrop-blur-lg border-t border-white/10 pb-safe h-16">
      <div className="flex items-center justify-around h-full px-2">
        {/* BUKLOD Tab */}
        <button
          onClick={() => setActiveTab('buklod')}
          className="relative flex flex-col items-center justify-center w-1/4 h-full transition-all"
        >
          <div 
            className={`relative p-1 transition-all ${activeTab === 'buklod' ? '' : 'text-white/30'}`}
            style={{ color: activeTab === 'buklod' ? userVibeColor : undefined }}
          >
            <Star 
              className="w-5 h-5" 
              fill={activeTab === 'buklod' ? `${userVibeColor}33` : 'none'} 
            />
            {activeTab === 'buklod' && (
              <motion.div 
                layoutId="activeTabGlow"
                className="absolute inset-0 blur-lg rounded-full"
                style={{ backgroundColor: `${userVibeColor}33` }}
              />
            )}
          </div>
          <span 
            className={`text-[10px] uppercase tracking-[0.15em] mt-1 font-bold ${activeTab === 'buklod' ? '' : 'text-white/20'}`}
            style={{ color: activeTab === 'buklod' ? userVibeColor : undefined }}
          >
            Buklod
          </span>
          {activeTab === 'buklod' && (
            <motion.div 
              layoutId="activeTabUnderline"
              className="absolute bottom-0 w-8 h-[2px] rounded-full"
              style={{ backgroundColor: userVibeColor }}
            />
          )}
        </button>

        {/* MUNDO / KALAWAKAN Tab */}
        <button
          onClick={handleMapToggle}
          className="relative flex flex-col items-center justify-center w-1/4 h-full transition-all"
        >
          <div 
            className={`relative p-1 transition-all ${isMapActive ? '' : 'text-white/30'}`}
            style={{ color: isMapActive ? userVibeColor : undefined }}
          >
            <motion.div
              animate={{ rotate: activeTab === 'kalawakan' ? 180 : 0 }}
              transition={{ type: "spring", stiffness: 200, damping: 20 }}
            >
              {activeTab === 'kalawakan' ? (
                <Orbit className="w-5 h-5" />
              ) : (
                <Globe className="w-5 h-5" />
              )}
            </motion.div>
            {isMapActive && (
              <motion.div 
                layoutId="activeTabGlow"
                className="absolute inset-0 blur-lg rounded-full"
                style={{ backgroundColor: `${userVibeColor}33` }}
              />
            )}
          </div>
          <span 
            className={`text-[10px] uppercase tracking-[0.15em] mt-1 font-bold ${isMapActive ? '' : 'text-white/20'}`}
            style={{ color: isMapActive ? userVibeColor : undefined }}
          >
            {activeTab === 'kalawakan' ? 'Kalawakan' : 'Mundo'}
          </span>
          {isMapActive && (
            <motion.div 
              layoutId="activeTabUnderline"
              className="absolute bottom-0 w-8 h-[2px] rounded-full"
              style={{ backgroundColor: userVibeColor }}
            />
          )}
        </button>

        {/* SIKLAB Tab */}
        <button
          onClick={() => setActiveTab('siklab')}
          className="relative flex flex-col items-center justify-center w-1/4 h-full transition-all"
        >
          <div 
            className={`relative p-1 transition-all ${activeTab === 'siklab' ? '' : 'text-white/30'}`}
            style={{ color: activeTab === 'siklab' ? userVibeColor : undefined }}
          >
            <div className="relative">
              <MessageSquare className="w-5 h-5" />
              {(unreadSignalsCount + unreadUgnayanCount) > 0 && (
                <span className="absolute -top-1.5 -right-1.5 min-w-[14px] h-3.5 bg-purple-600 rounded-full flex items-center justify-center px-1 text-[7px] text-white font-black shadow-[0_0_8px_rgba(168,85,247,0.8)]">
                  {(unreadSignalsCount + unreadUgnayanCount) > 9 ? '9+' : (unreadSignalsCount + unreadUgnayanCount)}
                </span>
              )}
            </div>
            {activeTab === 'siklab' && (
              <motion.div 
                layoutId="activeTabGlow"
                className="absolute inset-0 blur-lg rounded-full"
                style={{ backgroundColor: `${userVibeColor}33` }}
              />
            )}
          </div>
          <span 
            className={`text-[10px] uppercase tracking-[0.15em] mt-1 font-bold ${activeTab === 'siklab' ? '' : 'text-white/20'}`}
            style={{ color: activeTab === 'siklab' ? userVibeColor : undefined }}
          >
            Siklab
          </span>
          {activeTab === 'siklab' && (
            <motion.div 
              layoutId="activeTabUnderline"
              className="absolute bottom-0 w-8 h-[2px] rounded-full"
              style={{ backgroundColor: userVibeColor }}
            />
          )}
        </button>

        {profile ? (
          /* SAMBIT Tab */
          <button
            onClick={() => setActiveTab('sambit')}
            className="relative flex flex-col items-center justify-center w-1/4 h-full transition-all"
          >
            <div 
              className={`relative p-1 transition-all ${activeTab === 'sambit' ? '' : 'text-white/30'}`}
              style={{ color: activeTab === 'sambit' ? userVibeColor : undefined }}
            >
              <Plus className="w-6 h-6" />
              {activeTab === 'sambit' && (
                <motion.div 
                  layoutId="activeTabGlow"
                  className="absolute inset-0 blur-lg rounded-full"
                  style={{ backgroundColor: `${userVibeColor}33` }}
                />
              )}
            </div>
            <span 
              className={`text-[10px] uppercase tracking-[0.15em] mt-1 font-bold ${activeTab === 'sambit' ? '' : 'text-white/20'}`}
              style={{ color: activeTab === 'sambit' ? userVibeColor : undefined }}
            >
              Sambit
            </span>
            {activeTab === 'sambit' && (
              <motion.div 
                layoutId="activeTabUnderline"
                className="absolute bottom-0 w-8 h-[2px] rounded-full"
                style={{ backgroundColor: userVibeColor }}
              />
            )}
          </button>
        ) : (
          /* Sign In Tab for Guests */
          <button
            onClick={() => window.location.href = '/login'}
            className="relative flex flex-col items-center justify-center w-1/4 h-full transition-all"
          >
            <div className="relative p-1 text-purple-400">
              <Plus className="w-6 h-6 rotate-45" />
            </div>
            <span className="text-[10px] uppercase tracking-[0.15em] mt-1 font-bold text-purple-400">
              Sign In
            </span>
          </button>
        )}
      </div>
    </div>
  );
};
