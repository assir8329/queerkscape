import React, { useEffect, useState } from 'react';
import { collection, query, where, onSnapshot, doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth, UserProfile } from '../contexts/AuthContext';
import { motion, AnimatePresence } from 'motion/react';
import { X, Users, Star, MessageCircle } from 'lucide-react';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';
import { getHexColor } from '../lib/colors';

import { ModalPortal } from './ModalPortal';

interface BondsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUserClick: (user: UserProfile) => void;
  onChatClick?: (user: UserProfile) => void;
}

interface Bond {
  id: string;
  users: string[];
  otherUser?: UserProfile;
}

export const BondsModal: React.FC<BondsModalProps> = ({ isOpen, onClose, onUserClick, onChatClick }) => {
  const { profile } = useAuth();
  const [bonds, setBonds] = useState<Bond[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'bonds' | 'favorites'>('bonds');

  const emptyMessages = [
    "Ang langit ay tahimik pa... Wait for a soul to reach out",
    "Searching for frequencies. No signals have reached your star yet",
    "Your light is shining bright. Someone will notice soon"
  ];

  const randomEmptyMessage = React.useMemo(() => {
    return emptyMessages[Math.floor(Math.random() * emptyMessages.length)];
  }, [isOpen, activeTab]);

  useEffect(() => {
    if (!profile || !isOpen) return;

    const q = query(
      collection(db, 'connections'),
      where('users', 'array-contains', profile.uid)
    );

    const unsubscribe = onSnapshot(
      q,
      async (snapshot) => {
        const data = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Bond[];
        
        const enrichedData = await Promise.all(data.map(async (bond) => {
          const otherUid = bond.users.find(uid => uid !== profile.uid);
          if (otherUid) {
            try {
              const userDoc = await getDoc(doc(db, 'users', otherUid));
              if (userDoc.exists()) {
                bond.otherUser = userDoc.data() as UserProfile;
              }
            } catch (e) {
              handleFirestoreError(e, OperationType.GET, `users/${otherUid}`);
            }
          }
          return bond;
        }));
        
        setBonds(enrichedData.filter(b => b.otherUser));
        setLoading(false);
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, 'connections');
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [profile, isOpen]);

  const [favoriteStars, setFavoriteStars] = useState<UserProfile[]>([]);

  useEffect(() => {
    if (!profile || !isOpen || activeTab !== 'favorites') return;

    const fetchFavorites = async () => {
      if (!profile.favorites || profile.favorites.length === 0) {
        setFavoriteStars([]);
        return;
      }

      const stars = await Promise.all(profile.favorites.map(async (uid) => {
        try {
          const userDoc = await getDoc(doc(db, 'users', uid));
          return userDoc.exists() ? userDoc.data() as UserProfile : null;
        } catch (e) {
          return null;
        }
      }));

      setFavoriteStars(stars.filter(s => s) as UserProfile[]);
    };

    fetchFavorites();
  }, [profile, isOpen, activeTab]);

  return (
    <AnimatePresence>
      {isOpen && (
        <ModalPortal zIndex={2000}>
          <div className="fixed inset-0 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="w-full max-w-lg bg-[#1a1a2e] border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh] mb-24 md:mb-0"
            >
            <div className="p-4 border-b border-white/10 flex justify-between items-center bg-white/5">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-purple-400" />
                <h3 className="text-white font-semibold">Kindreds</h3>
              </div>
              <button onClick={onClose} className="text-white/50 hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex border-b border-white/5">
              <button 
                onClick={() => setActiveTab('bonds')}
                className={`flex-1 py-3 text-sm font-medium transition-colors ${activeTab === 'bonds' ? 'text-purple-400 border-b-2 border-purple-400 bg-purple-400/5' : 'text-white/40 hover:text-white/60'}`}
              >
                Ugnayan ({bonds.length})
              </button>
              <button 
                onClick={() => setActiveTab('favorites')}
                className={`flex-1 py-3 text-sm font-medium transition-colors ${activeTab === 'favorites' ? 'text-yellow-400 border-b-2 border-yellow-400 bg-yellow-400/5' : 'text-white/40 hover:text-white/60'}`}
              >
                Hinahangaan ({profile?.favorites?.length || 0})
              </button>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-4">
              {activeTab === 'bonds' ? (
                loading ? (
                  <div className="flex justify-center py-10">
                    <div className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : bonds.length === 0 ? (
                  <div className="text-center py-12 px-6 flex flex-col items-center gap-4">
                    <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-2">
                      <MessageCircle className="w-8 h-8 text-white/20" />
                    </div>
                    <p className="text-sm text-white/60 leading-relaxed italic max-w-[240px]">
                      {randomEmptyMessage}
                    </p>
                    <p className="text-[10px] text-white/20 uppercase tracking-widest font-bold">No kindreds found yet</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-2">
                    {bonds.map((bond) => (
                      <div
                        key={bond.id}
                        className="flex items-center gap-3 p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 transition-all text-left group"
                      >
                        <button 
                          onClick={() => {
                            if (bond.otherUser && onChatClick) {
                              onChatClick(bond.otherUser);
                            }
                          }}
                          className="flex items-center gap-3 flex-1 min-w-0"
                        >
                          <div 
                            className="w-10 h-10 rounded-full flex items-center justify-center font-bold shrink-0"
                            style={{
                              backgroundColor: `${getHexColor(bond.otherUser?.color || 'purple')}20`,
                              border: `1px solid ${getHexColor(bond.otherUser?.color || 'purple')}`,
                              color: getHexColor(bond.otherUser?.color || 'purple'),
                              boxShadow: `0 0 10px ${getHexColor(bond.otherUser?.color || 'purple')}40`
                            }}
                          >
                            {(bond.otherUser?.nickname || bond.otherUser?.username || '?').charAt(0).toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-white truncate">{bond.otherUser?.nickname || bond.otherUser?.username}</div>
                            <div className="text-xs text-white/40 truncate">{bond.otherUser?.vibe || 'Mysterious Star'}</div>
                          </div>
                        </button>
                        
                        <div className="flex items-center gap-2">
                          {bond.otherUser && (
                            <button
                              onClick={() => onUserClick(bond.otherUser!)}
                              className="p-2 bg-white/5 hover:bg-white/10 text-white/40 hover:text-white rounded-xl transition-all"
                              title="View Profile"
                            >
                              <Users className="w-4 h-4" />
                            </button>
                          )}
                          
                          {onChatClick && bond.otherUser && (
                            <button
                              onClick={() => onChatClick!(bond.otherUser!)}
                              className="p-2 bg-purple-500/20 hover:bg-purple-500/40 text-purple-300 rounded-xl transition-colors"
                              title="Send Signal"
                            >
                              <MessageCircle className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )
              ) : (
                favoriteStars.length === 0 ? (
                  <div className="text-center py-10 text-white/40">
                    <Star className="w-10 h-10 mx-auto mb-3 opacity-20" />
                    <p>No favorite stars yet.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-2">
                    {favoriteStars.map((star) => (
                      <div
                        key={star.uid}
                        className="flex items-center gap-3 p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 transition-all text-left group"
                      >
                        <button 
                          onClick={() => {
                            if (onChatClick) {
                              onChatClick(star);
                            }
                          }}
                          className="flex items-center gap-3 flex-1 min-w-0"
                        >
                          <div 
                            className="w-10 h-10 rounded-full flex items-center justify-center font-bold shrink-0"
                            style={{
                              backgroundColor: `${getHexColor(star.color)}20`,
                              border: `1px solid ${getHexColor(star.color)}`,
                              color: getHexColor(star.color),
                              boxShadow: `0 0 10px ${getHexColor(star.color)}40`
                            }}
                          >
                            {(star.nickname || star.username).charAt(0).toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-white truncate">{star.nickname || star.username}</div>
                            <div className="text-xs text-white/40 truncate">{star.vibe || 'Mysterious Star'}</div>
                          </div>
                        </button>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => onUserClick(star)}
                            className="p-2 bg-white/5 hover:bg-white/10 text-white/40 hover:text-white rounded-xl transition-all"
                            title="View Profile"
                          >
                            <Users className="w-4 h-4" />
                          </button>

                          {onChatClick && (
                            <button
                              onClick={() => onChatClick(star)}
                              className="p-2 bg-purple-500/20 hover:bg-purple-500/40 text-purple-300 rounded-xl transition-colors"
                              title="Send Signal"
                            >
                              <MessageCircle className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )
              )}
            </div>
          </motion.div>
        </div>
        </ModalPortal>
      )}
    </AnimatePresence>
  );
};
