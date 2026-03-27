import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Sparkles, MapPin, MessageSquare, Users, Globe, Star } from 'lucide-react';

import { ModalPortal } from './ModalPortal';

export const GuideModal: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const handleOpen = () => setIsOpen(true);
    window.addEventListener('open-guide', handleOpen);
    return () => window.removeEventListener('open-guide', handleOpen);
  }, []);

  const closeGuide = () => {
    setIsOpen(false);
  };

  const steps = [
    {
      icon: <Star className="w-6 h-6 text-yellow-400" />,
      title: "The Sky",
      description: "Every user is a star. Your color and position reflect your 'vibe' and interests."
    },
    {
      icon: <Sparkles className="w-6 h-6 text-purple-400" />,
      title: "Daily Sambit",
      description: "Broadcast a short 'sambit' each day to share what's on your mind with the sky."
    },
    {
      icon: <MessageSquare className="w-6 h-6 text-blue-400" />,
      title: "Bulong",
      description: "Leave anonymous reflections floating in the sky for others to discover."
    },
    {
      icon: <MapPin className="w-6 h-6 text-red-400" />,
      title: "Bakás",
      description: "Switch to The World to pin memories to real-world locations on the globe."
    },
    {
      icon: <Users className="w-6 h-6 text-green-400" />,
      title: "Kindred Souls",
      description: "Connect with other stars to see their signals more clearly and build a constellation."
    }
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <ModalPortal zIndex={2000}>
          <div className="fixed inset-0 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeGuide}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-[#1a1a2e] border border-white/10 rounded-[2.5rem] p-8 max-w-lg w-full shadow-2xl relative overflow-hidden"
            >
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-500 via-pink-500 to-blue-500" />
            
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-500/20 rounded-xl">
                  <Globe className="w-6 h-6 text-purple-400" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">GABAY</h2>
                  <p className="text-xs text-white/40 uppercase tracking-widest font-bold">ANG ATING TAGPUAN</p>
                </div>
              </div>
              <button 
                onClick={closeGuide}
                className="p-2 hover:bg-white/5 rounded-full text-white/40 hover:text-white transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-6 mb-8">
              {steps.map((step, i) => (
                <motion.div 
                  key={i}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className="flex gap-4 group"
                >
                  <div className="shrink-0 w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center group-hover:bg-white/10 transition-colors">
                    {step.icon}
                  </div>
                  <div>
                    <h3 className="text-white font-semibold text-sm mb-1">{step.title}</h3>
                    <p className="text-white/50 text-xs leading-relaxed">{step.description}</p>
                  </div>
                </motion.div>
              ))}
            </div>

            <button
              onClick={closeGuide}
              className="w-full py-4 bg-white/10 hover:bg-white/20 text-white rounded-2xl font-bold transition-all border border-white/10 active:scale-[0.98]"
            >
              Begin Your Journey
            </button>
          </motion.div>
        </div>
        </ModalPortal>
      )}
    </AnimatePresence>
  );
};
