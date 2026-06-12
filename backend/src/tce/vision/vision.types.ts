export interface VisionGoal {
  id: string;
  title: string;
  description: string;
  status: 'not_started' | 'in_progress' | 'complete' | 'blocked';
  progress: number;
  tasks: string[];
  completedAt?: string;
  blockedReason?: string;
}

export interface VisionChatMessage {
  role: 'user' | 'assistant';
  content: string;
  step?: string;
  visionTable?: import('./vision-setup-envelope.types').VisionTableSnapshot;
  createdAt: string;
}

export interface VisionFile {
  projectId: string;
  name: string;
  description: string;
  techStack: {
    locked: string[];
    forbidden: string[];
    frontend: string[];
    backend: string[];
    infra: string[];
  };
  goals: VisionGoal[];
  constraints: string[];
  openQuestions: string[];
  createdAt: string;
  lastUpdatedAt: string;
  version: number;
  setupComplete?: boolean;
  suggestedTasks?: string[];
  isSoftwareProject?: boolean;
}
