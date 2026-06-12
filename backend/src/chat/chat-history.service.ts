import { Injectable, Logger } from '@nestjs/common';
import { generateText } from 'ai';
import { UserChatService } from './user-chat.service';
import { TokenizerService } from '../tokenizer/tokenizer.service';
import { AiProviderRouter } from '../common/ai-provider-router.service';

interface LoadWindowOpts {
  projectId: string;
  tenantId: string;
  maxTokens: number;
  maxTurns: number;
}

@Injectable()
export class ChatHistoryService {
  private readonly logger = new Logger(ChatHistoryService.name);

  constructor(
    private readonly userChat: UserChatService,
    private readonly tokenizer: TokenizerService,
    private readonly aiRouter: AiProviderRouter,
  ) {}

  async loadWindow(
    opts: LoadWindowOpts,
  ): Promise<Array<{ role: string; content: string }>> {
    const rows = await this.userChat.getHistory(
      opts.projectId,
      opts.tenantId,
      opts.maxTurns,
    );
    if (rows.length === 0) return [];

    const totalTokens = rows.reduce((sum, r) => sum + (r.tokenCount || 0), 0);

    if (totalTokens <= opts.maxTokens) {
      return rows.map((r) => ({ role: r.role, content: r.content }));
    }

    // Over budget — compact older half
    const splitIdx = Math.floor(rows.length / 2);
    const older = rows.slice(0, splitIdx);
    const recent = rows.slice(splitIdx);

    const summary = await this.compactMessages(
      older.map((r) => `${r.role}: ${r.content}`).join('\n'),
    );

    return [
      { role: 'system', content: `# Prior conversation summary\n${summary}` },
      ...recent.map((r) => ({ role: r.role, content: r.content })),
    ];
  }

  // Extracted for testability
  async compactMessages(text: string): Promise<string> {
    try {
      const { text: summary } = await generateText({
        model: this.aiRouter.getModel('researcher'),
        messages: [
          {
            role: 'system',
            content:
              'Summarize the following conversation segment concisely. Retain key facts, preferences, decisions, and constraints.',
          },
          {
            role: 'user',
            content: text,
          },
        ],
      });
      return summary;
    } catch (err) {
      this.logger.warn(`Failed to compact messages: ${(err as Error).message}`);
      return 'Prior conversation omitted due to length.';
    }
  }
}
