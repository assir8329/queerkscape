import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';

interface ScrambleTextProps {
  from: string;
  to: string;
  duration?: number;
  delay?: number;
  className?: string;
}

const GLYPHS = 'abcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';

export const ScrambleText: React.FC<ScrambleTextProps> = ({
  from,
  to,
  duration = 800,
  delay = 1500,
  className = '',
}) => {
  const [text, setText] = useState(from);
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    let frame: number;
    let start: number;

    const update = (now: number) => {
      if (!start) start = now;
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);

      // Easing function for smoother transition
      const easeProgress = 1 - Math.pow(1 - progress, 3); 
      
      const result = to.split('').map((targetChar, i) => {
        // Each character has its own "reveal" threshold based on progress
        // We add some randomness to the threshold so they don't reveal strictly left-to-right
        const charThreshold = (i / to.length) * 0.5 + (Math.random() * 0.2);
        
        if (easeProgress > charThreshold + 0.3 || progress === 1) {
          return targetChar;
        }

        // If not revealed, either show original or a random glyph
        if (Math.random() > 0.8) {
          return GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
        }
        
        return from[i] || GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
      }).join('');

      setText(result);

      if (progress < 1) {
        frame = requestAnimationFrame(update);
      } else {
        setIsComplete(true);
      }
    };

    const timeout = setTimeout(() => {
      frame = requestAnimationFrame(update);
    }, delay);

    return () => {
      clearTimeout(timeout);
      cancelAnimationFrame(frame);
    };
  }, [from, to, duration, delay]);

  return (
    <motion.span 
      className={`relative inline-block ${className}`}
      animate={isComplete ? {
        textShadow: [
          "0 0 0px rgba(168,85,247,0)",
          "0 0 20px rgba(168,85,247,0.4)",
          "0 0 0px rgba(168,85,247,0)"
        ],
        scale: [1, 1.02, 1],
      } : {}}
      transition={{ 
        textShadow: { duration: 2, ease: "easeInOut" },
        scale: { duration: 0.4, ease: "easeOut" }
      }}
    >
      {text.split('').map((char, i) => (
        <motion.span
          key={i}
          initial={false}
          animate={{
            opacity: !isComplete ? [1, 0.6, 1] : 1,
            filter: !isComplete && Math.random() > 0.7 ? "blur(1px)" : "blur(0px)",
            y: !isComplete && Math.random() > 0.9 ? [0, -2, 0] : 0
          }}
          transition={{ 
            duration: 0.2,
            opacity: { repeat: !isComplete ? Infinity : 0, duration: 0.1 + Math.random() * 0.2 }
          }}
          className="inline-block"
        >
          {char === ' ' ? '\u00A0' : char}
        </motion.span>
      ))}
    </motion.span>
  );
};
