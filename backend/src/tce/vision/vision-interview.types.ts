import { VisionFile } from './vision.types';

export interface VisionInterviewTurn {
  sessionId: string;
  message: string;
  visionReady: boolean;
  finalVision?: VisionFile;
  suggestedTasks?: string[];
}

export interface VisionInterviewStartDto {
  // No body required — projectId comes from route param, userId from JWT
}

export interface VisionInterviewChatDto {
  sessionId: string;
  message: string;
}
