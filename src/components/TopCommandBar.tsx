import React, { useState } from 'react';
import { Search, Sparkles, X, Send, Command } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { UserProfile, useAuth } from '../contexts/AuthContext';

interface TopCommandBarProps {
  user: any;
  profile: UserProfile | null;
  dailyPrompt: string;
  filterTag: string;
  setFilterTag: (tag: string) => void;
  onPromptSubmit: (response: string) => Promise<void>;
  isVisible?: boolean;
}

export const TopCommandBar: React.FC<TopCommandBarProps> = ({
  user,
  profile,
  dailyPrompt,
  filterTag,
  setFilterTag,
  onPromptSubmit,
  isVisible = true
}) => {
  const { guestName } = useAuth();
  const [isExpanded, setIsExpanded] = useState(false);
  const [promptResponse, setPromptResponse] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!promptResponse.trim()) return;
    setIsSubmitting(true);
    await onPromptSubmit(promptResponse);
    setPromptResponse('');
    setIsExpanded(false);
    setIsSubmitting(false);
  };

  return (
    <div className="absolute top-6 left-1/2 -translate-x-1/2 z-50 w-full max-w-2xl px-6 pointer-events-none hidden md:block">
      <motion.div 
        animate={{ 
          opacity: isVisible ? 1 : 0.2,
          y: isVisible ? 0 : -10,
          scale: isVisible ? 1 : 0.98
        }}
        transition={{ type: "spring", stiffness: 200, damping: 25 }}
        className="pointer-events-auto"
      >
        <div className={`glass rounded-[2rem] p-1 flex items-center gap-2 shadow-2xl transition-all duration-500 ${isExpanded ? 'rounded-[2.5rem]' : ''}`}>
          
          {/* Left: Daily Prompt Trigger */}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className={`flex items-center gap-3 px-4 py-2 rounded-full transition-all duration-500 group relative overflow-hidden ${isExpanded ? 'bg-purple-500/20 text-purple-300' : 'hover:bg-white/5 text-white/60 hover:text-white'}`}
          >
            <Sparkles className={`w-3.5 h-3.5 transition-transform duration-500 ${isExpanded ? 'rotate-12 scale-110 text-yellow-400' : 'group-hover:scale-110'}`} />
            <span className="text-xs font-medium whitespace-nowrap hidden sm:inline">
              {isExpanded ? 'Sharing Sambit...' : dailyPrompt}
            </span>
            <span className="text-xs font-medium sm:hidden">
              {isExpanded ? 'Sambit' : 'Prompt'}
            </span>
            {isExpanded && (
              <motion.div 
                layoutId="glow"
                className="absolute inset-0 bg-purple-500/10 blur-xl"
              />
            )}
          </button>

          {/* Divider */}
          <div className="w-px h-5 bg-white/10 mx-1" />

          {/* Center: Search / Filter */}
          <div className="flex-1 relative group">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/20 group-focus-within:text-purple-400 transition-colors" />
            <input
              type="text"
              placeholder="Filter by vibe..."
              value={filterTag}
              onChange={(e) => setFilterTag(e.target.value)}
              className="w-full bg-transparent border-none py-2 pl-10 pr-4 text-white placeholder:text-white/20 focus:outline-none text-xs font-medium"
            />
            {filterTag && (
              <button 
                onClick={() => setFilterTag('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-white/10 rounded-full text-white/40 hover:text-white transition-all"
              >
                <X size={12} />
              </button>
            )}
          </div>

          {/* Right: Quick Action / Status */}
          <div className="hidden sm:flex items-center gap-2 pr-2">
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 rounded-full border border-white/5">
              <Command size={12} className="text-white/30" />
              <span className="text-[10px] font-bold text-white/30 uppercase tracking-widest">K</span>
            </div>
          </div>
        </div>

        {/* Expanded Prompt Input */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 12, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              className="glass-dark rounded-[2.5rem] p-6 shadow-2xl border-white/10 relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-purple-500/50 to-transparent" />
              
              {!user ? (
                <div className="flex flex-col items-center gap-4 py-4 text-center">
                  <div className="w-12 h-12 rounded-full bg-purple-500/10 flex items-center justify-center">
                    <Sparkles className="w-6 h-6 text-purple-400" />
                  </div>
                  <div>
                    <h3 className="text-white font-bold">Welcome, {guestName || 'Lost Star'}</h3>
                    <p className="text-white/40 text-sm mt-1">Sign in to share your daily sambit and connect with others.</p>
                  </div>
                  <button 
                    onClick={() => window.location.href = '/login'}
                    className="px-8 py-2.5 bg-purple-600 hover:bg-purple-500 text-white rounded-full text-sm font-bold transition-all shadow-lg shadow-purple-600/20 active:scale-95"
                  >
                    Go to Login
                  </button>
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold text-white/40 uppercase tracking-[0.2em]">{dailyPrompt}</h3>
                    <button onClick={() => setIsExpanded(false)} className="text-white/20 hover:text-white transition-colors">
                      <X size={18} />
                    </button>
                  </div>

                  <textarea
                    autoFocus
                    value={promptResponse}
                    onChange={(e) => setPromptResponse(e.target.value)}
                    placeholder="Type your reflection..."
                    className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white placeholder:text-white/20 focus:outline-none focus:border-purple-500/50 resize-none h-32 text-base transition-all font-medium"
                    maxLength={140}
                  />

                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono text-white/20">
                      {promptResponse.length} / 140
                    </span>
                    <button
                      onClick={handleSubmit}
                      disabled={!promptResponse.trim() || isSubmitting}
                      className="flex items-center gap-2 px-6 py-2.5 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 disabled:hover:bg-purple-600 text-white rounded-full text-sm font-bold transition-all shadow-[0_0_20px_rgba(168,85,247,0.3)] active:scale-95 group"
                    >
                      <span>Sambit</span>
                      <Send size={14} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};
