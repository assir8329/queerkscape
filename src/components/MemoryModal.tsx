import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, MapPin, Calendar, Sparkles } from 'lucide-react';
import { collection, addDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';
import { UserProfile, Memory } from '../types';
import { getCityBaseCoordinates, getCityOffset } from '../lib/locations';

import { ModalPortal } from './ModalPortal';

interface MemoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile;
  lat: number;
  lng: number;
  region: string;
}

export const MemoryModal: React.FC<MemoryModalProps> = ({ isOpen, onClose, currentUser, lat, lng, region }) => {
  const [text, setText] = useState('');
  const [date, setDate] = useState('');
  const [vibe, setVibe] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const memoryData: any = {
        userId: currentUser.uid,
        text: text.trim(),
        type: 'memory',
        lat: lat,
        lng: lng,
        region,
        createdAt: serverTimestamp(),
        viewCount: 0,
      };

      if (date) {
        memoryData.date = new Date(date);
      }
      if (vibe) {
        memoryData.vibe = vibe.trim();
      }

      await addDoc(collection(db, 'memories'), memoryData);
      setText('');
      setDate('');
      setVibe('');
      onClose();
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'memories');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <ModalPortal zIndex={2000}>
          <div className="fixed inset-0 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#050510] border border-white/10 rounded-2xl p-4 w-full max-w-md shadow-2xl relative"
            >
            <div className="flex items-center justify-between mb-5 py-1 border-b border-white/5">
              <div className="flex items-center gap-2 truncate">
                <MapPin className="w-3.5 h-3.5 text-yellow-500 shrink-0" />
                <div className="flex items-center gap-1.5 truncate">
                  <span className="text-[10px] uppercase tracking-widest text-white/40 font-bold whitespace-nowrap">Bakás</span>
                  <span className="text-white/20">·</span>
                  <span className="text-xs text-white/60 truncate font-medium">{region}</span>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-1 text-white/30 hover:text-white transition-colors shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-white/60 mb-1 uppercase tracking-wider">
                  Anong nangyari rito?
                </label>
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  maxLength={500}
                  placeholder="Mag-iwan ng bakás ng iyong kasaysayan..."
                  className="w-full bg-white/5 border border-white/10 rounded-xl p-2 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-yellow-500/50 resize-none h-28 leading-relaxed"
                  required
                />
                <div className="text-right text-[10px] text-white/40 mt-1">
                  {text.length}/500
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-white/60 mb-1 uppercase tracking-wider">
                    Date (Optional)
                  </label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                    <input
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      max={new Date().toISOString().split('T')[0]}
                      className="w-full bg-white/5 border border-white/10 rounded-xl py-2 pl-9 pr-3 text-white focus:outline-none focus:ring-2 focus:ring-yellow-500/50 text-sm"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-white/60 mb-1 uppercase tracking-wider">
                    Vibe (Optional)
                  </label>
                  <input
                    type="text"
                    value={vibe}
                    onChange={(e) => setVibe(e.target.value)}
                    placeholder="e.g., Nostalgic"
                    maxLength={50}
                    className="w-full bg-white/5 border border-white/10 rounded-xl p-2 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-yellow-500/50 text-sm"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={!text.trim() || isSubmitting}
                className="w-full py-3 bg-yellow-500 hover:bg-yellow-400 text-black font-bold rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-4"
              >
                {isSubmitting ? 'Nagbabakás...' : 'Mag-iwan ng Bakás'}
              </button>
            </form>
          </motion.div>
        </div>
        </ModalPortal>
      )}
    </AnimatePresence>
  );
};
