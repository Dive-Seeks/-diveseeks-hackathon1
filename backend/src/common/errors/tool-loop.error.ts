export class ToolLoopError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ToolLoopError';
  }
}
