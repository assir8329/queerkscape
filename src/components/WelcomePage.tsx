import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { useAuth } from '../contexts/AuthContext';
import { Sparkles, Map as MapIcon, LogIn, Globe } from 'lucide-react';
import { ScrambleText } from './ScrambleText';

export const WelcomePage: React.FC = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  // Optional: Auto-redirect logged-in users to map
  useEffect(() => {
    if (!loading && user) {
      // navigate('/map'); // Uncomment if you want auto-redirect
    }
  }, [user, loading, navigate]);

  return (
    <div className="relative w-full h-full overflow-hidden bg-[#050510] flex flex-col items-center justify-center font-sans">
      {/* Immersive Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Soft Gradients */}
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-600/20 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-pink-600/10 blur-[120px] rounded-full" />
        
        {/* Subtle Star Field */}
        {[...Array(50)].map((_, i) => (
          <motion.div
            key={i}
            initial={{ opacity: Math.random(), scale: Math.random() }}
            animate={{ 
              opacity: [0.2, 0.8, 0.2],
              scale: [0.8, 1.2, 0.8]
            }}
            transition={{ 
              duration: 3 + Math.random() * 4, 
              repeat: Infinity,
              delay: Math.random() * 5
            }}
            className="absolute w-0.5 h-0.5 bg-white rounded-full"
            style={{
              top: `${Math.random() * 100}%`,
              left: `${Math.random() * 100}%`,
            }}
          />
        ))}
      </div>

      {/* Content Container */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1.2, ease: "easeOut" }}
        className="relative z-10 flex flex-col items-center text-center px-6 max-w-2xl"
      >
        {/* Logo/Icon */}
        <motion.div
          animate={{ 
            y: [0, -10, 0],
            rotate: [0, 5, -5, 0]
          }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
          className="mb-8 p-4 rounded-full bg-white/5 border border-white/10 shadow-[0_0_30px_rgba(168,85,247,0.2)]"
        >
          <Sparkles className="w-12 h-12 text-purple-400" />
        </motion.div>

        {/* Title & Tagline */}
        <h1 className="text-5xl md:text-7xl font-semibold text-white tracking-tighter mb-2 min-h-[1.2em] flex items-center justify-center">
          Hiraya
        </h1>
        <p className="text-lg md:text-xl text-purple-300/60 font-medium tracking-widest uppercase mb-6">
          Ang ating tagpuan sa mga bituin.
        </p>

        {/* Description */}
        <p className="text-base md:text-lg text-white/60 leading-relaxed mb-10 max-w-md mx-auto">
          Isang santuwaryo para sa mga salitang hindi masabi. Map your internal world, leave whispers across the archipelago, and find your constellation.
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
          <button
            onClick={() => navigate('/map')}
            className="group relative flex items-center justify-center gap-3 bg-white text-black px-8 py-4 rounded-full font-semibold text-lg transition-all hover:scale-105 active:scale-95 w-full sm:w-auto overflow-hidden shadow-[0_0_20px_rgba(255,255,255,0.3)]"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-purple-400/0 via-purple-400/20 to-purple-400/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
            <Globe className="w-5 h-5" />
            Find your Constellation
          </button>

          <button
            onClick={() => navigate('/login')}
            className="flex items-center justify-center gap-3 bg-white/5 hover:bg-white/10 border border-white/10 text-white px-8 py-4 rounded-full font-semibold text-lg transition-all hover:scale-105 active:scale-95 w-full sm:w-auto"
          >
            <LogIn className="w-5 h-5 text-white/60" />
            Reignite your Star
          </button>
        </div>

        {/* Footer Hint */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2, duration: 1 }}
          className="mt-16 text-[10px] uppercase tracking-[0.3em] text-white/20 font-bold"
        >
          v1.0.0 • Made with stardust
        </motion.div>
      </motion.div>

      {/* Decorative Blur Orbs */}
      <div className="absolute top-[20%] right-[15%] w-32 h-32 bg-purple-500/10 blur-[60px] rounded-full animate-pulse" />
      <div className="absolute bottom-[20%] left-[15%] w-40 h-40 bg-pink-500/5 blur-[80px] rounded-full animate-pulse" style={{ animationDelay: '2s' }} />
    </div>
  );
};
