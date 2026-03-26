import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, limit, onSnapshot, addDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { motion } from 'motion/react';
import { Send, Sparkles, Ghost, Clock, Eye, MapPin, Globe, Navigation } from 'lucide-react';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';
import { UnsaidThought } from '../types';
import { getCityBaseCoordinates, getCityOffset } from '../lib/locations';
import { incrementViewCount } from './UnsaidThoughts';

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
      className="bg-white/[0.03] border border-white/5 rounded-2xl p-4 relative group hover:bg-white/[0.05] transition-colors"
    >
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${thought.isAnonymous ? 'bg-white/20' : 'bg-purple-500'} shadow-[0_0_10px_rgba(168,85,247,0.5)]`} />
          <span className="text-[10px] text-white/40 uppercase tracking-widest font-black">
            {thought.isAnonymous ? "An Echo" : thought.username || "A Soul"}
          </span>
        </div>

        <p className="text-sm text-white/90 leading-relaxed font-medium">
          "{thought.text}"
        </p>

        <div className="flex items-center gap-4 text-white/40 text-[10px] font-bold border-t border-white/5 pt-3 mt-1">
          {thought.region && (
            <div className="flex items-center gap-1.5">
              <MapPin className="w-3 h-3 text-purple-400/60" />
              <span>{thought.city || thought.region}</span>
            </div>
          )}
          
          <div className="flex items-center gap-1.5">
            <Clock className="w-3 h-3" />
            <span>{thought.createdAt?.toMillis ? new Date(thought.createdAt.toMillis()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now'}</span>
          </div>

          {(thought.viewCount !== undefined && thought.viewCount > 0) && (
            <div className="flex items-center gap-1.5">
              <Eye className="w-3 h-3" />
              <span>{thought.viewCount}</span>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export const UnsaidThoughtsContent: React.FC = () => {
  const { user, profile } = useAuth();
  const [thoughts, setThoughts] = useState<UnsaidThought[]>([]);
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
    const isSameRegion = t.region === profile.location.region;
    const isSameCountry = t.country === profile.location.country;
    return isSameRegion || isSameCountry;
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newThought.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const x = Math.floor(Math.random() * 4000) + 500;
      const y = Math.floor(Math.random() * 4000) + 500;
      
      // Redesigned location logic: City-based with random offset
      const userCity = profile?.location?.city || 'Manila';
      const base = getCityBaseCoordinates(userCity);
      
      const lat = base.lat + getCityOffset();
      const lng = base.lng + getCityOffset();

      const thoughtData: any = {
        userId: user.uid,
        username: profile?.username || 'Anonymous',
        text: newThought.trim(),
        type: 'whisper',
        createdAt: serverTimestamp(),
        isAnonymous,
        vibe: profile?.vibe || 'neutral',
        x, y, lat, lng,
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
    <div className="flex flex-col h-full">
      {/* Tabs */}
      <div className="px-6 py-4 flex gap-6 border-b border-white/5 bg-white/[0.02]">
        <button
          onClick={() => setFilter('global')}
          className={`text-[10px] font-black uppercase tracking-[0.2em] transition-all relative pb-2 ${filter === 'global' ? 'text-white' : 'text-white/30 hover:text-white/50'}`}
        >
          Global
          {filter === 'global' && <motion.div layoutId="tab-underline" className="absolute bottom-0 left-0 right-0 h-0.5 bg-pink-500" />}
        </button>
        <button
          onClick={() => setFilter('nearby')}
          className={`text-[10px] font-black uppercase tracking-[0.2em] transition-all relative pb-2 ${filter === 'nearby' ? 'text-white' : 'text-white/30 hover:text-white/50'}`}
        >
          Nearby
          {filter === 'nearby' && <motion.div layoutId="tab-underline" className="absolute bottom-0 left-0 right-0 h-0.5 bg-pink-500" />}
        </button>
      </div>

      {/* Feed */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
        {filteredThoughts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
            <Ghost className="w-12 h-12 text-white/5 mx-auto" />
            <p className="text-xs text-white/30 font-bold uppercase tracking-widest">No whispers here yet.</p>
          </div>
        ) : (
          filteredThoughts.map((thought) => (
            <ThoughtItem key={thought.id} thought={thought} />
          ))
        )}
      </div>

      {/* Input Area */}
      {user ? (
        <div className="p-6 bg-black/40 border-t border-white/5">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex flex-col gap-3 bg-white/5 border border-white/10 rounded-2xl p-4 focus-within:border-pink-500/30 focus-within:bg-white/10 transition-all">
              <textarea
                value={newThought}
                onChange={(e) => {
                  setNewThought(e.target.value);
                  e.target.style.height = 'auto';
                  e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
                }}
                placeholder="Whisper something to the universe..."
                className="w-full bg-transparent border-none p-0 text-sm text-white placeholder:text-white/20 focus:outline-none resize-none min-h-[40px] max-h-[120px] leading-relaxed font-medium"
                rows={1}
              />
              <div className="flex items-center justify-between border-t border-white/5 pt-3">
                <div className="flex items-center gap-4">
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
                    <span className="text-[10px] text-white/40 font-bold uppercase tracking-widest group-hover:text-white/60 transition-colors">Anonymous</span>
                  </label>
                  
                  <button
                    type="button"
                    onClick={() => setVisibility(visibility === 'global' ? 'nearby' : 'global')}
                    className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-white/40 hover:text-white/60 transition-all"
                  >
                    {visibility === 'nearby' ? <Navigation className="w-3 h-3" /> : <Globe className="w-3 h-3" />}
                    <span>{visibility}</span>
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={!newThought.trim() || isSubmitting}
                  className="w-10 h-10 flex items-center justify-center bg-pink-600 hover:bg-pink-500 disabled:opacity-30 text-white rounded-full transition-all shrink-0 shadow-lg shadow-pink-600/20 active:scale-90"
                >
                  {isSubmitting ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <Send size={18} />
                  )}
                </button>
              </div>
            </div>
            <div className="flex justify-end px-1">
              <span className={`text-[10px] font-mono font-bold ${newThought.length > 250 ? 'text-red-400' : 'text-white/20'}`}>
                {newThought.length}/280
              </span>
            </div>
          </form>
        </div>
      ) : (
        <div className="p-8 bg-white/[0.02] border-t border-white/5 text-center flex flex-col items-center gap-4">
          <p className="text-xs text-white/40 font-bold uppercase tracking-widest">Sign in to share your unsaid thoughts.</p>
          <button 
            onClick={() => window.location.href = '/login'}
            className="px-8 py-3 bg-pink-600 hover:bg-pink-500 text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all active:scale-95 shadow-lg shadow-pink-600/20"
          >
            Login
          </button>
        </div>
      )}
    </div>
  );
};
