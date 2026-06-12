import { Injectable, BadRequestException } from '@nestjs/common';
import { JournalService } from '../journal/journal.service';
import { CaJournalEntry, JournalType } from '../journal/journal-entry.entity';
import { EntryType } from '../journal/journal-line.entity';
import { RectifyErrorDto, ErrorType } from './dto/rectify-error.dto';

@Injectable()
export class ErrorRectificationService {
  constructor(private readonly journalService: JournalService) {}

  async rectify(
    tenantId: string,
    dto: RectifyErrorDto,
  ): Promise<CaJournalEntry> {
    const memo = `[RECTIFICATION: ${dto.errorType}] ${dto.memo}`;

    switch (dto.errorType) {
      case ErrorType.OMISSION:
        // Transaction never recorded -> post the missing entry
        // In reality, this requires full lines, but for standard spec we might just expect the caller to use normal createEntry.
        // We'll throw if lines aren't provided in a real scenario, but for now we expect correct/wrong accounts to mimic the fix.
        if (!dto.correctAccountId || !dto.wrongAccountId || !dto.amount) {
          throw new BadRequestException(
            'Omission requires correctAccountId (DR), wrongAccountId (CR) and amount',
          );
        }
        return this.journalService.createEntry(tenantId, {
          memo,
          entryDate: new Date().toISOString(),
          type: JournalType.RECTIFICATION,
          lines: [
            {
              accountId: dto.correctAccountId,
              entryType: EntryType.DEBIT,
              amount: dto.amount,
            },
            {
              accountId: dto.wrongAccountId,
              entryType: EntryType.CREDIT,
              amount: dto.amount,
            },
          ],
        });

      case ErrorType.COMMISSION:
      case ErrorType.PRINCIPLE:
        // Posted to wrong account (same side/type) -> DR wrong / CR wrong (to reverse) + DR right / CR right
        // If wrong account was debited, we credit it and debit the correct account
        if (!dto.correctAccountId || !dto.wrongAccountId || !dto.amount) {
          throw new BadRequestException(
            'Requires correctAccountId, wrongAccountId, and amount',
          );
        }
        return this.journalService.createEntry(tenantId, {
          memo,
          entryDate: new Date().toISOString(),
          type: JournalType.RECTIFICATION,
          lines: [
            {
              accountId: dto.correctAccountId,
              entryType: EntryType.DEBIT,
              amount: dto.amount,
            },
            {
              accountId: dto.wrongAccountId,
              entryType: EntryType.CREDIT,
              amount: dto.amount,
            },
          ],
        });

      case ErrorType.COMPLETE_REVERSAL:
        // Entry posted with DR/CR swapped -> double the original amount, post correct
        if (!dto.correctAccountId || !dto.wrongAccountId || !dto.amount) {
          throw new BadRequestException(
            'Requires correctAccountId (DR), wrongAccountId (CR), and amount',
          );
        }
        return this.journalService.createEntry(tenantId, {
          memo,
          entryDate: new Date().toISOString(),
          type: JournalType.RECTIFICATION,
          lines: [
            {
              accountId: dto.correctAccountId,
              entryType: EntryType.DEBIT,
              amount: dto.amount * 2,
            },
            {
              accountId: dto.wrongAccountId,
              entryType: EntryType.CREDIT,
              amount: dto.amount * 2,
            },
          ],
        });

      case ErrorType.PARTIAL_OMISSION:
        // Only one side posted -> complete the missing leg
        // This usually implies a suspense account is involved in modern systems to keep the balance.
        // If the original entry was unbalanced (which shouldn't happen here due to strict constraints),
        // we'd fix it. Assuming it went to Suspense.
        if (!dto.correctAccountId || !dto.wrongAccountId || !dto.amount) {
          throw new BadRequestException(
            'Requires correctAccountId, wrongAccountId (Suspense), and amount',
          );
        }
        return this.journalService.createEntry(tenantId, {
          memo,
          entryDate: new Date().toISOString(),
          type: JournalType.RECTIFICATION,
          lines: [
            {
              accountId: dto.correctAccountId,
              entryType: EntryType.DEBIT,
              amount: dto.amount,
            },
            {
              accountId: dto.wrongAccountId,
              entryType: EntryType.CREDIT,
              amount: dto.amount,
            },
          ],
        });

      case ErrorType.COMPENSATING:
        // Two equal-opposite errors that cancel. Both must be corrected.
        throw new BadRequestException(
          'Compensating errors must be corrected individually using other error types.',
        );

      default:
        throw new BadRequestException('Unknown error type');
    }
  }
}
