export const CONSTITUTION_TEMPLATE = `# [PROJECT_NAME] Constitution

## Core Principles
[PRINCIPLES]

## Tech Stack (Locked)
[TECH_STACK]

## Constraints (Never Violate)
[CONSTRAINTS]

## Governance
This constitution is generated from the project vision and active parametric
rules. Amendments propagate from VisionService and the parametric_weight table.

**Version**: [VERSION]
**Last Amended**: [LAST_AMENDED_DATE]
`;

export const SPEC_TEMPLATE = `# Feature Specification: [FEATURE_NAME]

## Overview
[OVERVIEW]

## User Scenarios
[SCENARIOS]

## Functional Requirements
[REQUIREMENTS]

## Success Criteria
[SUCCESS_CRITERIA]
`;

export const PLAN_TEMPLATE = `# Implementation Plan: [FEATURE_NAME]

## Constitution Check
[CONSTITUTION_CHECK]

## Architecture
[ARCHITECTURE]

## Phases
[PHASES]
`;

export const TASKS_TEMPLATE = `# Tasks: [FEATURE_NAME]

[TASK_LIST]
`;

export interface SpecKitFile {
  path: string;
  content: string;
}
