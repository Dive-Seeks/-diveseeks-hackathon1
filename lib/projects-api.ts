import api from "./api";
import type { ProjectTeam } from "./coding-store";
export type { ProjectTeam } from "./coding-store";

export interface Project {
  id: string;
  teamId: string;
  userId?: string | null;
  name: string;
  description?: string | null;
  team: ProjectTeam;
  githubRepo?: string | null;
  githubRepoId?: string | null;
  dataRepoId?: string | null;
  techStack?: string[];
  indexStatus?: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  visionReady?: boolean;
  taskCount?: number;
}

export interface DataRepo {
  id: string;
  tenant_id: string;
  project_id: string;
  name: string;
  status: "building" | "active" | "error";
  page_count: number;
}

export interface DataRepoDocument {
  id: string;
  filename: string;
  status: string;
  uploaded_at: string;
}

export interface GithubRepo {
  fullName: string;
  defaultBranch: string;
  private: boolean;
  language: string | null;
  description: string | null;
}

export interface GithubStatus {
  connected: boolean;
  githubLogin?: string;
  connectedAt?: string;
}

// ── Projects ──────────────────────────────────────────────────────────────────

export const listProjects = () =>
  api.get<{ data: Project[] }>("/diveseeks/projects");

export const listWorkflowReadyProjects = () =>
  api.get<{ data: Project[] }>("/diveseeks/projects/workflow-ready");

export const getProject = (projectId: string) =>
  api.get<{ data: Project }>(`/diveseeks/projects/${projectId}`);

export const checkProjectName = (name: string) =>
  api.get<{ data: { available: boolean } }>("/diveseeks/projects/check-name", {
    params: { name },
  });

export const createProject = (body: {
  name: string;
  team: ProjectTeam;
  githubRepo?: string;
  techStack?: string[];
  description?: string;
}) => api.post<{ data: Project }>("/diveseeks/projects", body);

export const initProjectVision = (
  projectId: string,
  body: {
    summary?: string;
    techStack?: { locked?: string[]; forbidden?: string[]; flexible?: string[] };
    constraints?: string[];
    goals?: { title: string; priority?: number }[];
  },
) => api.post<{ data: unknown }>(`/diveseeks/projects/${projectId}/vision`, body);

export type { VisionChatTurn, UserAction, VisionTurnEnvelope } from "@/types/vision-setup-envelope";

import type { VisionChatTurn, UserAction, VisionTurnEnvelope } from "@/types/vision-setup-envelope";

export const visionChat = (
  projectId: string,
  projectName: string,
  history: VisionChatTurn[],
  userAction: UserAction = { type: "init", payload: null },
  currentStep?: string,
) =>
  api.post<{ data: VisionTurnEnvelope }>(
    `/diveseeks/projects/${projectId}/vision/chat`,
    { projectName, history, userAction, currentStep },
  );

export const getProjectVision = (projectId: string, signal?: AbortSignal) =>
  api.get<{ data: unknown | null }>(`/diveseeks/projects/${projectId}/vision`, { signal });

export const getVisionChatHistory = (projectId: string) =>
  api.get<{ data: Array<{ role: string; content: string; step?: string; createdAt?: string }> }>(
    `/diveseeks/projects/${projectId}/vision/chat-history`,
  );

export const visionInterviewStart = (
  projectId: string,
  projectName: string,
  projectDescription: string,
) =>
  api.post<{ data: { sessionId: string; message: string; visionReady: boolean; suggestedTasks?: string[] } }>(
    `/diveseeks/projects/${projectId}/vision/interview/start`,
    { name: projectName, description: projectDescription },
  );

export const visionInterviewChat = (
  projectId: string,
  sessionId: string,
  message: string,
) =>
  api.post<{ data: { sessionId: string; message: string; visionReady: boolean; finalVision?: any; suggestedTasks?: string[] } }>(
    `/diveseeks/projects/${projectId}/vision/interview/chat`,
    { sessionId, message },
  );

// ── GitHub ────────────────────────────────────────────────────────────────────

export const getGithubStatus = () =>
  api.get<{ data: GithubStatus }>("/github/status");

export const startGithubOAuth = () =>
  api.get<{ url: string }>("/github/oauth/start");

export const listGithubRepos = () =>
  api.get<{ data: GithubRepo[] }>("/github/repos");

export const connectGithubRepo = (body: {
  projectId: string;
  repoFullName: string;
}) => api.post<{ data: { repoId: string; indexStatus: string } }>("/github/repos/connect", body);

// ── Data Engine (Documents) ───────────────────────────────────────────────────

export const getDataRepo = (repoId: string) =>
  api.get<{ data: DataRepo }>(`/data-engine/repos/${repoId}`);

export const listDataRepoDocuments = (repoId: string) =>
  api.get<{ data: DataRepoDocument[] }>(`/data-engine/repos/${repoId}/documents`);

export const uploadDocument = (repoId: string, file: File) => {
  const form = new FormData();
  form.append("file", file);
  return api.post<{ data: unknown }>(`/data-engine/repos/${repoId}/upload`, form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
};

export const setProjectWorkflowType = (
  projectId: string,
  workflowType: 'autonomous' | 'canvas',
) =>
  api.patch(`/diveseeks/projects/${projectId}/workflow-type`, { workflowType });
