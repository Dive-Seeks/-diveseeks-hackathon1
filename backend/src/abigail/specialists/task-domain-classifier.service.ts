import { Injectable } from '@nestjs/common';
import { NlpPipelineService } from '../../memory/nlp-pipeline.service';

export interface ClassificationResult {
  specialist: string;
  confidence: number;
  subType: string;
  skillHints: string[];
  nlpSignals: { verbs: string[]; nouns: string[]; actionType: string };
}

interface SpecialistKeywords {
  id: string;
  primaryAction: string;
  keywords: Array<{ term: string; weight: number }>;
}

const GENERAL_SPECIALISTS: SpecialistKeywords[] = [
  {
    id: 'echo',
    primaryAction: 'synthesis',
    keywords: [
      { term: 'summarize', weight: 3 },
      { term: 'summary', weight: 3 },
      { term: 'condense', weight: 3 },
      { term: 'brief', weight: 2 },
      { term: 'tldr', weight: 2 },
    ],
  },
  {
    id: 'lyra',
    primaryAction: 'content',
    keywords: [
      { term: 'post', weight: 2 },
      { term: 'blog', weight: 3 },
      { term: 'essay', weight: 3 },
      { term: 'article', weight: 3 },
      { term: 'caption', weight: 2 },
      { term: 'draft', weight: 2 },
    ],
  },
  {
    id: 'spark',
    primaryAction: 'general',
    keywords: [
      { term: 'brainstorm', weight: 3 },
      { term: 'idea', weight: 2 },
      { term: 'creative', weight: 3 },
      { term: 'concept', weight: 2 },
      { term: 'ideation', weight: 3 },
    ],
  },
  {
    id: 'zoe',
    primaryAction: 'content',
    keywords: [
      { term: 'email', weight: 3 },
      { term: 'reply', weight: 3 },
      { term: 'rewrite', weight: 2 },
      { term: 'message', weight: 2 },
      { term: 'communication', weight: 2 },
    ],
  },
  {
    id: 'gist',
    primaryAction: 'education',
    keywords: [
      { term: 'explain', weight: 3 },
      { term: 'analogy', weight: 3 },
      { term: 'simplify', weight: 3 },
      { term: 'meaning', weight: 2 },
      { term: 'understand', weight: 2 },
    ],
  },
  {
    id: 'memo',
    primaryAction: 'planning',
    keywords: [
      { term: 'organize', weight: 3 },
      { term: 'bullet', weight: 3 },
      { term: 'list', weight: 2 },
      { term: 'header', weight: 2 },
      { term: 'format', weight: 2 },
    ],
  },
  {
    id: 'tran',
    primaryAction: 'translation',
    keywords: [
      { term: 'translate', weight: 3 },
      { term: 'translation', weight: 3 },
      { term: 'multilingual', weight: 3 },
      { term: 'language', weight: 2 },
      { term: 'french', weight: 2 },
      { term: 'spanish', weight: 2 },
    ],
  },
  {
    id: 'plan',
    primaryAction: 'planning',
    keywords: [
      { term: 'plan', weight: 3 },
      { term: 'step', weight: 2 },
      { term: 'roadmap', weight: 3 },
      { term: 'action', weight: 2 },
      { term: 'schedule', weight: 2 },
      { term: 'timeline', weight: 2 },
    ],
  },
  {
    id: 'vibe',
    primaryAction: 'content',
    keywords: [
      { term: 'tone', weight: 3 },
      { term: 'style', weight: 2 },
      { term: 'formal', weight: 3 },
      { term: 'casual', weight: 3 },
      { term: 'voice', weight: 2 },
    ],
  },
];

const RESEARCH_SPECIALISTS: SpecialistKeywords[] = [
  {
    id: 'lit',
    primaryAction: 'research',
    keywords: [
      { term: 'literature', weight: 3 },
      { term: 'academic', weight: 3 },
      { term: 'paper', weight: 2 },
      { term: 'survey', weight: 2 },
      { term: 'review', weight: 2 },
    ],
  },
  {
    id: 'cite',
    primaryAction: 'general',
    keywords: [
      { term: 'citation', weight: 3 },
      { term: 'bibliography', weight: 3 },
      { term: 'cite', weight: 3 },
      { term: 'apa', weight: 3 },
      { term: 'mla', weight: 3 },
      { term: 'ieee', weight: 3 },
    ],
  },
  {
    id: 'hypo',
    primaryAction: 'analysis',
    keywords: [
      { term: 'hypothesis', weight: 3 },
      { term: 'experiment', weight: 3 },
      { term: 'variable', weight: 2 },
      { term: 'test', weight: 1 },
      { term: 'refine', weight: 2 },
    ],
  },
  {
    id: 'peer',
    primaryAction: 'review',
    keywords: [
      { term: 'peer', weight: 3 },
      { term: 'critique', weight: 3 },
      { term: 'methodology', weight: 3 },
      { term: 'weakness', weight: 2 },
      { term: 'review', weight: 2 },
    ],
  },
  {
    id: 'scribe',
    primaryAction: 'content',
    keywords: [
      { term: 'whitepaper', weight: 3 },
      { term: 'draft', weight: 2 },
      { term: 'specification', weight: 2 },
      { term: 'report', weight: 2 },
      { term: 'technical', weight: 2 },
    ],
  },
  {
    id: 'tutor',
    primaryAction: 'education',
    keywords: [
      { term: 'learn', weight: 3 },
      { term: 'equation', weight: 3 },
      { term: 'tutor', weight: 3 },
      { term: 'explain', weight: 2 },
      { term: 'intuitive', weight: 2 },
    ],
  },
  {
    id: 'prof',
    primaryAction: 'education',
    keywords: [
      { term: 'mentor', weight: 3 },
      { term: 'guidance', weight: 3 },
      { term: 'professor', weight: 3 },
      { term: 'curriculum', weight: 2 },
      { term: 'path', weight: 1 },
    ],
  },
  {
    id: 'grant',
    primaryAction: 'content',
    keywords: [
      { term: 'grant', weight: 3 },
      { term: 'proposal', weight: 3 },
      { term: 'funding', weight: 3 },
      { term: 'budget', weight: 2 },
      { term: 'viability', weight: 2 },
    ],
  },
  {
    id: 'data',
    primaryAction: 'analysis',
    keywords: [
      { term: 'data', weight: 3 },
      { term: 'dataset', weight: 3 },
      { term: 'statistic', weight: 3 },
      { term: 'trend', weight: 2 },
      { term: 'analysis', weight: 2 },
      { term: 'research', weight: 2 },
    ],
  },
  {
    id: 'synth',
    primaryAction: 'synthesis',
    keywords: [
      { term: 'synthesize', weight: 3 },
      { term: 'integrate', weight: 2 },
      { term: 'finding', weight: 2 },
      { term: 'knowledge', weight: 2 },
      { term: 'unify', weight: 2 },
    ],
  },
];

@Injectable()
export class TaskDomainClassifierService {
  constructor(private readonly nlp: NlpPipelineService) {}

  classify(taskText: string, team: string): ClassificationResult {
    const analysis = this.nlp.analyze(taskText);
    const roster =
      team === 'research' ? RESEARCH_SPECIALISTS : GENERAL_SPECIALISTS;
    const defaultSpecialist = team === 'research' ? 'synth' : 'quest';
    const skillHint =
      team === 'research'
        ? 'research-prd-discipline'
        : 'general-prd-discipline';
    const lemmaSet = new Set(analysis.lemmas);

    const scores: Array<{ id: string; score: number; primaryAction: string }> =
      roster.map((spec) => {
        let score = 0;
        for (const { term, weight } of spec.keywords) {
          if (lemmaSet.has(term)) score += weight;
        }
        if (
          spec.primaryAction === analysis.actionType &&
          analysis.actionType !== 'general'
        )
          score += 3;
        return { id: spec.id, score, primaryAction: spec.primaryAction };
      });

    scores.sort((a, b) => b.score - a.score);
    const winner = scores[0];
    const runnerUp = scores[1];

    const confidence =
      winner.score === 0
        ? 0
        : winner.score / (winner.score + (runnerUp?.score ?? 0) + 0.001);

    const specialist = confidence < 0.35 ? defaultSpecialist : winner.id;

    return {
      specialist,
      confidence,
      subType: analysis.actionType,
      skillHints: [skillHint],
      nlpSignals: {
        verbs: analysis.verbs,
        nouns: analysis.nouns,
        actionType: analysis.actionType,
      },
    };
  }
}
