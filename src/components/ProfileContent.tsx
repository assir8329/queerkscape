import React, { useState, useEffect } from 'react';
import { useAuth, UserProfile } from '../contexts/AuthContext';
import { motion, AnimatePresence } from 'motion/react';
import { X, Send, Flag, ShieldAlert, Edit2, Check, MessageCircle, Clock, Star, MapPin, Users, Bell, Settings, LogOut } from 'lucide-react';
import { collection, addDoc, serverTimestamp, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { VIBES, getHexColor } from '../lib/colors';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';

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

interface ProfileContentProps {
  user: UserProfile;
  onClose: () => void;
  onBondsClick?: () => void;
  onNotificationsClick?: () => void;
  onSettingsClick?: () => void;
  onSignOut?: () => void;
}

export const ProfileContent: React.FC<ProfileContentProps> = ({ 
  user, 
  onClose,
  onBondsClick,
  onNotificationsClick,
  onSettingsClick,
  onSignOut
}) => {
  const { profile, updateProfile } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<Partial<UserProfile>>({});
  const [signalMessage, setSignalMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [reportCategory, setReportCategory] = useState('spam');
  const [isReporting, setIsReporting] = useState(false);
  const [messages, setMessages] = useState<any[]>([]);
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

  useEffect(() => {
    if (!profile || !user || profile.uid === user.uid) return;

    const q = query(
      collection(db, 'interactions'),
      where('fromUid', 'in', [profile.uid, user.uid])
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const msgs = snapshot.docs
          .map(doc => ({ id: doc.id, ...doc.data() }))
          .filter((m: any) => m.toUid === profile.uid || m.toUid === user.uid)
          .sort((a: any, b: any) => (a.createdAt?.toMillis?.() || 0) - (b.createdAt?.toMillis?.() || 0));
        setMessages(msgs);
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, 'interactions');
      }
    );

    return () => unsubscribe();
  }, [profile, user]);

  const isMe = profile ? user.uid === profile.uid : false;

  const isUserActive = (lastActive: any) => {
    if (!lastActive?.toMillis) return false;
    const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
    return lastActive.toMillis() > fiveMinutesAgo;
  };

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

  const handleSendSignal = async () => {
    if (!signalMessage.trim() || !profile) return;
    
    const myLastMsg = messages.filter(m => m.fromUid === profile.uid).pop();
    if (myLastMsg && myLastMsg.createdAt) {
      const timeSinceLast = Date.now() - myLastMsg.createdAt.toMillis();
      if (timeSinceLast < 10000) {
        alert('Please wait a moment before sending another signal.');
        return;
      }
    }

    setSending(true);
    try {
      await addDoc(collection(db, 'interactions'), {
        fromUid: profile.uid,
        toUid: user.uid,
        message: signalMessage,
        createdAt: serverTimestamp(),
        read: false,
      });
      
      const hasReceived = messages.some(m => m.fromUid === user.uid);
      if (hasReceived) {
        const connId = profile.uid < user.uid ? `${profile.uid}_${user.uid}` : `${user.uid}_${profile.uid}`;
        try {
          const { getDoc, doc, setDoc } = await import('firebase/firestore');
          const connRef = doc(db, 'connections', connId);
          const connSnap = await getDoc(connRef);
          if (!connSnap.exists()) {
            await setDoc(connRef, {
              users: [profile.uid, user.uid].sort(),
              createdAt: serverTimestamp(),
            });
          }
        } catch (err) {
          handleFirestoreError(err, OperationType.CREATE, `connections/${connId}`);
        }
      }
      
      setSignalMessage('');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'interactions');
    } finally {
      setSending(false);
    }
  };

  const toggleFavorite = async () => {
    if (!profile) return;
    const isFavorited = profile.favorites?.includes(user.uid);
    const newFavorites = isFavorited
      ? (profile.favorites || []).filter(id => id !== user.uid)
      : [...(profile.favorites || []), user.uid];
    
    await updateProfile({ favorites: newFavorites });
  };

  const hexColor = getHexColor(user.color);
  const active = isUserActive(user.lastActive);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header Section */}
      <div className="p-6 bg-white/[0.02] border-b border-white/5 shrink-0">
        <div className="flex items-center gap-4">
          <div 
            className={`relative w-16 h-16 rounded-2xl shrink-0 flex items-center justify-center`}
            style={{ 
              backgroundColor: `${hexColor}20`,
              border: `1px solid ${hexColor}40`,
              boxShadow: active ? `0 0 30px ${hexColor}20` : 'none'
            }}
          >
            {user.avatarUrl ? (
              <img src={user.avatarUrl} alt="" className="w-full h-full object-cover rounded-2xl" referrerPolicy="no-referrer" />
            ) : (
              <Users className="w-6 h-6 text-white/20" />
            )}
            {active && <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-[#050510]" />}
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <div 
                className="w-2 h-2 rounded-full" 
                style={{ 
                  backgroundColor: hexColor,
                  boxShadow: `0 0 8px ${hexColor}`
                }} 
              />
              <h2 className="text-xl font-bold text-white tracking-tight truncate">
                {user.nickname || user.username}
              </h2>
              {!isEditing && (
                <button 
                  onClick={profile ? toggleFavorite : undefined} 
                  className={`text-white/30 hover:text-yellow-400 transition-colors p-1 shrink-0 ${!profile ? 'opacity-20 cursor-not-allowed' : ''}`}
                >
                  <Star className={`w-4 h-4 ${profile?.favorites?.includes(user.uid) ? 'fill-yellow-400 text-yellow-400' : ''}`} />
                </button>
              )}
            </div>
            <div className="text-[10px] text-white/40 font-mono mt-0.5 tracking-widest uppercase">@{user.username}</div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 mt-4 text-[9px] font-black uppercase tracking-widest">
          {user.location && !user.hideLocation && (
            <div className="flex items-center gap-1.5 text-white/60 bg-white/5 px-2 py-1 rounded-full border border-white/5">
              <MapPin className="w-2.5 h-2.5 text-white/30" />
              <span>{user.location.city}</span>
            </div>
          )}
          {user.relationshipStatus && (
            <div className="flex items-center gap-1.5 text-white/60 bg-white/5 px-2 py-1 rounded-full border border-white/5">
              <span className="text-white/30">💞</span>
              <span>{user.relationshipStatus}</span>
            </div>
          )}
          {user.pronouns && (
            <div className="flex items-center gap-1.5 text-white/60 bg-white/5 px-2 py-1 rounded-full border border-white/5">
              <span className="text-white/30">👤</span>
              <span>{user.pronouns}</span>
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
        {isEditing ? (
          /* EDIT MODE */
          <div className="space-y-6">
            <div className="space-y-4">
              <div className="text-[10px] uppercase tracking-[0.2em] text-white/20 font-black px-1">Basic Info</div>
              
              <div className="space-y-1.5">
                <label className="text-[10px] text-white/30 uppercase tracking-wider font-bold ml-1">Nickname</label>
                <input
                  type="text"
                  value={editData.nickname ?? user.nickname ?? user.username}
                  onChange={(e) => setEditData({ ...editData, nickname: e.target.value })}
                  className="w-full bg-white/[0.03] border border-white/5 rounded-xl px-4 py-3 text-white focus:outline-none focus:bg-white/[0.06] focus:border-purple-500/30 transition-all text-sm"
                  maxLength={30}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[10px] text-white/30 uppercase tracking-wider font-bold ml-1">Pronouns</label>
                  <input
                    type="text"
                    value={editData.pronouns ?? user.pronouns ?? ''}
                    onChange={(e) => setEditData({ ...editData, pronouns: e.target.value })}
                    className="w-full bg-white/[0.03] border border-white/5 rounded-xl px-4 py-3 text-white focus:outline-none focus:bg-white/[0.06] focus:border-purple-500/30 transition-all text-sm"
                    placeholder="they/them"
                    maxLength={20}
                  />
                </div>
                <div className="flex flex-col justify-end pb-3">
                  <label className="flex items-center gap-2 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={editData.hideLocation ?? user.hideLocation ?? false}
                      onChange={(e) => setEditData({ ...editData, hideLocation: e.target.checked })}
                      className="w-3.5 h-3.5 rounded border-white/10 bg-white/5 text-purple-500 focus:ring-purple-500/50 focus:ring-offset-0"
                    />
                    <span className="text-[9px] text-white/30 group-hover:text-white/50 transition-colors uppercase tracking-widest font-bold">Hide Location</span>
                  </label>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] text-white/30 uppercase tracking-wider font-bold ml-1">Location</label>
                <div className="flex items-center justify-between bg-white/[0.03] rounded-xl p-3 border border-white/5">
                  <span className="text-xs text-white/60">
                    {(editData.location ?? user.location)?.city || 'Unknown'}
                  </span>
                  <button
                    onClick={handleUpdateLocation}
                    disabled={isLocating}
                    className="px-2 py-1 bg-purple-500/20 hover:bg-purple-500/40 text-purple-300 rounded-lg text-[10px] font-bold transition-colors"
                  >
                    {isLocating ? '...' : 'Update'}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] text-white/30 uppercase tracking-wider font-bold ml-1">Sambit</label>
                <textarea
                  value={editData.signal ?? user.signal}
                  onChange={(e) => setEditData({ ...editData, signal: e.target.value })}
                  className="w-full bg-white/[0.03] border border-white/5 rounded-xl px-4 py-3 text-white focus:outline-none focus:bg-white/[0.06] focus:border-purple-500/30 transition-all resize-none h-24 text-sm"
                  maxLength={100}
                  placeholder="What's on your mind?"
                />
              </div>
            </div>

            <div className="space-y-4">
              <div className="text-[10px] uppercase tracking-[0.2em] text-white/20 font-black px-1">Identity</div>
              <div className="grid grid-cols-1 gap-3">
                <select
                  value={editData.identity ?? user.identity ?? ''}
                  onChange={(e) => setEditData({ ...editData, identity: e.target.value })}
                  className="w-full bg-white/[0.03] border border-white/5 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:bg-white/[0.06] focus:border-purple-500/30 transition-all appearance-none"
                >
                  <option value="" className="bg-[#1a1a2e]">Select Identity</option>
                  <option value="Cis-Woman" className="bg-[#1a1a2e]">Cis-Woman</option>
                  <option value="Trans-Woman" className="bg-[#1a1a2e]">Trans-Woman</option>
                  <option value="Non-Binary" className="bg-[#1a1a2e]">Non-Binary</option>
                  <option value="Genderfluid" className="bg-[#1a1a2e]">Genderfluid</option>
                  <option value="Genderqueer" className="bg-[#1a1a2e]">Genderqueer</option>
                  <option value="Agender" className="bg-[#1a1a2e]">Agender</option>
                </select>

                <select
                  value={editData.sexualRole ?? user.sexualRole ?? ''}
                  onChange={(e) => setEditData({ ...editData, sexualRole: e.target.value })}
                  className="w-full bg-white/[0.03] border border-white/5 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:bg-white/[0.06] focus:border-purple-500/30 transition-all appearance-none"
                >
                  <option value="" className="bg-[#1a1a2e]">Select Sexual Role</option>
                  <option value="Stone Top" className="bg-[#1a1a2e]">Stone Top</option>
                  <option value="Pillow Princess" className="bg-[#1a1a2e]">Pillow Princess</option>
                  <option value="Switch/Versa" className="bg-[#1a1a2e]">Switch/Versa</option>
                  <option value="Switch (top leaning)" className="bg-[#1a1a2e]">Switch (top leaning)</option>
                  <option value="Switch (bottom leaning)" className="bg-[#1a1a2e]">Switch (bottom leaning)</option>
                </select>

                <select
                  value={editData.relationshipStatus ?? user.relationshipStatus ?? ''}
                  onChange={(e) => setEditData({ ...editData, relationshipStatus: e.target.value })}
                  className="w-full bg-white/[0.03] border border-white/5 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:bg-white/[0.06] focus:border-purple-500/30 transition-all appearance-none"
                >
                  <option value="" className="bg-[#1a1a2e]">Select Relationship Status</option>
                  <option value="single" className="bg-[#1a1a2e]">Single</option>
                  <option value="taken" className="bg-[#1a1a2e]">Taken</option>
                  <option value="in a situationship" className="bg-[#1a1a2e]">In a situationship</option>
                  <option value="non-monogamous" className="bg-[#1a1a2e]">Non-monogamous</option>
                </select>
              </div>
            </div>

            <div className="space-y-4">
              <div className="text-[10px] uppercase tracking-[0.2em] text-white/20 font-black px-1">Personality</div>
              <div className="grid grid-cols-2 gap-3">
                <select
                  value={editData.zodiacSign ?? user.zodiacSign ?? ''}
                  onChange={(e) => setEditData({ ...editData, zodiacSign: e.target.value })}
                  className="w-full bg-white/[0.03] border border-white/5 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:bg-white/[0.06] focus:border-purple-500/30 transition-all appearance-none"
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

                <select
                  value={editData.mbti ?? user.mbti ?? ''}
                  onChange={(e) => setEditData({ ...editData, mbti: e.target.value })}
                  className="w-full bg-white/[0.03] border border-white/5 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:bg-white/[0.06] focus:border-purple-500/30 transition-all appearance-none"
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

            <div className="space-y-4">
              <div className="text-[10px] uppercase tracking-[0.2em] text-white/20 font-black px-1">Looking For</div>
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
                      className={`px-3 py-1.5 rounded-full text-[10px] font-bold transition-all border ${
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
            </div>

            <div className="space-y-4">
              <div className="text-[10px] uppercase tracking-[0.2em] text-white/20 font-black px-1">Interests</div>
              <input
                type="text"
                value={(editData.tags ?? user.tags).join(', ')}
                onChange={(e) => {
                  const newTags = e.target.value.split(',').map(t => t.trim()).filter(Boolean).slice(0, 10).map(t => t.slice(0, 20));
                  setEditData({ ...editData, tags: newTags });
                }}
                className="w-full bg-white/[0.03] border border-white/5 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:bg-white/[0.06] focus:border-purple-500/30 transition-all"
                placeholder="gaming, art, music..."
              />
            </div>

            <div className="flex gap-3 pt-4">
              <button
                onClick={() => {
                  setIsEditing(false);
                  setEditData({});
                }}
                className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-white/60 rounded-xl font-bold text-xs uppercase tracking-widest transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="flex-[2] py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-xl font-bold text-xs uppercase tracking-widest transition-all active:scale-95 shadow-lg shadow-purple-600/20"
              >
                Save Changes
              </button>
            </div>
          </div>
        ) : (
          /* VIEW MODE */
          <div className="space-y-6">
            {user.signal && (
              <section className="space-y-2">
                <div className="text-[10px] uppercase tracking-[0.2em] text-white/20 font-black px-1">Sambit</div>
                <div className="bg-white/[0.03] rounded-2xl p-4 border border-white/5 relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-1 h-full bg-purple-500/50" />
                  <p className="text-sm text-white/90 font-medium leading-relaxed italic">
                    "{user.signal}"
                  </p>
                </div>
              </section>
            )}

            {/* Vibe + Looking For */}
            {(user.vibe || (user.lookingFor && (Array.isArray(user.lookingFor) ? user.lookingFor.length > 0 : !!user.lookingFor))) && (
              <section className="flex flex-wrap gap-1.5">
                {user.vibe && (
                  <div 
                    className="px-2.5 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider border"
                    style={{ 
                      backgroundColor: `${hexColor}15`,
                      borderColor: `${hexColor}40`,
                      color: hexColor,
                      boxShadow: `0 0 10px ${hexColor}10`
                    }}
                  >
                    ✨ {user.vibe}
                  </div>
                )}
                {(() => {
                  const rawLookingFor = user.lookingFor ?? [];
                  const currentLookingFor = Array.isArray(rawLookingFor) ? rawLookingFor : (typeof rawLookingFor === 'string' ? [rawLookingFor] : []);
                  return currentLookingFor.map((option, idx) => (
                    <div key={idx} className="px-2.5 py-1 rounded-full text-[9px] font-bold bg-white/5 text-white/60 border border-white/5">
                      💫 {option}
                    </div>
                  ));
                })()}
              </section>
            )}

            {/* Identity & Personality Grid */}
            <div className="grid grid-cols-1 gap-4">
              {(user.relationshipStatus || user.identity || user.sexualRole) && (
                <section className="space-y-2">
                  <div className="text-[10px] uppercase tracking-wider text-white/30 font-bold">Identity</div>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      user.relationshipStatus,
                      user.identity,
                      user.sexualRole
                    ].filter(Boolean).map((item, i) => (
                      <div key={i} className="px-3 py-2 bg-white/[0.02] border border-white/5 rounded-lg text-xs text-white/70 font-medium capitalize">
                        {item}
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {(user.zodiacSign || user.mbti) && (
                <section className="space-y-2">
                  <div className="text-[10px] uppercase tracking-wider text-white/30 font-bold">Personality</div>
                  <div className="grid grid-cols-2 gap-2">
                    {user.zodiacSign && (
                      <div className="px-3 py-2 bg-white/[0.02] border border-white/5 rounded-lg text-xs text-white/70 font-medium flex items-center gap-2">
                        <span className="text-white/30">🌙</span> {user.zodiacSign}
                      </div>
                    )}
                    {user.mbti && (
                      <div className="px-3 py-2 bg-white/[0.02] border border-white/5 rounded-lg text-xs text-white/70 font-medium flex items-center gap-2">
                        <span className="text-white/30">🧠</span> {user.mbti}
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
                    <span key={i} className="px-2 py-1 bg-purple-500/5 text-purple-300/80 text-[9px] font-bold rounded-md border border-purple-500/10">
                      #{tag}
                    </span>
                  ))}
                </div>
              </section>
            )}

            {/* Interaction Area */}
            {profile && !isMe && (
              <section className="space-y-3 pt-4 border-t border-white/5">
                <div className="text-[10px] uppercase tracking-[0.2em] text-white/20 font-black px-1">Sambit</div>
                <div className="space-y-3">
                  <textarea
                    value={signalMessage}
                    onChange={(e) => setSignalMessage(e.target.value)}
                    placeholder={`Say something to ${user.nickname || user.username}...`}
                    className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-purple-500/30 transition-all resize-none h-24 font-medium"
                  />
                  <button
                    onClick={handleSendSignal}
                    disabled={!signalMessage.trim() || sending}
                    className="w-full py-3 bg-white text-[#050510] rounded-xl font-black text-xs uppercase tracking-[0.2em] transition-all hover:bg-white/90 active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    <Send size={14} />
                    Sambit
                  </button>
                </div>
              </section>
            )}

            {isMe && (
              <button
                onClick={() => setIsEditing(true)}
                className="w-full py-3.5 bg-white/5 hover:bg-white/10 text-white rounded-xl font-black text-xs uppercase tracking-[0.2em] transition-all border border-white/10 flex items-center justify-center gap-2"
              >
                <Edit2 size={14} />
                Edit Star
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
