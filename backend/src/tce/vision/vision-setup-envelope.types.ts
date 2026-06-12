import { z } from 'zod';
import { VisionFile } from './vision.types';

export const VISION_STEPS = [
  'description',
  'tech_stack',
  'first_goal',
  'constraints',
  'open_questions',
] as const;
export type VisionStep = (typeof VISION_STEPS)[number];

export interface CeoBriefResult {
  inferredSections: VisionStep[];
  inferredDescription: string | null;
  inferredTechStack: {
    locked: string[];
    forbidden: string[];
    frontend: string[];
    backend: string[];
    infra: string[];
  } | null;
  inferredConstraints: string[];
  isSoftwareProject: boolean;
  openingQuestion: string;
  openingCardKind: 'single_choice' | 'multi_select' | 'yes_no' | 'free_text';
  openingOptions: { id: string; label: string; rationale: string }[];
  suggestedTasks: string[];
}

export const SingleChoiceCardSchema = z.object({
  kind: z.literal('single_choice'),
  cardId: z.string(),
  question: z.string(),
  options: z.array(
    z.object({
      id: z.string(),
      label: z.string(),
      rationale: z.string().optional().default(''),
    }),
  ),
  allowFreeText: z.boolean().optional().default(true),
});

export const MultiSelectCardSchema = z.object({
  kind: z.literal('multi_select'),
  cardId: z.string(),
  question: z.string(),
  options: z.array(z.object({ id: z.string(), label: z.string() })),
  minSelected: z.number().int().min(0).optional().default(1),
  maxSelected: z.number().int().min(1).optional().default(5),
  allowFreeText: z.boolean().optional().default(true),
});

export const YesNoCardSchema = z.object({
  kind: z.literal('yes_no'),
  cardId: z.string(),
  question: z.string(),
  rationale: z.string().optional().default(''),
  allowFreeText: z.boolean().optional().default(true),
});

export const FreeTextCardSchema = z.object({
  kind: z.literal('free_text'),
  cardId: z.string(),
  question: z.string(),
  placeholder: z.string().optional().default(''),
});

export const ConfirmationCardSchema = z.object({
  kind: z.literal('confirmation'),
  cardId: z.string(),
  title: z.string(),
  body: z.string(),
  capturedFields: z.array(z.string()),
});

export const CardBlockSchema = z.discriminatedUnion('kind', [
  SingleChoiceCardSchema,
  MultiSelectCardSchema,
  YesNoCardSchema,
  FreeTextCardSchema,
  ConfirmationCardSchema,
]);

export type CardBlock = z.infer<typeof CardBlockSchema>;

export const VisionTableSnapshotSchema = z.object({
  name: z.string(),
  description: z.string().nullable(),
  techStack: z
    .object({
      locked: z.preprocess(
        (v) => (Array.isArray(v) ? v : []),
        z.array(z.string()),
      ),
      forbidden: z.preprocess(
        (v) => (Array.isArray(v) ? v : []),
        z.array(z.string()),
      ),
      frontend: z.preprocess(
        (v) => (Array.isArray(v) ? v : []),
        z.array(z.string()),
      ),
      backend: z.preprocess(
        (v) => (Array.isArray(v) ? v : []),
        z.array(z.string()),
      ),
      infra: z.preprocess(
        (v) => (Array.isArray(v) ? v : []),
        z.array(z.string()),
      ),
    })
    .catch({ locked: [], forbidden: [], frontend: [], backend: [], infra: [] }),
  goals: z.preprocess(
    (v) => (Array.isArray(v) ? v : []),
    z.array(
      z.object({ id: z.string(), title: z.string(), description: z.string() }),
    ),
  ),
  constraints: z.preprocess(
    (v) => (Array.isArray(v) ? v : []),
    z.array(z.string()),
  ),
  openQuestions: z.preprocess(
    (v) => (Array.isArray(v) ? v : []),
    z.array(z.string()),
  ),
  status: z
    .object({
      description: z
        .enum(['pending', 'in_progress', 'confirmed'])
        .catch('in_progress'),
      tech_stack: z
        .enum(['pending', 'in_progress', 'confirmed'])
        .catch('pending'),
      first_goal: z
        .enum(['pending', 'in_progress', 'confirmed'])
        .catch('pending'),
      constraints: z
        .enum(['pending', 'in_progress', 'confirmed'])
        .catch('pending'),
      open_questions: z
        .enum(['pending', 'in_progress', 'confirmed'])
        .catch('pending'),
    })
    .catch({
      description: 'in_progress',
      tech_stack: 'pending',
      first_goal: 'pending',
      constraints: 'pending',
      open_questions: 'pending',
    }),
});

export type VisionTableSnapshot = z.infer<typeof VisionTableSnapshotSchema>;

export const VisionTurnEnvelopeSchema = z.object({
  sessionId: z.string().min(1),
  step: z.enum(VISION_STEPS),
  stepIndex: z.number().int().min(1).max(5),
  totalSteps: z.number().int().min(1).catch(5),
  abigailMessage: z.string().max(2000),
  card: CardBlockSchema.nullable(),
  visionTable: VisionTableSnapshotSchema,
  visionReady: z.boolean(),
  finalVision: z.any().optional(),
  suggestedTasks: z.array(z.string()).optional(),
});

export type VisionTurnEnvelope = Omit<
  z.infer<typeof VisionTurnEnvelopeSchema>,
  'finalVision'
> & {
  finalVision?: VisionFile;
};

export const UserActionSchema = z.object({
  type: z.enum([
    'click_option',
    'multi_select',
    'yes_no',
    'free_text',
    'init',
    'edit_step',
  ]),
  payload: z.any(),
});
export type UserAction = z.infer<typeof UserActionSchema>;

export interface VisionChatTurn {
  role: 'user' | 'assistant';
  content: string;
  cardSnapshot?: CardBlock | null;
  visionTableSnapshot?: VisionTableSnapshot | null;
  stepSnapshot?: VisionStep | null;
}
