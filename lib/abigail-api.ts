// lib/abigail-api.ts
import api from "./api";

// ── Types ──────────────────────────────────────────────────────────────────

export interface AbigailRequestBody {
  projectId: string;
  message: string;
  teamId?: string;
  userId: string;
  specialist?: string;
  alsoSpecialist?: string;
  team?: "coding" | "general" | "research";
  specKitAnswers?: Record<string, string>;
}

export type AbigailResponseStatus =
  | "queued"
  | "done"
  | "resolved_by_weight"
  | "resolved_by_rule"
  | "redirect"
  | "failed"
  | "rejected"
  | "architectural_gate"
  | "speckit_clarifying"
  | "constitution_violation"
  | "accepted";

export interface AbigailRequestResponse {
  status: AbigailResponseStatus;
  sessionId?: string;
  brainstormRequired?: boolean;
  technique?: string;
  topic?: string;
  target?: string;   // "developer_interview" when status === "redirect"
  profileId?: string;
}

export interface DeveloperProfilePatch {
  skillLevel: "junior" | "comfortable" | "experienced" | "expert";
  explanationDepth: "minimal" | "standard" | "detailed";
  improvementPreference: "never" | "sometimes" | "always";
  learningDepth: "none" | "some" | "lots";
}

export interface TaskSession {
  id: string;
  taskDescription: string;
  status: "queued" | "in_progress" | "done" | "failed" | "resolved_by_weight" | "resolved_by_rule";
  specialist?: string;
  createdAt: string;
}

export interface Agent {
  id: string;
  name: string;
  role: string;
  domain?: string;
  tenantId?: string | null;
  title?: string;
  status: "active" | "idle" | "thinking" | "suspended";
}

export interface BudgetInfo {
  usedCents: number;
  limitCents: number;
  percentUsed: number;
}

export interface EvolutionEvent {
  id: string;
  tenant_id: string;
  domain: string;
  created_at: string;
}

export interface BrainSession {
  id: string;
  topic: string;
  state: "ideating" | "complete";
  technique: string;
  currentThread: string;
  ideaCount: number;
  summary?: string;
}

export interface BrainThread {
  id: string;
  name: string;
  topic: string;
}

// ── Abigail Core ───────────────────────────────────────────────────────────

export const sendAbigailRequest = (body: AbigailRequestBody) =>
  api.post<{ data: AbigailRequestResponse }>("/abigail/request", body);

export const patchDeveloperProfile = (profileId: string, patch: DeveloperProfilePatch) =>
  api.patch<{ data: unknown }>(`/abigail/profiles/${profileId}`, patch);

export const fetchBudget = () =>
  api.get<{ data: BudgetInfo }>("/abigail/budget");

export const fetchEvolutionEvents = (params?: { domain?: string; page?: number; limit?: number }) =>
  api.get<{ data: { data: EvolutionEvent[]; total: number; page: number; limit: number } }>("/abigail/evolution-events", { params });

// ── Projects / Tasks ───────────────────────────────────────────────────────

export interface DiveSeeksProject {
  id: string;
  teamId: string;
  name: string;
  team?: "coding" | "general" | "research";
  dataRepoId?: string | null;
  githubRepo?: string;
  techStack?: string[];
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface VisionDto {
  summary?: string;
  techStack?: {
    locked?: string[];
    forbidden?: string[];
    flexible?: string[];
  };
  constraints?: string[];
  goals?: { id?: string; title: string; description?: string; priority?: number }[];
}

export const listProjects = () =>
  api.get<{ data: DiveSeeksProject[] }>("/diveseeks/projects");

export const createProject = (body: {
  name: string;
  teamId: string;
  team?: "coding" | "general" | "research";
  githubRepo?: string;
  techStack?: string[];
}) => api.post<{ data: DiveSeeksProject }>("/diveseeks/projects", body);

export const initProjectVision = (projectId: string, body: VisionDto) =>
  api.post<{ data: unknown }>(`/diveseeks/projects/${projectId}/vision`, body);

export const fetchProjectTasks = (projectId: string) =>
  api.get<{ data: { tasks: TaskSession[]; queued: number; inProgress: number; done: number } }>(`/diveseeks/projects/${projectId}/tasks`);

// ── Agents / Org Chart ─────────────────────────────────────────────────────

export const bootTenant = () =>
  api.post<{ data: { coordinator: Agent } }>("/abigail/boot");

export const fetchOrgChart = () =>
  api.get<{ data: Agent[] }>("/agents/org-chart");

export const fetchCoordinatorScope = () =>
  api.get<{ data: Agent[] }>("/agents/coordinator/scope");

export const updateAgent = (agentId: string, body: { name?: string; title?: string }) =>
  api.patch<{ data: Agent }>(`/agents/${agentId}`, body);

export const checkCoordinatorName = (name: string, excludeId?: string) =>
  api.get<{ data: { available: boolean } }>('/agents/check-name', { params: { name, ...(excludeId && { excludeId }) } });

// ── Brain Sessions ─────────────────────────────────────────────────────────

export const openBrainSession = (body: { topic: string; intentType: string }) =>
  api.post<{ data: BrainSession }>("/abigail-brain/sessions", body);

export const addBrainIdea = (sessionId: string, body: { content: string; batchNumber: number }) =>
  api.post<{ data: unknown }>(`/abigail-brain/sessions/${sessionId}/ideas`, body);

export const forkBrainThread = (sessionId: string, body: { name: string; topic: string }) =>
  api.post<{ data: BrainThread }>(`/abigail-brain/sessions/${sessionId}/fork`, body);

export const backBrainThread = (sessionId: string) =>
  api.post<{ data: BrainSession }>(`/abigail-brain/sessions/${sessionId}/back`, {});

export const completeBrainSession = (sessionId: string) =>
  api.post<{ data: BrainSession }>(`/abigail-brain/sessions/${sessionId}/complete`, {});

export const fetchBrainSessionSummary = (sessionId: string) =>
  api.get<{ data: { summary: string } }>(`/abigail-brain/sessions/${sessionId}/summary`);

export const fetchActiveBrainSession = () =>
  api.get<{ data: BrainSession | null }>("/abigail-brain/sessions/active");

// ── Activity Log ───────────────────────────────────────────────────────────

export interface ActivityLogEntry {
  id: string;
  tenantId: string | null;
  issueId: string | null;
  agentId: string | null;
  actor: string;
  action: string;
  payload: Record<string, any> | null;
  createdAt: string;
}

export const fetchActivityLog = (tenantId: string, page = 1, limit = 30) =>
  api.get<{ data: { data: ActivityLogEntry[]; total: number } }>(
    `/activity/tenant/${tenantId}`,
    { params: { page, limit } },
  );

// ── Agent Issues (Task Queue) ──────────────────────────────────────────────

export type IssueStatus =
  | "todo"
  | "assigned"
  | "in_progress"
  | "in_review"
  | "waiting_approval"
  | "done"
  | "rejected"
  | "cancelled";

export interface GoalAncestry {
  taskTitle: string;
  goalId: string;
  goalTitle: string;
  goalDescription: string;
  goalProgress: number;
  projectName: string;
  projectDescription: string;
}

export interface AgentIssueRow {
  id: string;
  tenantId: string;
  title: string;
  description: string | null;
  assigneeAgentId: string;
  sessionId: string | null;
  domain: string | null;
  status: IssueStatus;
  priority: string | null;
  checkoutRunId: string | null;
  executionLockedAt: string | null;
  goalAncestry: GoalAncestry | null;
  originKind: string | null;
  createdAt: string;
  updatedAt: string;
}

export const fetchAgentIssues = (params?: {
  agentId?: string;
  status?: string;
  page?: number;
  limit?: number;
}) =>
  api.get<{ data: { data: AgentIssueRow[]; total: number; page: number; limit: number } }>(
    "/agent-issues",
    { params },
  );

// ── Coordinator Budget (full summary) ─────────────────────────────────────

export interface SpendSummary {
  tenantId: string;
  monthlyLimitCents: number;
  spentCents: number;
  remainingCents: number;
  paused: boolean;
  windowStart: string;
  windowEnd: string;
}

export const fetchSpendSummary = () =>
  api.get<{ data: SpendSummary }>("/coordinator/budget");

// ── Token Spend Events ─────────────────────────────────────────────────────

export interface TokenSpendEvent {
  id: string;
  tenantId: string;
  sessionId: string | null;
  jobId: string | null;
  mcpId: string | null;
  provider: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  costCents: number;
  createdAt: string;
}

export const fetchSpendEvents = (limit = 20) =>
  api.get<{ data: { data: TokenSpendEvent[] } }>("/coordinator/budget/spend-events", {
    params: { limit },
  });
