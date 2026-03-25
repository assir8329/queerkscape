import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, limit, onSnapshot, addDoc, serverTimestamp, Timestamp, doc, updateDoc, increment } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { motion, AnimatePresence } from 'motion/react';
import { MessageSquare, Send, X, Sparkles, Ghost, Clock, Eye, MapPin, Globe, Navigation } from 'lucide-react';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';

import { UnsaidThought } from '../types';

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
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      className="bg-white/[0.03] border border-white/5 rounded-2xl p-4 relative group hover:bg-white/[0.05] transition-colors"
    >
      <p className="text-white/90 leading-relaxed italic">"{thought.text}"</p>
      <div className="mt-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${thought.isAnonymous ? 'bg-white/20' : 'bg-purple-500'} shadow-[0_0_8px_rgba(168,85,247,0.5)]`} />
          <span className="text-[10px] text-white/40 uppercase tracking-wider font-bold">
            {thought.isAnonymous ? 'Anonymous' : 'A Soul'}
          </span>
        </div>
        <div className="flex items-center gap-3">
          {thought.region && (
            <div className="flex items-center gap-1 text-white/40 text-[10px]">
              <MapPin className="w-3 h-3 text-purple-400/60" />
              <span>{thought.city || thought.region}</span>
            </div>
          )}
          {(thought.viewCount !== undefined && thought.viewCount > 0) && (
            <div className="flex items-center gap-1 text-white/40 text-[10px]">
              <Eye className="w-3 h-3" />
              <span>{thought.viewCount} listening</span>
            </div>
          )}
          <div className="flex items-center gap-1 text-white/30 text-[10px]">
            <Clock className="w-3 h-3" />
            <span>{thought.createdAt?.toMillis ? new Date(thought.createdAt.toMillis()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now'}</span>
          </div>
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

      // Use user's location for Earth map if available and not anonymous
      let lat = (Math.random() * 140) - 70; // Random fallback
      let lng = (Math.random() * 360) - 180; // Random fallback

      if (!isAnonymous && profile?.location && !profile.hideLocation) {
        lat = profile.location.lat + (Math.random() * 0.1 - 0.05);
        lng = profile.location.lng + (Math.random() * 0.1 - 0.05);
      }

      const thoughtData: any = {
        userId: user.uid,
        text: newThought.trim(),
        createdAt: serverTimestamp(),
        isAnonymous,
        vibe: profile?.vibe || 'neutral',
        x,
        y,
        lat,
        lng,
        viewCount: 0,
        visibility,
        expiresAt: Timestamp.fromMillis(Date.now() + 24 * 60 * 60 * 1000)
      };

      if (!isAnonymous && profile?.location) {
        thoughtData.city = profile.location.city;
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
    <>
      {/* Floating Toggle Button (Desktop only, as mobile uses BottomNav) */}
      {externalIsOpen === undefined && (
        <div className="hidden md:block absolute bottom-8 left-1/2 -translate-x-1/2 z-40">
          <button
            onClick={handleOpen}
            className="group relative flex items-center gap-3 bg-white/5 backdrop-blur-xl border border-white/10 p-2 pr-6 rounded-full shadow-2xl hover:bg-white/10 transition-all active:scale-95"
          >
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center shadow-lg group-hover:shadow-pink-500/50 transition-all">
              <MessageSquare className="w-5 h-5 text-white" />
            </div>
            <span className="text-white/90 text-sm font-semibold tracking-wide">Unsaid Thoughts</span>
            
            {/* Pulse effect */}
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-pink-500 rounded-full border-2 border-[#050510] animate-pulse" />
          </button>
        </div>
      )}

      {/* Side Panel / Modal */}
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
              className="relative w-full max-w-2xl bg-[#1a1a2e]/90 backdrop-blur-2xl border border-white/10 rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col pointer-events-auto max-h-[85vh]"
            >
              {/* Header */}
              <div className="p-8 pb-4 flex items-center justify-between border-b border-white/5">
                <div>
                  <h2 className="text-3xl font-bold text-white tracking-tight">Unsaid Thoughts</h2>
                  <p className="text-white/40 text-sm mt-1">Whispers from the collective soul</p>
                </div>
                <button
                  onClick={handleClose}
                  className="p-3 hover:bg-white/5 rounded-full transition-colors text-white/40 hover:text-white"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* Tabs */}
              <div className="px-8 py-4 flex gap-6 border-b border-white/5">
                <button
                  onClick={() => setFilter('global')}
                  className={`pb-2 text-sm font-semibold transition-all relative ${filter === 'global' ? 'text-white' : 'text-white/30 hover:text-white/50'}`}
                >
                  Global Echoes
                  {filter === 'global' && <motion.div layoutId="tab-underline" className="absolute bottom-0 left-0 right-0 h-0.5 bg-pink-500" />}
                </button>
                <button
                  onClick={() => setFilter('nearby')}
                  className={`pb-2 text-sm font-semibold transition-all relative ${filter === 'nearby' ? 'text-white' : 'text-white/30 hover:text-white/50'}`}
                >
                  Nearby Whispers
                  {filter === 'nearby' && <motion.div layoutId="tab-underline" className="absolute bottom-0 left-0 right-0 h-0.5 bg-pink-500" />}
                </button>
              </div>

              {/* Feed */}
              <div className="flex-1 overflow-y-auto p-8 space-y-6 custom-scrollbar">
                {filteredThoughts.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
                    <Ghost className="w-16 h-16 text-white/5 mx-auto mb-4" />
                    {filter === 'nearby' ? (
                      <div>
                        <p className="text-white/60 font-medium">No whispers nearby yet 🌙</p>
                        <p className="text-xs mt-1 text-white/20">Be the first to share something in your region.</p>
                      </div>
                    ) : (
                      <p className="text-white/30 italic">No thoughts shared here yet. Be the first to whisper.</p>
                    )}
                  </div>
                ) : (
                  filteredThoughts.map((thought) => (
                    <ThoughtItem key={thought.id} thought={thought} />
                  ))
                )}
              </div>

              {/* Input Area */}
              {user ? (
                <div className="p-8 bg-black/20 border-t border-white/5">
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="relative">
                      <textarea
                        value={newThought}
                        onChange={(e) => setNewThought(e.target.value)}
                        placeholder="What's weighing on your heart?"
                        className="w-full bg-white/5 border border-white/10 rounded-3xl p-6 pr-24 text-white placeholder:text-white/20 focus:outline-none focus:border-pink-500/50 resize-none h-32 transition-all text-lg leading-relaxed"
                        maxLength={280}
                      />
                      <div className="absolute bottom-4 right-4 flex items-center gap-4">
                        <span className={`text-xs font-mono ${newThought.length > 250 ? 'text-red-400' : 'text-white/20'}`}>
                          {newThought.length}/280
                        </span>
                        <button
                          type="submit"
                          disabled={!newThought.trim() || isSubmitting}
                          className="p-4 bg-pink-600 hover:bg-pink-500 disabled:opacity-50 disabled:hover:bg-pink-600 text-white rounded-2xl transition-all shadow-lg shadow-pink-600/20 active:scale-95"
                        >
                          {isSubmitting ? (
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          ) : (
                            <Send className="w-5 h-5" />
                          )}
                        </button>
                      </div>
                    </div>
                    <div className="mt-4 flex items-center justify-between px-2">
                      <div className="flex items-center gap-4">
                        <label className="flex items-center gap-3 cursor-pointer group">
                          <input
                            type="checkbox"
                            checked={isAnonymous}
                            onChange={(e) => setIsAnonymous(e.target.checked)}
                            className="hidden"
                          />
                          <div className={`w-5 h-5 rounded-md border transition-all flex items-center justify-center ${isAnonymous ? 'bg-pink-600 border-pink-600' : 'border-white/20 group-hover:border-white/40'}`}>
                            {isAnonymous && <div className="w-2 h-2 bg-white rounded-full" />}
                          </div>
                          <span className="text-xs text-white/40 font-medium group-hover:text-white/60 transition-colors">Whisper Anonymously</span>
                        </label>
                        
                        <button
                          type="button"
                          onClick={() => setVisibility(visibility === 'global' ? 'nearby' : 'global')}
                          className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all ${
                            visibility === 'nearby' 
                              ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' 
                              : 'text-white/40 hover:text-white/60'
                          }`}
                        >
                          {visibility === 'nearby' ? <Navigation className="w-3 h-3" /> : <Globe className="w-3 h-3" />}
                          <span>{visibility}</span>
                        </button>
                      </div>
                      <p className="text-[10px] text-white/20 italic">Your location will be attached to help others find your echo.</p>
                    </div>
                  </form>
                </div>
              ) : (
                <div className="p-8 bg-white/[0.02] border-t border-white/5 text-center">
                  <p className="text-white/40 text-sm italic">Sign in to share your unsaid thoughts...</p>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};
