import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, limit, onSnapshot, addDoc, serverTimestamp, Timestamp, doc, updateDoc, increment } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { motion, AnimatePresence } from 'motion/react';
import { MessageSquare, Send, X, Sparkles, Ghost, Clock, Eye, MapPin, Globe, Navigation } from 'lucide-react';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';

import { UnsaidThought } from '../types';
import { getCityBaseCoordinates, getCityOffset } from '../lib/locations';

export const incrementViewCount = async (thoughtId: string) => {
  try {
    const viewedThoughts = JSON.parse(sessionStorage.getItem('viewedThoughts') || '[]');
    if (viewedThoughts.includes(thoughtId)) return;

    const thoughtRef = doc(db, 'unsaidThoughts', thoughtId);
    await updateDoc(thoughtRef, {
      viewCount: increment(1)
    });

    const updatedViewed = [...viewedThoughts, thoughtId];
    sessionStorage.setItem('viewedThoughts', JSON.stringify(updatedViewed));
  } catch (error) {
    // Silently fail for view counts
    handleFirestoreError(error, OperationType.UPDATE, `unsaidThoughts/${thoughtId}`);
  }
};

const ThoughtItem: React.FC<{ thought: UnsaidThought }> = ({ thought }) => {
  const [hasIncremented, setHasIncremented] = useState(false);
  const itemRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    const viewedThoughts = JSON.parse(sessionStorage.getItem('viewedThoughts') || '[]');
    if (viewedThoughts.includes(thought.id)) {
      setHasIncremented(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !hasIncremented) {
          incrementViewCount(thought.id);
          setHasIncremented(true);
        }
      },
      { threshold: 0.5 }
    );

    if (itemRef.current) {
      observer.observe(itemRef.current);
    }

    return () => observer.disconnect();
  }, [thought.id, hasIncremented]);

  return (
    <motion.div
      ref={itemRef}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white/[0.03] border border-white/5 rounded-2xl p-3 relative group hover:bg-white/[0.05] transition-colors"
    >
      <div className="flex flex-col gap-2">
        {/* Header Label */}
        <div className="flex items-center gap-1.5">
          <div className={`w-1.5 h-1.5 rounded-full ${thought.isAnonymous ? 'bg-white/20' : 'bg-purple-500'} shadow-[0_0_8px_rgba(168,85,247,0.5)]`} />
          <span className="text-[10px] text-white/40 uppercase tracking-wider font-bold">
            {thought.isAnonymous ? 'A Whisper' : 'A Soul'}
          </span>
        </div>

        {/* Main Content */}
        <p className="text-sm text-white/90 leading-relaxed font-medium line-clamp-3 max-w-[95%]">
          "{thought.text}"
        </p>

        {/* Metadata Footer */}
        <div className="flex items-center gap-3 text-white/40 text-[10px] font-medium border-t border-white/5 pt-2 mt-1">
          {thought.region && (
            <div className="flex items-center gap-1">
              <MapPin className="w-2.5 h-2.5 text-purple-400/60" />
              <span>{thought.city || thought.region}</span>
            </div>
          )}
          
          <div className="flex items-center gap-1">
            <Clock className="w-2.5 h-2.5" />
            <span>{thought.createdAt?.toMillis ? new Date(thought.createdAt.toMillis()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now'}</span>
          </div>

          {(thought.viewCount !== undefined && thought.viewCount > 0) && (
            <div className="flex items-center gap-1">
              <Eye className="w-2.5 h-2.5" />
              <span>{thought.viewCount}</span>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export interface UnsaidThoughtsProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export const UnsaidThoughts: React.FC<UnsaidThoughtsProps> = ({ isOpen: externalIsOpen, onClose: externalOnClose }) => {
  const { user, profile } = useAuth();
  const [thoughts, setThoughts] = useState<UnsaidThought[]>([]);
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  
  const isOpen = externalIsOpen !== undefined ? externalIsOpen : internalIsOpen;
  
  const handleClose = () => {
    if (externalOnClose) externalOnClose();
    else setInternalIsOpen(false);
  };

  const handleOpen = () => {
    setInternalIsOpen(true);
  };

  const [newThought, setNewThought] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [visibility, setVisibility] = useState<'nearby' | 'global'>('global');
  const [filter, setFilter] = useState<'nearby' | 'global'>('global');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const q = query(
      collection(db, 'unsaidThoughts'),
      orderBy('createdAt', 'desc'),
      limit(100)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const thoughtsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as UnsaidThought));
      setThoughts(thoughtsData);
    }, (error) => handleFirestoreError(error, OperationType.GET, 'unsaidThoughts'));

    return () => unsubscribe();
  }, []);

  const filteredThoughts = thoughts.filter(t => {
    if (filter === 'global') return true;
    if (!profile?.location) return false;
    
    // Nearby logic: same region or same country
    const isSameRegion = t.region === profile.location.region;
    const isSameCountry = t.country === profile.location.country;
    
    return isSameRegion || isSameCountry;
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newThought.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      // Generate random coordinates for the constellation map display
      const x = Math.floor(Math.random() * 4000) + 500;
      const y = Math.floor(Math.random() * 4000) + 500;

      // Redesigned location logic: City-based with random offset
      const userCity = profile?.location?.city || 'Manila';
      const base = getCityBaseCoordinates(userCity);
      
      const lat = base.lat + getCityOffset();
      const lng = base.lng + getCityOffset();

      const thoughtData: any = {
        userId: user.uid,
        text: newThought.trim(),
        type: 'whisper',
        createdAt: serverTimestamp(),
        isAnonymous,
        vibe: profile?.vibe || 'neutral',
        x,
        y,
        lat,
        lng,
        city: userCity,
        viewCount: 0,
        visibility,
        expiresAt: Timestamp.fromMillis(Date.now() + 24 * 60 * 60 * 1000)
      };

      if (profile?.location) {
        thoughtData.region = profile.location.region;
        thoughtData.country = profile.location.country;
      }

      await addDoc(collection(db, 'unsaidThoughts'), thoughtData);

      setNewThought('');
      setIsSubmitting(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'unsaidThoughts');
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 sm:p-6 pointer-events-none">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={handleClose}
              className="absolute inset-0 bg-[#050510]/60 backdrop-blur-sm pointer-events-auto"
            />
            
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-lg bg-[#1a1a2e]/95 backdrop-blur-2xl border border-white/10 rounded-3xl shadow-2xl overflow-hidden flex flex-col pointer-events-auto max-h-[80vh]"
            >
              {/* Header */}
              <div className="p-4 pb-2 flex items-center justify-between border-b border-white/5">
                <h2 className="text-base font-semibold text-white tracking-tight">Unsaid Thoughts</h2>
                <button
                  onClick={handleClose}
                  className="p-1.5 hover:bg-white/5 rounded-full transition-colors text-white/40 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Tabs */}
              <div className="px-4 py-2 flex gap-4 border-b border-white/5">
                <button
                  onClick={() => setFilter('global')}
                  className={`text-xs font-bold uppercase tracking-wider transition-all relative pb-1 ${filter === 'global' ? 'text-white' : 'text-white/30 hover:text-white/50'}`}
                >
                  Global
                  {filter === 'global' && <motion.div layoutId="tab-underline" className="absolute bottom-0 left-0 right-0 h-0.5 bg-pink-500" />}
                </button>
                <button
                  onClick={() => setFilter('nearby')}
                  className={`text-xs font-bold uppercase tracking-wider transition-all relative pb-1 ${filter === 'nearby' ? 'text-white' : 'text-white/30 hover:text-white/50'}`}
                >
                  Nearby
                  {filter === 'nearby' && <motion.div layoutId="tab-underline" className="absolute bottom-0 left-0 right-0 h-0.5 bg-pink-500" />}
                </button>
              </div>

              {/* Feed */}
              <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar">
                {filteredThoughts.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 gap-2 text-center">
                    <Ghost className="w-10 h-10 text-white/5 mx-auto" />
                    <p className="text-xs text-white/30 font-medium">No whispers here yet.</p>
                  </div>
                ) : (
                  filteredThoughts.map((thought) => (
                    <ThoughtItem key={thought.id} thought={thought} />
                  ))
                )}
              </div>

              {/* Input Area */}
              {user ? (
                <div className="p-3 bg-black/40 border-t border-white/5">
                  <form onSubmit={handleSubmit} className="space-y-2">
                    <div className="flex items-end gap-2 bg-white/5 border border-white/10 rounded-2xl p-2 focus-within:border-pink-500/30 focus-within:bg-white/10 transition-all">
                      <textarea
                        value={newThought}
                        onChange={(e) => {
                          setNewThought(e.target.value);
                          e.target.style.height = 'auto';
                          e.target.style.height = `${Math.min(e.target.scrollHeight, 100)}px`;
                        }}
                        placeholder="Whisper something..."
                        className="flex-1 bg-transparent border-none p-1 text-sm text-white placeholder:text-white/20 focus:outline-none resize-none min-h-[32px] max-h-[100px] leading-relaxed"
                        rows={1}
                      />
                      <button
                        type="submit"
                        disabled={!newThought.trim() || isSubmitting}
                        className="w-8 h-8 flex items-center justify-center bg-pink-600 hover:bg-pink-500 disabled:opacity-30 text-white rounded-full transition-all shrink-0 shadow-lg shadow-pink-600/20 active:scale-90"
                      >
                        {isSubmitting ? (
                          <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                          <Send size={14} />
                        )}
                      </button>
                    </div>
                    
                    <div className="flex items-center justify-between px-1">
                      <div className="flex items-center gap-3">
                        <label className="flex items-center gap-2 cursor-pointer group">
                          <input
                            type="checkbox"
                            checked={isAnonymous}
                            onChange={(e) => setIsAnonymous(e.target.checked)}
                            className="hidden"
                          />
                          <div className={`w-4 h-4 rounded border transition-all flex items-center justify-center ${isAnonymous ? 'bg-pink-600 border-pink-600' : 'border-white/20 group-hover:border-white/40'}`}>
                            {isAnonymous && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                          </div>
                          <span className="text-[10px] text-white/40 font-medium group-hover:text-white/60 transition-colors">Anonymous</span>
                        </label>
                        
                        <button
                          type="button"
                          onClick={() => setVisibility(visibility === 'global' ? 'nearby' : 'global')}
                          className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-white/40 hover:text-white/60 transition-all"
                        >
                          {visibility === 'nearby' ? <Navigation className="w-3 h-3" /> : <Globe className="w-3 h-3" />}
                          <span>{visibility}</span>
                        </button>
                      </div>
                      <span className={`text-[10px] font-mono ${newThought.length > 250 ? 'text-red-400' : 'text-white/20'}`}>
                        {newThought.length}/280
                      </span>
                    </div>
                  </form>
                </div>
              ) : (
                <div className="p-6 bg-white/[0.02] border-t border-white/5 text-center flex flex-col items-center gap-2">
                  <p className="text-xs text-white/40">Sign in to share your unsaid thoughts.</p>
                  <button 
                    onClick={() => window.location.href = '/login'}
                    className="px-4 py-2 bg-pink-600 hover:bg-pink-500 text-white rounded-xl font-bold text-xs transition-all active:scale-95"
                  >
                    Login
                  </button>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
  );
};
