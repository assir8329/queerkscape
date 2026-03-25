import React, { useState, useEffect } from 'react';
import { Share2, Globe, User as UserIcon, Users, Bell, Settings, LogOut, MapPin, Menu, LogIn } from 'lucide-react';
import { UserProfile } from '../contexts/AuthContext';
import { getHexColor } from '../lib/colors';

interface SidebarProps {
  profile: UserProfile | null;
  mapMode: 'constellation' | 'earth';
  setMapMode: (mode: 'constellation' | 'earth') => void;
  onMyProfileClick: () => void;
  onBondsClick: () => void;
  onNotificationsClick: () => void;
  onSettingsClick: () => void;
  onSignOut: () => void;
  onSignInClick: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ 
  profile, 
  mapMode, 
  setMapMode, 
  onMyProfileClick, 
  onBondsClick,
  onNotificationsClick,
  onSettingsClick,
  onSignOut,
  onSignInClick
}) => {
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    const saved = localStorage.getItem("sidebarOpen");
    return saved !== null ? saved === "true" : false;
  });

  useEffect(() => {
    localStorage.setItem("sidebarOpen", String(sidebarOpen));
  }, [sidebarOpen]);

  const hexColor = profile ? getHexColor(profile.color) : '#ffffff';

  return (
    <div className={`hidden md:flex ${sidebarOpen ? 'w-[250px]' : 'w-[72px]'} h-full bg-black/40 backdrop-blur-xl border-r border-white/10 flex-col z-40 shrink-0 transition-all duration-300`}>
      {/* Top Section */}
      <div className={`p-4 border-b border-white/10 flex flex-col items-center relative transition-all duration-300 ${sidebarOpen ? 'text-center' : ''}`}>
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className={`absolute top-4 ${sidebarOpen ? 'right-4' : 'right-0 left-0 mx-auto w-fit'} text-white/50 hover:text-white transition-colors z-10`}
          title={sidebarOpen ? "Collapse Sidebar" : "Expand Sidebar"}
        >
          <Menu className="w-5 h-5" />
        </button>

        <div 
          className={`rounded-full flex items-center justify-center transition-all duration-300 ${sidebarOpen ? 'w-16 h-16 mb-4 mt-6' : 'w-10 h-10 mt-10'}`}
          style={{
            backgroundColor: profile ? hexColor : 'rgba(255,255,255,0.1)',
            boxShadow: profile ? `0 0 10px ${hexColor}80` : 'none'
          }}
        >
          <UserIcon className={`${sidebarOpen ? 'w-8 h-8' : 'w-5 h-5'} ${profile ? 'text-white' : 'text-white/40'}`} />
        </div>
        
        {sidebarOpen && profile && (
          <>
            <h2 className="text-xl font-bold text-white mb-1 truncate w-full px-2">{profile.nickname || profile.username}</h2>
            <div className="text-xs text-white/40 mb-1 truncate w-full px-2">@{profile.username}</div>
            <div className="flex items-center gap-1 text-xs text-white/60">
              <div className="w-2 h-2 rounded-full bg-green-500 shrink-0" />
              <span>Active Star</span>
            </div>
            {profile.location && !profile.hideLocation && (
              <div className="flex items-center gap-1 text-xs text-white/50 mt-2 truncate w-full justify-center px-2">
                <MapPin className="w-3 h-3 shrink-0" />
                <span className="truncate">{profile.location.city}{profile.location.region ? `, ${profile.location.region}` : ''}</span>
              </div>
            )}
          </>
        )}

        {sidebarOpen && !profile && (
          <div className="mt-4">
            <h2 className="text-lg font-bold text-white mb-1">Lost Star</h2>
            <p className="text-[10px] text-white/40 uppercase tracking-widest">Observing the Scape</p>
          </div>
        )}
      </div>

      {/* Navigation Items */}
      <div className="flex-1 py-6 px-3 flex flex-col gap-2 overflow-y-auto custom-scrollbar overflow-x-hidden">
        <button
          onClick={() => setMapMode('constellation')}
          title={!sidebarOpen ? "Sky View" : undefined}
          className={`w-full flex items-center ${sidebarOpen ? 'gap-3 px-4' : 'justify-center px-0'} py-3 rounded-xl transition-all ${mapMode === 'constellation' ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' : 'text-white/60 hover:text-white hover:bg-white/5'}`}
        >
          <Share2 className="w-5 h-5 shrink-0" />
          {sidebarOpen && <span className="font-medium truncate">Sky View</span>}
        </button>
        
        <button
          onClick={() => setMapMode('earth')}
          title={!sidebarOpen ? "Ground View" : undefined}
          className={`w-full flex items-center ${sidebarOpen ? 'gap-3 px-4' : 'justify-center px-0'} py-3 rounded-xl transition-all ${mapMode === 'earth' ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30' : 'text-white/60 hover:text-white hover:bg-white/5'}`}
        >
          <Globe className="w-5 h-5 shrink-0" />
          {sidebarOpen && <span className="font-medium truncate">Ground View</span>}
        </button>

        <div className="h-px bg-white/10 my-2 mx-2 shrink-0" />

        {profile && (
          <>
            <button
              onClick={onMyProfileClick}
              title={!sidebarOpen ? "My Profile" : undefined}
              className={`w-full flex items-center ${sidebarOpen ? 'gap-3 px-4' : 'justify-center px-0'} py-3 rounded-xl text-white/60 hover:text-white hover:bg-white/5 transition-all`}
            >
              <UserIcon className="w-5 h-5 shrink-0" />
              {sidebarOpen && <span className="font-medium truncate">My Profile</span>}
            </button>

            <button
              onClick={onBondsClick}
              title={!sidebarOpen ? "My Bonds" : undefined}
              className={`w-full flex items-center ${sidebarOpen ? 'gap-3 px-4' : 'justify-center px-0'} py-3 rounded-xl text-white/60 hover:text-white hover:bg-white/5 transition-all`}
            >
              <Users className="w-5 h-5 shrink-0" />
              {sidebarOpen && <span className="font-medium truncate">My Bonds</span>}
            </button>

            <button
              onClick={onNotificationsClick}
              title={!sidebarOpen ? "Notifications" : undefined}
              className={`w-full flex items-center ${sidebarOpen ? 'gap-3 px-4' : 'justify-center px-0'} py-3 rounded-xl text-white/60 hover:text-white hover:bg-white/5 transition-all`}
            >
              <Bell className="w-5 h-5 shrink-0" />
              {sidebarOpen && <span className="font-medium truncate">Notifications</span>}
            </button>

            <button
              onClick={onSettingsClick}
              title={!sidebarOpen ? "Settings" : undefined}
              className={`w-full flex items-center ${sidebarOpen ? 'gap-3 px-4' : 'justify-center px-0'} py-3 rounded-xl text-white/60 hover:text-white hover:bg-white/5 transition-all`}
            >
              <Settings className="w-5 h-5 shrink-0" />
              {sidebarOpen && <span className="font-medium truncate">Settings</span>}
            </button>
          </>
        )}
      </div>

      {/* Bottom Section */}
      <div className="p-3 border-t border-white/10">
        {profile ? (
          <button
            onClick={onSignOut}
            title={!sidebarOpen ? "Logout" : undefined}
            className={`w-full flex items-center ${sidebarOpen ? 'justify-center gap-2 px-4' : 'justify-center px-0'} py-3 rounded-xl text-red-400 hover:text-red-300 hover:bg-red-400/10 transition-all font-medium`}
          >
            <LogOut className="w-5 h-5 shrink-0" />
            {sidebarOpen && <span className="truncate">Logout</span>}
          </button>
        ) : (
          <button
            onClick={onSignInClick}
            title={!sidebarOpen ? "Sign In" : undefined}
            className={`w-full flex items-center ${sidebarOpen ? 'justify-center gap-2 px-4' : 'justify-center px-0'} py-3 rounded-xl text-purple-400 hover:text-purple-300 hover:bg-purple-400/10 transition-all font-medium`}
          >
            <LogIn className="w-5 h-5 shrink-0" />
            {sidebarOpen && <span className="truncate">Sign In</span>}
          </button>
        )}
      </div>
    </div>
  );
};
