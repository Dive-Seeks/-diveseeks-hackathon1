export type AiFailoverReason =
  | 'auth'
  | 'auth_permanent'
  | 'billing'
  | 'rate_limit'
  | 'overloaded'
  | 'server_error'
  | 'timeout'
  | 'context_overflow'
  | 'payload_too_large'
  | 'format_error'
  | 'model_not_found'
  | 'provider_policy_blocked'
  | 'thinking_signature'
  | 'long_context_tier'
  | 'oauth_long_context_beta_forbidden'
  | 'unknown';

export interface ClassifiedAiError {
  reason: AiFailoverReason;
  retryable: boolean;
  shouldCompress: boolean;
  shouldFallback: boolean;
  message: string;
  statusCode?: number;
}

import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class AiErrorClassifierService {
  private readonly logger = new Logger(AiErrorClassifierService.name);

  classify(error: any): ClassifiedAiError {
    const statusCode =
      error?.statusCode || error?.status || error?.response?.status;
    const message = error?.message || error?.toString() || 'Unknown AI error';
    const code = error?.code || error?.error?.code;
    const type = error?.type || error?.error?.type;

    let reason: AiFailoverReason = 'unknown';
    let retryable = true;
    let shouldCompress = false;
    let shouldFallback = false;

    // 1. HTTP Status & structured codes
    if (statusCode === 401) {
      reason = 'auth';
      shouldFallback = true;
      retryable = false;
    } else if (
      statusCode === 402 ||
      message.toLowerCase().includes('billing') ||
      message.toLowerCase().includes('credit')
    ) {
      reason = 'billing';
      shouldFallback = true;
      retryable = false;
    } else if (statusCode === 403) {
      reason = 'auth_permanent';
      shouldFallback = true;
      retryable = false;
    } else if (statusCode === 404 || code === 'model_not_found') {
      reason = 'model_not_found';
      shouldFallback = true;
      retryable = false;
    } else if (statusCode === 413 || code === 'payload_too_large') {
      reason = 'payload_too_large';
      shouldCompress = true;
      retryable = true;
    } else if (
      statusCode === 429 &&
      (message.toLowerCase().includes('extra usage') ||
        message.toLowerCase().includes('usage tier'))
    ) {
      // Anthropic long-context usage-tier surcharge — not retryable, fall back to shorter model
      reason = 'long_context_tier';
      retryable = false;
      shouldFallback = true;
    } else if (
      statusCode === 400 &&
      message.toLowerCase().includes('long context beta')
    ) {
      // Anthropic OAuth token missing the long-context-beta scope
      reason = 'oauth_long_context_beta_forbidden';
      retryable = false;
      shouldFallback = true;
    } else if (statusCode === 429 || code === 'rate_limit_exceeded') {
      reason = 'rate_limit';
      retryable = true;
      shouldFallback = true;
    } else if (statusCode === 400) {
      if (
        message.toLowerCase().includes('context') ||
        code === 'context_length_exceeded'
      ) {
        reason = 'context_overflow';
        shouldCompress = true;
      } else if (
        message.toLowerCase().includes('policy') ||
        message.toLowerCase().includes('blocked')
      ) {
        reason = 'provider_policy_blocked';
        shouldFallback = false;
        retryable = false;
      } else {
        reason = 'format_error';
        retryable = false;
      }
    } else if (
      message.toLowerCase().includes('high demand') ||
      message.toLowerCase().includes('experiencing demand') ||
      message.toLowerCase().includes('try again later') ||
      message.toLowerCase().includes('temporarily unavailable')
    ) {
      reason = 'overloaded';
      retryable = true;
      shouldFallback = true;
    } else if (statusCode >= 500) {
      if (statusCode === 503 || statusCode === 502) {
        reason = 'overloaded';
        shouldFallback = true;
      } else {
        reason = 'server_error';
      }
      retryable = true;
    } else if (
      type === 'timeout' ||
      message.toLowerCase().includes('timeout')
    ) {
      reason = 'timeout';
      retryable = true;
    } else if (
      message.toLowerCase().includes('disconnect') ||
      message.toLowerCase().includes('socket')
    ) {
      reason = 'timeout'; // mapped to timeout for retries
      retryable = true;
    }

    // Anthropic thinking signature
    if (message.includes('thinking') && message.includes('signature')) {
      reason = 'thinking_signature';
      retryable = false;
      shouldFallback = true;
    }

    return {
      reason,
      retryable,
      shouldCompress,
      shouldFallback,
      message,
      statusCode,
    };
  }
}
