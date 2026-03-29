import React, { useState } from 'react';
import { Globe, User as UserIcon, MessageSquare, Star, Users, Settings as TakdaIcon } from 'lucide-react';
import { UserProfile, useAuth } from '../contexts/AuthContext';
import { motion, AnimatePresence } from 'motion/react';
import { AppTab } from '../App';

interface SidebarProps {
  profile: UserProfile | null;
  mapMode: 'constellation' | 'earth';
  onMyProfileClick: () => void;
  onNotificationsClick: () => void;
  onPrivateSkyClick: () => void;
  onBondsClick: () => void;
  onTakdaClick: () => void;
  activeTab: AppTab;
  onTabChange: (tab: AppTab) => void;
  isVisible?: boolean;
  unreadSignalsCount?: number;
  unreadUgnayanCount?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({ 
  profile, 
  mapMode, 
  onMyProfileClick, 
  onNotificationsClick,
  onPrivateSkyClick,
  onBondsClick,
  onTakdaClick,
  activeTab,
  onTabChange,
  isVisible = true,
  unreadSignalsCount = 0,
  unreadUgnayanCount = 0,
}) => {
  if (!isVisible) return null;

  return (
    <div className="hidden md:block fixed bottom-8 left-1/2 -translate-x-1/2 z-[100]">
      <motion.div 
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-full px-8 py-3 flex items-center gap-6 shadow-2xl"
      >
        {/* Sky/Map Item */}
        <DockItem 
          icon={<Globe size={20} />} 
          label={mapMode === 'constellation' ? 'MUNDO' : 'SKY'} 
          onClick={() => {
            if (mapMode === 'constellation') {
              onTabChange('mundo');
            } else {
              onTabChange('kalawakan');
            }
          }}
          active={activeTab === 'mundo' || activeTab === 'kalawakan'}
        />

        {/* Buklod Item */}
        <DockItem 
          icon={<Star size={20} />} 
          label="BUKLOD" 
          onClick={onPrivateSkyClick}
          active={activeTab === 'buklod'}
        />

        {/* Ugnayan Item */}
        <DockItem 
          icon={
            <div className="relative">
              <Users size={20} />
              {unreadUgnayanCount > 0 && (
                <motion.span 
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-purple-600 rounded-full flex items-center justify-center text-[7px] text-white font-black shadow-[0_0_10px_rgba(168,85,247,0.8)] border border-white/20"
                >
                  {unreadUgnayanCount > 9 ? '9+' : unreadUgnayanCount}
                </motion.span>
              )}
            </div>
          } 
          label="UGNAYAN" 
          onClick={onBondsClick}
          active={false}
        />

        {/* Siklab Item */}
        <DockItem 
          icon={
            <div className="relative">
              <MessageSquare size={20} />
              {unreadSignalsCount > 0 && (
                <motion.span 
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-purple-600 rounded-full flex items-center justify-center text-[7px] text-white font-black shadow-[0_0_10px_rgba(168,85,247,0.8)] border border-white/20"
                >
                  {unreadSignalsCount > 9 ? '9+' : unreadSignalsCount}
                </motion.span>
              )}
            </div>
          } 
          label="SIKLAB" 
          onClick={onNotificationsClick}
          active={false}
        />

        {/* Takda Item */}
        <DockItem 
          icon={<TakdaIcon size={20} />} 
          label="TAKDA" 
          onClick={onTakdaClick}
          active={false}
        />

        {/* Profile Item */}
        <DockItem 
          icon={
            <div className="relative">
              {profile?.avatarUrl ? (
                <img src={profile.avatarUrl} alt="" className="w-5 h-5 rounded-full object-cover border border-white/20" referrerPolicy="no-referrer" />
              ) : (
                <UserIcon size={20} />
              )}
            </div>
          } 
          label="PROFILE" 
          onClick={onMyProfileClick}
          active={false}
        />
      </motion.div>
    </div>
  );
};

interface DockItemProps {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  active?: boolean;
}

const DockItem: React.FC<DockItemProps> = ({ icon, label, onClick, active }) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div className="relative flex flex-col items-center">
      <AnimatePresence>
        {isHovered && (
          <motion.span
            initial={{ opacity: 0, y: 0 }}
            animate={{ opacity: 1, y: -10 }}
            exit={{ opacity: 0, y: 0 }}
            className="absolute bottom-full mb-2 text-[9px] font-bold text-white/60 tracking-[0.2em] uppercase whitespace-nowrap"
          >
            {label}
          </motion.span>
        )}
      </AnimatePresence>

      <motion.button
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={onClick}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        className={`relative p-2 rounded-full transition-all duration-300 flex items-center justify-center ${
          active ? 'text-white' : 'text-white/40 hover:text-white hover:brightness-125'
        }`}
      >
        {icon}
        {active && (
          <motion.div 
            layoutId="active-dot"
            className="absolute -bottom-1 w-1 h-1 rounded-full bg-white shadow-[0_0_8px_white]"
          />
        )}
      </motion.button>
    </div>
  );
};
