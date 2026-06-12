export type VisionStep =
  | 'description'
  | 'tech_stack'
  | 'first_goal'
  | 'constraints'
  | 'open_questions';

export type CardBlock =
  | {
      kind: 'single_choice';
      cardId: string;
      question: string;
      options: { id: string; label: string; rationale: string }[];
      allowFreeText: true;
    }
  | {
      kind: 'multi_select';
      cardId: string;
      question: string;
      options: { id: string; label: string }[];
      minSelected: number;
      maxSelected: number;
      allowFreeText: true;
    }
  | {
      kind: 'yes_no';
      cardId: string;
      question: string;
      rationale: string;
      allowFreeText: true;
    }
  | {
      kind: 'free_text';
      cardId: string;
      question: string;
      placeholder: string;
    }
  | {
      kind: 'confirmation';
      cardId: string;
      title: string;
      body: string;
      capturedFields: string[];
    };

export interface VisionTableSnapshot {
  name: string;
  description: string | null;
  techStack: {
    locked: string[];
    forbidden: string[];
    frontend: string[];
    backend: string[];
    infra: string[];
  };
  goals: { id: string; title: string; description: string }[];
  constraints: string[];
  openQuestions: string[];
  status: Record<VisionStep, 'pending' | 'in_progress' | 'confirmed'>;
}

export interface VisionTurnEnvelope {
  sessionId: string;
  step: VisionStep;
  stepIndex: number;
  totalSteps: 5;
  abigailMessage: string;
  card: CardBlock | null;
  visionTable: VisionTableSnapshot;
  visionReady: boolean;
  finalVision?: any;
  suggestedTasks?: string[];
}

export type UserAction = {
  type:
    | 'click_option'
    | 'multi_select'
    | 'yes_no'
    | 'free_text'
    | 'init'
    | 'edit_step';
  payload: any;
};

export interface VisionChatTurn {
  role: 'user' | 'assistant';
  content: string;
  cardSnapshot?: CardBlock | null;
  visionTableSnapshot?: VisionTableSnapshot | null;
  stepSnapshot?: VisionStep | null;
}
