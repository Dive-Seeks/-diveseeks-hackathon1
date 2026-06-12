/**
 * Industry Registry — Dynamic Industry Expansion
 * Defines the root agents and domains for each industry.
 */
export const INDUSTRY_REGISTRY: Record<
  string,
  {
    ceoName: string;
    ceoTitle: string;
    domains: string[];
    defaultManagers: { name: string; domain: string }[];
  }
> = {
  pos: {
    ceoName: 'Jos',
    ceoTitle: 'Industry CEO — Point of Sale',
    domains: [
      'menu',
      'marketing',
      'analytics',
      'inventory',
      'ads',
      'accounting',
    ],
    defaultManagers: [
      { name: 'Menu Manager', domain: 'menu' },
      { name: 'Marketing Manager', domain: 'marketing' },
      { name: 'Analytics Manager', domain: 'analytics' },
    ],
  },
  software: {
    ceoName: 'DevCEO',
    ceoTitle: 'Industry CEO — Software Development',
    domains: ['backend', 'frontend', 'testing', 'security', 'devops', 'docs'],
    defaultManagers: [
      { name: 'Engineering Manager', domain: 'engineering' },
      { name: 'QA Manager', domain: 'qa' },
    ],
  },
  healthcare: {
    ceoName: 'MedCEO',
    ceoTitle: 'Industry CEO — Healthcare',
    domains: ['diagnosis', 'records', 'billing', 'compliance', 'scheduling'],
    defaultManagers: [],
  },
  legal: {
    ceoName: 'LegalCEO',
    ceoTitle: 'Industry CEO — Legal',
    domains: ['contracts', 'compliance', 'research', 'billing'],
    defaultManagers: [],
  },
  robotics: {
    ceoName: 'RoboticsCEO',
    ceoTitle: 'Industry CEO — Robotics',
    domains: ['sensors', 'motion', 'safety', 'ml-models', 'firmware'],
    defaultManagers: [],
  },
};
