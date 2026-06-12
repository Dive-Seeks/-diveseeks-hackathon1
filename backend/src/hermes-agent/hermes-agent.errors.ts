export class HermesAgentUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'HermesAgentUnavailableError';
  }
}
