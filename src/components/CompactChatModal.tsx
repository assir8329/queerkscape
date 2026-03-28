import React, { useState, useEffect, useRef } from 'react';
import { useAuth, UserProfile } from '../contexts/AuthContext';
import { motion, AnimatePresence } from 'motion/react';
import { X, Send, MessageCircle, Loader2 } from 'lucide-react';
import { collection, addDoc, serverTimestamp, query, where, onSnapshot, orderBy, limit } from 'firebase/firestore';
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
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!profile || !user) return;

    // Query for messages between these two users
    const q = query(
      collection(db, 'interactions'),
      where('fromUid', 'in', [profile.uid, user.uid]),
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

    return () => unsubscribe();
  }, [profile, user]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  if (!user || !profile) return null;

  const handleSend = async () => {
    if (!message.trim() || sending) return;

    setSending(true);
    try {
      await addDoc(collection(db, 'interactions'), {
        fromUid: profile.uid,
        toUid: user.uid,
        message: message.trim(),
        createdAt: serverTimestamp(),
        read: false,
      });
      setMessage('');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'interactions');
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
            className="pointer-events-auto w-[90vw] max-w-[360px] bg-[#1a1a2e]/98 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col"
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
              ) : messages.length === 0 ? (
                <div className="text-center py-6 px-4">
                  <p className="text-[10px] text-white/40 italic leading-relaxed">
                    Tahimik ang iyong kalawakan. Maghintay ng siklab mula sa iyong mga buklod.
                  </p>
                </div>
              ) : (
                messages.map((msg) => (
                  <div 
                    key={msg.id}
                    className={`flex flex-col ${msg.fromUid === profile.uid ? 'items-end' : 'items-start'}`}
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
                  className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500 transition-colors"
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
