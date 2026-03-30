import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, Mail, Lock, User, ArrowRight, Loader2, X } from 'lucide-react';

export const Auth: React.FC<{ onClose?: () => void }> = ({ onClose }) => {
  const { signIn, signInWithEmail, signUpWithEmail, loading } = useAuth();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      if (isSignUp) {
        if (username.length < 3) throw new Error('Username must be at least 3 characters.');
        if (password.length < 6) throw new Error('Password must be at least 6 characters.');
        await signUpWithEmail(email, password, username);
      } else {
        await signInWithEmail(email, password);
      }
    } catch (err: any) {
      if (err.code === 'auth/operation-not-allowed') {
        setError('Email/Password sign-in is not enabled. Please enable it in the Firebase Console under Authentication > Sign-in method.');
      } else {
        setError(err.message || 'An error occurred during authentication.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#050510] text-white">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
        >
          <Sparkles className="w-8 h-8 text-purple-400" />
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#050510] text-white overflow-hidden relative p-4">
      {/* Background stars */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(50)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute bg-white rounded-full opacity-20"
            style={{
              width: Math.random() * 4 + 1 + 'px',
              height: Math.random() * 4 + 1 + 'px',
              top: Math.random() * 100 + '%',
              left: Math.random() * 100 + '%',
            }}
            animate={{
              opacity: [0.2, 0.8, 0.2],
              scale: [1, 1.5, 1],
            }}
            transition={{
              duration: Math.random() * 3 + 2,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="z-10 w-full max-w-[400px] flex flex-col items-center p-8 bg-[#050510]/95 backdrop-blur-2xl rounded-xl border border-white/10 shadow-2xl relative"
      >
        {onClose && (
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 p-2 text-white/40 hover:text-white transition-colors z-50"
            aria-label="Close login"
          >
            <X className="w-4 h-4" />
          </button>
        )}
        <div className="flex flex-col items-center mb-8">
          <Sparkles className="w-10 h-10 text-purple-400 mb-4" />
          <h1 className="text-xl font-brand font-normal mb-2 tracking-[0.3em] uppercase text-white">
            HIRAYA
          </h1>
          <p className="text-white/40 text-center text-[11px] tracking-wider uppercase">
            {isSignUp ? 'Find your place among the stars.' : 'Welcome back to your constellation.'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="w-full space-y-3.5 mb-6">
          <AnimatePresence mode="wait">
            {isSignUp && (
              <motion.div
                key="username"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="relative"
              >
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30" />
                <input
                  type="text"
                  placeholder="USERNAME"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-white/[0.03] border border-white/5 rounded-xl py-3 pl-10 pr-4 text-xs text-white placeholder:text-white/20 focus:outline-none focus:border-purple-500/30 focus:bg-white/[0.06] transition-all tracking-wider"
                  required
                />
              </motion.div>
            )}
          </AnimatePresence>

          <div className="relative">
            <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30" />
            <input
              type="email"
              placeholder="EMAIL"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-white/[0.03] border border-white/5 rounded-xl py-3 pl-10 pr-4 text-xs text-white placeholder:text-white/20 focus:outline-none focus:border-purple-500/30 focus:bg-white/[0.06] transition-all tracking-wider"
              required
            />
          </div>

          <div className="relative">
            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30" />
            <input
              type="password"
              placeholder="PASSWORD"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-white/[0.03] border border-white/5 rounded-xl py-3 pl-10 pr-4 text-xs text-white placeholder:text-white/20 focus:outline-none focus:border-purple-500/30 focus:bg-white/[0.06] transition-all tracking-wider"
              required
            />
          </div>

          {error && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-red-400/80 text-[10px] text-center tracking-wide"
            >
              {error}
            </motion.p>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className={`w-full py-3 rounded-xl text-[11px] font-ui uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-2 disabled:opacity-50 ${
              isSignUp 
                ? 'bg-yellow-500 hover:bg-yellow-400 text-black shadow-[0_0_20px_rgba(234,179,8,0.3)]' 
                : 'bg-purple-600 hover:bg-purple-500 text-white shadow-[0_0_20px_rgba(168,85,247,0.3)]'
            }`}
          >
            {isSubmitting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                {isSignUp ? 'Join Hiraya' : 'Reignite Star'}
                <ArrowRight className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </form>

        <div className="w-full flex items-center gap-4 mb-6">
          <div className="h-px flex-1 bg-white/5" />
          <span className="text-white/10 text-[9px] uppercase tracking-[0.3em]">or</span>
          <div className="h-px flex-1 bg-white/5" />
        </div>

        <button
          onClick={signIn}
          className="w-full py-3 bg-white/[0.02] hover:bg-white/[0.05] border border-white/5 rounded-xl transition-all flex items-center justify-center gap-3 font-ui text-[10px] uppercase tracking-widest text-white/60 hover:text-white"
        >
          <img src="https://www.google.com/favicon.ico" alt="Google" className="w-3.5 h-3.5 opacity-70" />
          Sign in with Google
        </button>

        <p className="mt-8 text-white/30 text-[10px] uppercase tracking-widest">
          {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
          <button
            onClick={() => setIsSignUp(!isSignUp)}
            className="text-purple-400 hover:text-purple-300 font-ui transition-colors"
          >
            {isSignUp ? 'SIGN IN' : 'SIGN UP'}
          </button>
        </p>
      </motion.div>
    </div>
  );
};
