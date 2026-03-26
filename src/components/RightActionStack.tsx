import React from 'react';
import { MapPin, Navigation2, Layers, ZoomIn, ZoomOut, Maximize2, Minimize2, Star, Globe } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface RightActionStackProps {
  isLoggedIn: boolean;
  onCenterMe: () => void;
  onPinMemory: () => void;
  onToggleLayer: (layer: string) => void;
  activeLayers: string[];
  mapMode: 'constellation' | 'earth';
  setMapMode: (mode: 'constellation' | 'earth') => void;
  filterTag: string;
  setFilterTag: (tag: string) => void;
  isVisible?: boolean;
}

export const RightActionStack: React.FC<RightActionStackProps> = ({
  isLoggedIn,
  onCenterMe,
  onPinMemory,
  onToggleLayer,
  activeLayers,
  mapMode,
  setMapMode,
  filterTag,
  setFilterTag,
  isVisible = true
}) => {
  return (
    <div className="fixed right-6 top-1/2 -translate-y-1/2 z-40 flex flex-col gap-4 pointer-events-none">
      <motion.div 
        animate={{ 
          opacity: isVisible ? 1 : 0.2,
          x: isVisible ? 0 : 20,
          scale: isVisible ? 1 : 0.95
        }}
        transition={{ type: "spring", stiffness: 200, damping: 25 }}
        className="flex flex-col gap-4 pointer-events-auto"
      >
        {/* Primary Actions Group */}
        <div className="glass-dark rounded-3xl p-1.5 flex flex-col gap-1 shadow-2xl border-white/5">
          <ActionButton 
            icon={<Navigation2 size={18} />} 
            label={isLoggedIn ? "Center Me" : "Sign in to center"} 
            onClick={isLoggedIn ? onCenterMe : () => {}} 
            variant="primary"
            disabled={!isLoggedIn}
          />
          <ActionButton 
            icon={<MapPin size={18} />} 
            label={isLoggedIn ? "Pin Memory" : "Sign in to pin"} 
            onClick={isLoggedIn ? onPinMemory : () => {}} 
            variant="highlight"
            disabled={!isLoggedIn}
          />
        </div>

        {/* View Controls Group */}
        <div className="glass-dark rounded-3xl p-1.5 flex flex-col gap-1 shadow-2xl border-white/5">
          <ActionButton 
            icon={mapMode === 'constellation' ? <Globe size={18} /> : <Star size={18} />} 
            label={mapMode === 'constellation' ? "Ground View" : "Sky View"} 
            onClick={() => setMapMode(mapMode === 'constellation' ? 'earth' : 'constellation')} 
          />
          <ActionButton 
            icon={<Star size={18} fill={filterTag === 'favorites' ? "currentColor" : "none"} />} 
            label="Favorites" 
            active={filterTag === 'favorites'}
            onClick={() => setFilterTag(filterTag === 'favorites' ? '' : 'favorites')} 
            variant="yellow"
          />
        </div>

        {/* Layers Group */}
        <div className="glass-dark rounded-3xl p-1.5 flex flex-col gap-1 shadow-2xl border-white/5">
          <ActionButton 
            icon={<Layers size={18} />} 
            label="Thoughts" 
            active={activeLayers.includes('thoughts')}
            onClick={() => onToggleLayer('thoughts')} 
          />
          <ActionButton 
            icon={<Layers size={18} />} 
            label="Memories" 
            active={activeLayers.includes('memories')}
            onClick={() => onToggleLayer('memories')} 
          />
        </div>
      </motion.div>
    </div>
  );
};

interface ActionButtonProps {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  variant?: 'default' | 'primary' | 'highlight' | 'yellow';
}

const ActionButton: React.FC<ActionButtonProps> = ({ icon, label, onClick, active, disabled, variant = 'default' }) => {
  const variants = {
    default: active ? 'bg-white/10 text-white border-white/10' : 'text-white/40 hover:text-white hover:bg-white/5 border-transparent',
    primary: 'bg-purple-500/10 text-purple-400 hover:bg-purple-500/20 border-purple-500/20',
    highlight: 'bg-pink-500/10 text-pink-400 hover:bg-pink-500/20 border-pink-500/20',
    yellow: active ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' : 'text-white/40 hover:text-white hover:bg-white/5 border-transparent'
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`w-12 h-12 flex items-center justify-center rounded-2xl transition-all duration-300 border group relative ${variants[variant]} ${disabled ? 'opacity-20 cursor-not-allowed grayscale' : ''}`}
      title={label}
    >
      <div className={`shrink-0 transition-transform duration-300 group-hover:scale-110 group-active:scale-95`}>
        {icon}
      </div>
      
      {/* Tooltip on Hover */}
      <div className="absolute right-full mr-3 px-3 py-1.5 glass-dark rounded-xl text-[10px] font-bold text-white/60 uppercase tracking-widest opacity-0 group-hover:opacity-100 translate-x-2 group-hover:translate-x-0 transition-all pointer-events-none whitespace-nowrap border border-white/5">
        {label}
      </div>
    </button>
  );
};
