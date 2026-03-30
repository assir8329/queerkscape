import React, { useState, useEffect, useRef } from 'react';
import { useAuth, UserProfile } from '../contexts/AuthContext';
import { motion, AnimatePresence } from 'motion/react';
import { X, Send, MessageCircle, Loader2 } from 'lucide-react';
import { collection, addDoc, serverTimestamp, query, where, onSnapshot, orderBy, limit, or, and } from 'firebase/firestore';
import { db } from '../firebase';
import { getHexColor } from '../lib/colors';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';
import { ModalPortal } from './ModalPortal';

interface CompactChatModalProps {
  user: UserProfile | null;
  onClose: () => void;
}

export const CompactChatModal: React.FC<CompactChatModalProps> = ({ user, onClose }) => {
  const { profile } = useAuth();
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isBonding, setIsBonding] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!profile || !user) return;

    // Check if ugnayan exists to determine "bonding" state
    const ugnayanId = profile.uid < user.uid ? `${profile.uid}-${user.uid}` : `${user.uid}-${profile.uid}`;
    const { doc, getDoc, onSnapshot: onSnap } = require('firebase/firestore');
    const ugnayanRef = doc(db, 'ugnayan', ugnayanId);
    
    getDoc(ugnayanRef).then((snap: any) => {
      if (!snap.exists()) {
        setIsBonding(true);
      } else {
        setIsBonding(false);
      }
    }).catch(() => setIsBonding(false));

    // Listen for ugnayan creation
    const unsubscribeUgnayan = onSnap(ugnayanRef, (snap: any) => {
      if (snap.exists()) {
        setIsBonding(false);
      }
    });

    // Query for messages between these two users
    const q = query(
      collection(db, 'interactions'),
      or(
        and(where('fromUid', '==', profile.uid), where('toUid', '==', user.uid)),
        and(where('fromUid', '==', user.uid), where('toUid', '==', profile.uid))
      ),
      orderBy('createdAt', 'desc'),
      limit(10)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const msgs = snapshot.docs
          .map(doc => ({ id: doc.id, ...doc.data() }))
          .filter((m: any) => m.toUid === profile.uid || m.toUid === user.uid)
          .sort((a: any, b: any) => (a.createdAt?.toMillis?.() || 0) - (b.createdAt?.toMillis?.() || 0));
        setMessages(msgs);
        setLoading(false);
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, 'interactions');
        setLoading(false);
      }
    );

    return () => {
      unsubscribe();
      unsubscribeUgnayan();
    };
  }, [profile, user]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  if (!user || !profile) return null;

  const handleSend = async () => {
    if (!message.trim() || sending) return;

    const messageContent = message.trim();
    setMessage('');
    
    // Optimistic UI update
    const optimisticId = `temp-${Date.now()}`;
    const optimisticMsg = {
      id: optimisticId,
      fromUid: profile.uid,
      toUid: user.uid,
      message: messageContent,
      createdAt: { toMillis: () => Date.now() },
      isOptimistic: true
    };
    
    setMessages(prev => [...prev, optimisticMsg]);

    // Background connection logic
    const ensureConnection = async () => {
      const ugnayanId = profile.uid < user.uid ? `${profile.uid}-${user.uid}` : `${user.uid}-${profile.uid}`;
      try {
        const { getDoc, doc, setDoc } = await import('firebase/firestore');
        const ugnayanRef = doc(db, 'ugnayan', ugnayanId);
        const ugnayanSnap = await getDoc(ugnayanRef);
        
        if (!ugnayanSnap.exists()) {
          await setDoc(ugnayanRef, {
            users: [profile.uid, user.uid].sort(),
            createdAt: serverTimestamp(),
            from_coord: { x: profile.x, y: profile.y, color: profile.color },
            to_coord: { x: user.x, y: user.y, color: user.color }
          });
        }
      } catch (err) {
        console.error("Background connection error:", err);
      }
    };

    // Trigger background connection
    ensureConnection();

    setSending(true);
    try {
      await addDoc(collection(db, 'interactions'), {
        fromUid: profile.uid,
        toUid: user.uid,
        message: messageContent,
        createdAt: serverTimestamp(),
        read: false,
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'interactions');
      // Remove optimistic message on error
      setMessages(prev => prev.filter(m => m.id !== optimisticId));
    } finally {
      setSending(false);
    }
  };

  const hexColor = getHexColor(user.color);

  return (
    <AnimatePresence>
      <ModalPortal zIndex={3000}>
        <div className="fixed inset-0 flex items-center justify-center p-4 pointer-events-none">
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="pointer-events-auto w-[90vw] max-w-[360px] bg-[#050510]/95 backdrop-blur-2xl border border-white/10 rounded-3xl shadow-2xl overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between bg-white/5">
              <div className="flex items-center gap-2 min-w-0">
                <div 
                  className="w-6 h-6 rounded-full shrink-0" 
                  style={{ backgroundColor: hexColor }}
                />
                <div className="min-w-0">
                  <h3 className="text-xs font-bold text-white truncate">
                    {user.nickname || user.username}
                  </h3>
                  <p className="text-[8px] text-white/40 uppercase tracking-widest font-black">Signal</p>
                </div>
              </div>
              <button 
                onClick={onClose}
                className="p-1 text-white/40 hover:text-white transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {/* Messages Preview */}
            <div 
              ref={scrollRef}
              className="flex-1 p-3 space-y-2 max-h-[200px] overflow-y-auto custom-scrollbar min-h-[80px]"
            >
              {loading ? (
                <div className="flex items-center justify-center h-full py-4">
                  <Loader2 className="w-4 h-4 text-purple-500 animate-spin" />
                </div>
              ) : (
                <>
                  {isBonding && (
                    <div className="flex justify-center mb-2">
                      <div className="px-2 py-0.5 bg-purple-500/10 border border-purple-500/20 rounded-full flex items-center gap-1.5">
                        <div className="w-1 h-1 bg-purple-400 rounded-full animate-ping" />
                        <span className="text-[8px] text-purple-300/80 uppercase tracking-widest font-bold">Nabubuo ang ugnayan...</span>
                      </div>
                    </div>
                  )}
                  {messages.length === 0 ? (
                    <div className="text-center py-6 px-4">
                      <p className="text-[10px] text-white/40 italic leading-relaxed">
                        Tahimik ang iyong kalawakan. Maghintay ng siklab mula sa iyong mga buklod.
                      </p>
                    </div>
                  ) : (
                    messages.map((msg) => (
                      <div 
                        key={msg.id}
                        className={`flex flex-col ${msg.fromUid === profile.uid ? 'items-end' : 'items-start'} ${msg.isOptimistic ? 'opacity-70' : ''}`}
                      >
                        <div className={`px-3 py-1.5 rounded-xl text-[11px] leading-relaxed max-w-[90%] ${
                          msg.fromUid === profile.uid 
                            ? 'bg-purple-500/20 text-purple-100 border border-purple-500/20' 
                            : 'bg-white/5 text-white/90 border border-white/5'
                        }`}>
                          {msg.message}
                        </div>
                      </div>
                    ))
                  )}
                </>
              )}
            </div>

            {/* Input */}
            <div className="p-3 bg-black/20 border-t border-white/5">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                  placeholder="Send a signal..."
                  className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-0 text-xs text-white focus:outline-none focus:border-purple-500 transition-colors"
                  autoFocus
                />
                <button
                  onClick={handleSend}
                  disabled={!message.trim() || sending}
                  className="w-9 h-9 bg-purple-500 hover:bg-purple-600 disabled:opacity-50 text-white rounded-xl flex items-center justify-center transition-all active:scale-90 shrink-0"
                >
                  <Send size={14} />
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      </ModalPortal>
    </AnimatePresence>
  );
};
