import { Injectable } from '@nestjs/common';
import { ToolLoopAgent, stepCountIs, ModelMessage } from 'ai';
import { AiProviderRouter } from '../../common/ai-provider-router.service';
import { ChatHistoryService } from '../../chat/chat-history.service';
import { SoulEngine } from '../../common/soul/soul-engine.service';
import { DreamerPreferencesService } from '../../dreamer/dreamer-preferences.service';
import { KnowledgeStoreService } from '../../knowledge-store/knowledge-store.service';

export interface ChatContext {
  projectId: string;
  tenantId: string;
  userId: string;
  specialist: string;
}

@Injectable()
export class ChatAgentFactory {
  constructor(
    private readonly aiRouter: AiProviderRouter,
    private readonly chatHistory: ChatHistoryService,
    private readonly soulEngine: SoulEngine,
    private readonly preferencesService: DreamerPreferencesService,
    private readonly knowledgeStore: KnowledgeStoreService,
  ) {}

  build(context: ChatContext): ToolLoopAgent {
    const factory = this;
    return new ToolLoopAgent({
      model: this.aiRouter.getModel('chat'),
      instructions: '',
      tools: {},
      stopWhen: stepCountIs(5),
      prepareCall: async ({ messages }) => {
        let soul = '';
        try {
          soul = await factory.soulEngine.assemble(context.specialist, {
            tenantId: context.tenantId,
            userId: context.userId,
          } as any);
        } catch {
          soul = `You are ${context.specialist}, an AI assistant.`;
        }

        let memoryBlock = '';
        try {
          // Normalise AI SDK ModelMessage[] → plain {role, content} for preferences service
          const plainMessages = (messages ?? []).map((m: any) => ({
            role: String(m.role),
            content:
              typeof m.content === 'string'
                ? m.content
                : Array.isArray(m.content)
                  ? m.content
                      .filter((p: any) => p.type === 'text')
                      .map((p: any) => p.text)
                      .join(' ')
                  : '',
          }));
          memoryBlock = await factory.preferencesService.buildMemoryBlock(
            context.userId,
            context.tenantId,
            plainMessages,
          );
        } catch {
          // Non-fatal — missing preferences just means no memory block
        }

        const window = await factory.chatHistory.loadWindow({
          projectId: context.projectId,
          tenantId: context.tenantId,
          maxTokens: 6000,
          maxTurns: 20,
        });

        // Phase 4 — knowledge retrieval: search indexed content for the last user message
        let knowledgeBlock = '';
        try {
          const lastUserMsg = (messages ?? [])
            .filter((m: any) => m.role === 'user')
            .pop();
          const query = lastUserMsg
            ? typeof lastUserMsg.content === 'string'
              ? lastUserMsg.content
              : Array.isArray(lastUserMsg.content)
                ? lastUserMsg.content
                    .filter((p: any) => p.type === 'text')
                    .map((p: any) => p.text)
                    .join(' ')
                : ''
            : '';
          if (query) {
            const knowledge = await factory.knowledgeStore.search(
              query,
              context.tenantId,
              1500,
            );
            if (knowledge.found && knowledge.chunks.length > 0) {
              knowledgeBlock = `# Relevant knowledge\n${knowledge.chunks.map((c) => c.content).join('\n\n')}`;
            }
          }
        } catch {
          // Non-fatal — chat works without knowledge retrieval
        }

        const systemMessage = {
          role: 'system' as const,
          content: [soul, memoryBlock, knowledgeBlock]
            .filter(Boolean)
            .join('\n\n'),
        };
        const historyMessages = window.map((m) => ({
          role: m.role as 'user' | 'assistant' | 'system',
          content: m.content,
        }));

        return {
          model: factory.aiRouter.getModel('chat'),
          messages: [
            systemMessage,
            ...historyMessages,
            ...(messages || []),
          ] as ModelMessage[],
        };
      },
    });
  }
}
