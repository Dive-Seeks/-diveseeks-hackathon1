/**
 * Facts verified live against the pinned image (plan Task 2 contract check).
 * If a newer image differs, update HERE only.
 * `||` (not `??`) everywhere: compose passes EMPTY STRINGS for unset vars,
 * and Number('') is 0 — empty must fall back to the verified defaults.
 */
export const HERMES_IMAGE =
  process.env.HERMES_AGENT_IMAGE || 'nousresearch/hermes-agent:v2026.6.5';

export const HERMES_API_PORT =
  Number(process.env.HERMES_AGENT_API_PORT) || 8642;

export const HERMES_NETWORK =
  process.env.HERMES_AGENT_NETWORK || 'dive_pos_agents_internal';

export const HERMES_CONFIG_PATH = '/opt/data/config.yaml';

export const SUPERVISOR_PORT = Number(process.env.SUPERVISOR_PORT) || 18800;
