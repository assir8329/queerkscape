import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, MessageSquare, MapPin, X } from 'lucide-react';

interface CreateActionHubProps {
  isOpen: boolean;
  onClose: () => void;
  onAction: (action: 'signal' | 'thought' | 'memory') => void;
}

export const CreateActionHub: React.FC<CreateActionHubProps> = ({ isOpen, onClose, onAction }) => {
  const actions = [
    {
      id: 'signal' as const,
      title: 'Send Signal',
      description: 'Share your vibe',
      icon: <Sparkles className="w-4 h-4 text-blue-400" />,
    },
    {
      id: 'thought' as const,
      title: 'Whisper Thought',
      description: 'Collective whisper',
      icon: <MessageSquare className="w-4 h-4 text-purple-400" />,
    },
    {
      id: 'memory' as const,
      title: 'Pin Memory',
      description: 'Mark a location',
      icon: <MapPin className="w-4 h-4 text-yellow-400" />,
    },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] md:hidden"
          />

          {/* Bottom Sheet (Floating Card above Nav) */}
          <motion.div
            initial={{ y: '100%', opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed bottom-[80px] left-4 right-4 z-[101] md:hidden bg-[#050510]/95 backdrop-blur-2xl border border-white/10 rounded-2xl p-4 shadow-[0_20px_50px_rgba(0,0,0,0.5)]"
          >
            {/* Handle */}
            <div className="w-8 h-1 bg-white/10 rounded-full mx-auto mb-4" />

            <div className="flex justify-between items-center mb-3 px-1">
              <h2 className="text-sm font-bold text-white/40 uppercase tracking-widest">Create</h2>
              <button 
                onClick={onClose}
                className="p-1.5 hover:bg-white/5 rounded-full transition-colors text-white/20"
              >
                <X size={16} />
              </button>
            </div>

            <div className="flex flex-col gap-1">
              {actions.map((action) => (
                <button
                  key={action.id}
                  onClick={() => {
                    onAction(action.id);
                    onClose();
                  }}
                  className="flex items-center gap-3 py-2.5 px-3 rounded-xl hover:bg-white/5 active:bg-white/10 transition-all active:scale-[0.98] text-left group"
                >
                  <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                    {action.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-medium text-white truncate">{action.title}</h3>
                    <p className="text-[10px] text-white/40 truncate">{action.description}</p>
                  </div>
                </button>
              ))}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
