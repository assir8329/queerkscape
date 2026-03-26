import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { UnsaidThought } from '../types';
import { MessageSquare } from 'lucide-react';

interface ThoughtBubbleProps {
  thought: UnsaidThought;
  onExpand: (thought: UnsaidThought) => void;
}

export const ThoughtBubble: React.FC<ThoughtBubbleProps> = ({ thought, onExpand }) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Random delay to make them appear organically
    const delay = Math.random() * 5000;
    const timer = setTimeout(() => setIsVisible(true), delay);
    
    // Fading out after some time
    const fadeOutTimer = setTimeout(() => setIsVisible(false), 20000 + Math.random() * 10000);

    return () => {
      clearTimeout(timer);
      clearTimeout(fadeOutTimer);
    };
  }, []);

  if (!thought.x || !thought.y) return null;

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0 }}
          className="absolute z-10 cursor-pointer pointer-events-auto group"
          style={{ left: thought.x, top: thought.y }}
          onClick={() => onExpand(thought)}
        >
          {/* Glowing Pulse */}
          <div className="absolute -inset-4 bg-purple-500/20 rounded-full blur-xl animate-pulse group-hover:bg-purple-500/40 transition-all" />
          
          {/* Icon/Bubble */}
          <div className="relative bg-white/10 backdrop-blur-md border border-white/20 p-2 rounded-full shadow-[0_0_15px_rgba(168,85,247,0.3)] hover:scale-110 transition-transform">
            <MessageSquare className="w-3 h-3 text-purple-300" />
          </div>

          {/* Mini Preview on Hover */}
          <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
            <div className="bg-[#0a0a1a]/90 backdrop-blur-md border border-white/10 rounded-xl p-3 shadow-2xl w-48 text-center">
              <p className="text-white/80 text-[10px] font-medium leading-relaxed line-clamp-2">"{thought.text}"</p>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
