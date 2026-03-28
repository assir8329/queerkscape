import React, { useEffect, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth, UserProfile } from '../contexts/AuthContext';
import { motion, AnimatePresence } from 'motion/react';
import { X, ShieldAlert, Trash2, Settings as TakdaIcon } from 'lucide-react';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';

import { ModalPortal } from './ModalPortal';

interface TakdaModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TakdaModal: React.FC<TakdaModalProps> = ({ isOpen, onClose }) => {
  const { profile, updateProfile } = useAuth();
  const [blockedStars, setBlockedStars] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!profile || !isOpen || !profile.blockedUsers || profile.blockedUsers.length === 0) {
      setBlockedStars([]);
      return;
    }

    const fetchBlocked = async () => {
      setLoading(true);
      const stars = await Promise.all(profile.blockedUsers.map(async (uid) => {
        try {
          const userDoc = await getDoc(doc(db, 'users', uid));
          return userDoc.exists() ? userDoc.data() as UserProfile : null;
        } catch (e) {
          handleFirestoreError(e, OperationType.GET, `users/${uid}`);
          return null;
        }
      }));
      setBlockedStars(stars.filter(s => s) as UserProfile[]);
      setLoading(false);
    };

    fetchBlocked();
  }, [profile, isOpen]);

  const handleUnblock = async (uid: string) => {
    if (!profile) return;
    const newBlocked = profile.blockedUsers.filter(id => id !== uid);
    await updateProfile({ blockedUsers: newBlocked });
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <ModalPortal zIndex={2000}>
          <div className="fixed inset-0 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="w-full max-w-md bg-[#1a1a2e] border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh] mb-24 md:mb-0"
            >
            <div className="p-4 border-b border-white/10 flex justify-between items-center bg-white/5">
              <div className="flex items-center gap-2">
                <TakdaIcon className="w-5 h-5 text-blue-400" />
                <h3 className="text-white font-semibold">TAKDA NG HIRAYA</h3>
              </div>
              <button onClick={onClose} className="text-white/50 hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto custom-scrollbar">
              <section className="mb-8">
                <div className="flex items-center gap-2 mb-4">
                  <ShieldAlert className="w-4 h-4 text-red-400" />
                  <h4 className="text-sm font-semibold text-white uppercase tracking-wider">MGA TALANG BINUKOD</h4>
                </div>
                
                {loading ? (
                  <div className="flex justify-center py-4">
                    <div className="w-5 h-5 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : blockedStars.length === 0 ? (
                  <p className="text-xs text-white/40 font-medium">No stars are currently blocked.</p>
                ) : (
                  <div className="space-y-2">
                    {blockedStars.map(star => (
                      <div key={star.uid} className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/5">
                        <div className="flex flex-col">
                          <span className="text-sm text-white font-medium">{star.nickname || star.username}</span>
                          <span className="text-[10px] text-white/30">@{star.username}</span>
                        </div>
                        <button 
                          onClick={() => handleUnblock(star.uid)}
                          className="p-2 text-red-400/60 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all"
                          title="Unblock"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              <section className="mb-4">
                <h4 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">Katiwasayan</h4>
                <div className="bg-white/5 rounded-xl p-4 border border-white/5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-white font-medium">Location Privacy</p>
                      <p className="text-xs text-white/40">You can toggle this in your profile editor.</p>
                    </div>
                    <div className={`w-10 h-5 rounded-full transition-colors ${profile?.hideLocation ? 'bg-purple-500' : 'bg-white/10'}`}>
                      <div className={`w-3 h-3 bg-white rounded-full mt-1 transition-transform ${profile?.hideLocation ? 'translate-x-6' : 'translate-x-1'}`} />
                    </div>
                  </div>
                </div>
              </section>
              
              <p className="text-[10px] text-white/20 text-center mt-8">
                Constellation v1.0.0 • Made with stardust
              </p>
            </div>
          </motion.div>
        </div>
        </ModalPortal>
      )}
    </AnimatePresence>
  );
};
