import React, { useEffect, useState } from 'react';
import { collection, query, where, onSnapshot, updateDoc, doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth, UserProfile } from '../contexts/AuthContext';
import { motion, AnimatePresence } from 'motion/react';
import { Bell, X } from 'lucide-react';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';

interface Interaction {
  id: string;
  fromUid: string;
  toUid: string;
  message: string;
  createdAt: any;
  read: boolean;
  senderName?: string;
}

interface NotificationsProps {
  isOpen: boolean;
  onClose: () => void;
}

export const Notifications: React.FC<NotificationsProps> = ({ isOpen, onClose }) => {
  const { profile } = useAuth();
  const [interactions, setInteractions] = useState<Interaction[]>([]);

  useEffect(() => {
    if (!profile) return;

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
        
        // Fetch sender names
        const enrichedData = await Promise.all(data.map(async (interaction) => {
          try {
            const userDoc = await getDoc(doc(db, 'users', interaction.fromUid));
            if (userDoc.exists()) {
              const data = userDoc.data();
              interaction.senderName = data.nickname || data.username;
            } else {
              interaction.senderName = 'Unknown Star';
            }
          } catch (e) {
            handleFirestoreError(e, OperationType.GET, `users/${interaction.fromUid}`);
            interaction.senderName = 'Unknown Star';
          }
          return interaction;
        }));
        
        // Sort client-side
        enrichedData.sort((a, b) => {
          const timeA = a.createdAt?.toMillis?.() || 0;
          const timeB = b.createdAt?.toMillis?.() || 0;
          return timeB - timeA;
        });
        
        setInteractions(enrichedData);
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, 'interactions');
      }
    );

    return () => unsubscribe();
  }, [profile]);

  const unreadCount = interactions.filter((i) => !i.read).length;

  const markAsRead = async (id: string) => {
    try {
      await updateDoc(doc(db, 'interactions', id), { read: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `interactions/${id}`);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed top-4 right-4 z-50">
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            className="w-80 bg-[#1a1a2e] border border-white/10 rounded-2xl shadow-2xl overflow-hidden"
          >
            <div className="p-4 border-b border-white/10 flex justify-between items-center bg-white/5">
              <h3 className="text-white font-semibold">Signals Received</h3>
              <button onClick={onClose} className="text-white/50 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="max-h-96 overflow-y-auto custom-scrollbar">
              {interactions.length === 0 ? (
                <div className="p-6 text-center text-white/50 text-sm">
                  No signals yet. Keep exploring!
                </div>
              ) : (
                <div className="divide-y divide-white/5">
                  {interactions.map((interaction) => (
                    <div
                      key={interaction.id}
                      className={`p-4 transition-colors cursor-pointer ${interaction.read ? 'opacity-60 hover:bg-white/5' : 'bg-white/10 hover:bg-white/20'}`}
                      onClick={() => !interaction.read && markAsRead(interaction.id)}
                    >
                      <div className="flex justify-between items-start mb-1">
                        <span className="text-xs text-purple-400 font-medium">
                          From {interaction.senderName}
                        </span>
                        <span className="text-[10px] text-white/40">
                          {interaction.createdAt?.toDate ? interaction.createdAt.toDate().toLocaleDateString() : 'Just now'}
                        </span>
                      </div>
                      <p className="text-sm text-white/90 line-clamp-2">"{interaction.message}"</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
