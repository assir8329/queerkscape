import React from 'react';
import { MapPin, Navigation2, Layers, ZoomIn, ZoomOut, Maximize2, Minimize2, Star, Globe } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface RightActionStackProps {
  isLoggedIn: boolean;
  onCenterMe: () => void;
  onPinMemory: () => void;
  onZoomIn?: () => void;
  onZoomOut?: () => void;
  isAddingMemory?: boolean;
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
  onZoomIn,
  onZoomOut,
  isAddingMemory,
  onToggleLayer,
  activeLayers,
  mapMode,
  setMapMode,
  filterTag,
  setFilterTag,
  isVisible = true
}) => {
  return (
    <>
      {/* Bottom Right Actions (Navigation & Zoom) */}
      <div className="fixed right-6 bottom-8 z-40 hidden md:flex flex-col gap-4 pointer-events-none">
        <motion.div 
          animate={{ 
            opacity: isVisible ? 1 : 0.2,
            x: isVisible ? 0 : 20,
            scale: isVisible ? 1 : 0.95
          }}
          transition={{ type: "spring", stiffness: 200, damping: 25 }}
          className="flex flex-col gap-4 pointer-events-auto"
        >
          <div className="glass-dark rounded-3xl p-1.5 flex flex-col gap-1 shadow-2xl border-white/5">
            <ActionButton 
              icon={<Navigation2 size={18} />} 
              label={isLoggedIn ? "Center Me" : "Sign in to center"} 
              onClick={() => {
                if (isLoggedIn) {
                  onCenterMe();
                } else {
                  window.location.href = '/login';
                }
              }} 
              variant="primary"
            />
            {mapMode === 'constellation' && (
              <>
                <ActionButton 
                  icon={<ZoomIn size={18} />} 
                  label="Zoom In" 
                  onClick={onZoomIn || (() => {})} 
                />
                <ActionButton 
                  icon={<ZoomOut size={18} />} 
                  label="Zoom Out" 
                  onClick={onZoomOut || (() => {})} 
                />
              </>
            )}
          </div>
        </motion.div>
      </div>
    </>
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
