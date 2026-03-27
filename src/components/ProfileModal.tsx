import React, { useState, useEffect } from 'react';
import { useAuth, UserProfile } from '../contexts/AuthContext';
import { motion, AnimatePresence } from 'motion/react';
import { X, Send, Flag, ShieldAlert, Edit2, Check, MessageCircle, Star, MapPin, Users, Bell, Settings, LogOut } from 'lucide-react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { VIBES, getHexColor } from '../lib/colors';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';

import { ModalPortal } from './ModalPortal';

const STANDARD_OPTIONS = [
  "Friendship",
  "Something casual",
  "Serious relationship",
  "Just exploring",
  "New connections",
  "Conversations",
  "Community",
  "Slow connections",
  "See where it goes"
];

const LOOKING_FOR_OPTIONS = [...STANDARD_OPTIONS, "custom"];

interface ProfileModalProps {
  user: UserProfile | null;
  onClose: () => void;
  onSettingsClick?: () => void;
  onChatClick?: (user: UserProfile) => void;
  onSignOut?: () => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({ 
  user, 
  onClose,
  onSettingsClick,
  onChatClick,
  onSignOut
}) => {
  const { profile, updateProfile } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<Partial<UserProfile>>({});
  const [reportReason, setReportReason] = useState('');
  const [reportCategory, setReportCategory] = useState('spam');
  const [isReporting, setIsReporting] = useState(false);
  const [connectionCount, setConnectionCount] = useState<number | null>(null);
  const [constellationName, setConstellationName] = useState<string | null>(null);
  const [isLocating, setIsLocating] = useState(false);

  const handleUpdateLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser');
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=10`);
          const data = await response.json();
          
          if (data && data.address) {
            const newLocation = {
              city: data.address.city || data.address.town || data.address.village || data.address.county || 'Unknown',
              region: data.address.state || data.address.region || '',
              country: data.address.country || '',
              lat: latitude,
              lng: longitude,
            };
            setEditData(prev => ({ ...prev, location: newLocation }));
          }
        } catch (error) {
          console.error("Error fetching location details:", error);
          alert("Could not determine city from coordinates. Please try again.");
        } finally {
          setIsLocating(false);
        }
      },
      (error) => {
        console.error("Geolocation error:", error);
        alert("Could not get your location. Please check your browser permissions.");
        setIsLocating(false);
      }
    );
  };

  useEffect(() => {
    if (!user) return;
    
    // Fetch connection count
    const fetchConnections = async () => {
      try {
        const { getDocs, query, collection, where } = await import('firebase/firestore');
        const q = query(collection(db, 'connections'), where('users', 'array-contains', user.uid));
        const snap = await getDocs(q);
        setConnectionCount(snap.size);
      } catch (err) {
        handleFirestoreError(err, OperationType.GET, 'connections');
      }
    };
    fetchConnections();

    // Fetch constellation name if they have one
    const fetchConstellation = async () => {
      if (!user.constellationId) return;
      try {
        const { getDoc, doc } = await import('firebase/firestore');
        const docSnap = await getDoc(doc(db, 'constellations', user.constellationId));
        if (docSnap.exists()) {
          setConstellationName(docSnap.data().name);
        }
      } catch (err) {
        handleFirestoreError(err, OperationType.GET, `constellations/${user.constellationId}`);
      }
    };
    fetchConstellation();
  }, [user]);


  if (!user) return null;

  const isMe = profile ? user.uid === profile.uid : false;

  const isUserActive = (lastActive: any) => {
    if (!lastActive?.toMillis) return false;
    const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
    return lastActive.toMillis() > fiveMinutesAgo;
  };


  // ... existing code ...


  const handleSave = async () => {
    const updates = { ...editData };
    if (updates.username && updates.username !== user.username) {
      if (user.usernameChanged) {
        alert("You have already changed your username once.");
        return;
      }
      if (updates.username.length < 3) {
        alert("Username must be at least 3 characters.");
        return;
      }
      updates.usernameChanged = true;
    } else {
      delete updates.username;
    }
    await updateProfile(updates);
    setIsEditing(false);
  };


  const handleReport = async () => {
    if (!reportReason.trim()) return;
    try {
      await addDoc(collection(db, 'reports'), {
        reportedUid: user.uid,
        reportedByUid: profile.uid,
        reason: reportReason,
        category: reportCategory,
        createdAt: serverTimestamp(),
      });
      setIsReporting(false);
      setReportReason('');
      alert('Report submitted. Thank you.');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'reports');
    }
  };

  const handleBlock = async () => {
    if (window.confirm('Are you sure you want to block this user? They will disappear from your map.')) {
      await updateProfile({
        blockedUsers: [...(profile.blockedUsers || []), user.uid],
      });
      onClose();
    }
  };

  const toggleFavorite = async () => {
    const isFavorited = profile.favorites?.includes(user.uid);
    const newFavorites = isFavorited
      ? (profile.favorites || []).filter(id => id !== user.uid)
      : [...(profile.favorites || []), user.uid];
    
    await updateProfile({ favorites: newFavorites });
  };

  const hexColor = getHexColor(user.color);
  const active = isUserActive(user.lastActive);

  // Convert hex to rgba for shadow
  const hexToRgb = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` : '255, 255, 255';
  };
  const rgbColor = hexToRgb(hexColor);

  return (
    <AnimatePresence>
      <ModalPortal zIndex={1000}>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={onClose}
        >
        <motion.div
          initial={{ scale: 0.9, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.9, y: 20 }}
          className="bg-[#1a1a2e] border border-white/10 rounded-2xl p-4 w-full max-w-md shadow-2xl relative overflow-hidden flex flex-col max-h-[85vh] md:max-h-[90vh]"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Top glow */}
          <div 
            className="absolute top-0 left-0 right-0 h-1" 
            style={{ 
              backgroundColor: hexColor,
              boxShadow: `0 0 15px rgba(${rgbColor}, 0.8)`
            }} 
          />
          
          <button 
            onClick={onClose} 
            className="absolute top-0 right-0 w-11 h-11 flex items-center justify-center text-white/40 hover:text-white transition-all z-50"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex flex-col h-full overflow-hidden">
            {/* Header Section */}
            <div className="flex items-center gap-4 mb-4 shrink-0 relative">
              <div 
                className={`relative w-14 h-14 rounded-full shrink-0 ${!active ? 'opacity-80' : ''}`}
                style={{ 
                  backgroundColor: hexColor,
                  boxShadow: active ? `0 0 15px rgba(${rgbColor}, 0.3)` : 'none'
                }}
              >
                {active && <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-green-500 rounded-full border-2 border-[#1a1a2e]" title="Active Star" />}
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h2 className="text-base font-semibold text-white tracking-tight truncate">
                        {user.nickname || user.username}
                      </h2>
                      <span className="text-sm shrink-0">✨</span>
                      {!isEditing && (
                        <button 
                          onClick={profile ? toggleFavorite : undefined} 
                          className={`text-white/30 hover:text-yellow-400 transition-colors p-1.5 shrink-0 ${!profile ? 'opacity-20 cursor-not-allowed' : ''}`}
                          title={!profile ? "Login to favorite" : ""}
                        >
                          <Star className={`w-4 h-4 ${profile?.favorites?.includes(user.uid) ? 'fill-yellow-400 text-yellow-400' : ''}`} />
                        </button>
                      )}
                    </div>
                    <div className="text-[10px] text-white/40 font-medium tracking-wide uppercase">@{user.username}</div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1 text-[10px] font-medium">
                  {user.location && !user.hideLocation && (
                    <div className="flex items-center gap-1 text-white/60">
                      <MapPin className="w-2.5 h-2.5 text-white/30" />
                      <span>{user.location.city}</span>
                    </div>
                  )}
                  {user.relationshipStatus && (
                    <div className="flex items-center gap-1 text-white/60">
                      <span className="text-white/30">💞</span>
                      <span className="capitalize">{user.relationshipStatus}</span>
                    </div>
                  )}
                  {user.pronouns && (
                    <div className="flex items-center gap-1 text-white/60">
                      <span className="text-white/30">👤</span>
                      <span>{user.pronouns}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto pr-1 custom-scrollbar space-y-4 pb-2">
              {isEditing ? (
                /* EDIT MODE */
                <div className="space-y-6">
                  {/* A. Basic Info */}
                  <section className="space-y-6">
                    <div className="text-[10px] uppercase tracking-[0.2em] text-white/20 font-black px-1">Basic Info</div>
                    <div className="space-y-4">
                      <div className="space-y-1.5">
                        <label className="text-[10px] text-white/30 uppercase tracking-wider font-bold ml-1">Nickname</label>
                        <input
                          type="text"
                          value={editData.nickname ?? user.nickname ?? user.username}
                          onChange={(e) => setEditData({ ...editData, nickname: e.target.value })}
                          className="w-full bg-white/[0.03] border border-transparent rounded-xl px-4 py-3 text-white focus:outline-none focus:bg-white/[0.06] focus:border-purple-500/30 transition-all"
                          maxLength={30}
                        />
                      </div>
                      
                      {!user.usernameChanged && (
                        <div className="space-y-1.5">
                          <label className="text-[10px] text-white/30 uppercase tracking-wider font-bold ml-1">Username (One-time change)</label>
                          <div className="flex items-center gap-2 bg-white/[0.03] border border-transparent rounded-xl px-4 py-3 focus-within:border-purple-500/30 focus-within:bg-white/[0.06] transition-all">
                            <span className="text-white/20 font-bold">@</span>
                            <input
                              type="text"
                              value={editData.username ?? user.username}
                              onChange={(e) => setEditData({ ...editData, username: e.target.value.replace(/[^a-zA-Z0-9_]/g, '') })}
                              className="bg-transparent border-none p-0 text-white focus:outline-none w-full"
                              maxLength={30}
                            />
                          </div>
                        </div>
                      )}

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-[10px] text-white/30 uppercase tracking-wider font-bold ml-1">Pronouns</label>
                          <input
                            type="text"
                            value={editData.pronouns ?? user.pronouns ?? ''}
                            onChange={(e) => setEditData({ ...editData, pronouns: e.target.value })}
                            className="w-full bg-white/[0.03] border border-transparent rounded-xl px-4 py-3 text-white focus:outline-none focus:bg-white/[0.06] focus:border-purple-500/30 transition-all"
                            placeholder="they/them"
                            maxLength={20}
                          />
                        </div>
                        <div className="flex flex-col justify-end pb-3">
                          <label className="flex items-center gap-3 cursor-pointer group">
                            <div className="relative flex items-center">
                              <input
                                type="checkbox"
                                checked={editData.hideLocation ?? user.hideLocation ?? false}
                                onChange={(e) => setEditData({ ...editData, hideLocation: e.target.checked })}
                                className="w-4 h-4 rounded border-white/10 bg-white/5 text-purple-500 focus:ring-purple-500/50 focus:ring-offset-0 transition-all"
                              />
                            </div>
                            <span className="text-[10px] text-white/30 group-hover:text-white/50 transition-colors uppercase tracking-widest font-bold">Hide Location</span>
                          </label>
                        </div>
                      </div>

                      {/* Location Update */}
                      <div className="space-y-1.5">
                        <label className="text-[10px] text-white/30 uppercase tracking-wider font-bold ml-1">Location</label>
                        <div className="flex items-center justify-between bg-white/[0.03] rounded-xl p-3 border border-transparent focus-within:border-purple-500/30 focus-within:bg-white/[0.06] transition-all">
                          <div className="flex flex-col">
                            <span className="text-sm text-white font-medium">
                              {(editData.location ?? user.location)?.city 
                                ? `${(editData.location ?? user.location)?.city}, ${(editData.location ?? user.location)?.country}`
                                : 'Unknown'}
                            </span>
                          </div>
                          <button
                            onClick={handleUpdateLocation}
                            disabled={isLocating}
                            className="px-3 py-1.5 bg-purple-500/20 hover:bg-purple-500/40 disabled:opacity-50 text-purple-300 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5"
                          >
                            <MapPin className="w-3 h-3" />
                            {isLocating ? 'Locating...' : 'Update'}
                          </button>
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] text-white/30 uppercase tracking-wider font-bold ml-1">Sambit</label>
                        <textarea
                          value={editData.signal ?? user.signal}
                          onChange={(e) => setEditData({ ...editData, signal: e.target.value })}
                          className="w-full bg-white/[0.03] border border-transparent rounded-xl px-4 py-3 text-white focus:outline-none focus:bg-white/[0.06] focus:border-purple-500/30 transition-all resize-none h-24 text-sm leading-relaxed"
                          maxLength={100}
                          placeholder="What's on your mind?"
                        />
                      </div>
                    </div>
                  </section>

                  {/* B. Identity */}
                  <section className="space-y-6">
                    <div className="text-[10px] uppercase tracking-[0.2em] text-white/20 font-black px-1">Identity</div>
                    <div className="grid grid-cols-1 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[10px] text-white/30 uppercase tracking-wider font-bold ml-1">Gender Identity</label>
                        <select
                          value={editData.identity ?? user.identity ?? ''}
                          onChange={(e) => setEditData({ ...editData, identity: e.target.value })}
                          className="w-full bg-white/[0.03] border border-transparent rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:bg-white/[0.06] focus:border-purple-500/30 transition-all appearance-none cursor-pointer"
                        >
                          <option value="" className="bg-[#1a1a2e]">Select Identity</option>
                          <option value="Cis-Woman" className="bg-[#1a1a2e]">Cis-Woman</option>
                          <option value="Trans-Woman" className="bg-[#1a1a2e]">Trans-Woman</option>
                          <option value="Non-Binary" className="bg-[#1a1a2e]">Non-Binary</option>
                          <option value="Genderfluid" className="bg-[#1a1a2e]">Genderfluid</option>
                          <option value="Genderqueer" className="bg-[#1a1a2e]">Genderqueer</option>
                          <option value="Agender" className="bg-[#1a1a2e]">Agender</option>
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] text-white/30 uppercase tracking-wider font-bold ml-1">Sexual Role</label>
                        <select
                          value={editData.sexualRole ?? user.sexualRole ?? ''}
                          onChange={(e) => setEditData({ ...editData, sexualRole: e.target.value })}
                          className="w-full bg-white/[0.03] border border-transparent rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:bg-white/[0.06] focus:border-purple-500/30 transition-all appearance-none cursor-pointer"
                        >
                          <option value="" className="bg-[#1a1a2e]">Select Sexual Role</option>
                          <option value="Stone Top" className="bg-[#1a1a2e]">Stone Top</option>
                          <option value="Pillow Princess" className="bg-[#1a1a2e]">Pillow Princess</option>
                          <option value="Switch/Versa" className="bg-[#1a1a2e]">Switch/Versa</option>
                          <option value="Switch (top leaning)" className="bg-[#1a1a2e]">Switch (top leaning)</option>
                          <option value="Switch (bottom leaning)" className="bg-[#1a1a2e]">Switch (bottom leaning)</option>
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] text-white/30 uppercase tracking-wider font-bold ml-1">Relationship Status</label>
                        <select
                          value={editData.relationshipStatus ?? user.relationshipStatus ?? ''}
                          onChange={(e) => setEditData({ ...editData, relationshipStatus: e.target.value })}
                          className="w-full bg-white/[0.03] border border-transparent rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:bg-white/[0.06] focus:border-purple-500/30 transition-all appearance-none cursor-pointer"
                        >
                          <option value="" className="bg-[#1a1a2e]">Select Relationship Status</option>
                          <option value="single" className="bg-[#1a1a2e]">Single</option>
                          <option value="taken" className="bg-[#1a1a2e]">Taken</option>
                          <option value="in a situationship" className="bg-[#1a1a2e]">In a situationship</option>
                          <option value="non-monogamous" className="bg-[#1a1a2e]">Non-monogamous</option>
                        </select>
                      </div>
                    </div>
                  </section>

                  {/* C. Personality */}
                  <section className="space-y-6">
                    <div className="text-[10px] uppercase tracking-[0.2em] text-white/20 font-black px-1">Personality</div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[10px] text-white/30 uppercase tracking-wider font-bold ml-1">Zodiac</label>
                        <select
                          value={editData.zodiacSign ?? user.zodiacSign ?? ''}
                          onChange={(e) => setEditData({ ...editData, zodiacSign: e.target.value })}
                          className="w-full bg-white/[0.03] border border-transparent rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:bg-white/[0.06] focus:border-purple-500/30 transition-all appearance-none cursor-pointer"
                        >
                          <option value="" className="bg-[#1a1a2e]">Zodiac</option>
                          <option value="Aries" className="bg-[#1a1a2e]">Aries</option>
                          <option value="Taurus" className="bg-[#1a1a2e]">Taurus</option>
                          <option value="Gemini" className="bg-[#1a1a2e]">Gemini</option>
                          <option value="Cancer" className="bg-[#1a1a2e]">Cancer</option>
                          <option value="Leo" className="bg-[#1a1a2e]">Leo</option>
                          <option value="Virgo" className="bg-[#1a1a2e]">Virgo</option>
                          <option value="Libra" className="bg-[#1a1a2e]">Libra</option>
                          <option value="Scorpio" className="bg-[#1a1a2e]">Scorpio</option>
                          <option value="Sagittarius" className="bg-[#1a1a2e]">Sagittarius</option>
                          <option value="Capricorn" className="bg-[#1a1a2e]">Capricorn</option>
                          <option value="Aquarius" className="bg-[#1a1a2e]">Aquarius</option>
                          <option value="Pisces" className="bg-[#1a1a2e]">Pisces</option>
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] text-white/30 uppercase tracking-wider font-bold ml-1">MBTI</label>
                        <select
                          value={editData.mbti ?? user.mbti ?? ''}
                          onChange={(e) => setEditData({ ...editData, mbti: e.target.value })}
                          className="w-full bg-white/[0.03] border border-transparent rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:bg-white/[0.06] focus:border-purple-500/30 transition-all appearance-none cursor-pointer"
                        >
                          <option value="" className="bg-[#1a1a2e]">MBTI</option>
                          <option value="INTJ" className="bg-[#1a1a2e]">INTJ</option>
                          <option value="INTP" className="bg-[#1a1a2e]">INTP</option>
                          <option value="ENTJ" className="bg-[#1a1a2e]">ENTJ</option>
                          <option value="ENTP" className="bg-[#1a1a2e]">ENTP</option>
                          <option value="INFJ" className="bg-[#1a1a2e]">INFJ</option>
                          <option value="INFP" className="bg-[#1a1a2e]">INFP</option>
                          <option value="ENFJ" className="bg-[#1a1a2e]">ENFJ</option>
                          <option value="ENFP" className="bg-[#1a1a2e]">ENFP</option>
                          <option value="ISTJ" className="bg-[#1a1a2e]">ISTJ</option>
                          <option value="ISFJ" className="bg-[#1a1a2e]">ISFJ</option>
                          <option value="ESTJ" className="bg-[#1a1a2e]">ESTJ</option>
                          <option value="ESFJ" className="bg-[#1a1a2e]">ESFJ</option>
                          <option value="ISTP" className="bg-[#1a1a2e]">ISTP</option>
                          <option value="ISFP" className="bg-[#1a1a2e]">ISFP</option>
                          <option value="ESTP" className="bg-[#1a1a2e]">ESTP</option>
                          <option value="ESFP" className="bg-[#1a1a2e]">ESFP</option>
                        </select>
                      </div>
                    </div>
                  </section>

                  {/* D. Preferences */}
                  <section className="space-y-6">
                    <div className="text-[10px] uppercase tracking-[0.2em] text-white/20 font-black px-1">Preferences</div>
                    <div className="space-y-4">
                      <div className="space-y-3">
                        <label className="text-[10px] text-white/30 uppercase tracking-wider font-bold ml-1">Looking For (Max 3)</label>
                        <div className="flex flex-wrap gap-2">
                          {LOOKING_FOR_OPTIONS.map(option => {
                            const rawLookingFor = editData.lookingFor ?? user.lookingFor ?? [];
                            const currentLookingFor = Array.isArray(rawLookingFor) ? rawLookingFor : (typeof rawLookingFor === 'string' ? [rawLookingFor] : []);
                            
                            let isSelected = false;
                            if (option === "custom") {
                              isSelected = currentLookingFor.some(opt => opt && !STANDARD_OPTIONS.includes(opt));
                            } else {
                              isSelected = currentLookingFor.includes(option);
                            }

                            return (
                              <button
                                key={option}
                                type="button"
                                onClick={() => {
                                  let next;
                                  if (option === "custom") {
                                    if (isSelected) {
                                      next = currentLookingFor.filter(opt => STANDARD_OPTIONS.includes(opt));
                                    } else {
                                      if (currentLookingFor.length >= 3) return;
                                      next = [...currentLookingFor, ""];
                                    }
                                  } else {
                                    if (isSelected) {
                                      next = currentLookingFor.filter(o => o !== option);
                                    } else {
                                      if (currentLookingFor.length >= 3) return;
                                      next = [...currentLookingFor, option];
                                    }
                                  }
                                  setEditData({ ...editData, lookingFor: next });
                                }}
                                className={`px-4 py-2 rounded-full text-[11px] font-bold transition-all border ${
                                  isSelected 
                                    ? 'bg-purple-500/10 border-purple-500/50 text-purple-300' 
                                    : 'bg-white/[0.03] border-transparent text-white/40 hover:bg-white/[0.06] hover:text-white/60'
                                }`}
                              >
                                {option === "custom" ? "Custom..." : option}
                              </button>
                            );
                          })}
                        </div>

                        {(() => {
                          const rawLookingFor = editData.lookingFor ?? user.lookingFor ?? [];
                          const currentLookingFor = Array.isArray(rawLookingFor) ? rawLookingFor : (typeof rawLookingFor === 'string' ? [rawLookingFor] : []);
                          const customValue = currentLookingFor.find(opt => opt !== undefined && opt !== null && !STANDARD_OPTIONS.includes(opt));
                          const hasCustom = customValue !== undefined;

                          if (!hasCustom && !currentLookingFor.includes("")) return null;

                          return (
                            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="relative">
                              <input
                                type="text"
                                placeholder="Describe what you're looking for..."
                                value={customValue ?? ''}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  const standard = currentLookingFor.filter(opt => STANDARD_OPTIONS.includes(opt));
                                  const next = [...standard, val].slice(0, 3);
                                  setEditData({ ...editData, lookingFor: next });
                                }}
                                className="w-full bg-white/[0.03] border border-transparent rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:bg-white/[0.06] focus:border-purple-500/30 transition-all"
                                maxLength={50}
                              />
                            </motion.div>
                          );
                        })()}
                      </div>
                    </div>
                  </section>

                  {/* E. Tags & Vibe */}
                  <section className="space-y-6">
                    <div className="text-[10px] uppercase tracking-[0.2em] text-white/20 font-black px-1">Interests & Vibe</div>
                    <div className="space-y-6">
                      <div className="space-y-1.5">
                        <label className="text-[10px] text-white/30 uppercase tracking-wider font-bold ml-1">Tags (Comma separated)</label>
                        <input
                          type="text"
                          value={(editData.tags ?? user.tags).join(', ')}
                          onChange={(e) => {
                            const newTags = e.target.value.split(',').map(t => t.trim()).filter(Boolean).slice(0, 10).map(t => t.slice(0, 20));
                            setEditData({ ...editData, tags: newTags });
                          }}
                          className="w-full bg-white/[0.03] border border-transparent rounded-xl px-4 py-3 text-white focus:outline-none focus:bg-white/[0.06] focus:border-purple-500/30 transition-all"
                          placeholder="gaming, art, music..."
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        {VIBES.map(v => {
                          const isSelected = (editData.color ?? user.color) === v.color;
                          return (
                            <button
                              key={v.id}
                              onClick={() => setEditData({ ...editData, color: v.color, vibe: v.label })}
                              className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                                isSelected 
                                  ? 'bg-white/[0.06] border-white/20' 
                                  : 'bg-transparent border-transparent hover:bg-white/[0.03] opacity-60 hover:opacity-100'
                              }`}
                            >
                              <div 
                                className="w-4 h-4 rounded-full"
                                style={{ 
                                  backgroundColor: v.color,
                                  boxShadow: isSelected ? `0 0 15px ${v.color}` : 'none'
                                }}
                              />
                              <span className="text-[11px] font-bold text-white uppercase tracking-wider">{v.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </section>
                </div>
              ) : (
                /* VIEW MODE */
                <div className="space-y-4">
                  {/* Signal Section */}
                  {user.signal && (
                    <section className="relative group">
                      <div className="absolute -inset-2 bg-gradient-to-r from-purple-500/5 to-blue-500/5 rounded-xl blur-xl opacity-50 group-hover:opacity-100 transition-opacity" />
                      <div className="relative bg-white/[0.03] rounded-xl p-3 space-y-1.5 border border-white/5">
                        <div className="text-[10px] uppercase tracking-wider text-white/30 font-bold flex items-center gap-1.5">
                          <MessageCircle className="w-2.5 h-2.5" /> Sambit
                        </div>
                        <p className="text-sm text-white/90 font-medium leading-relaxed tracking-tight">
                          "{user.signal}"
                        </p>
                      </div>
                    </section>
                  )}

                  {/* Vibe + Looking For */}
                  {(user.vibe || (user.lookingFor && (Array.isArray(user.lookingFor) ? user.lookingFor.length > 0 : !!user.lookingFor))) && (
                    <section className="space-y-2">
                      <div className="flex flex-wrap gap-1.5">
                        {user.vibe && (
                          <div 
                            className="px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 transition-transform hover:scale-105"
                            style={{ 
                              backgroundColor: `rgba(${rgbColor}, 0.08)`,
                              color: hexColor,
                              border: `1px solid rgba(${rgbColor}, 0.2)`
                            }}
                          >
                            <span>✨</span> {user.vibe}
                          </div>
                        )}
                        {(() => {
                          const rawLookingFor = user.lookingFor ?? [];
                          const currentLookingFor = Array.isArray(rawLookingFor) ? rawLookingFor : (typeof rawLookingFor === 'string' ? [rawLookingFor] : []);
                          return currentLookingFor.map((option, idx) => (
                            <div 
                              key={idx} 
                              className="px-3 py-1.5 rounded-full text-[10px] font-bold bg-white/5 text-white/60 flex items-center gap-1.5 border border-white/5 hover:bg-white/10 transition-colors"
                            >
                              <span>💫</span> {option || "Custom..."}
                            </div>
                          ));
                        })()}
                      </div>
                    </section>
                  )}

                  {/* Identity & Personality Grid */}
                  <div className="grid grid-cols-2 gap-4">
                    {/* Identity Section */}
                    {(user.relationshipStatus || user.identity || user.sexualRole) && (
                      <section className="space-y-2">
                        <div className="text-[10px] uppercase tracking-wider text-white/30 font-bold">Identity</div>
                        <div className="flex flex-col gap-1.5">
                          {[
                            user.relationshipStatus,
                            user.identity,
                            user.sexualRole
                          ].filter(Boolean).map((item, i) => (
                            <div key={i} className="flex items-center gap-2 px-3 py-1.5 bg-white/[0.02] border border-white/5 rounded-lg text-xs text-white/70 font-medium">
                              <span className="capitalize">{item}</span>
                            </div>
                          ))}
                        </div>
                      </section>
                    )}

                    {/* Personality Section */}
                    {(user.zodiacSign || user.mbti) && (
                      <section className="space-y-2">
                        <div className="text-[10px] uppercase tracking-wider text-white/30 font-bold">Personality</div>
                        <div className="flex flex-col gap-1.5">
                          {user.zodiacSign && (
                            <div className="flex items-center gap-2 px-3 py-1.5 bg-white/[0.02] border border-white/5 rounded-lg text-xs text-white/70 font-medium">
                              <span className="text-white/30">🌙</span>
                              <span>{user.zodiacSign}</span>
                            </div>
                          )}
                          {user.mbti && (
                            <div className="flex items-center gap-2 px-3 py-1.5 bg-white/[0.02] border border-white/5 rounded-lg text-xs text-white/70 font-medium">
                              <span className="text-white/30">🧠</span>
                              <span>{user.mbti}</span>
                            </div>
                          )}
                        </div>
                      </section>
                    )}
                  </div>

                  {/* Tags Section */}
                  {user.tags && user.tags.length > 0 && (
                    <section className="space-y-2">
                      <div className="text-[10px] uppercase tracking-wider text-white/30 font-bold">Interests</div>
                      <div className="flex flex-wrap gap-1.5">
                        {user.tags.map((tag, i) => (
                          <span key={i} className="px-2.5 py-1 bg-purple-500/5 text-purple-300/80 text-[10px] font-bold rounded-md border border-purple-500/10">
                            #{tag}
                          </span>
                        ))}
                      </div>
                    </section>
                  )}

                </div>
              )}
            </div>

            {/* Actions Footer */}
            <div className="mt-6 pt-6 border-t border-white/10 shrink-0">
              {!profile ? (
                <div className="text-center py-4 px-6 bg-white/5 rounded-2xl border border-white/10">
                  <p className="text-xs text-white/40 font-medium mb-3">Login to send signals and interact with this star</p>
                  <button 
                    onClick={() => window.location.href = '/login'}
                    className="w-full py-2.5 bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 rounded-xl text-xs font-bold transition-all"
                  >
                    Go to Login
                  </button>
                </div>
              ) : isMe ? (
                <div className="flex gap-3">
                  {isEditing ? (
                    <>
                      <button 
                        onClick={() => {
                          setIsEditing(false);
                          setEditData({});
                        }} 
                        className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-white/60 rounded-2xl font-bold text-sm transition-colors"
                      >
                        Cancel
                      </button>
                      <button 
                        onClick={handleSave} 
                        className="flex-[2] py-3 bg-purple-500 hover:bg-purple-600 text-white rounded-2xl font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-purple-500/20 transition-all active:scale-95"
                      >
                        <Check className="w-4 h-4" /> Save Changes
                      </button>
                    </>
                  ) : (
                    <div className="w-full space-y-3">
                      <button 
                        onClick={() => setIsEditing(true)} 
                        className="w-full py-3 bg-white/10 hover:bg-white/20 text-white rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all active:scale-95"
                      >
                        <Edit2 className="w-4 h-4" /> Edit Star
                      </button>
                      
                      {/* Mobile Actions Menu */}
                      <div className="md:hidden grid grid-cols-2 gap-3 pt-3 border-t border-white/10">
                        {onSettingsClick && (
                          <button onClick={onSettingsClick} className="py-3 bg-white/5 hover:bg-white/10 text-white/80 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-colors">
                            <Settings className="w-4 h-4" /> Settings
                          </button>
                        )}
                        {onSignOut && (
                          <button onClick={onSignOut} className="py-3 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-colors">
                            <LogOut className="w-4 h-4" /> Sign Out
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  <button
                    onClick={() => onChatClick && onChatClick(user)}
                    className="w-full py-4 bg-purple-500 hover:bg-purple-600 text-white rounded-2xl font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-purple-500/20 transition-all active:scale-95"
                  >
                    <Send className="w-4 h-4" /> Send Signal
                  </button>
                  
                  <div className="flex justify-between items-center px-1">
                    <button onClick={() => setIsReporting(!isReporting)} className="text-[10px] uppercase tracking-widest text-white/30 hover:text-white/60 flex items-center gap-1.5 transition-colors font-bold">
                      <Flag className="w-3 h-3" /> Report
                    </button>
                    <button onClick={handleBlock} className="text-[10px] uppercase tracking-widest text-red-400/40 hover:text-red-400/60 flex items-center gap-1.5 transition-colors font-bold">
                      <ShieldAlert className="w-3 h-3" /> Block
                    </button>
                  </div>

                  {isReporting && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="space-y-3 bg-red-500/5 p-4 rounded-2xl border border-red-500/10">
                      <p className="text-[10px] text-red-200/50 uppercase tracking-wider font-bold">Report User</p>
                      <select 
                        value={reportCategory} 
                        onChange={(e) => setReportCategory(e.target.value)}
                        className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-red-500"
                      >
                        <option value="spam">Spam</option>
                        <option value="harassment">Harassment</option>
                        <option value="fake">Fake Account</option>
                        <option value="other">Other</option>
                      </select>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={reportReason}
                          onChange={(e) => setReportReason(e.target.value)}
                          placeholder="Details..."
                          className="flex-1 bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-red-500"
                        />
                        <button 
                          onClick={handleReport} 
                          disabled={!reportReason.trim()} 
                          className="px-4 py-2 bg-red-500/20 hover:bg-red-500/40 disabled:opacity-50 text-red-400 rounded-xl text-sm font-bold transition-colors"
                        >
                          Submit
                        </button>
                      </div>
                    </motion.div>
                  )}
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </motion.div>
      </ModalPortal>
    </AnimatePresence>
  );
};
