import { AgentMessage } from '../../lib/agent-canvas.types';
import { getIdentity } from '../../lib/specialist-identities';

export function AgentMessageBubble({ message }: { message: AgentMessage }) {
  const identity = getIdentity(message.fromAgent);
  const isSystem = identity.team === 'system';
  
  return (
    <div className={`flex flex-col mb-4 ${isSystem ? 'items-center' : 'items-start'}`}>
      <div className="flex items-center gap-2 mb-1">
        <div 
          className="w-6 h-6 rounded-full flex items-center justify-center text-xs text-white font-bold"
          style={{ backgroundColor: identity.colour }}
        >
          {identity.monogram}
        </div>
        <span className="text-xs font-medium text-slate-500">
          {identity.displayName}
          {message.toAgent ? ` → ${getIdentity(message.toAgent).displayName}` : ''}
        </span>
      </div>
      <div className={`px-3 py-2 rounded-lg text-sm max-w-[85%] ${
        isSystem ? 'bg-slate-100 text-slate-600 border border-slate-200' : 'bg-white border border-slate-200 shadow-sm'
      }`}>
        {message.content}
      </div>
    </div>
  );
}
