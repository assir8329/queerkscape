import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';
import { ModalPortal } from './ModalPortal';

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  reportedByUid: string;
  reportedUid?: string;
  contentId?: string;
  contentType: 'whisper' | 'memory' | 'user';
}

const REPORT_CATEGORIES = [
  { id: 'spam', label: 'Spam' },
  { id: 'harassment', label: 'Harassment' },
  { id: 'inappropriate', label: 'Inappropriate Content' },
  { id: 'hate_speech', label: 'Hate Speech' },
  { id: 'other', label: 'Other' },
];

export const ReportModal: React.FC<ReportModalProps> = ({ 
  isOpen, 
  onClose, 
  reportedByUid, 
  reportedUid, 
  contentId, 
  contentType 
}) => {
  const [category, setCategory] = useState('');
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!category || !reason.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'reports'), {
        reportedByUid,
        reportedUid: reportedUid || null,
        contentId: contentId || null,
        contentType,
        category,
        reason: reason.trim(),
        createdAt: serverTimestamp(),
      });
      setIsSuccess(true);
      setTimeout(() => {
        setIsSuccess(false);
        setCategory('');
        setReason('');
        onClose();
      }, 2000);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'reports');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <ModalPortal zIndex={3000}>
          <div className="fixed inset-0 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#0d0d16] border border-white/10 rounded-2xl p-6 w-full max-w-[400px] shadow-2xl relative overflow-hidden"
            >
              {/* Background Glow */}
              <div className="absolute -top-24 -right-24 w-48 h-48 bg-red-500/10 blur-[80px] rounded-full pointer-events-none" />

              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-red-500/20 flex items-center justify-center">
                    <AlertTriangle className="w-4 h-4 text-red-500" />
                  </div>
                  <h2 className="text-lg font-ui font-bold text-white">Report Content</h2>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 text-white/30 hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {isSuccess ? (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="py-12 flex flex-col items-center justify-center text-center"
                >
                  <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mb-4">
                    <CheckCircle2 className="w-8 h-8 text-green-500" />
                  </div>
                  <h3 className="text-xl font-ui font-bold text-white mb-2">Report Submitted</h3>
                  <p className="text-sm text-white/60">
                    Salamat sa iyong pag-uulat. Susuriin namin ito agad.
                  </p>
                </motion.div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div>
                    <label className="block text-xs font-ui-tech font-medium text-white/40 mb-3 uppercase tracking-widest">
                      Bakit mo ito inuulat?
                    </label>
                    <div className="grid grid-cols-1 gap-2">
                      {REPORT_CATEGORIES.map((cat) => (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => setCategory(cat.id)}
                          className={`w-full px-4 py-3 rounded-xl border text-left text-sm transition-all ${
                            category === cat.id
                              ? 'bg-red-500/10 border-red-500/50 text-red-500'
                              : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10 hover:border-white/20'
                          }`}
                        >
                          {cat.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-ui-tech font-medium text-white/40 mb-2 uppercase tracking-widest">
                      Karagdagang Detalye
                    </label>
                    <textarea
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      placeholder="Sabihin sa amin ang higit pa..."
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/20 focus:outline-none focus:ring-2 focus:ring-red-500/50 resize-none h-24 text-sm"
                      required
                    />
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button
                      type="button"
                      onClick={onClose}
                      className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-white font-ui font-bold rounded-xl transition-colors"
                    >
                      Bumalik
                    </button>
                    <button
                      type="submit"
                      disabled={!category || !reason.trim() || isSubmitting}
                      className="flex-1 py-3 bg-red-500 hover:bg-red-400 text-black font-ui font-bold rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isSubmitting ? 'Nagpapadala...' : 'Iulat'}
                    </button>
                  </div>
                </form>
              )}
            </motion.div>
          </div>
        </ModalPortal>
      )}
    </AnimatePresence>
  );
};
