import React, { useState, useEffect } from 'react';
import { Share2, Globe, User as UserIcon, Users, Bell, Settings, LogOut, MapPin, Menu, LogIn, ChevronLeft, ChevronRight, HelpCircle, Plus, MessageCircle } from 'lucide-react';
import { UserProfile } from '../contexts/AuthContext';
import { getHexColor } from '../lib/colors';
import { motion, AnimatePresence } from 'motion/react';

interface SidebarProps {
  profile: UserProfile | null;
  mapMode: 'constellation' | 'earth';
  setMapMode: (mode: 'constellation' | 'earth') => void;
  onMyProfileClick: () => void;
  onBondsClick: () => void;
  onNotificationsClick: () => void;
  onSettingsClick: () => void;
  onThoughtsClick: () => void;
  onPinMemoryClick: () => void;
  isAddingMemory?: boolean;
  onCreateClick: () => void;
  onSignOut: () => void;
  onSignInClick: () => void;
  isVisible?: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({ 
  profile, 
  mapMode, 
  setMapMode, 
  onMyProfileClick, 
  onBondsClick,
  onNotificationsClick,
  onSettingsClick,
  onThoughtsClick,
  onPinMemoryClick,
  isAddingMemory,
  onCreateClick,
  onSignOut,
  onSignInClick,
  isVisible = true
}) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const hexColor = profile ? getHexColor(profile.color) : '#ffffff';

  return (
    <motion.div 
      initial={false}
      animate={{ 
        width: sidebarOpen ? 260 : 72,
        opacity: isVisible ? 1 : 0.4,
        x: isVisible ? 0 : -20
      }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className={`hidden md:flex h-full glass-dark border-r border-white/5 flex-col z-40 shrink-0 relative focus-transition`}
    >
      {/* Toggle Button */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="absolute -right-3 top-20 w-6 h-6 rounded-full bg-[#1a1a2e] border border-white/10 flex items-center justify-center text-white/60 hover:text-white transition-colors z-50 shadow-lg"
      >
        {sidebarOpen ? <ChevronLeft size={14} /> : <ChevronRight size={14} />}
      </button>

      {/* Profile Section */}
      <div className="p-4 flex flex-col items-center">
        <motion.div 
          layout
          className="relative group cursor-pointer"
          onClick={onMyProfileClick}
        >
          <div 
            className={`rounded-2xl flex items-center justify-center transition-all duration-500 overflow-hidden ${sidebarOpen ? 'w-16 h-16' : 'w-10 h-10'}`}
            style={{
              backgroundColor: profile ? `${hexColor}20` : 'rgba(255,255,255,0.05)',
              border: `1px solid ${profile ? `${hexColor}40` : 'rgba(255,255,255,0.1)'}`,
              boxShadow: profile ? `0 0 20px ${hexColor}20` : 'none'
            }}
          >
            {profile?.avatarUrl ? (
              <img src={profile.avatarUrl} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            ) : (
              <UserIcon className={`${sidebarOpen ? 'w-7 h-7' : 'w-5 h-5'} ${profile ? 'text-white' : 'text-white/20'}`} />
            )}
          </div>
          {profile && (
            <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-green-500 border-2 border-[#050510] rounded-full" />
          )}
        </motion.div>
        
        <AnimatePresence mode="wait">
          {sidebarOpen && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="mt-4 text-center w-full"
            >
              {profile ? (
                <>
                  <h2 className="text-base font-semibold text-white truncate px-2">{profile.nickname || profile.username}</h2>
                  <p className="text-[10px] text-white/40 font-mono mt-0.5">@{profile.username}</p>
                </>
              ) : (
                <div className="py-2">
                  <h2 className="text-xs font-medium text-white/60 uppercase tracking-widest">Lost Star</h2>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Navigation */}
      <div className="flex-1 px-2 flex flex-col gap-1 overflow-y-auto custom-scrollbar">
        <div className="mb-4">
          <p className={`text-[9px] font-bold text-white/20 uppercase tracking-[0.2em] px-4 mb-2 ${!sidebarOpen && 'text-center'}`}>
            {sidebarOpen ? 'Visions' : '•••'}
          </p>
          <SidebarItem 
            icon={<Share2 size={18} />} 
            label="The Sky" 
            active={mapMode === 'constellation'} 
            onClick={() => setMapMode('constellation')} 
            collapsed={!sidebarOpen}
          />
          <SidebarItem 
            icon={<Globe size={18} />} 
            label="The World" 
            active={mapMode === 'earth'} 
            onClick={() => setMapMode('earth')} 
            collapsed={!sidebarOpen}
          />
        </div>

        {profile && (
          <div>
            <p className={`text-[9px] font-bold text-white/20 uppercase tracking-[0.2em] px-4 mb-2 ${!sidebarOpen && 'text-center'}`}>
              {sidebarOpen ? 'Inner Circle' : '•••'}
            </p>
            <SidebarItem 
              icon={<UserIcon size={18} />} 
              label="My Star" 
              onClick={onMyProfileClick} 
              collapsed={!sidebarOpen}
            />
            <SidebarItem 
              icon={<Users size={18} />} 
              label="Kindreds" 
              onClick={onBondsClick} 
              collapsed={!sidebarOpen}
            />
            <SidebarItem 
              icon={<Bell size={18} />} 
              label="Signals" 
              onClick={onNotificationsClick} 
              collapsed={!sidebarOpen}
            />
            <SidebarItem 
              icon={<Settings size={18} />} 
              label="Settings" 
              onClick={onSettingsClick} 
              collapsed={!sidebarOpen}
            />
          </div>
        )}
      </div>

      {/* Floating Action Buttons (Desktop Only) */}
      <div 
        className="absolute left-full ml-3 top-1/2 -translate-y-1/2 flex flex-col gap-3 z-50"
        style={{ pointerEvents: 'auto' }}
      >
        <motion.button
          whileHover={{ scale: 1.1, x: 5 }}
          whileTap={{ scale: 0.95 }}
          onClick={onCreateClick}
          className="w-12 h-12 rounded-2xl bg-purple-600 text-white flex items-center justify-center shadow-[0_0_20px_rgba(168,85,247,0.4)] border border-purple-400/30 hover:bg-purple-500 transition-colors"
          title="Maglikha"
        >
          <Plus size={24} />
        </motion.button>
        <motion.button
          whileHover={{ scale: 1.1, x: 5 }}
          whileTap={{ scale: 0.95 }}
          onClick={onThoughtsClick}
          className="w-12 h-12 rounded-2xl glass-dark text-white flex items-center justify-center shadow-xl border border-white/10 hover:bg-white/10 transition-colors"
          title="Bulong"
        >
          <MessageCircle size={24} />
        </motion.button>
        <motion.button
          whileHover={{ scale: 1.1, x: 5 }}
          whileTap={{ scale: 0.95 }}
          onClick={onPinMemoryClick}
          className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-xl border transition-all duration-300 ${
            isAddingMemory 
              ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30 shadow-[0_0_15px_rgba(234,179,8,0.3)]' 
              : 'glass-dark text-yellow-400 border-white/10 hover:bg-white/10'
          }`}
          title="Bakás"
        >
          <MapPin size={24} />
        </motion.button>
      </div>

      {/* Bottom Actions */}
      <div className="p-2 border-t border-white/5 flex flex-col gap-1">
        <SidebarItem 
          icon={<HelpCircle size={18} />} 
          label="How it Works" 
          onClick={() => window.dispatchEvent(new CustomEvent('open-guide'))} 
          collapsed={!sidebarOpen}
        />
        {profile ? (
          <SidebarItem 
            icon={<LogOut size={18} />} 
            label="Logout" 
            onClick={onSignOut} 
            collapsed={!sidebarOpen}
            variant="danger"
          />
        ) : (
          <SidebarItem 
            icon={<LogIn size={18} />} 
            label="Sign In" 
            onClick={onSignInClick} 
            collapsed={!sidebarOpen}
            variant="primary"
          />
        )}
      </div>
    </motion.div>
  );
};

interface SidebarItemProps {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  onClick: () => void;
  collapsed: boolean;
  variant?: 'default' | 'primary' | 'danger';
}

const SidebarItem: React.FC<SidebarItemProps> = ({ icon, label, active, onClick, collapsed, variant = 'default' }) => {
  const variants = {
    default: active ? 'bg-white/10 text-white border-white/10' : 'text-white/40 hover:text-white hover:bg-white/5 border-transparent',
    primary: 'text-purple-400 hover:text-purple-300 hover:bg-purple-500/10 border-transparent',
    danger: 'text-red-400 hover:text-red-300 hover:bg-red-500/10 border-transparent'
  };

  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-4 p-3 rounded-2xl transition-all duration-300 border group relative ${variants[variant]}`}
      title={collapsed ? label : undefined}
    >
      <div className={`shrink-0 transition-transform duration-300 group-hover:scale-110 group-active:scale-95`}>
        {icon}
      </div>
      {!collapsed && (
        <span className="font-medium text-sm truncate">{label}</span>
      )}
      {active && !collapsed && (
        <motion.div 
          layoutId="active-pill"
          className="absolute right-3 w-1.5 h-1.5 rounded-full bg-white shadow-[0_0_10px_white]"
        />
      )}
    </button>
  );
};
