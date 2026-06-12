import { IsEnum } from 'class-validator';

export enum SkillLevelAnswer {
  JUNIOR = 'junior',
  COMFORTABLE = 'comfortable',
  EXPERIENCED = 'experienced',
  EXPERT = 'expert',
}

export enum ExplanationDepth {
  FULL = 'full',
  BRIEF = 'brief',
  MINIMAL = 'minimal',
}

export enum ImprovementPreference {
  ALWAYS = 'always',
  SOMETIMES = 'sometimes',
  NEVER = 'never',
}

export enum LearningDepth {
  LOTS = 'lots',
  SOME = 'some',
  NONE = 'none',
}

export class CompleteInterviewDto {
  @IsEnum(SkillLevelAnswer)
  skillLevel: SkillLevelAnswer;

  @IsEnum(ExplanationDepth)
  explanationDepth: ExplanationDepth;

  @IsEnum(ImprovementPreference)
  improvementPreference: ImprovementPreference;

  @IsEnum(LearningDepth)
  learningDepth: LearningDepth;
}
