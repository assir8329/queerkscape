import React from 'react';
import { Star, Globe, MessageCircle, Plus, Sparkles } from 'lucide-react';
import { motion } from 'motion/react';

interface BottomNavProps {
  activeTab: 'profile' | 'map' | 'siklab' | 'thoughts';
  setActiveTab: (tab: 'profile' | 'map' | 'siklab' | 'thoughts') => void;
  hasNewSignals?: boolean;
}

export const BottomNav: React.FC<BottomNavProps> = ({ activeTab, setActiveTab, hasNewSignals = false }) => {
  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#0B0B0C] border-t border-white/5 pb-safe h-16">
      <div className="flex items-center justify-around h-full px-2">
        {/* Star Tab */}
        <button
          onClick={() => setActiveTab('profile')}
          className="relative flex flex-col items-center justify-center w-1/4 h-full transition-all"
        >
          <div className={`relative p-1 transition-all ${activeTab === 'profile' ? 'text-purple-400' : 'text-white/30'}`}>
            <Star className={`w-5 h-5 ${activeTab === 'profile' ? 'fill-purple-400/20' : ''}`} />
            {activeTab === 'profile' && (
              <motion.div 
                layoutId="activeTabGlow"
                className="absolute inset-0 bg-purple-500/20 blur-lg rounded-full"
              />
            )}
          </div>
          <span className={`text-[10px] uppercase tracking-[0.15em] mt-1 font-bold ${activeTab === 'profile' ? 'text-purple-400' : 'text-white/20'}`}>
            Star
          </span>
          {activeTab === 'profile' && (
            <motion.div 
              layoutId="activeTabUnderline"
              className="absolute bottom-0 w-8 h-[2px] bg-gradient-to-r from-purple-500 to-cyan-400 rounded-full"
            />
          )}
        </button>

        {/* Map Tab */}
        <button
          onClick={() => setActiveTab('map')}
          className="relative flex flex-col items-center justify-center w-1/4 h-full transition-all"
        >
          <div className={`relative p-1 transition-all ${activeTab === 'map' ? 'text-purple-400' : 'text-white/30'}`}>
            <Globe className="w-5 h-5" />
            {activeTab === 'map' && (
              <motion.div 
                layoutId="activeTabGlow"
                className="absolute inset-0 bg-purple-500/20 blur-lg rounded-full"
              />
            )}
          </div>
          <span className={`text-[10px] uppercase tracking-[0.15em] mt-1 font-bold ${activeTab === 'map' ? 'text-purple-400' : 'text-white/20'}`}>
            Map
          </span>
          {activeTab === 'map' && (
            <motion.div 
              layoutId="activeTabUnderline"
              className="absolute bottom-0 w-8 h-[2px] bg-gradient-to-r from-purple-500 to-cyan-400 rounded-full"
            />
          )}
        </button>

        {/* Siklab Tab */}
        <button
          onClick={() => setActiveTab('siklab')}
          className="relative flex flex-col items-center justify-center w-1/4 h-full transition-all"
        >
          <div className={`relative p-1 transition-all ${activeTab === 'siklab' ? 'text-purple-400' : 'text-white/30'}`}>
            <div className="relative">
              <MessageCircle className="w-5 h-5" />
              <Sparkles className="absolute -top-1 -right-1 w-2 h-2 text-purple-300" />
              {hasNewSignals && (
                <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-purple-500 rounded-full shadow-[0_0_8px_rgba(168,85,247,0.8)]" />
              )}
            </div>
            {activeTab === 'siklab' && (
              <motion.div 
                layoutId="activeTabGlow"
                className="absolute inset-0 bg-purple-500/20 blur-lg rounded-full"
              />
            )}
          </div>
          <span className={`text-[10px] uppercase tracking-[0.15em] mt-1 font-bold ${activeTab === 'siklab' ? 'text-purple-400' : 'text-white/20'}`}>
            Siklab
          </span>
          {activeTab === 'siklab' && (
            <motion.div 
              layoutId="activeTabUnderline"
              className="absolute bottom-0 w-8 h-[2px] bg-gradient-to-r from-purple-500 to-cyan-400 rounded-full"
            />
          )}
        </button>

        {/* Sambit Tab */}
        <button
          onClick={() => setActiveTab('thoughts')}
          className="relative flex flex-col items-center justify-center w-1/4 h-full transition-all"
        >
          <div className={`relative p-1 transition-all ${activeTab === 'thoughts' ? 'text-purple-400' : 'text-white/30'}`}>
            <Plus className="w-6 h-6" />
            {activeTab === 'thoughts' && (
              <motion.div 
                layoutId="activeTabGlow"
                className="absolute inset-0 bg-purple-500/20 blur-lg rounded-full"
              />
            )}
          </div>
          <span className={`text-[10px] uppercase tracking-[0.15em] mt-1 font-bold ${activeTab === 'thoughts' ? 'text-purple-400' : 'text-white/20'}`}>
            Sambit
          </span>
          {activeTab === 'thoughts' && (
            <motion.div 
              layoutId="activeTabUnderline"
              className="absolute bottom-0 w-8 h-[2px] bg-gradient-to-r from-purple-500 to-cyan-400 rounded-full"
            />
          )}
        </button>
      </div>
    </div>
  );
};
