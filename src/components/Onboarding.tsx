import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { motion } from 'motion/react';
import { Sparkles, Check, X, MapPin } from 'lucide-react';
import { getCityBaseCoordinates } from '../lib/locations';
import { VIBES } from '../lib/colors';

const STANDARD_OPTIONS = [
  "Friendship",
  "Something casual",
  "Serious relationship",
  "Just exploring",
  "New connections",
  "Conversations",
  "Community",
  "Slow connections",
  "See where it goes"
];

const LOOKING_FOR_OPTIONS = [...STANDARD_OPTIONS, "custom"];

export const Onboarding: React.FC = () => {
  const { profile, updateProfile } = useAuth();
  const [step, setStep] = useState(1);
  const [selectedVibe, setSelectedVibe] = useState<(typeof VIBES)[0] | null>(null);
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [signal, setSignal] = useState('');
  const [city, setCity] = useState('');
  const [region, setRegion] = useState('');
  const [country, setCountry] = useState('');
  const [isLocating, setIsLocating] = useState(false);

  // New personalization fields
  const [identity, setIdentity] = useState('');
  const [sexualRole, setSexualRole] = useState('');
  const [relationshipStatus, setRelationshipStatus] = useState('');
  const [zodiacSign, setZodiacSign] = useState('');
  const [mbti, setMbti] = useState('');
  const [lookingFor, setLookingFor] = useState<string[]>([]);

  if (!profile || profile.onboarded) return null;

  const handleAddTag = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && tagInput.trim() && tags.length < 5) {
      setTags([...tags, tagInput.trim()]);
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter(t => t !== tagToRemove));
  };

  const handleGeolocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser');
      return;
    }
    
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${position.coords.latitude}&lon=${position.coords.longitude}&zoom=10&addressdetails=1`);
          const data = await response.json();
          
          if (data && data.address) {
            setCity(data.address.city || data.address.town || data.address.village || '');
            setRegion(data.address.state || data.address.region || '');
            setCountry(data.address.country || '');
          }
        } catch (error) {
          console.error("Error fetching location details:", error);
          alert("Could not determine city from coordinates. Please enter manually.");
        } finally {
          setIsLocating(false);
        }
      },
      (error) => {
        console.error("Geolocation error:", error);
        alert("Could not get your location. Please enter manually.");
        setIsLocating(false);
      }
    );
  };

  const handleComplete = async () => {
    if (!selectedVibe) {
      setStep(1);
      return;
    }

    const updateData: any = {
      color: selectedVibe.color,
      vibe: selectedVibe.label,
      tags,
      signal: signal || 'Just joined the constellation.',
      identity,
      sexualRole,
      relationshipStatus,
      zodiacSign,
      mbti,
      lookingFor,
      onboarded: true,
    };

    if (city || region || country) {
      const userCity = city.trim();
      const base = getCityBaseCoordinates(userCity);
      
      updateData.location = {
        city: userCity,
        region: region.trim(),
        country: country.trim(),
        lat: base.lat,
        lng: base.lng,
      };
    }

    await updateProfile(updateData);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#050510]/90 backdrop-blur-md p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-[#1a1a2e] border border-white/10 rounded-2xl p-8 max-w-md w-full shadow-2xl relative overflow-hidden max-h-[90vh] overflow-y-auto custom-scrollbar"
      >
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-500 via-pink-500 to-blue-500" />
        
        <div className="flex items-center justify-center mb-6">
          <Sparkles className="w-10 h-10 text-purple-400" />
        </div>
        
        <h2 className="text-2xl font-bold text-white text-center mb-2">Welcome to the Constellation</h2>
        <p className="text-white/60 text-center mb-8 text-sm">Let's set up your star so others can find you.</p>

        {step === 1 && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
            <h3 className="text-white font-semibold mb-4 text-center">Choose your vibe</h3>
            <div className="grid grid-cols-2 gap-3 mb-8">
              {VIBES.map((v) => (
                <button
                  key={v.id}
                  onClick={() => setSelectedVibe(v)}
                  className={`flex items-center gap-3 p-3 rounded-xl transition-all border ${selectedVibe?.id === v.id ? 'bg-white/10 border-white/30 shadow-[0_0_15px_rgba(255,255,255,0.1)]' : 'bg-transparent border-white/5 hover:bg-white/5 opacity-70 hover:opacity-100'}`}
                >
                  <div 
                    className="w-4 h-4 rounded-full" 
                    style={{ 
                      backgroundColor: v.color,
                      boxShadow: selectedVibe?.id === v.id ? `0 0 10px ${v.color}` : 'none'
                    }} 
                  />
                  <span className="text-sm text-white font-medium">{v.label}</span>
                </button>
              ))}
            </div>
            <button
              onClick={() => setStep(2)}
              disabled={!selectedVibe}
              className={`w-full py-3 rounded-xl font-medium transition-all border ${
                selectedVibe 
                  ? 'bg-white/10 hover:bg-white/20 text-white border-white/10' 
                  : 'bg-white/5 text-white/20 border-white/5 cursor-not-allowed'
              }`}
            >
              {selectedVibe ? 'Next' : 'Select a vibe to continue'}
            </button>
          </motion.div>
        )}

        {step === 2 && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
            <h3 className="text-white font-semibold mb-2 text-center">Where are you located? (Optional)</h3>
            <p className="text-white/40 text-xs text-center mb-4">This helps you find Stars nearby in Mundo. Your exact location is never shared.</p>
            
            <div className="space-y-3 mb-6">
              <button
                onClick={handleGeolocation}
                disabled={isLocating}
                className="w-full py-2 bg-purple-500/20 hover:bg-purple-500/40 text-purple-300 rounded-lg flex items-center justify-center gap-2 transition-colors border border-purple-500/30 text-sm"
              >
                <MapPin className="w-4 h-4" />
                {isLocating ? 'Locating...' : 'Use my current location'}
              </button>
              
              <div className="flex items-center gap-2 text-white/30 text-xs">
                <div className="flex-1 h-px bg-white/10" />
                <span>OR ENTER MANUALLY</span>
                <div className="flex-1 h-px bg-white/10" />
              </div>

              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="City"
                className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500"
              />
              <div className="flex gap-2">
                <input
                  type="text"
                  value={region}
                  onChange={(e) => setRegion(e.target.value)}
                  placeholder="State/Region"
                  className="w-1/2 bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500"
                />
                <input
                  type="text"
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  placeholder="Country"
                  className="w-1/2 bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500"
                />
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setStep(1)}
                className="w-1/3 py-3 bg-transparent hover:bg-white/5 text-white/60 rounded-xl font-medium transition-colors border border-white/10"
              >
                Back
              </button>
              <button
                onClick={() => setStep(3)}
                className="w-2/3 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl font-medium transition-colors border border-white/10"
              >
                Next
              </button>
            </div>
          </motion.div>
        )}

        {step === 3 && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
            <h3 className="text-white font-semibold mb-2 text-center">Your Identity</h3>
            <p className="text-white/40 text-xs text-center mb-4">Help others understand who you are.</p>
            
            <div className="space-y-4 mb-8">
              <select
                value={identity}
                onChange={(e) => setIdentity(e.target.value)}
                className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500 appearance-none"
              >
                <option value="">Select Identity</option>
                <option value="Cis-Woman">Cis-Woman</option>
                <option value="Trans-Woman">Trans-Woman</option>
                <option value="Non-Binary">Non-Binary</option>
                <option value="Genderfluid">Genderfluid</option>
                <option value="Genderqueer">Genderqueer</option>
                <option value="Agender">Agender</option>
              </select>

              <select
                value={sexualRole}
                onChange={(e) => setSexualRole(e.target.value)}
                className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500 appearance-none"
              >
                <option value="">Select Sexual Role</option>
                <option value="Stone Top">Stone Top</option>
                <option value="Pillow Princess">Pillow Princess</option>
                <option value="Switch/Versa">Switch/Versa</option>
                <option value="Switch (top leaning)">Switch (top leaning)</option>
                <option value="Switch (bottom leaning)">Switch (bottom leaning)</option>
              </select>

              <select
                value={relationshipStatus}
                onChange={(e) => setRelationshipStatus(e.target.value)}
                className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500 appearance-none"
              >
                <option value="">Select Relationship Status</option>
                <option value="single">Single</option>
                <option value="taken">Taken</option>
                <option value="in a situationship">In a situationship</option>
                <option value="non-monogamous">Non-monogamous</option>
              </select>

              <div className="space-y-2">
                <label className="text-[10px] text-white/30 uppercase tracking-wider font-bold ml-1">Looking For (Max 3)</label>
                <div className="flex flex-wrap gap-2">
                  {STANDARD_OPTIONS.map(option => {
                    const isSelected = lookingFor.includes(option);
                    return (
                      <button
                        key={option}
                        type="button"
                        onClick={() => {
                          if (isSelected) {
                            setLookingFor(lookingFor.filter(o => o !== option));
                          } else {
                            if (lookingFor.length >= 3) return;
                            setLookingFor([...lookingFor, option]);
                          }
                        }}
                        className={`px-3 py-1.5 rounded-full text-[10px] font-bold transition-all border ${
                          isSelected 
                            ? 'bg-purple-500/10 border-purple-500/50 text-purple-300' 
                            : 'bg-white/[0.03] border-transparent text-white/40 hover:bg-white/[0.06] hover:text-white/60'
                        }`}
                      >
                        {option}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setStep(2)}
                className="flex-1 py-3 bg-transparent hover:bg-white/5 text-white/70 rounded-xl font-medium transition-colors border border-white/10"
              >
                Back
              </button>
              <button
                onClick={() => setStep(4)}
                className="flex-1 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl font-medium transition-colors border border-white/10"
              >
                Next
              </button>
            </div>
          </motion.div>
        )}

        {step === 4 && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
            <h3 className="text-white font-semibold mb-2 text-center">Personality</h3>
            <p className="text-white/40 text-xs text-center mb-4">Share your cosmic traits.</p>
            
            <div className="space-y-4 mb-8">
              <select
                value={zodiacSign}
                onChange={(e) => setZodiacSign(e.target.value)}
                className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500 appearance-none"
              >
                <option value="">Select Zodiac</option>
                <option value="Aries">Aries</option>
                <option value="Taurus">Taurus</option>
                <option value="Gemini">Gemini</option>
                <option value="Cancer">Cancer</option>
                <option value="Leo">Leo</option>
                <option value="Virgo">Virgo</option>
                <option value="Libra">Libra</option>
                <option value="Scorpio">Scorpio</option>
                <option value="Sagittarius">Sagittarius</option>
                <option value="Capricorn">Capricorn</option>
                <option value="Aquarius">Aquarius</option>
                <option value="Pisces">Pisces</option>
              </select>

              <select
                value={mbti}
                onChange={(e) => setMbti(e.target.value)}
                className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500 appearance-none"
              >
                <option value="">Select MBTI</option>
                <option value="INTJ">INTJ</option>
                <option value="INTP">INTP</option>
                <option value="ENTJ">ENTJ</option>
                <option value="ENTP">ENTP</option>
                <option value="INFJ">INFJ</option>
                <option value="INFP">INFP</option>
                <option value="ENFJ">ENFJ</option>
                <option value="ENFP">ENFP</option>
                <option value="ISTJ">ISTJ</option>
                <option value="ISFJ">ISFJ</option>
                <option value="ESTJ">ESTJ</option>
                <option value="ESFJ">ESFJ</option>
                <option value="ISTP">ISTP</option>
                <option value="ISFP">ISFP</option>
                <option value="ESTP">ESTP</option>
                <option value="ESFP">ESFP</option>
              </select>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setStep(3)}
                className="flex-1 py-3 bg-transparent hover:bg-white/5 text-white/70 rounded-xl font-medium transition-colors border border-white/10"
              >
                Back
              </button>
              <button
                onClick={() => setStep(5)}
                className="flex-1 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl font-medium transition-colors border border-white/10"
              >
                Next
              </button>
            </div>
          </motion.div>
        )}

        {step === 5 && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
            <h3 className="text-white font-semibold mb-2 text-center">What are your interests?</h3>
            <p className="text-white/40 text-xs text-center mb-4">Add up to 5 tags (press Enter)</p>
            
            <div className="flex flex-wrap gap-2 mb-4 min-h-[40px]">
              {tags.map(tag => (
                <span key={tag} className="px-3 py-1 bg-white/10 text-white/90 rounded-full text-sm flex items-center gap-1 border border-white/10">
                  {tag}
                  <button onClick={() => handleRemoveTag(tag)} className="text-white/40 hover:text-white"><X className="w-3 h-3" /></button>
                </span>
              ))}
            </div>
            
            <input
              type="text"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={handleAddTag}
              disabled={tags.length >= 5}
              placeholder={tags.length >= 5 ? "Max 5 tags reached" : "e.g. gaming, art, music..."}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white mb-8 focus:outline-none focus:border-purple-500"
            />
            
            <div className="flex gap-3">
              <button
                onClick={() => setStep(4)}
                className="flex-1 py-3 bg-transparent hover:bg-white/5 text-white/70 rounded-xl font-medium transition-colors border border-white/10"
              >
                Back
              </button>
              <button
                onClick={() => setStep(6)}
                className="flex-1 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl font-medium transition-colors border border-white/10"
              >
                Next
              </button>
            </div>
          </motion.div>
        )}

        {step === 6 && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
            <h3 className="text-white font-semibold mb-2 text-center">Broadcast your first sambit</h3>
            <p className="text-white/40 text-xs text-center mb-4">A short message visible to others.</p>
            
            <textarea
              value={signal}
              onChange={(e) => setSignal(e.target.value)}
              placeholder="Sambit..."
              maxLength={100}
              className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-white mb-8 focus:outline-none focus:border-purple-500 resize-none h-24"
            />
            
            <div className="flex gap-3">
              <button
                onClick={() => setStep(5)}
                className="flex-1 py-3 bg-transparent hover:bg-white/5 text-white/70 rounded-xl font-medium transition-colors border border-white/10"
              >
                Back
              </button>
              <button
                onClick={handleComplete}
                className="flex-1 py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-xl font-medium transition-colors shadow-[0_0_15px_rgba(168,85,247,0.5)] flex items-center justify-center gap-2"
              >
                <Check className="w-4 h-4" /> Enter the Sky
              </button>
            </div>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
};
