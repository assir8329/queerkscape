import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, MapPin, Calendar, Sparkles, Eye } from 'lucide-react';

import { Memory } from '../types';

interface MemoryViewModalProps {
  memory: Memory | null;
  onClose: () => void;
}

export const MemoryViewModal: React.FC<MemoryViewModalProps> = ({ memory, onClose }) => {
  if (!memory) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="bg-[#0a0a1a] border border-yellow-500/20 rounded-2xl p-6 w-full max-w-md shadow-2xl relative overflow-hidden"
        >
          {/* Decorative background glow */}
          <div className="absolute -top-20 -right-20 w-40 h-40 bg-yellow-500/10 rounded-full blur-3xl pointer-events-none" />
          
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-white/50 hover:text-white transition-colors z-10"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3 mb-6 relative z-10">
            <div className="w-10 h-10 rounded-full bg-yellow-500/20 flex items-center justify-center border border-yellow-500/30 shadow-[0_0_15px_rgba(234,179,8,0.3)]">
              <Sparkles className="w-5 h-5 text-yellow-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white tracking-wide">A Memory</h2>
              <div className="flex items-center gap-2 text-xs text-white/50 mt-1">
                <MapPin className="w-3 h-3 text-yellow-500/70" />
                <span>{memory.region}</span>
              </div>
            </div>
          </div>

          <div className="relative z-10 space-y-4">
            <div className="bg-white/5 border border-white/10 rounded-xl p-4">
              <p className="text-white/90 leading-relaxed italic font-serif text-lg">
                "{memory.text}"
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3 text-xs text-white/40">
              {memory.date && (
                <div className="flex items-center gap-1.5 bg-white/5 px-2.5 py-1.5 rounded-lg border border-white/5">
                  <Calendar className="w-3.5 h-3.5 text-yellow-500/70" />
                  <span>{memory.date.toDate ? memory.date.toDate().toLocaleDateString() : new Date(memory.date).toLocaleDateString()}</span>
                </div>
              )}
              
              {memory.vibe && (
                <div className="flex items-center gap-1.5 bg-white/5 px-2.5 py-1.5 rounded-lg border border-white/5">
                  <span className="text-yellow-500/70">~</span>
                  <span className="capitalize">{memory.vibe}</span>
                </div>
              )}

              {memory.viewCount !== undefined && memory.viewCount > 0 && (
                <div className="flex items-center gap-1.5 bg-yellow-500/10 px-2.5 py-1.5 rounded-lg border border-yellow-500/20 text-yellow-500/80 ml-auto">
                  <Eye className="w-3.5 h-3.5" />
                  <span className="font-medium">{memory.viewCount} views</span>
                </div>
              )}
            </div>
            
            <div className="text-[10px] text-white/20 text-center pt-2">
              Pinned on {memory.createdAt?.toDate ? memory.createdAt.toDate().toLocaleDateString() : 'recently'}
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
