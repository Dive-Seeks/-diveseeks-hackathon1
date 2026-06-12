import { Handle, Position } from '@xyflow/react';
import { AgentNodeData } from '../../lib/agent-canvas.types';
import { Loader2 } from 'lucide-react';

export function AgentNode({ data }: { data: AgentNodeData }) {
  const { identity, status, currentTask } = data;
  
  return (
    <div className={`relative flex flex-col items-center p-3 rounded-xl border-2 bg-white shadow-md w-48 ${
      status === 'running' ? 'border-blue-500 shadow-blue-100' : 
      status === 'done' ? 'border-green-500 shadow-green-100' : 
      status === 'failed' ? 'border-red-500 shadow-red-100' : 
      'border-slate-200'
    }`}>
      <Handle type="target" position={Position.Top} className="w-3 h-3 bg-slate-400" />
      
      <div 
        className="w-12 h-12 rounded-full flex items-center justify-center text-lg text-white font-bold mb-2 shadow-sm"
        style={{ backgroundColor: identity.colour }}
      >
        {identity.monogram}
      </div>
      
      <div className="text-sm font-bold text-slate-800">{identity.displayName}</div>
      <div className="text-xs text-slate-500 mb-2 text-center leading-tight">{identity.description}</div>
      
      {status === 'running' && (
        <div className="flex items-center gap-2 text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded-md w-full">
          <Loader2 className="w-3 h-3 animate-spin shrink-0" />
          <span className="truncate" title={currentTask}>{currentTask || 'Working...'}</span>
        </div>
      )}
      
      {status === 'done' && (
        <div className="flex items-center gap-1 text-xs text-green-600 bg-green-50 px-2 py-1 rounded-md w-full justify-center">
          <span className="font-medium">Complete</span>
        </div>
      )}
      
      <Handle type="source" position={Position.Bottom} className="w-3 h-3 bg-slate-400" />
    </div>
  );
}
