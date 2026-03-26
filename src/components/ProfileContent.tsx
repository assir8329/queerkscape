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
    if (!signalMessage.trim()) return;
    
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
    const isFavorited = profile.favorites?.includes(user.uid);
    const newFavorites = isFavorited
      ? (profile.favorites || []).filter(id => id !== user.uid)
      : [...(profile.favorites || []), user.uid];
    
    await updateProfile({ favorites: newFavorites });
  };

  const hexColor = getHexColor(user.color);
  const active = isUserActive(user.lastActive);

  return (
    <div className="flex flex-col h-full">
      {/* Header Section */}
      <div className="p-8 bg-white/[0.02] border-b border-white/5">
        <div className="flex items-center gap-6">
          <div 
            className={`relative w-20 h-20 rounded-2xl shrink-0 flex items-center justify-center`}
            style={{ 
              backgroundColor: `${hexColor}20`,
              border: `1px solid ${hexColor}40`,
              boxShadow: active ? `0 0 30px ${hexColor}20` : 'none'
            }}
          >
            {user.avatarUrl ? (
              <img src={user.avatarUrl} alt="" className="w-full h-full object-cover rounded-2xl" referrerPolicy="no-referrer" />
            ) : (
              <Users className="w-8 h-8 text-white/20" />
            )}
            {active && <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 rounded-full border-4 border-[#050510]" />}
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-bold text-white tracking-tight truncate">
                {user.nickname || user.username}
              </h2>
              {!isEditing && (
                <button 
                  onClick={profile ? toggleFavorite : undefined} 
                  className={`text-white/30 hover:text-yellow-400 transition-colors p-1.5 shrink-0 ${!profile ? 'opacity-20 cursor-not-allowed' : ''}`}
                >
                  <Star className={`w-5 h-5 ${profile?.favorites?.includes(user.uid) ? 'fill-yellow-400 text-yellow-400' : ''}`} />
                </button>
              )}
            </div>
            <div className="text-xs text-white/40 font-mono mt-1 tracking-widest uppercase">@{user.username}</div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4 mt-6 text-[11px] font-black uppercase tracking-widest">
          {user.location && !user.hideLocation && (
            <div className="flex items-center gap-2 text-white/60 bg-white/5 px-3 py-1.5 rounded-full border border-white/5">
              <MapPin className="w-3 h-3 text-white/30" />
              <span>{user.location.city}</span>
            </div>
          )}
          {user.relationshipStatus && (
            <div className="flex items-center gap-2 text-white/60 bg-white/5 px-3 py-1.5 rounded-full border border-white/5">
              <span className="text-white/30">💞</span>
              <span>{user.relationshipStatus}</span>
            </div>
          )}
          {user.pronouns && (
            <div className="flex items-center gap-2 text-white/60 bg-white/5 px-3 py-1.5 rounded-full border border-white/5">
              <span className="text-white/30">👤</span>
              <span>{user.pronouns}</span>
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
        {isEditing ? (
          /* EDIT MODE - Simplified for Panel */
          <div className="space-y-8">
            <div className="space-y-2">
              <label className="text-[10px] text-white/30 uppercase tracking-[0.2em] font-black ml-1">Nickname</label>
              <input
                type="text"
                value={editData.nickname ?? user.nickname ?? user.username}
                onChange={(e) => setEditData({ ...editData, nickname: e.target.value })}
                className="w-full bg-white/[0.03] border border-white/5 rounded-2xl px-5 py-4 text-white focus:outline-none focus:bg-white/[0.06] focus:border-purple-500/30 transition-all font-medium"
                maxLength={30}
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-[10px] text-white/30 uppercase tracking-[0.2em] font-black ml-1">Signal</label>
              <textarea
                value={editData.signal ?? user.signal}
                onChange={(e) => setEditData({ ...editData, signal: e.target.value })}
                className="w-full bg-white/[0.03] border border-white/5 rounded-2xl px-5 py-4 text-white focus:outline-none focus:bg-white/[0.06] focus:border-purple-500/30 transition-all resize-none h-32 text-sm leading-relaxed font-medium"
                maxLength={100}
                placeholder="What's on your mind?"
              />
            </div>

            <button
              onClick={handleSave}
              className="w-full py-4 bg-purple-600 hover:bg-purple-500 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] transition-all active:scale-95 shadow-lg shadow-purple-600/20"
            >
              Save Changes
            </button>
          </div>
        ) : (
          /* VIEW MODE */
          <div className="space-y-8">
            {user.signal && (
              <section className="space-y-3">
                <div className="text-[10px] uppercase tracking-[0.2em] text-white/20 font-black px-1">Current Signal</div>
                <div className="bg-white/[0.03] rounded-3xl p-6 border border-white/5 relative overflow-hidden group">
                  <div className="absolute top-0 left-0 w-1 h-full bg-purple-500/50" />
                  <p className="text-lg text-white/90 font-medium leading-relaxed tracking-tight italic">
                    "{user.signal}"
                  </p>
                </div>
              </section>
            )}

            {/* Interaction Area */}
            {profile && !isMe && (
              <section className="space-y-4">
                <div className="text-[10px] uppercase tracking-[0.2em] text-white/20 font-black px-1">Send a Signal</div>
                <div className="bg-white/[0.03] rounded-3xl p-6 border border-white/5 space-y-4">
                  <textarea
                    value={signalMessage}
                    onChange={(e) => setSignalMessage(e.target.value)}
                    placeholder={`Say something to ${user.nickname || user.username}...`}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-purple-500/30 transition-all resize-none h-24 font-medium"
                  />
                  <button
                    onClick={handleSendSignal}
                    disabled={!signalMessage.trim() || sending}
                    className="w-full py-3 bg-white text-[#050510] rounded-2xl font-black text-xs uppercase tracking-[0.2em] transition-all hover:bg-white/90 active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    <Send size={14} />
                    Send Signal
                  </button>
                </div>
              </section>
            )}

            {isMe && (
              <button
                onClick={() => setIsEditing(true)}
                className="w-full py-4 bg-white/5 hover:bg-white/10 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] transition-all border border-white/10 flex items-center justify-center gap-2"
              >
                <Edit2 size={14} />
                Edit Profile
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
