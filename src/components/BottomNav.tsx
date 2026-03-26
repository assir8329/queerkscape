import React from 'react';
import { User, Globe, Sparkles } from 'lucide-react';

interface BottomNavProps {
  activeTab: 'profile' | 'map' | 'thoughts';
  setActiveTab: (tab: 'profile' | 'map' | 'thoughts') => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ activeTab, setActiveTab }) => {
  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#050510]/80 backdrop-blur-xl border-t border-white/10 pb-safe">
      <div className="flex items-center justify-around p-3">
        <button
          onClick={() => setActiveTab('profile')}
          className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all ${
            activeTab === 'profile' ? 'text-purple-400' : 'text-white/40 hover:text-white/60'
          }`}
        >
          <User className="w-6 h-6" />
          <span className="text-[10px] font-medium">Profile</span>
        </button>
        
        <button
          onClick={() => setActiveTab('map')}
          className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all ${
            activeTab === 'map' ? 'text-blue-400' : 'text-white/40 hover:text-white/60'
          }`}
        >
          <Globe className="w-6 h-6" />
          <span className="text-[10px] font-medium">Map</span>
        </button>
        
        <button
          onClick={() => setActiveTab('thoughts')}
          className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all ${
            activeTab === 'thoughts' ? 'text-yellow-400' : 'text-white/40 hover:text-white/60'
          }`}
        >
          <Sparkles className="w-6 h-6" />
          <span className="text-[10px] font-medium">Create</span>
        </button>
      </div>
    </div>
  );
};
