import { AgentMessage } from '../../lib/agent-canvas.types';
import { AgentMessageBubble } from './AgentMessageBubble';

export function AgentChatThread({ messages }: { messages: AgentMessage[] }) {
  return (
    <div className="flex flex-col h-full overflow-y-auto p-4 bg-slate-50">
      {messages.map((msg) => (
        <AgentMessageBubble key={msg.id} message={msg} />
      ))}
    </div>
  );
}
