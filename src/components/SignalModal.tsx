import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, X, Send } from 'lucide-react';

import { ModalPortal } from './ModalPortal';

interface SignalModalProps {
  isOpen: boolean;
  onClose: () => void;
  dailyPrompt: string;
  onSubmit: (response: string) => Promise<void>;
}

export const SignalModal: React.FC<SignalModalProps> = ({ isOpen, onClose, dailyPrompt, onSubmit }) => {
  const [response, setResponse] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!response.trim() || isSubmitting) return;

    setIsSubmitting(true);
    await onSubmit(response);
    setResponse('');
    setIsSubmitting(false);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <ModalPortal zIndex={2000}>
          <div className="fixed inset-0 flex items-center justify-center p-4 sm:p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
              className="absolute inset-0 bg-[#050510]/60 backdrop-blur-sm"
            />
            
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-lg bg-[#050510]/95 backdrop-blur-2xl border border-white/10 rounded-xl shadow-2xl overflow-hidden flex flex-col"
            >
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-purple-500/50 to-transparent" />
            
            <div className="p-8 pb-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-purple-500/10 flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-purple-400" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white tracking-tight">Sambit</h2>
                  <p className="text-white/40 text-xs mt-0.5">Share your presence with the universe.</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-white/5 rounded-full transition-colors text-white/40 hover:text-white"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-8 pt-4 space-y-6">
              <div className="space-y-3">
                <label className="text-[10px] font-bold text-white/30 uppercase tracking-[0.2em] px-1">
                  {dailyPrompt}
                </label>
                <textarea
                  autoFocus
                  value={response}
                  onChange={(e) => setResponse(e.target.value)}
                  placeholder="Type your reflection..."
                  className="w-full bg-white/5 border border-white/10 rounded-3xl px-6 py-0 text-white placeholder:text-white/20 focus:outline-none focus:border-purple-500/50 resize-none h-40 text-lg leading-relaxed transition-all font-medium"
                  maxLength={140}
                />
                <div className="flex justify-end px-2">
                  <span className={`text-[10px] font-mono ${response.length > 120 ? 'text-yellow-400' : 'text-white/20'}`}>
                    {response.length} / 140
                  </span>
                </div>
              </div>

              <button
                type="submit"
                disabled={!response.trim() || isSubmitting}
                className="w-full flex items-center justify-center gap-3 py-4 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 disabled:hover:bg-purple-600 text-white rounded-2xl font-bold transition-all shadow-[0_0_20px_rgba(168,85,247,0.3)] active:scale-[0.98] group"
              >
                <span>Sambit</span>
                {isSubmitting ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Send size={18} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                )}
              </button>
            </form>
          </motion.div>
        </div>
        </ModalPortal>
      )}
    </AnimatePresence>
  );
};
