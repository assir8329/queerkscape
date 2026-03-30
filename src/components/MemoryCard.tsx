import React, { useState } from 'react';
import { X, MapPin, Sparkles, Eye, Clock, User, Flag } from 'lucide-react';
import { Memory, UserProfile } from '../types';
import { ReportModal } from './ReportModal';
import { getRandomName } from '../lib/randomNames';

interface MemoryCardProps {
  memory: Memory;
  user?: UserProfile;
  currentUser?: UserProfile;
  onClose: () => void;
}

export const MemoryCard: React.FC<MemoryCardProps> = ({ memory, user, currentUser, onClose }) => {
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const anonymousName = getRandomName(memory.id);

  const lines = memory.text.split('\n').filter(l => l.trim().length > 0);
  const title = lines.length > 1 ? lines[0] : null;
  const body = lines.length > 1 ? lines.slice(1).join('\n') : memory.text;

  const dateStr = memory.date?.toDate ? memory.date.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 
                 (memory.createdAt?.toDate ? memory.createdAt.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Recently');

  return (
    <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[1000] bg-[#050510]/95 backdrop-blur-2xl border border-white/10 rounded-xl p-3 w-[300px] max-h-[80vh] overflow-y-auto shadow-2xl flex flex-col gap-2 group pointer-events-auto m-0">
      {/* Subtle Glow */}
      <div className="absolute -inset-1 bg-yellow-500/5 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
      
      {/* Header */}
      <div className="flex items-center justify-between relative z-10 py-0.5 border-b border-white/5 pb-2">
        <div className="flex items-center gap-2 text-[10px] font-bold tracking-widest text-white/40">
          <span className="text-purple-400/60 uppercase">Bulong</span>
          <span className="opacity-20">|</span>
          {memory.isAnonymous ? (
            <span className="text-white/20 italic font-medium lowercase tracking-normal">{anonymousName}</span>
          ) : (
            <span className="truncate max-w-[120px] normal-case">{user?.nickname || user?.username || 'Someone'}</span>
          )}
        </div>
        <button 
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          className="w-5 h-5 flex items-center justify-center text-white/30 hover:text-white transition-colors rounded-full hover:bg-white/5 shrink-0"
        >
          <X size={14} />
        </button>
      </div>

      {/* Content */}
      <div className="flex flex-col gap-0.5 relative z-10 py-1">
        {title && (
          <h3 className="text-[0.95rem] font-soul font-light text-white/90 leading-[1.5] m-0">
            {title}
          </h3>
        )}
        <p className={`text-[0.95rem] font-soul font-light leading-[1.5] text-white/90 m-0 ${title ? 'opacity-80' : ''}`}>
          {body}
        </p>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between text-[10px] text-white/40 relative z-10 border-t border-white/5 pt-2">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <MapPin size={12} className="text-purple-400/60" />
            <span>{memory.region || 'Somewhere'}</span>
          </div>
          <div className="flex items-center gap-1">
            <Clock size={12} />
            <span>{dateStr}</span>
          </div>
          <div className="flex items-center gap-1">
            <Sparkles size={12} className="text-yellow-400/40" />
            <span>{memory.viewCount || 0} star listened</span>
          </div>
        </div>

        {currentUser && currentUser.uid !== memory.userId && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsReportModalOpen(true);
            }}
            className="flex items-center gap-1 text-white/30 hover:text-white/80 transition-colors"
            title="Report this memory"
          >
            <Flag size={12} strokeWidth={1.5} />
            <span className="font-ui-tech font-medium tracking-wider uppercase">Report</span>
          </button>
        )}
      </div>

      <ReportModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        reportedByUid={currentUser?.uid || ''}
        reportedUid={memory.userId}
        contentId={memory.id}
        contentType="memory"
      />
    </div>
  );
};
