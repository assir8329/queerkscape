import React, { useEffect, useState, useRef, useMemo } from 'react';
import { collection, query, where, onSnapshot, doc, getDoc, addDoc, serverTimestamp, orderBy, limit, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth, UserProfile } from '../contexts/AuthContext';
import { motion, AnimatePresence } from 'motion/react';
import { X, Users, MessageCircle, Send, Loader2, ChevronLeft, Sparkles } from 'lucide-react';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';
import { getHexColor } from '../lib/colors';
import { ModalPortal } from './ModalPortal';

interface SiklabInboxProps {
  isOpen: boolean;
  onClose: () => void;
  initialUser?: UserProfile | null;
  onUserClick: (user: UserProfile) => void;
}

interface Interaction {
  id: string;
  fromUid: string;
  toUid: string;
  message: string;
  createdAt: any;
  read: boolean;
  senderName?: string;
  senderColor?: string;
  senderVibe?: string;
}

interface Bond {
  id: string;
  users: string[];
  otherUser?: UserProfile;
}

const UGNAYAN_EMPTY_MESSAGES = [
  "Tahimik ang iyong kalawakan. Maghintay ng siklab mula sa iyong mga buklod."
];

export const SiklabInbox: React.FC<SiklabInboxProps> = ({ isOpen, onClose, initialUser, onUserClick }) => {
  const { profile } = useAuth();
  const [activeTab, setActiveTab] = useState<'ugnayan' | 'signals'>('ugnayan');
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  
  // Data states
  const [bonds, setBonds] = useState<Bond[]>([]);
  const [interactions, setInteractions] = useState<Interaction[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Chat states
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [isBonding, setIsBonding] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const randomUgnayanMessage = useMemo(() => {
    return UGNAYAN_EMPTY_MESSAGES[Math.floor(Math.random() * UGNAYAN_EMPTY_MESSAGES.length)];
  }, [isOpen, activeTab === 'ugnayan']);

  // Set initial user if provided
  useEffect(() => {
    if (initialUser) {
      setSelectedUser(initialUser);
    }
  }, [initialUser]);

  // Fetch Connections (Ugnayan)
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

  // Fetch Recent Interactions (Signals)
  useEffect(() => {
    if (!profile || !isOpen) return;

    const q = query(
      collection(db, 'interactions'),
      where('toUid', '==', profile.uid)
    );

    const unsubscribe = onSnapshot(
      q,
      async (snapshot) => {
        const data = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Interaction[];
        
        // Group by sender to show unique conversations
        const uniqueSenders = new Map<string, Interaction>();
        data.forEach(interaction => {
          const existing = uniqueSenders.get(interaction.fromUid);
          if (!existing || (interaction.createdAt?.toMillis?.() || 0) > (existing.createdAt?.toMillis?.() || 0)) {
            uniqueSenders.set(interaction.fromUid, interaction);
          }
        });

        const enrichedData = await Promise.all(Array.from(uniqueSenders.values()).map(async (interaction) => {
          try {
            const userDoc = await getDoc(doc(db, 'users', interaction.fromUid));
            if (userDoc.exists()) {
              const userData = userDoc.data() as UserProfile;
              interaction.senderName = userData.nickname || userData.username;
              interaction.senderColor = userData.color;
              interaction.senderVibe = userData.vibe;
            }
          } catch (e) {
            handleFirestoreError(e, OperationType.GET, `users/${interaction.fromUid}`);
          }
          return interaction;
        }));
        
        enrichedData.sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));
        setInteractions(enrichedData);
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, 'interactions');
      }
    );

    return () => unsubscribe();
  }, [profile, isOpen]);

  // Fetch Chat Messages when a user is selected
  useEffect(() => {
    if (!profile || !selectedUser) {
      setChatMessages([]);
      return;
    }

    setChatLoading(true);
    
    // Check if ugnayan exists to determine "bonding" state
    const ugnayanId = profile.uid < selectedUser.uid ? `${profile.uid}-${selectedUser.uid}` : `${selectedUser.uid}-${profile.uid}`;
    const ugnayanRef = doc(db, 'ugnayan', ugnayanId);
    
    getDoc(ugnayanRef).then(snap => {
      if (!snap.exists()) {
        setIsBonding(true);
      } else {
        setIsBonding(false);
      }
    }).catch(() => setIsBonding(false));

    // Listen for ugnayan creation to refresh/clear bonding state
    const unsubscribeUgnayan = onSnapshot(ugnayanRef, (snap) => {
      if (snap.exists()) {
        setIsBonding(false);
      }
    });

    const q = query(
      collection(db, 'interactions'),
      where('fromUid', 'in', [profile.uid, selectedUser.uid]),
      orderBy('createdAt', 'desc'),
      limit(50)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const msgs = snapshot.docs
          .map(doc => ({ id: doc.id, ...doc.data() }))
          .filter((m: any) => m.toUid === profile.uid || m.toUid === selectedUser.uid)
          .sort((a: any, b: any) => (a.createdAt?.toMillis?.() || 0) - (b.createdAt?.toMillis?.() || 0));
        
        setChatMessages(msgs);
        setChatLoading(false);

        // Mark unread messages from this user as read
        msgs.forEach(async (msg: any) => {
          if (msg.toUid === profile.uid && !msg.read) {
            try {
              await updateDoc(doc(db, 'interactions', msg.id), { read: true });
            } catch (e) {
              // Ignore read update errors
            }
          }
        });
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, 'interactions');
        setChatLoading(false);
      }
    );

    return () => {
      unsubscribe();
      unsubscribeUgnayan();
    };
  }, [profile, selectedUser]);

  // Scroll to bottom of chat
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [chatMessages]);

  const handleSend = async () => {
    if (!newMessage.trim() || sending || !selectedUser || !profile) return;

    const messageContent = newMessage.trim();
    setNewMessage(''); // Clear immediately for better UX
    
    // Optimistic UI update
    const optimisticId = `temp-${Date.now()}`;
    const optimisticMsg = {
      id: optimisticId,
      fromUid: profile.uid,
      toUid: selectedUser.uid,
      message: messageContent,
      createdAt: { toDate: () => new Date() },
      read: false,
      isOptimistic: true
    };
    
    setChatMessages(prev => [...prev, optimisticMsg]);

    // Background connection logic
    const ensureConnection = async () => {
      const ugnayanId = profile.uid < selectedUser.uid ? `${profile.uid}-${selectedUser.uid}` : `${selectedUser.uid}-${profile.uid}`;
      try {
        const { getDoc, doc, setDoc, addDoc, updateDoc, collection } = await import('firebase/firestore');
        const ugnayanRef = doc(db, 'ugnayan', ugnayanId);
        const ugnayanSnap = await getDoc(ugnayanRef);
        
        if (!ugnayanSnap.exists()) {
          await setDoc(ugnayanRef, {
            users: [profile.uid, selectedUser.uid].sort(),
            createdAt: serverTimestamp(),
            from_coord: { x: profile.x, y: profile.y, color: profile.color },
            to_coord: { x: selectedUser.x, y: selectedUser.y, color: selectedUser.color }
          });
        }

        // Legacy connections logic
        const hasReceived = chatMessages.some(m => m.fromUid === selectedUser.uid);
        if (hasReceived) {
          const connId = profile.uid < selectedUser.uid ? `${profile.uid}_${selectedUser.uid}` : `${selectedUser.uid}_${profile.uid}`;
          const connRef = doc(db, 'connections', connId);
          const connSnap = await getDoc(connRef);
          if (!connSnap.exists()) {
            await setDoc(connRef, {
              users: [profile.uid, selectedUser.uid].sort(),
              createdAt: serverTimestamp(),
            });
          }

          if (!profile.constellationId && !selectedUser.constellationId) {
            const constellationRef = await addDoc(collection(db, 'constellations'), {
              name: `${profile.nickname || profile.username} & ${selectedUser.nickname || selectedUser.username}'s Constellation`,
              memberIds: [profile.uid, selectedUser.uid],
              createdAt: serverTimestamp(),
            });
            await updateDoc(doc(db, 'users', profile.uid), { constellationId: constellationRef.id });
            await updateDoc(doc(db, 'users', selectedUser.uid), { constellationId: constellationRef.id });
          }
        }
      } catch (err) {
        console.error("Background connection error:", err);
      }
    };

    // Trigger background connection without awaiting
    ensureConnection();

    setSending(true);
    try {
      await addDoc(collection(db, 'interactions'), {
        fromUid: profile.uid,
        toUid: selectedUser.uid,
        message: messageContent,
        createdAt: serverTimestamp(),
        read: false,
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'interactions');
      // Remove optimistic message on error
      setChatMessages(prev => prev.filter(m => m.id !== optimisticId));
    } finally {
      setSending(false);
    }
  };

  const handleBack = () => {
    setSelectedUser(null);
  };

  const handleUserSelect = async (uid: string) => {
    try {
      const userDoc = await getDoc(doc(db, 'users', uid));
      if (userDoc.exists()) {
        setSelectedUser(userDoc.data() as UserProfile);
      }
    } catch (e) {
      handleFirestoreError(e, OperationType.GET, `users/${uid}`);
    }
  };

  if (!isOpen) return null;

  return (
    <ModalPortal zIndex={2000}>
      <div className="fixed inset-0 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="w-full max-w-lg bg-[#0B0B0C] border border-white/10 rounded-3xl shadow-2xl overflow-hidden flex flex-col h-[80vh] mb-24 md:mb-0"
        >
          {/* Header */}
          <div className="p-4 border-b border-white/5 flex justify-between items-center bg-white/5">
            <div className="flex items-center gap-3">
              {selectedUser && (
                <button onClick={handleBack} className="p-1 text-white/40 hover:text-white transition-colors">
                  <ChevronLeft className="w-5 h-5" />
                </button>
              )}
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-purple-400" />
                <h3 className="text-white font-bold uppercase tracking-widest text-sm">Siklab</h3>
              </div>
            </div>
            <button onClick={onClose} className="text-white/40 hover:text-white transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          {!selectedUser ? (
            <>
              {/* Tabs */}
              <div className="flex border-b border-white/5">
                <button 
                  onClick={() => setActiveTab('ugnayan')}
                  className={`flex-1 py-4 flex items-center justify-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] transition-all ${activeTab === 'ugnayan' ? 'text-purple-400 border-b-2 border-purple-400 bg-purple-400/5' : 'text-white/20 hover:text-white/40'}`}
                >
                  <Users className={`w-3.5 h-3.5 ${activeTab === 'ugnayan' ? 'text-purple-400' : 'text-white/20'}`} />
                  Ugnayan
                </button>
                <button 
                  onClick={() => setActiveTab('signals')}
                  className={`flex-1 py-4 flex items-center justify-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] transition-all ${activeTab === 'signals' ? 'text-purple-400 border-b-2 border-purple-400 bg-purple-400/5' : 'text-white/20 hover:text-white/40'}`}
                >
                  <MessageCircle className={`w-3.5 h-3.5 ${activeTab === 'signals' ? 'text-purple-400' : 'text-white/20'}`} />
                  Signals
                </button>
              </div>

              {/* List View */}
              <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-2">
                {loading ? (
                  <div className="flex justify-center py-10">
                    <Loader2 className="w-6 h-6 text-purple-500 animate-spin" />
                  </div>
                ) : activeTab === 'ugnayan' ? (
                  bonds.length === 0 ? (
                    <div className="text-center py-12 px-6">
                      <Users className="w-10 h-10 mx-auto mb-4 text-white/10" />
                      <p className="text-xs text-white/40 leading-relaxed italic font-medium max-w-[200px] mx-auto">
                        {randomUgnayanMessage}
                      </p>
                    </div>
                  ) : (
                    bonds.map((bond) => (
                      <button
                        key={bond.id}
                        onClick={() => setSelectedUser(bond.otherUser!)}
                        className="w-full flex items-center gap-4 p-4 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/5 transition-all text-left"
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
                          <div className="font-bold text-white text-sm">{bond.otherUser?.nickname || bond.otherUser?.username}</div>
                          <div className="text-[10px] text-white/40 uppercase tracking-widest font-bold">{bond.otherUser?.vibe || 'Mysterious Star'}</div>
                        </div>
                      </button>
                    ))
                  )
                ) : (
                  interactions.length === 0 ? (
                    <div className="text-center py-12 px-6">
                      <MessageCircle className="w-10 h-10 mx-auto mb-4 text-white/10" />
                      <p className="text-xs text-white/40 leading-relaxed italic font-medium max-w-[200px] mx-auto">
                        Tahimik ang iyong kalawakan. Maghintay ng siklab mula sa iyong mga buklod.
                      </p>
                    </div>
                  ) : (
                    interactions.map((interaction) => (
                      <button
                        key={interaction.id}
                        onClick={() => handleUserSelect(interaction.fromUid)}
                        className={`w-full flex items-center gap-4 p-4 rounded-2xl border transition-all text-left ${interaction.read ? 'bg-white/5 border-white/5 opacity-60' : 'bg-purple-500/10 border-purple-500/20'}`}
                      >
                        <div 
                          className="w-10 h-10 rounded-full flex items-center justify-center font-bold shrink-0"
                          style={{
                            backgroundColor: `${getHexColor(interaction.senderColor || 'purple')}20`,
                            border: `1px solid ${getHexColor(interaction.senderColor || 'purple')}`,
                            color: getHexColor(interaction.senderColor || 'purple'),
                            boxShadow: `0 0 10px ${getHexColor(interaction.senderColor || 'purple')}40`
                          }}
                        >
                          {(interaction.senderName || '?').charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-start mb-1">
                            <div className="font-bold text-white text-sm">{interaction.senderName}</div>
                            <div className="text-[8px] text-white/30 uppercase font-bold">
                              {interaction.createdAt?.toDate ? interaction.createdAt.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now'}
                            </div>
                          </div>
                          <div className="text-xs text-white/60 line-clamp-1 italic">"{interaction.message}"</div>
                        </div>
                        {!interaction.read && (
                          <div className="w-2 h-2 bg-purple-500 rounded-full shadow-[0_0_8px_rgba(168,85,247,0.8)]" />
                        )}
                      </button>
                    ))
                  )
                )}
              </div>
            </>
          ) : (
            <>
              {/* Chat View */}
              <div className="p-4 border-b border-white/5 bg-white/5 flex items-center gap-3">
                <div 
                  className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs"
                  style={{
                    backgroundColor: `${getHexColor(selectedUser.color)}20`,
                    border: `1px solid ${getHexColor(selectedUser.color)}`,
                    color: getHexColor(selectedUser.color)
                  }}
                >
                  {(selectedUser.nickname || selectedUser.username).charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="font-bold text-white text-sm">{selectedUser.nickname || selectedUser.username}</div>
                  <div className="text-[8px] text-white/40 uppercase tracking-[0.2em] font-bold">{selectedUser.vibe}</div>
                </div>
                
                <button 
                  onClick={() => onUserClick(selectedUser)}
                  className="ml-auto p-2 bg-white/5 hover:bg-white/10 text-white/40 hover:text-white rounded-xl transition-all"
                  title="View Profile"
                >
                  <Users className="w-4 h-4" />
                </button>
              </div>

              <div 
                ref={scrollRef}
                className="flex-1 p-4 space-y-4 overflow-y-auto custom-scrollbar bg-black/40"
              >
                {chatLoading ? (
                  <div className="flex items-center justify-center h-full">
                    <Loader2 className="w-6 h-6 text-purple-500 animate-spin" />
                  </div>
                ) : (
                  <>
                    {isBonding && (
                      <div className="flex justify-center mb-4">
                        <div className="px-3 py-1 bg-purple-500/10 border border-purple-500/20 rounded-full flex items-center gap-2">
                          <div className="w-1 h-1 bg-purple-400 rounded-full animate-ping" />
                          <span className="text-[9px] text-purple-300/80 uppercase tracking-widest font-bold">Nabubuo ang ugnayan...</span>
                        </div>
                      </div>
                    )}
                    {chatMessages.length === 0 ? (
                      <div className="text-center py-12 opacity-20">
                        <p className="text-[10px] uppercase tracking-[0.3em] font-bold">Begin your conversation</p>
                      </div>
                    ) : (
                      chatMessages.map((msg) => (
                        <div 
                          key={msg.id}
                          className={`flex flex-col ${msg.fromUid === profile?.uid ? 'items-end' : 'items-start'} ${msg.isOptimistic ? 'opacity-70' : ''}`}
                        >
                          <div className={`px-4 py-2.5 rounded-2xl text-xs leading-relaxed max-w-[85%] ${
                            msg.fromUid === profile?.uid 
                              ? 'bg-purple-500/20 text-purple-100 border border-purple-500/20 shadow-[0_0_15px_rgba(168,85,247,0.1)]' 
                              : 'bg-white/5 text-white/90 border border-white/5'
                          }`}>
                            {msg.message}
                          </div>
                          <span className="text-[8px] text-white/20 mt-1 px-2 font-bold uppercase">
                            {msg.createdAt?.toDate ? msg.createdAt.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Now'}
                          </span>
                        </div>
                      ))
                    )}
                  </>
                )}
              </div>

              {/* Chat Input */}
              <div className="p-4 bg-[#0B0B0C] border-t border-white/5">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                    placeholder="Send a signal..."
                    className="flex-1 bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-sm text-white focus:outline-none focus:border-purple-500 transition-colors"
                  />
                  <button
                    onClick={handleSend}
                    disabled={!newMessage.trim() || sending}
                    className="w-12 h-12 bg-purple-500 hover:bg-purple-600 disabled:opacity-50 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-purple-500/20 transition-all active:scale-90 shrink-0"
                  >
                    {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                  </button>
                </div>
              </div>
            </>
          )}
        </motion.div>
      </div>
    </ModalPortal>
  );
};
