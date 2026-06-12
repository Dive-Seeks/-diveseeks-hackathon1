/**
 * Controls whether AI/agent BullMQ processors are registered on this node.
 *
 * AI_WORKER_MODE values:
 *   'worker'   — this node is a dedicated AI worker; processors run, no HTTP server.
 *   'disabled' — this node is an HTTP-only node; processors do NOT run.
 *   <unset>    — single-node dev default; both HTTP and processors run.
 */
export function shouldRunAiProcessors(): boolean {
  const mode = process.env.AI_WORKER_MODE;
  if (mode === 'disabled') return false;
  return true; // 'worker' or unset — both run processors
}
