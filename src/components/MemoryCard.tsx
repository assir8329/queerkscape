import React from 'react';
import { X, MapPin, Sparkles, Eye, Clock, User } from 'lucide-react';
import { Memory, UserProfile } from '../types';

interface MemoryCardProps {
  memory: Memory;
  user?: UserProfile;
  onClose: () => void;
}

export const MemoryCard: React.FC<MemoryCardProps> = ({ memory, user, onClose }) => {
  // Smart title/preview logic: If text has multiple lines, first line is title.
  // Or if it's long, we can just use the first few words as a "title" feel.
  const lines = memory.text.split('\n').filter(l => l.trim().length > 0);
  const title = lines.length > 1 ? lines[0] : null;
  const body = lines.length > 1 ? lines.slice(1).join('\n') : memory.text;

  const dateStr = memory.date?.toDate ? memory.date.toDate().toLocaleDateString() : 
                 (memory.createdAt?.toDate ? memory.createdAt.toDate().toLocaleDateString() : 'Recently');

  return (
    <div className="bg-black/80 backdrop-blur-md border border-white/10 rounded-xl p-2 w-[280px] shadow-2xl relative flex flex-col gap-2 group pointer-events-auto">
      {/* Subtle Glow */}
      <div className="absolute -inset-1 bg-yellow-500/5 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
      
      {/* Header */}
      <div className="flex items-center justify-between relative z-10 mb-1 py-0.5 border-b border-white/5">
        <div className="flex items-center gap-2 truncate">
          <MapPin className="w-3 h-3 text-yellow-500 shrink-0" />
          <div className="flex items-center gap-1.5 truncate">
            <span className="text-[9px] uppercase tracking-widest text-white/40 font-bold whitespace-nowrap">A Memory</span>
            <span className="text-white/20">·</span>
            <span className="text-[10px] text-white/60 truncate font-medium">{memory.region}</span>
          </div>
        </div>
        <button 
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          className="w-5 h-5 flex items-center justify-center text-white/30 hover:text-white transition-colors rounded-full hover:bg-white/5 shrink-0"
        >
          <X className="w-3 h-3" />
        </button>
      </div>

      {/* Content */}
      <div className="flex flex-col gap-1 relative z-10">
        {title && (
          <h3 className="text-sm font-semibold text-white/90 leading-tight">
            {title}
          </h3>
        )}
        <p className={`text-sm leading-relaxed text-white/90 ${title ? 'opacity-80' : 'font-medium'}`}>
          {body}
        </p>
      </div>

      {/* Footer */}
      <div className="flex items-center gap-2 text-[10px] text-white/50 pt-1 border-t border-white/5 relative z-10">
        <div className="flex items-center gap-1 max-w-[100px] truncate">
          <User className="w-2.5 h-2.5 opacity-50" />
          <span className="truncate">{user?.nickname || user?.username || 'Someone'}</span>
        </div>
        <span className="opacity-20">•</span>
        <div className="flex items-center gap-1">
          <Clock className="w-2.5 h-2.5 opacity-50" />
          <span>{dateStr}</span>
        </div>
        <span className="opacity-20">•</span>
        <div className="flex items-center gap-1">
          <Eye className="w-2.5 h-2.5 opacity-50" />
          <span>{memory.viewCount || 0}</span>
        </div>
      </div>
    </div>
  );
};
