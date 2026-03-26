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
  onCreateClick,
  onSignOut,
  onSignInClick,
  isVisible = true
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const sidebarOpen = isHovered;

  const hexColor = profile ? getHexColor(profile.color) : '#ffffff';

  return (
    <motion.div 
      initial={false}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      animate={{ 
        width: sidebarOpen ? 260 : 72,
        opacity: isVisible ? 1 : 0.4,
        x: isVisible ? 0 : -20
      }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className={`hidden md:flex h-full glass-dark border-r border-white/5 flex-col z-40 shrink-0 relative focus-transition`}
    >
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
            {sidebarOpen ? 'Perspective' : '•••'}
          </p>
          <SidebarItem 
            icon={<Share2 size={18} />} 
            label="Sky View" 
            active={mapMode === 'constellation'} 
            onClick={() => setMapMode('constellation')} 
            collapsed={!sidebarOpen}
          />
          <SidebarItem 
            icon={<Globe size={18} />} 
            label="Ground View" 
            active={mapMode === 'earth'} 
            onClick={() => setMapMode('earth')} 
            collapsed={!sidebarOpen}
          />
        </div>

        <div className="mb-4">
          <p className={`text-[9px] font-bold text-white/20 uppercase tracking-[0.2em] px-4 mb-2 ${!sidebarOpen && 'text-center'}`}>
            {sidebarOpen ? 'Explore' : '•••'}
          </p>
          <SidebarItem 
            icon={<Plus size={18} />} 
            label="Create" 
            onClick={onCreateClick} 
            collapsed={!sidebarOpen}
            variant="primary"
          />
          <SidebarItem 
            icon={<MessageCircle size={18} />} 
            label="Whispers" 
            onClick={onThoughtsClick} 
            collapsed={!sidebarOpen}
          />
        </div>

        {profile && (
          <div>
            <p className={`text-[9px] font-bold text-white/20 uppercase tracking-[0.2em] px-4 mb-2 ${!sidebarOpen && 'text-center'}`}>
              {sidebarOpen ? 'Personal' : '•••'}
            </p>
            <SidebarItem 
              icon={<UserIcon size={18} />} 
              label="My Profile" 
              onClick={onMyProfileClick} 
              collapsed={!sidebarOpen}
            />
            <SidebarItem 
              icon={<Users size={18} />} 
              label="My Bonds" 
              onClick={onBondsClick} 
              collapsed={!sidebarOpen}
            />
            <SidebarItem 
              icon={<Bell size={18} />} 
              label="Notifications" 
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
