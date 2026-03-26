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
    setIsVisible(true);
    
    // Fading out after some time
    const fadeOutTimer = setTimeout(() => setIsVisible(false), 60000 + Math.random() * 30000);

    return () => {
      clearTimeout(fadeOutTimer);
    };
  }, []);

  if (thought.x == null || thought.y == null) return null;

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0 }}
          className="absolute z-10 cursor-pointer pointer-events-auto group"
          style={{ left: thought.x, top: thought.y }}
          onClick={() => {
            onExpand(thought);
          }}
        >
          {/* Glowing Pulse */}
          <div className="absolute -inset-2 bg-purple-500/20 rounded-full blur-lg animate-pulse group-hover:bg-purple-500/40 transition-all" />
          
          {/* Icon/Bubble */}
          <div className="relative bg-purple-500/20 backdrop-blur-md border border-purple-500/60 p-1 rounded-full shadow-[0_0_10px_rgba(168,85,247,0.6)] hover:scale-110 transition-transform">
            <MessageSquare className="w-2 h-2 text-purple-400" />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
