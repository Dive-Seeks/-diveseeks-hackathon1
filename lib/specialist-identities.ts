export interface SpecialistIdentity {
  displayName: string;
  monogram: string;
  colour: string;
  team: 'coding' | 'general' | 'research' | 'system';
  description: string;      // role label, e.g. "Backend Engineer"
  speciality: string;       // tech keywords, e.g. "NestJS · TypeORM · PostgreSQL"
  avatarPath: string | null; // "/avatars/coding/rex.png" or null → monogram fallback
}

// randomuser.me portrait photos — free, no API key, consistent by index
const M = (n: number) => `https://randomuser.me/api/portraits/men/${n}.jpg`;
const W = (n: number) => `https://randomuser.me/api/portraits/women/${n}.jpg`;

export const SPECIALIST_IDENTITIES: Record<string, SpecialistIdentity> = {
  // ── Coding team ───────────────────────────────────────────────────────────
  rex:    { displayName: 'Rex',    monogram: 'RX', colour: '#3B82F6', team: 'coding',   description: 'Backend Engineer',       speciality: 'NestJS · TypeORM · PostgreSQL', avatarPath: M(1)  },
  nova:   { displayName: 'Nova',   monogram: 'NV', colour: '#8B5CF6', team: 'coding',   description: 'Frontend Engineer',      speciality: 'Next.js · Tailwind · Zustand',  avatarPath: W(5)  },
  kai:    { displayName: 'Kai',    monogram: 'KI', colour: '#06B6D4', team: 'coding',   description: 'Code Reviewer',          speciality: 'Security · Style · Coverage',   avatarPath: M(3)  },
  sage:   { displayName: 'Sage',   monogram: 'SG', colour: '#10B981', team: 'coding',   description: 'Test Engineer',          speciality: 'Jest · Playwright · Hurl',      avatarPath: W(12) },
  pixel:  { displayName: 'Pixel',  monogram: 'PX', colour: '#EC4899', team: 'coding',   description: 'Debugger',               speciality: 'Root cause · Error patterns',   avatarPath: M(7)  },
  luma:   { displayName: 'Luma',   monogram: 'LM', colour: '#7C3AED', team: 'coding',   description: 'Documentation Writer',   speciality: 'README · API Docs · Changelog', avatarPath: W(8)  },
  orion:  { displayName: 'Orion',  monogram: 'OR', colour: '#0EA5E9', team: 'coding',   description: 'Architect',              speciality: 'System design · ADRs',          avatarPath: M(15) },
  felix:  { displayName: 'Felix',  monogram: 'FX', colour: '#F97316', team: 'coding',   description: 'Security Auditor',       speciality: 'OWASP · Auth · Secrets',        avatarPath: M(9)  },
  atlas:  { displayName: 'Atlas',  monogram: 'AT', colour: '#84CC16', team: 'coding',   description: 'DevOps Engineer',        speciality: 'Docker · CI/CD · Deploy',       avatarPath: M(11) },
  vex:    { displayName: 'Vex',    monogram: 'VX', colour: '#F43F5E', team: 'coding',   description: 'Security Tester',        speciality: 'XSS · Injection · Pentest',     avatarPath: W(10) },
  // ── General team ─────────────────────────────────────────────────────────
  quest:  { displayName: 'Quest',  monogram: 'QU', colour: '#8B5CF6', team: 'general',  description: 'Q&A Specialist',         speciality: 'Knowledge · FAQ · Research',    avatarPath: M(20) },
  echo:   { displayName: 'Echo',   monogram: 'EC', colour: '#8B5CF6', team: 'general',  description: 'Summariser',             speciality: 'Condense · Brief · TL;DR',      avatarPath: W(20) },
  lyra:   { displayName: 'Lyra',   monogram: 'LY', colour: '#8B5CF6', team: 'general',  description: 'Content Writer',         speciality: 'Blog · Essay · Caption',        avatarPath: W(22) },
  spark:  { displayName: 'Spark',  monogram: 'SP', colour: '#8B5CF6', team: 'general',  description: 'Ideation Specialist',    speciality: 'Brainstorm · Creative · Ideas', avatarPath: M(22) },
  zoe:    { displayName: 'Zoe',    monogram: 'ZO', colour: '#8B5CF6', team: 'general',  description: 'Communication Expert',   speciality: 'Email · Rewrite · Tone',        avatarPath: W(24) },
  gist:   { displayName: 'Gist',   monogram: 'GI', colour: '#8B5CF6', team: 'general',  description: 'Explainer',              speciality: 'Analogies · Simplify · ELI5',   avatarPath: M(24) },
  memo:   { displayName: 'Memo',   monogram: 'ME', colour: '#8B5CF6', team: 'general',  description: 'Organiser',              speciality: 'Lists · Structure · Bullets',   avatarPath: W(26) },
  tran:   { displayName: 'Tran',   monogram: 'TR', colour: '#8B5CF6', team: 'general',  description: 'Translator',             speciality: 'Multilingual · Localisation',   avatarPath: M(26) },
  plan:   { displayName: 'Plan',   monogram: 'PL', colour: '#8B5CF6', team: 'general',  description: 'Planner',                speciality: 'Tasks · Roadmap · Timeline',    avatarPath: W(28) },
  vibe:   { displayName: 'Vibe',   monogram: 'VI', colour: '#8B5CF6', team: 'general',  description: 'Tone Specialist',        speciality: 'Formal · Casual · Brand voice', avatarPath: M(28) },
  // ── Research team ────────────────────────────────────────────────────────
  lit:    { displayName: 'Lit',    monogram: 'LT', colour: '#10B981', team: 'research', description: 'Literature Researcher',  speciality: 'Papers · Academic · Search',    avatarPath: W(30) },
  cite:   { displayName: 'Cite',   monogram: 'CT', colour: '#10B981', team: 'research', description: 'Citation Specialist',    speciality: 'APA · MLA · IEEE · Chicago',    avatarPath: M(30) },
  hypo:   { displayName: 'Hypo',   monogram: 'HY', colour: '#10B981', team: 'research', description: 'Hypothesis Generator',   speciality: 'Variables · Experiment design', avatarPath: M(32) },
  peer:   { displayName: 'Peer',   monogram: 'PE', colour: '#10B981', team: 'research', description: 'Peer Reviewer',          speciality: 'Methodology · Critique',        avatarPath: W(32) },
  scribe: { displayName: 'Scribe', monogram: 'SC', colour: '#10B981', team: 'research', description: 'Research Writer',        speciality: 'Whitepaper · Report · Draft',   avatarPath: W(34) },
  tutor:  { displayName: 'Tutor',  monogram: 'TU', colour: '#10B981', team: 'research', description: 'Tutor',                  speciality: 'Explain · Equations · Intuition', avatarPath: M(34) },
  prof:   { displayName: 'Prof',   monogram: 'PR', colour: '#10B981', team: 'research', description: 'Domain Expert',          speciality: 'Mentor · Curate · Academic',    avatarPath: M(36) },
  grant:  { displayName: 'Grant',  monogram: 'GR', colour: '#10B981', team: 'research', description: 'Grant Writer',           speciality: 'Proposal · Funding · Business', avatarPath: W(36) },
  data:   { displayName: 'Data',   monogram: 'DA', colour: '#10B981', team: 'research', description: 'Data Analyst',           speciality: 'Statistics · Trends · Dataset', avatarPath: M(38) },
  synth:  { displayName: 'Synth',  monogram: 'ST', colour: '#10B981', team: 'research', description: 'Knowledge Synthesiser',  speciality: 'Integrate · Consolidate · Findings', avatarPath: W(38) },
  // ── System agents ─────────────────────────────────────────────────────────
  'abigail-ceo':  { displayName: 'Abigail Gen 1', monogram: 'AB', colour: '#F59E0B', team: 'system', description: 'Executive Brain',      speciality: 'Gates · Routes · Validates',   avatarPath: null },
  'abigail-mind': { displayName: 'AbigailMind',   monogram: 'AM', colour: '#F59E0B', team: 'system', description: 'Coordinator',          speciality: 'Context · Dispatch · Memory',  avatarPath: null },
  coordinator:    { displayName: 'Coordinator',   monogram: 'CO', colour: '#64748B', team: 'system', description: 'Autonomous Planner',   speciality: '',                             avatarPath: null },
  hermes:         { displayName: 'Hermes',        monogram: 'HM', colour: '#F97316', team: 'system', description: 'Behavioural Observer', speciality: '',                             avatarPath: null },
  soul:           { displayName: 'Soul',          monogram: 'SL', colour: '#6366F1', team: 'system', description: 'Nightly Evolver',      speciality: '',                             avatarPath: null },
  'audit-loop':   { displayName: 'AuditLoop',     monogram: 'AL', colour: '#F43F5E', team: 'system', description: '8-Phase Quality Loop', speciality: '',                             avatarPath: null },
  system:         { displayName: 'System',        monogram: 'SY', colour: '#64748B', team: 'system', description: 'System',               speciality: '',                             avatarPath: null },
};

export function getIdentity(agentId: string): SpecialistIdentity {
  const safe = agentId ?? 'unknown';
  return (
    SPECIALIST_IDENTITIES[safe] ?? {
      displayName: safe,
      monogram: safe.slice(0, 2).toUpperCase(),
      colour: '#64748B',
      team: 'system' as const,
      description: agentId,
      speciality: '',
      avatarPath: null,
    }
  );
}
