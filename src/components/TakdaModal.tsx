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
              className="w-full max-w-[400px] bg-[#050510]/95 border border-white/10 rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh] mb-24 md:mb-0 backdrop-blur-2xl"
            >
            <div className="p-4 border-b border-white/5 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <TakdaIcon className="w-4 h-4 text-purple-400" />
                <h3 className="text-white font-bold uppercase tracking-[0.2em] text-xs">TAKDA NG HIRAYA</h3>
              </div>
              <button onClick={onClose} className="text-white/40 hover:text-white transition-colors p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto custom-scrollbar space-y-8">
              <section>
                <div className="flex items-center gap-2 mb-4 border-b border-white/5 pb-1">
                  <ShieldAlert className="w-3.5 h-3.5 text-red-400" />
                  <h4 className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em]">MGA TALANG BINUKOD</h4>
                </div>
                
                {loading ? (
                  <div className="flex justify-center py-4">
                    <div className="w-5 h-5 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : blockedStars.length === 0 ? (
                  <p className="text-xs text-white/30 font-medium italic">No stars are currently blocked.</p>
                ) : (
                  <div className="space-y-2">
                    {blockedStars.map(star => (
                      <div key={star.uid} className="flex items-center justify-between p-3 bg-white/[0.02] rounded-xl border border-white/5">
                        <div className="flex flex-col">
                          <span className="text-sm text-white font-medium">{star.nickname || star.username}</span>
                          <span className="text-[10px] text-white/30 font-mono">@{star.username}</span>
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

              <section>
                <div className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em] mb-4 border-b border-white/5 pb-1">Katiwasayan</div>
                <div className="bg-white/[0.02] rounded-2xl p-4 border border-white/5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-white font-bold uppercase tracking-wider">Location Privacy</p>
                      <p className="text-[10px] text-white/30">You can toggle this in your profile editor.</p>
                    </div>
                    <div className="relative inline-flex h-6 w-11 items-center rounded-full transition-all focus:outline-none group opacity-80">
                      <div className={`absolute inset-0 rounded-full transition-all duration-300 ${profile?.hideLocation ? 'bg-purple-500/20 shadow-[0_0_15px_rgba(168,85,247,0.4)]' : 'bg-white/5'}`} />
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-all duration-300 shadow-lg relative z-10 ${
                          profile?.hideLocation ? 'translate-x-6 bg-purple-400 shadow-[0_0_10px_rgba(168,85,247,0.8)]' : 'translate-x-1 bg-white/40'
                        }`}
                      />
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
