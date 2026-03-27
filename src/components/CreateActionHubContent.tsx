import React from 'react';
import { Sparkles, MessageSquare, MapPin } from 'lucide-react';

interface CreateActionHubContentProps {
  onAction: (action: 'signal' | 'thought' | 'memory') => void;
}

export const CreateActionHubContent: React.FC<CreateActionHubContentProps> = ({ onAction }) => {
  const actions = [
    {
      id: 'signal' as const,
      title: 'Magparamdam',
      description: 'Share your presence with the universe.',
      icon: <Sparkles className="w-5 h-5 text-blue-400" />,
      color: 'blue'
    },
    {
      id: 'thought' as const,
      title: 'Bulong',
      description: "Share what's often left unsaid.",
      icon: <MessageSquare className="w-5 h-5 text-purple-400" />,
      color: 'purple'
    },
    {
      id: 'memory' as const,
      title: 'Bakás',
      description: 'Mark a place that holds your history.',
      icon: <MapPin className="w-5 h-5 text-yellow-400" />,
      color: 'yellow'
    },
  ];

  return (
    <div className="p-6 space-y-3">
      <div className="mb-6">
        <h3 className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em] mb-4 px-1">What's on your mind?</h3>
        <div className="grid grid-cols-1 gap-3">
          {actions.map((action) => (
            <button
              key={action.id}
              onClick={() => onAction(action.id)}
              className="flex items-center gap-4 p-4 rounded-2xl bg-white/[0.03] border border-white/5 hover:bg-white/[0.06] hover:border-white/10 transition-all active:scale-[0.98] text-left group"
            >
              <div className={`w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform`}>
                {action.icon}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-bold text-white tracking-tight">{action.title}</h3>
                <p className="text-[11px] text-white/40 font-medium leading-relaxed mt-0.5">{action.description}</p>
              </div>
            </button>
          ))}
        </div>
      </div>
      
      <div className="pt-6 border-t border-white/5">
        <p className="text-[10px] text-white/20 font-medium leading-relaxed px-1">
          Bawat nilikha ay isang bagong bituin sa ating mapa. Connecting our journeys, one soul at a time.
        </p>
      </div>
    </div>
  );
};
