import { Injectable } from '@nestjs/common';
import { BrainTechnique } from './entities/brain-session.entity';

@Injectable()
export class BrainTechniqueService {
  private readonly techniques = {
    free_association: {
      name: 'Free Association',
      description:
        'Generate ideas in batches of 5–10 without filtering or feasibility checks.',
      prompt:
        'Let\'s start with Free Association. Generate 5-10 wild ideas for "{topic}". Don\'t worry about feasibility yet—just get them out.',
    },
    scamper: {
      name: 'SCAMPER',
      description:
        'Substitute, Combine, Adapt, Modify, Put to other uses, Eliminate, Reverse.',
      prompt:
        'Using SCAMPER, how can we Substitute or Combine elements of "{topic}"? Give me 5-10 ideas.',
    },
    six_hats: {
      name: 'Six Thinking Hats',
      description:
        'White (facts), Red (gut), Black (risk), Yellow (value), Green (creative), Blue (process).',
      prompt:
        'Let\'s use Six Thinking Hats. Start with the White Hat (facts) and Green Hat (creative ideas) for "{topic}".',
    },
    reverse: {
      name: 'Reverse Brainstorming',
      description:
        'Brainstorm how to make it FAIL first to surface hidden risks.',
      prompt:
        'Reverse it: How could we make "{topic}" a complete disaster? Surfacing these failure modes helps us build better.',
    },
    analogy: {
      name: 'Analogy',
      description: 'Find parallels from other domains and map them back.',
      prompt:
        'What is "{topic}" most like in nature or another industry? Let\'s use that analogy to find new perspectives.',
    },
    constraint: {
      name: 'Constraint-Based Thinking',
      description: 'What if budget=0 / time=1day / team=1person?',
      prompt:
        'What if we had to build "{topic}" in 24 hours with zero budget? What would the absolute core be?',
    },
    five_whys: {
      name: '5 Whys',
      description: 'Drill into description by asking why repeatedly.',
      prompt:
        'For "{topic}" — who is it for, what does it replace, why does it need to exist, why now, why this stack? Drill from one line to a paragraph.',
    },
    morphological: {
      name: 'Morphological Matrix',
      description:
        'Lay out dimensions (frontend / backend / data / auth / infra) × 2–3 options each.',
      prompt:
        'For "{topic}", lay out the stack dimensions (frontend, backend, data, auth, infra) and propose 2–3 concrete options per dimension.',
    },
    smart: {
      name: 'SMART Goal',
      description:
        'Break a goal into Specific / Measurable / Achievable / Relevant / Time-bound.',
      prompt:
        'For "{topic}", define the first goal as SMART: Specific, Measurable, Achievable, Relevant, Time-bound. One goal — title + description.',
    },
    premortem: {
      name: 'Premortem',
      description:
        'Imagine the project failed in 6 months — what rule, if broken, caused it?',
      prompt:
        'Imagine "{topic}" failed in 6 months. What hard rule, if broken, caused the failure? List 3-5 constraint candidates.',
    },
    diverge: {
      name: 'Diverge-only',
      description:
        'Diverge-first idea generation for listing uncertainties — multi-select what is real.',
      prompt:
        'For "{topic}", list every uncertainty or open question you still have. Quantity over quality. We will multi-select later.',
    },
  };

  getOpeningPrompt(technique: BrainTechnique, topic: string): string {
    const t = this.techniques[technique];
    return t.prompt.replace('{topic}', topic);
  }

  selectTechnique(intentType: string): BrainTechnique {
    switch (intentType) {
      case 'feature':
        return 'free_association';
      case 'architecture':
        return 'six_hats';
      case 'design':
        return 'analogy';
      case 'new_module':
        return 'scamper';
      default:
        return 'free_association';
    }
  }

  selectTechniqueForVisionStep(
    step:
      | 'description'
      | 'tech_stack'
      | 'first_goal'
      | 'constraints'
      | 'open_questions',
  ): BrainTechnique {
    switch (step) {
      case 'description':
        return 'five_whys';
      case 'tech_stack':
        return 'morphological';
      case 'first_goal':
        return 'smart';
      case 'constraints':
        return 'premortem';
      case 'open_questions':
        return 'diverge';
    }
  }
}
