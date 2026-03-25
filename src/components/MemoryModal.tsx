import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, MapPin, Calendar, Sparkles } from 'lucide-react';
import { collection, addDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';
import { UserProfile, Memory } from '../types';

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
        lat,
        lng,
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
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-[#0a0a1a] border border-white/10 rounded-2xl p-6 w-full max-w-md shadow-2xl relative"
          >
            <button
              onClick={onClose}
              className="absolute top-4 right-4 text-white/50 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-full bg-yellow-500/20 flex items-center justify-center border border-yellow-500/30">
                <Sparkles className="w-5 h-5 text-yellow-400" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Pin a Memory</h2>
                <div className="flex items-center gap-1 text-xs text-white/50 mt-1">
                  <MapPin className="w-3 h-3" />
                  <span>{region}</span>
                </div>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-white/60 mb-1 uppercase tracking-wider">
                  What happened here?
                </label>
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  maxLength={500}
                  placeholder="Leave a piece of your history..."
                  className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-yellow-500/50 resize-none h-32"
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
                {isSubmitting ? 'Pinning...' : 'Pin Memory'}
              </button>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
