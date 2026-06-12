"use client";

import * as React from "react";
import {
  BookOpen,
  Sparkles,
  CheckCircle2,
  Lightbulb,
  FileText,
  ChevronRight,
  Search,
  ShieldAlert,
  Network,
  Code2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { AbigailPipelineFlow } from "@/components/abigail-docs/AbigailPipelineFlow";

const CHAPTERS = [
  { id: "beyond-llm",    label: "Beyond the Modern LLM",  icon: Sparkles },
  { id: "why-exists",    label: "Why Abigail Exists",      icon: Lightbulb },
  { id: "vision",        label: "The Abigail Vision",      icon: FileText },
  { id: "manifesto",     label: "Abigail Manifesto",       icon: BookOpen },
  { id: "constitution",  label: "Abigail Constitution",    icon: ShieldAlert },
  { id: "architecture",  label: "Pipeline Architecture",   icon: Network },
  { id: "coding",        label: "Coding Solutions",        icon: Code2 },
] as const;

export default function AbigailDocsPage() {
  const [activeTab, setActiveTab] = React.useState<"beyond-llm" | "why-exists" | "vision" | "manifesto" | "constitution" | "architecture" | "coding">("beyond-llm");
  const [searchQuery, setSearchQuery] = React.useState("");
  const [feedbackSubmitted, setFeedbackSubmitted] = React.useState(false);
  const [email, setEmail] = React.useState("");
  const [emailSubmitted, setEmailSubmitted] = React.useState(false);

  // Automatically scroll to top when active tab changes
  React.useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
    setFeedbackSubmitted(false);
  }, [activeTab]);

  const currentIndex = CHAPTERS.findIndex(c => c.id === activeTab);
  const prevChapter = currentIndex > 0 ? CHAPTERS[currentIndex - 1] : null;
  const nextChapter = currentIndex < CHAPTERS.length - 1 ? CHAPTERS[currentIndex + 1] : null;

  const filteredChapters = React.useMemo(() => {
    if (!searchQuery) return CHAPTERS;
    const q = searchQuery.toLowerCase();
    return CHAPTERS.filter(c => c.label.toLowerCase().includes(q));
  }, [searchQuery]);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans relative overflow-x-hidden selection:bg-orange-500/20 selection:text-orange-300">
      {/* Background decoration grid & radial glows */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1f293708_1px,transparent_1px),linear-gradient(to_bottom,#1f293708_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none z-0" />
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-orange-500/5 blur-[120px] rounded-full pointer-events-none z-0" />
      <div className="absolute top-[400px] left-0 w-[400px] h-[400px] bg-amber-500/3 blur-[100px] rounded-full pointer-events-none z-0" />

      <title>Abigail AI Framework Documentation | Dive Seeks</title>
      <meta name="description" content="Sovereign AI framework and organizational intelligence manifesto." />

      {/* Hero Header */}
      <header className="border-b border-zinc-900/80 bg-zinc-950/70 backdrop-blur-md sticky top-0 z-50 transition-colors duration-300">
        <div className="max-w-[90rem] w-full mx-auto px-6 sm:px-8 lg:px-12 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="size-9 rounded-xl overflow-hidden bg-zinc-900 border border-zinc-800 flex items-center justify-center shadow-md">
              <img 
                src="/Abigail-gen-1/Abigail-gen-1.png" 
                alt="Abigail Logo" 
                className="size-full object-cover"
              />
            </div>
            <div>
              <h1 className="text-base font-sans font-semibold text-white tracking-tight">Abigail AI</h1>
              <p className="text-[9px] text-orange-500/80 font-mono tracking-widest uppercase font-semibold">Framework Documentation</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <a 
              href="/coding" 
              className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-zinc-900 hover:border-zinc-800 bg-zinc-950 hover:bg-zinc-900/60 text-zinc-300 hover:text-white transition-all shadow-sm"
            >
              Console
            </a>
            <div className="h-4 w-px bg-zinc-900" />
            <span className="px-2.5 py-1 rounded-full bg-orange-500/10 border border-orange-500/20 text-[10px] font-mono text-orange-400 font-medium tracking-wide">
              Sovereign AI
            </span>
          </div>
        </div>
      </header>

      {/* Mobile Sticky Tab Bar (Horizontal Scrollable) */}
      <div className="md:hidden border-b border-zinc-900 bg-zinc-950/80 backdrop-blur sticky top-16 z-40 px-4 py-3 overflow-x-auto scrollbar-none flex gap-2 shadow-md">
        {filteredChapters.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={cn(
                "flex items-center gap-2 px-3.5 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all border active:scale-95 duration-200",
                isActive 
                  ? "bg-orange-500/10 border-orange-500/30 text-orange-400 shadow-inner" 
                  : "bg-zinc-900/40 border-zinc-900 text-zinc-400 hover:text-zinc-200"
              )}
            >
              <Icon className="size-3.5" />
              {item.label}
            </button>
          );
        })}
      </div>

      {/* Main Container */}
      <div className="flex-1 max-w-[90rem] w-full mx-auto px-6 sm:px-8 lg:px-12 py-10 md:py-14 flex flex-col md:flex-row gap-10 lg:gap-16 relative z-10">
        
        {/* Navigation Sidebar (Desktop Only) */}
        <aside className="w-64 shrink-0 hidden md:block">
          <div className="sticky top-26 space-y-6">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 size-3.5 text-zinc-500" />
              <input
                type="text"
                placeholder="Quick search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-900 rounded-lg pl-9 pr-4 py-2 text-xs text-white placeholder-zinc-550 focus:outline-none focus:ring-1 focus:ring-orange-500/30 focus:border-orange-500 transition-all font-body"
              />
            </div>

            <div>
              <p className="text-[10px] font-mono text-zinc-500 tracking-wider uppercase mb-3 px-3 font-semibold">Core Chapters</p>
              <nav className="space-y-1">
                {filteredChapters.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => setActiveTab(item.id)}
                      className={cn(
                        "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold transition-all text-left font-body border border-transparent hover:translate-x-0.5 duration-200",
                        isActive 
                          ? "bg-zinc-900/80 border-zinc-800 text-orange-400 shadow-sm" 
                          : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/50"
                      )}
                    >
                      <Icon className={cn("size-4 shrink-0", isActive ? "text-orange-400" : "text-zinc-500")} />
                      {item.label}
                    </button>
                  );
                })}
                {filteredChapters.length === 0 && (
                  <p className="text-xs text-zinc-500 px-3 py-2 italic font-body">No chapters match.</p>
                )}
              </nav>
            </div>
            
            <div className="rounded-xl border border-zinc-900 bg-zinc-950/60 p-4.5 space-y-2.5 shadow-sm">
              <div className="flex items-center gap-2">
                <ShieldAlert className="size-4 text-orange-400" />
                <h4 className="text-xs font-bold font-sans text-zinc-300">Constitutional Guard</h4>
              </div>
              <p className="text-xs text-zinc-400 leading-relaxed font-body italic">
                &ldquo;Every code change must move Abigail closer to becoming a true AI Framework, not a collection of LLM calls.&rdquo;
              </p>
            </div>
          </div>
        </aside>

        {/* Content Pane */}
        <main className="flex-1 min-w-0 max-w-full md:max-w-3xl lg:max-w-4xl px-0 md:px-4 abigail-docs-content">
          <div className="space-y-16 animate-in fade-in slide-in-from-bottom-2 duration-300">
            
            {/* Section 1: Beyond the Modern LLM */}
            {activeTab === "beyond-llm" && (
              <section className="space-y-12">
                <div className="space-y-6">
                  <span className="text-[10px] font-mono text-orange-400 uppercase tracking-widest font-semibold bg-orange-500/10 border border-orange-500/20 px-2 py-0.5 rounded">Chapter 01</span>
                  <h2 id="beyond-modern-llm" className="text-3xl sm:text-4xl lg:text-5xl font-sans font-bold text-white tracking-tight mt-2">
                    Beyond the Modern LLM
                  </h2>
                  <p className="text-zinc-300 text-base sm:text-lg leading-8 font-body">
                    Modern LLMs are extraordinary achievements.
                  </p>
                  
                  <div className="space-y-4 pt-2">
                    <p className="text-zinc-400 text-xs font-mono uppercase tracking-wider">They provide:</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {[
                        "Language understanding",
                        "Language generation",
                        "Reasoning capabilities",
                        "Tool usage",
                        "Context awareness"
                      ].map((item) => (
                        <div key={item} className="flex items-center gap-3 bg-zinc-900/40 border border-zinc-900/80 p-4 rounded-xl hover:border-zinc-800 transition-colors">
                          <CheckCircle2 className="size-4.5 text-orange-500 shrink-0" />
                          <span className="text-sm font-semibold text-zinc-200">{item}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <p className="text-zinc-300 text-[15px] sm:text-base leading-8 font-body mt-4">
                    But many of the capabilities people associate with intelligence are actually built around the model.
                  </p>
                  <p className="text-zinc-355 text-base leading-8 border-l-2 border-orange-500 pl-4 my-8 font-semibold italic font-body">
                    Abigail's goal is to make those capabilities visible, understandable, controllable, and owned by the organization.
                  </p>
                </div>

                <div className="border-t border-zinc-900/60 pt-10 space-y-6">
                  <h3 id="abigail-stack" className="text-2xl font-sans font-bold text-white tracking-tight">
                    The Abigail Intelligence Stack
                  </h3>
                  <p className="text-zinc-400 text-sm leading-relaxed font-body">
                    Abigail combines multiple AI disciplines into a single framework.
                  </p>

                  <div className="space-y-6">
                    {[
                      {
                        title: "The Brain System",
                        desc: "The Abigail Brain provides Thalamus (routing), Broca-Wernicke (language interpretation), Amygdala (importance and salience), Hippocampus (memory), Neocortex (knowledge synthesis), Basal Ganglia (learning), and Prefrontal Cortex (planning and coordination)."
                      },
                      {
                        title: "The Memory System",
                        desc: "Abigail remembers through Episodic Memory, Pattern Memory, Parametric Memory, Knowledge Memory, and Organizational Memory. Memory belongs to the organization. Not the model."
                      },
                      {
                        title: "The Metadata Intelligence System",
                        desc: "Every action creates metadata. Abigail records decisions, outcomes, failures, successes, requirements, evidence, specialists, goals, and architectural decisions. Metadata becomes organizational intelligence."
                      },
                      {
                        title: "The Tokenizer Engine",
                        desc: "Abigail includes its own tokenizer and language-processing infrastructure. Language is not treated as magic. Language becomes structured information that can be analyzed, classified, governed, and improved."
                      },
                      {
                        title: "The Knowledge Synthesis Engine",
                        desc: "Abigail includes a Wiki Intelligence System. Instead of storing endless disconnected chunks: Knowledge → Research → Synthesis → Wiki → Knowledge Graph → Organizational Intelligence. The system continuously transforms information into understanding."
                      },
                      {
                        title: "The Evolution Engine",
                        desc: "Abigail continuously improves itself. Every success, failure, correction, review, requirement, and project becomes future learning. The system evolves from real outcomes rather than relying solely on larger models."
                      },
                      {
                        title: "The Governance Engine",
                        desc: "Every action passes through rules, vision, constraints, budget controls, architectural controls, and human oversight. The framework remains accountable."
                      }
                    ].map((sys) => (
                      <div key={sys.title} className="bg-zinc-950/40 border border-zinc-900/80 rounded-xl p-6 hover:border-zinc-800 transition-all duration-300">
                        <h4 className="text-sm font-semibold text-orange-400 mb-3 font-mono flex items-center gap-2">
                          <ChevronRight className="size-4 text-orange-500" />
                          {sys.title}
                        </h4>
                        <p className="text-xs sm:text-sm text-zinc-300 leading-7 font-body">{sys.desc}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="border-t border-zinc-900/60 pt-10 space-y-4">
                  <h3 id="natural-language" className="text-2xl font-sans font-bold text-white tracking-tight">
                    Natural Language Governance
                  </h3>
                  <p className="text-zinc-300 text-[15px] sm:text-base leading-8 font-body">
                    One of the biggest challenges in AI is transparency. Many systems hide intelligence inside model weights, training data, and black-box processes.
                  </p>
                  <p className="text-zinc-300 text-[15px] sm:text-base leading-8 font-body">
                    Abigail takes the opposite approach. Everything should be understandable through natural language. Humans should be able to inspect, understand, correct, improve, and govern the system without requiring machine learning expertise.
                  </p>
                </div>

                <div className="border-t border-zinc-900/60 pt-10 space-y-4">
                  <h3 id="humanity-first" className="text-2xl font-sans font-bold text-white tracking-tight">
                    Humanity First
                  </h3>
                  <p className="text-zinc-300 text-[15px] sm:text-base leading-8 font-body">
                    Our goal is not to replace human judgment. Our goal is not to remove human responsibility. Our goal is not autonomous control. Our goal is augmentation.
                  </p>
                  <p className="text-zinc-300 text-[15px] sm:text-base leading-8 font-body">
                    Humans remain the owners, the governors, the decision makers, the auditors, and the final authority. AI should help humanity. Humanity should not serve AI.
                  </p>
                </div>

                <div className="border-t border-zinc-900/60 pt-10 space-y-4 bg-gradient-to-br from-orange-500/5 to-amber-600/5 border border-orange-500/10 rounded-2xl p-6 sm:p-8">
                  <h3 id="abigail-principle" className="text-xl font-sans font-bold text-white tracking-tight">
                    The Abigail Principle
                  </h3>
                  <p className="text-zinc-300 text-base leading-8 mt-2 font-body">
                    The future should not belong to the largest model. The future should belong to the organizations that learn.
                  </p>
                  <p className="text-zinc-300 text-base leading-8 font-semibold mt-2 font-body">
                    The future should belong to systems that remember, explain, improve, adapt, and remain under human control.
                  </p>
                  <div className="mt-4 pt-4 border-t border-zinc-900 text-xs sm:text-sm font-mono space-y-2 text-zinc-400">
                    <p>• The model provides language.</p>
                    <p>• The framework provides intelligence.</p>
                    <p>• The human provides direction.</p>
                    <p className="text-orange-400 mt-2 font-semibold text-sm sm:text-base">That is Abigail.</p>
                  </div>
                </div>
              </section>
            )}

            {/* Section 2: Why Abigail Exists */}
            {activeTab === "why-exists" && (
              <section className="space-y-12">
                <div className="space-y-6">
                  <span className="text-[10px] font-mono text-orange-400 uppercase tracking-widest font-semibold bg-orange-500/10 border border-orange-500/20 px-2 py-0.5 rounded">Chapter 02</span>
                  <h2 id="why-abigail-exists" className="text-3xl sm:text-4xl lg:text-5xl font-sans font-bold text-white tracking-tight mt-2">
                    Why Abigail Exists
                  </h2>
                  <p className="text-zinc-300 text-base sm:text-lg leading-8 font-body">
                    Today the world is building AI around large language models. These models are incredibly powerful, but they have a limitation: organizations cannot see inside them.
                  </p>
                  <div className="bg-zinc-950/50 border border-zinc-900 p-6 sm:p-8 rounded-xl space-y-4">
                    <p className="text-xs sm:text-sm text-zinc-400 uppercase tracking-wider font-semibold font-mono">A company using a large model often cannot answer:</p>
                    <ul className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm text-zinc-300 font-body">
                      {[
                        "Why was this decision made?",
                        "Which memory influenced it?",
                        "Which rule was applied?",
                        "What knowledge was used?",
                        "How did the system learn this behavior?",
                        "How can this behavior be improved?"
                      ].map((q) => (
                        <li key={q} className="flex items-center gap-2">
                          <span className="size-1.5 rounded-full bg-orange-500 shrink-0" />
                          <span>{q}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <p className="text-zinc-300 text-[15px] sm:text-base leading-8 font-body mt-4">
                    The model becomes a black box. The larger the model becomes, the less visibility organizations have into its internal reasoning.
                  </p>
                  <p className="text-zinc-300 text-[15px] sm:text-base leading-8 font-body">
                    This creates a dependency problem. Businesses become dependent on intelligence they cannot inspect, govern, or own.
                  </p>
                </div>

                <div className="border-t border-zinc-900/60 pt-10 space-y-4">
                  <h3 id="abigail-approach" className="text-2xl font-sans font-bold text-white tracking-tight">
                    The Abigail Approach
                  </h3>
                  <p className="text-zinc-300 text-[15px] sm:text-base leading-8 font-body">
                    We believe that intelligence should not be hidden inside model weights. Intelligence should exist inside the organization: visible, auditable, queryable, governable, and improvable.
                  </p>
                  <p className="text-zinc-300 text-[15px] sm:text-base leading-8 font-body">
                    Abigail moves intelligence from model weights into organizational systems. The framework owns memory, knowledge, rules, planning, coordination, learning, evolution, and governance.
                  </p>
                  <p className="text-zinc-355 text-base sm:text-lg font-semibold border-l-2 border-orange-500 pl-4 my-6 font-body">
                    The LLM provides language understanding, language generation, and communication. The LLM is the voice. Abigail is the intelligence system.
                  </p>
                </div>

                <div className="border-t border-zinc-900/60 pt-10 space-y-4">
                  <h3 id="brain-principle" className="text-2xl font-sans font-bold text-white tracking-tight">
                    The Brain Principle
                  </h3>
                  <p className="text-zinc-355 text-[15px] sm:text-base leading-8 font-body">
                    A human mouth is not the human brain. The mouth communicates decisions. The brain creates decisions.
                  </p>
                  <div className="bg-zinc-900/20 border border-zinc-900 rounded-xl p-6 sm:p-8 space-y-5">
                    <div className="flex items-center gap-3 text-sm sm:text-base">
                      <span className="px-2 py-0.5 bg-orange-500/10 border border-orange-500/20 text-[10px] sm:text-xs font-mono text-orange-400 rounded">LLM</span>
                      <span className="text-zinc-300 font-body">The Mouth (Communication Layer)</span>
                    </div>
                    <div className="h-px bg-zinc-900" />
                    <div className="space-y-3">
                      <div className="flex items-center gap-3 text-sm sm:text-base">
                        <span className="px-2 py-0.5 bg-amber-500/10 border border-amber-500/20 text-[10px] sm:text-xs font-mono text-amber-400 rounded">Abigail Brain</span>
                        <span className="text-zinc-300 font-body">The Decision Creator</span>
                      </div>
                      <p className="text-xs sm:text-sm text-zinc-400 pl-2 leading-6 font-body">
                        Contains Thalamus (routing), Broca-Wernicke (language interpretation), Amygdala (salience), Hippocampus (memory), Neocortex (knowledge synthesis), Basal Ganglia (learning), and Prefrontal Cortex (planning).
                      </p>
                    </div>
                  </div>
                  <p className="text-zinc-300 text-[15px] sm:text-base leading-8 font-body">
                    These systems remain under organizational control. Models can change. The Brain remains.
                  </p>
                </div>

                <div className="border-t border-zinc-900/60 pt-10 space-y-4">
                  <h3 id="model-independence" className="text-2xl font-sans font-bold text-white tracking-tight">
                    Model Independence
                  </h3>
                  <p className="text-zinc-300 text-[15px] sm:text-base leading-8 font-body">
                    Organizations should never be locked to a single model vendor. Abigail can work with Gemini, DeepSeek, GPT, Claude, open-source models, and future models.
                  </p>
                  <p className="text-zinc-300 text-[15px] sm:text-base leading-8 font-semibold font-body">
                    Changing the model should not destroy intelligence. Because the intelligence is not stored in the model. It is stored in the framework.
                  </p>
                </div>

                <div className="border-t border-zinc-900/60 pt-10 space-y-4">
                  <h3 id="enterprise-intelligence" className="text-2xl font-sans font-bold text-white tracking-tight">
                    Enterprise Intelligence
                  </h3>
                  <p className="text-zinc-300 text-[15px] sm:text-base leading-8 font-body">
                    Most businesses do not want to become AI companies. They want intelligent systems.
                  </p>
                  <p className="text-zinc-350 text-[15px] sm:text-base leading-8 font-body">
                    Abigail allows organizations to connect existing databases, workflows, documents, and business systems without building GPU clusters, training models, or hiring AI research teams.
                  </p>
                  <p className="text-zinc-300 text-[15px] sm:text-base leading-8 font-body">
                    Abigail transforms existing organizational knowledge into intelligence.
                  </p>
                </div>

                <div className="border-t border-zinc-900/60 pt-10 space-y-4">
                  <h3 id="the-future" className="text-2xl font-sans font-bold text-white tracking-tight">
                    The Future
                  </h3>
                  <p className="text-zinc-300 text-[15px] sm:text-base leading-8 font-body">
                    We believe the future is not bigger models. We believe the future is smarter organizations.
                  </p>
                  <div className="p-6 sm:p-8 bg-zinc-900/40 border border-zinc-900 rounded-xl text-zinc-350 text-sm space-y-3 font-body">
                    <p>The organization owns the Brain, Memory, Knowledge, Rules, and Evolution.</p>
                    <p>The model becomes replaceable. The intelligence remains.</p>
                    <p className="text-orange-400 font-semibold mt-1">Abigail is the intelligence framework that allows organizations to own and evolve their intelligence over time.</p>
                  </div>
                </div>
              </section>
            )}

            {/* Section 3: The Abigail Vision */}
            {activeTab === "vision" && (
              <section className="space-y-12">
                <div className="space-y-6">
                  <span className="text-[10px] font-mono text-orange-400 uppercase tracking-widest font-semibold bg-orange-500/10 border border-orange-500/20 px-2 py-0.5 rounded">Chapter 03</span>
                  <h2 id="abigail-vision" className="text-3xl sm:text-4xl lg:text-5xl font-sans font-bold text-white tracking-tight mt-2">
                    The Abigail Vision
                  </h2>
                  
                  <h3 id="no-gpu-farm" className="text-xl font-sans font-bold text-white tracking-tight pt-4 border-t border-zinc-900/60">
                    Intelligence Should Not Require a GPU Farm
                  </h3>
                  <p className="text-zinc-300 text-[15px] sm:text-base leading-8 font-body">
                    Today, if a company wants better AI, the answer is always: buy larger models, buy more GPUs, buy more tokens, buy more cloud infrastructure.
                  </p>
                  <p className="text-zinc-305 text-base font-semibold font-body leading-8">
                    This creates a future where intelligence belongs only to organizations with the largest budgets. We believe this is wrong.
                  </p>
                </div>

                <div className="border-t border-zinc-900/60 pt-10 space-y-4">
                  <h3 id="intelligence-exists" className="text-2xl font-sans font-bold text-white tracking-tight">
                    Intelligence Already Exists
                  </h3>
                  <p className="text-zinc-300 text-[15px] sm:text-base leading-8 font-body">
                    Every business already contains intelligence. It exists in databases, documents, workflows, employees, decisions, failures, successes, processes, and knowledge.
                  </p>
                  <p className="text-zinc-300 text-[15px] sm:text-base leading-8 font-body">
                    The problem is not a lack of intelligence. The problem is that this intelligence is trapped.
                  </p>
                </div>

                <div className="border-t border-zinc-900/60 pt-10 space-y-4">
                  <h3 id="abigail-mission" className="text-2xl font-sans font-bold text-white tracking-tight">
                    Abigail's Mission
                  </h3>
                  <p className="text-zinc-300 text-[15px] sm:text-base leading-8 font-body">
                    Abigail transforms existing business knowledge into organizational intelligence.
                  </p>
                  <p className="text-zinc-300 text-[15px] sm:text-base leading-8 font-body">
                    Instead of creating another AI that depends on bigger models, Abigail creates a framework that learns from company data, business processes, operational history, human expertise, and organizational memory.
                  </p>
                  <p className="text-zinc-355 text-base font-semibold italic font-body leading-8">
                    The more a business operates, the smarter Abigail becomes.
                  </p>
                </div>

                <div className="border-t border-zinc-900/60 pt-10 space-y-4">
                  <h3 id="database-first" className="text-2xl font-sans font-bold text-white tracking-tight">
                    Database First
                  </h3>
                  <p className="text-zinc-300 text-[15px] sm:text-base leading-8 font-body">
                    The database is the brain. Every business already owns valuable intelligence: customer records, orders, products, tickets, emails, documents, knowledge bases, and internal processes.
                  </p>
                  <p className="text-zinc-355 text-[15px] sm:text-base leading-8 font-body">
                    Abigail connects to existing business systems and transforms data into intelligence. The company already owns the knowledge. Abigail simply helps it think.
                  </p>
                </div>

                <div className="border-t border-zinc-900/60 pt-10 space-y-4">
                  <h3 id="enterprise-simplicity" className="text-2xl font-sans font-bold text-white tracking-tight">
                    Enterprise Without Complexity
                  </h3>
                  <p className="text-zinc-300 text-[15px] sm:text-base leading-8 font-body">
                    Most enterprise AI requires dedicated GPUs, expensive infrastructure, large engineering teams, and complex deployments.
                  </p>
                  <div className="bg-zinc-950/50 border border-zinc-900 p-6 sm:p-8 rounded-xl space-y-4">
                    <p className="text-xs sm:text-sm text-zinc-400 uppercase tracking-wider font-semibold font-mono">Abigail is designed differently. A business should be able to:</p>
                    <ol className="list-decimal pl-6 text-sm text-zinc-300 space-y-2.5 font-body">
                      <li>Connect their systems.</li>
                      <li>Connect their databases.</li>
                      <li>Connect their knowledge.</li>
                      <li>Start learning immediately.</li>
                    </ol>
                    <p className="text-xs sm:text-sm text-muted-foreground pt-1 font-body">No GPU clusters. No model training teams. No AI specialists.</p>
                  </div>
                </div>

                <div className="border-t border-zinc-900/60 pt-10 space-y-4">
                  <h3 id="saas-first" className="text-2xl font-sans font-bold text-white tracking-tight">
                    SaaS First
                  </h3>
                  <p className="text-zinc-300 text-[15px] sm:text-base leading-8 font-body">
                    Organizations should not need VPS management, infrastructure teams, GPU provisioning, or Kubernetes clusters.
                  </p>
                  <p className="text-zinc-300 text-[15px] sm:text-base leading-8 font-body">
                    Abigail provides intelligence as infrastructure. Multi-tenant architecture ensures complete tenant isolation, data ownership, security boundaries, and independent memory and knowledge systems.
                  </p>
                  <p className="text-zinc-355 text-base sm:text-lg font-semibold font-body leading-8">
                    Each organization owns its intelligence. No tenant can access another tenant's knowledge.
                  </p>
                </div>

                <div className="border-t border-zinc-900/60 pt-10 space-y-4">
                  <h3 id="human-controlled" className="text-2xl font-sans font-bold text-white tracking-tight">
                    Human Controlled Intelligence
                  </h3>
                  <p className="text-zinc-300 text-[15px] sm:text-base leading-8 font-body">
                    The future must remain human governed. Organizations must be able to inspect decisions, override decisions, audit memory, review knowledge, correct mistakes, and shape behavior.
                  </p>
                  <p className="text-zinc-300 text-[15px] sm:text-base leading-8 font-body">
                    The AI works for the organization. The organization does not work for the AI.
                  </p>
                </div>

                <div className="border-t border-zinc-900/60 pt-10 space-y-4 bg-gradient-to-br from-orange-500/5 to-amber-600/5 border border-orange-500/10 rounded-2xl p-6 sm:p-8">
                  <h3 id="long-term-goal" className="text-xl font-sans font-bold text-white tracking-tight">
                    The Long-Term Goal
                  </h3>
                  <p className="text-zinc-305 text-base leading-8 mt-2 font-body">
                    Our goal is not to build another chatbot or model. Our goal is not to compete with foundation model providers.
                  </p>
                  <p className="text-zinc-300 text-base leading-8 font-semibold mt-2 font-body">
                    Our goal is to create a framework where every business owns its intelligence and memory, every decision is explainable, every lesson is preserved, and every workflow becomes smarter over time.
                  </p>
                  <div className="mt-4 pt-4 border-t border-zinc-900 text-xs sm:text-sm font-mono space-y-2 text-zinc-400">
                    <p>• The model is replaceable.</p>
                    <p>• The memory and knowledge remain.</p>
                    <p>• The organization remains.</p>
                    <p className="text-orange-400 mt-2 font-semibold text-sm sm:text-base">That is Abigail. Not Artificial Intelligence. Organizational Intelligence.</p>
                  </div>
                </div>
              </section>
            )}

            {/* Section 4: Abigail Manifesto */}
            {activeTab === "manifesto" && (
              <section className="space-y-12">
                <div className="space-y-6">
                  <span className="text-[10px] font-mono text-orange-400 uppercase tracking-widest font-semibold bg-orange-500/10 border border-orange-500/20 px-2 py-0.5 rounded">Chapter 04</span>
                  <h2 id="abigail-manifesto" className="text-3xl sm:text-4xl lg:text-5xl font-sans font-bold text-white tracking-tight mt-2">
                    Abigail Manifesto
                  </h2>
                  
                  <h3 id="the-problem" className="text-xl font-sans font-bold text-white tracking-tight pt-4 border-t border-zinc-900/60">
                    The Problem
                  </h3>
                  <p className="text-zinc-300 text-[15px] sm:text-base leading-8 font-body">
                    Today the AI industry is moving in the wrong direction. Every time a business wants better AI, the answer is: bigger models, bigger GPUs, bigger cloud bills, bigger context windows, and more tokens.
                  </p>
                  <p className="text-zinc-300 text-[15px] sm:text-base leading-8 font-body">
                    This creates a future where only the largest companies can afford intelligence. The world is being told: "To become smarter, AI needs more compute." We disagree.
                  </p>
                </div>

                <div className="border-t border-zinc-900/60 pt-10 space-y-4">
                  <h3 id="abigail-thesis" className="text-2xl font-sans font-bold text-white tracking-tight">
                    The Abigail Thesis
                  </h3>
                  <p className="text-zinc-300 text-[15px] sm:text-base leading-8 font-body">
                    Intelligence is not the model. Intelligence is memory, experience, rules, planning, learning, and organizational knowledge.
                  </p>
                  <p className="text-zinc-355 text-base sm:text-lg font-semibold font-body leading-8">
                    A human brain is not powerful because it has billions of neurons. A human brain is powerful because it learns from experience. The same principle should apply to AI.
                  </p>
                </div>

                <div className="border-t border-zinc-900/60 pt-10 space-y-4">
                  <h3 id="our-mission" className="text-2xl font-sans font-bold text-white tracking-tight">
                    Our Mission
                  </h3>
                  <p className="text-zinc-300 text-[15px] sm:text-base leading-8 font-body">
                    Build an AI Framework where businesses and enterprises do not need massive GPU clusters to become intelligent.
                  </p>
                  <p className="text-zinc-300 text-[15px] sm:text-base leading-8 font-body">
                    Instead of spending millions retraining models, organizations should be able to accumulate intelligence through memory, metadata, knowledge, experience, rules, and evolution.
                  </p>
                  <p className="text-zinc-355 text-base sm:text-lg font-semibold font-body leading-8">
                    The model becomes a translator. The framework becomes the intelligence.
                  </p>
                </div>

                <div className="border-t border-zinc-900/60 pt-10 space-y-4">
                  <h3 id="fundamental-shift" className="text-2xl font-sans font-bold text-white tracking-tight">
                    The Fundamental Shift
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-zinc-950/50 border border-zinc-900 p-6 rounded-xl space-y-3">
                      <h4 className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Traditional AI</h4>
                      <p className="text-[11px] sm:text-xs text-zinc-400 font-mono">User → LLM → Response</p>
                      <ul className="text-xs sm:text-sm text-zinc-400 pl-4 list-disc space-y-1.5 font-body">
                        <li>Everything lives inside the model.</li>
                        <li>Nothing belongs to the business.</li>
                        <li>Nothing survives model replacement.</li>
                        <li>Every improvement requires more compute.</li>
                      </ul>
                    </div>
                    <div className="bg-orange-500/5 border border-orange-500/10 p-6 rounded-xl space-y-3">
                      <h4 className="text-xs font-mono uppercase tracking-wider text-orange-400">Abigail Architecture</h4>
                      <p className="text-[11px] sm:text-xs text-orange-400/80 font-mono">User → Brain → Memory → Knowledge → Rules → Planning → Specialists → LLM → Response</p>
                      <ul className="text-xs sm:text-sm text-zinc-300 pl-4 list-disc space-y-1.5 font-body">
                        <li>The intelligence belongs to the organization.</li>
                        <li>The model is replaceable.</li>
                        <li>The knowledge remains.</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <div className="border-t border-zinc-900/60 pt-10 space-y-4">
                  <h3 id="brain-philosophy" className="text-2xl font-sans font-bold text-white tracking-tight">
                    The Brain Philosophy
                  </h3>
                  <p className="text-zinc-300 text-[15px] sm:text-base leading-8 font-body">
                    Every enterprise should own its own brain. Not a black box. Not hidden weights. Not vendor-controlled memory. A real brain: visible, queryable, auditable, repairable, and extensible.
                  </p>
                  <p className="text-zinc-300 text-[15px] sm:text-base leading-8 font-body">
                    The organization should be able to inspect why a decision happened, which memory influenced it, which rule was applied, which specialist executed it, which experience created the knowledge, and how the system evolved.
                  </p>
                  <p className="text-zinc-355 text-base sm:text-lg font-semibold italic font-body leading-8">
                    Everything should be visible in the local database. Nothing should be magic.
                  </p>
                </div>

                <div className="border-t border-zinc-900/60 pt-10 space-y-4">
                  <h3 id="human-control-manifesto" className="text-2xl font-sans font-bold text-white tracking-tight">
                    Human Control
                  </h3>
                  <p className="text-zinc-300 text-[15px] sm:text-base leading-8 font-body">
                    Humans must remain above the AI. The framework must allow human review, human override, human governance, human correction, and human ownership.
                  </p>
                  <p className="text-zinc-300 text-[15px] sm:text-base leading-8 font-semibold font-body">
                    The AI learns. The human remains in control.
                  </p>
                </div>

                <div className="border-t border-zinc-900/60 pt-10 space-y-4">
                  <h3 id="memory-economy" className="text-2xl font-sans font-bold text-white tracking-tight">
                    The Memory Economy
                  </h3>
                  <p className="text-zinc-300 text-[15px] sm:text-base leading-8 font-body">
                    Today's AI economy is based on compute. Abigail creates a Memory Economy.
                  </p>
                  <p className="text-zinc-300 text-[15px] sm:text-base leading-8 font-body">
                    The more an organization works: the smarter it becomes, the less it spends, the less it depends on large models, and the more knowledge it owns.
                  </p>
                  <p className="text-zinc-355 text-base sm:text-lg font-semibold font-body leading-8">
                    Experience becomes an asset. Knowledge becomes infrastructure. Memory becomes capital.
                  </p>
                </div>

                <div className="border-t border-zinc-900/60 pt-10 space-y-4">
                  <h3 id="evolution-engine" className="text-2xl font-sans font-bold text-white tracking-tight">
                    The Evolution Engine
                  </h3>
                  <p className="text-zinc-300 text-[15px] sm:text-base leading-8 font-body">
                    Every success, failure, correction, and project becomes learning. The system should improve continuously without retraining giant models.
                  </p>
                  <p className="text-zinc-300 text-[15px] sm:text-base leading-8 font-body">
                    Over time, small models become more capable, cheap models become more useful, and organizations become more intelligent.
                  </p>
                </div>

                <div className="border-t border-zinc-900/60 pt-10 space-y-4 bg-gradient-to-br from-orange-500/5 to-amber-600/5 border border-orange-500/10 rounded-2xl p-6 sm:p-8">
                  <h3 id="vision-manifesto" className="text-xl font-sans font-bold text-white tracking-tight">
                    The Long-Term Vision
                  </h3>
                  <p className="text-zinc-300 text-base leading-8 mt-2 font-body">
                    A future where every business owns its intelligence, every enterprise owns its memory, every decision is explainable, every workflow is auditable, every lesson is preserved, and every system improves itself.
                  </p>
                  <p className="text-zinc-300 text-base leading-8 font-semibold mt-2 font-body">
                    Not through bigger GPUs. Not through bigger models. Through accumulated organizational intelligence.
                  </p>
                  <div className="mt-4 pt-4 border-t border-zinc-900 text-xs sm:text-sm font-mono space-y-2 text-zinc-400">
                    <p>The Brain belongs to the business.</p>
                    <p>The Knowledge belongs to the business.</p>
                    <p>The Memory belongs to the business.</p>
                    <p>The Evolution belongs to the business.</p>
                    <p className="text-orange-400 mt-2 font-semibold text-sm sm:text-base">The LLM is only the communication layer. The organization owns the intelligence. That is Abigail.</p>
                  </div>
                </div>
              </section>
            )}

            {/* Section 5: Abigail Framework Constitution */}
            {activeTab === "constitution" && (
              <section className="space-y-12">
                <div className="space-y-6">
                  <span className="text-[10px] font-mono text-orange-400 uppercase tracking-widest font-semibold bg-orange-500/10 border border-orange-500/20 px-2 py-0.5 rounded">Chapter 05</span>
                  <h2 id="abigail-constitution" className="text-3xl sm:text-4xl lg:text-5xl font-sans font-bold text-white tracking-tight mt-2">
                    Abigail Framework Constitution
                  </h2>

                </div>

                <div className="border-t border-zinc-900/60 pt-10 space-y-4">
                  <h3 id="constitution-core-principle" className="text-2xl font-sans font-bold text-white tracking-tight">
                    Core Principle
                  </h3>
                  <p className="text-zinc-300 text-[15px] sm:text-base leading-8 font-body">
                    LLMs are not the intelligence. The LLM is only a communication layer.
                  </p>
                  <p className="text-zinc-300 text-[15px] sm:text-base leading-8 font-body">
                    Abigail's intelligence comes from: Memory, Rules, Planning, Multi-agent coordination, Expert systems, Evolution, Knowledge systems, Vision alignment, and PRD execution loops.
                  </p>
                  <p className="text-zinc-350 text-base sm:text-lg font-semibold font-body leading-8">
                    The framework owns intelligence. The LLM owns language.
                  </p>
                  <p className="text-zinc-300 text-[15px] sm:text-base leading-8 font-body italic">
                    Abigail is designed around the principle: &ldquo;LLM is the mouth. Abigail is the brain. PostgreSQL is long-term memory.&rdquo;
                  </p>
                </div>

                <div className="border-t border-zinc-900/60 pt-10 space-y-4">
                  <h3 id="what-abigail-is" className="text-2xl font-sans font-bold text-white tracking-tight">
                    What Abigail Is
                  </h3>
                  <p className="text-zinc-300 text-[15px] sm:text-base leading-8 font-body">
                    Abigail is a deterministic AI operating framework that combines Expert Systems, Multi-Agent Systems, Memory Systems, Planning Systems, Evolutionary Systems, Knowledge Systems, PRD-Driven Execution, and Autonomous Coordination.
                  </p>
                  <div className="bg-zinc-900/20 border border-zinc-900 rounded-xl p-6 sm:p-8 space-y-3">
                    <p className="text-xs sm:text-sm text-zinc-400 uppercase tracking-wider font-semibold font-mono">The framework already contains:</p>
                    <div className="grid grid-cols-2 gap-3 text-xs sm:text-sm text-zinc-300 font-body">
                      {[
                        "CEO", "Coordinator", "30 Specialists", "Memory Loop", 
                        "Evolution Loop", "Universal PRD Loop", "Goal Tracking", 
                        "Parametric Learning", "Architectural Governance", 
                        "Deep Reasoning", "Brain Sessions", "TCE Planning"
                      ].map((item) => (
                        <div key={item} className="flex items-center gap-2">
                          <span className="size-1 bg-orange-500 rounded-full shrink-0" />
                          <span>{item}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <p className="text-zinc-300 text-[15px] sm:text-base leading-8 font-body font-semibold">
                    Do not replace these systems. Improve them.
                  </p>
                </div>

                <div className="border-t border-zinc-900/60 pt-10 space-y-4">
                  <h3 id="architectural-vision" className="text-2xl font-sans font-bold text-white tracking-tight">
                    Architectural Vision
                  </h3>
                  <p className="text-zinc-300 text-[15px] sm:text-base leading-8 font-mono bg-zinc-950 border border-zinc-900 p-4 rounded-xl text-center text-orange-400">
                    CEO → Coordinator → Specialists → PRD Loop → Memory → Evolution → Knowledge → Results
                  </p>
                  <p className="text-zinc-300 text-[15px] sm:text-base leading-8 font-body mt-4">
                    The framework must always preserve: Vision alignment, Goal ancestry, Architectural governance, Budget governance, Memory continuity, Auditability, and Deterministic workflows.
                  </p>
                </div>

                <div className="border-t border-zinc-900/60 pt-10 space-y-4">
                  <h3 id="non-negotiable-rules" className="text-2xl font-sans font-bold text-white tracking-tight">
                    Non-Negotiable Rules
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {[
                      "Never bypass the CEO.",
                      "Never bypass the Coordinator.",
                      "Never bypass the PRD loop.",
                      "Never bypass memory recording.",
                      "Never bypass audit logging.",
                      "Never bypass architectural rules.",
                      "Never create parallel orchestration systems.",
                      "Never duplicate existing framework capabilities.",
                      "Prefer extending existing services over creating new ones.",
                      "Follow CLAUDE.md before any implementation decision."
                    ].map((rule, index) => (
                      <div key={rule} className="flex items-start gap-3 bg-zinc-950/40 border border-zinc-900 p-4 rounded-xl hover:border-zinc-800 transition-colors">
                        <span className="text-xs font-mono text-orange-500 font-bold shrink-0 mt-0.5">#{index + 1}</span>
                        <span className="text-sm font-body text-zinc-200">{rule}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="border-t border-zinc-900/60 pt-10 space-y-4">
                  <h3 id="workflow-philosophy" className="text-2xl font-sans font-bold text-white tracking-tight">
                    Workflow Philosophy
                  </h3>
                  <p className="text-zinc-300 text-[15px] sm:text-base leading-8 font-body">
                    Abigail does not execute tasks directly. Abigail executes goals.
                  </p>
                  <p className="text-zinc-300 text-[15px] sm:text-base leading-8 font-mono bg-zinc-950 border border-zinc-900 p-4 rounded-xl text-center text-orange-400">
                    Vision Goal → TCE Task → PRD → Requirements → Specialist Iterations → Evaluation → Memory → Evolution
                  </p>
                  <p className="text-zinc-300 text-[15px] sm:text-base leading-8 font-body mt-4">
                    Every specialist must work through this lifecycle.
                  </p>
                </div>

                <div className="border-t border-zinc-900/60 pt-10 space-y-4">
                  <h3 id="memory-philosophy" className="text-2xl font-sans font-bold text-white tracking-tight">
                    Memory Philosophy
                  </h3>
                  <p className="text-zinc-300 text-[15px] sm:text-base leading-8 font-body">
                    Memory is not chat history. Memory is organizational intelligence.
                  </p>
                  <ul className="list-disc pl-6 text-sm text-zinc-300 space-y-2 font-body">
                    <li>Episodic Memory</li>
                    <li>Parametric Memory</li>
                    <li>Pattern Memory</li>
                    <li>Knowledge Memory</li>
                    <li>Evolution Memory</li>
                    <li>Project Memory</li>
                  </ul>
                  <p className="text-zinc-300 text-[15px] sm:text-base leading-8 font-body font-semibold mt-4">
                    Every improvement must strengthen memory, not bypass it.
                  </p>
                </div>

                <div className="border-t border-zinc-900/60 pt-10 space-y-4">
                  <h3 id="evolution-philosophy" className="text-2xl font-sans font-bold text-white tracking-tight">
                    Evolution Philosophy
                  </h3>
                  <p className="text-zinc-300 text-[15px] sm:text-base leading-8 font-body">
                    Abigail must continuously improve. Every task outcome is experience, training data, and future knowledge.
                  </p>
                  <p className="text-zinc-300 text-[15px] sm:text-base leading-8 font-body">
                    The framework should learn from: successes, failures, human reviews, architectural overrides, and PRD requirement outcomes.
                  </p>
                </div>

                <div className="border-t border-zinc-900/60 pt-10 space-y-4">
                  <h3 id="current-priority" className="text-2xl font-sans font-bold text-white tracking-tight">
                    Current Priority
                  </h3>
                  <p className="text-zinc-300 text-[15px] sm:text-base leading-8 font-body">
                    The immediate goal is NOT new architecture. The immediate goal is:
                  </p>
                  <ul className="list-decimal pl-6 text-sm text-zinc-300 space-y-2 font-body">
                    <li>Fix workflow collapse.</li>
                    <li>Fix recovery behavior.</li>
                    <li>Fix needs_review lifecycle.</li>
                    <li>Fix workflow completion detection.</li>
                    <li>Ensure CEO → Coordinator → Specialist → Result works reliably.</li>
                    <li>Ensure memory and evolution receive task outcomes.</li>
                  </ul>
                  <div className="p-4 bg-red-950/20 border border-red-900/30 rounded-xl text-xs text-red-400 font-mono space-y-1 mt-4">
                    <p>• Do not add OpenClaw.</p>
                    <p>• Do not add Hermes.</p>
                    <p>• Do not add Internal MCP.</p>
                    <p>• Do not redesign the framework.</p>
                    <p className="font-semibold mt-2">First make Abigail reliable.</p>
                  </div>
                </div>

                <div className="border-t border-zinc-900/60 pt-10 space-y-4">
                  <h3 id="future-vision" className="text-2xl font-sans font-bold text-white tracking-tight">
                    Future Vision
                  </h3>
                  <p className="text-zinc-300 text-[15px] sm:text-base leading-8 font-body">
                    After workflow stability:
                  </p>
                  <div className="space-y-4">
                    {[
                      { p: "1", name: "Retrieval Profiles" },
                      { p: "2", name: "Internal MCP Gateway" },
                      { p: "3", name: "Playwright MCP" },
                      { p: "4", name: "AI SDK 6 Tool Agents" },
                      { p: "5", name: "Advanced Research Agents" },
                      { p: "6", name: "External MCP Ecosystem" }
                    ].map((phase) => (
                      <div key={phase.p} className="flex items-center gap-4 bg-zinc-950/30 border border-zinc-900 p-4 rounded-xl">
                        <span className="px-2.5 py-1 bg-orange-500/10 border border-orange-500/20 text-xs font-mono text-orange-400 rounded">Phase 0{phase.p}</span>
                        <span className="text-sm font-semibold text-zinc-300 font-body">{phase.name}</span>
                      </div>
                    ))}
                  </div>
                  <p className="text-zinc-300 text-[15px] sm:text-base leading-8 font-body mt-4">
                    Internal MCP should become the tool nervous system. CEO remains the executive brain. Coordinator remains workflow control. Specialists remain execution units.
                  </p>
                </div>

                <div className="border-t border-zinc-900/60 pt-10 space-y-4 bg-gradient-to-br from-orange-500/5 to-amber-600/5 border border-orange-500/10 rounded-2xl p-6 sm:p-8">
                  <h3 id="success-criteria" className="text-xl font-sans font-bold text-white tracking-tight">
                    Success Criteria
                  </h3>
                  <p className="text-zinc-300 text-base leading-8 mt-2 font-body">
                    Success is not adding features. Success is proving that:
                  </p>
                  <ul className="list-disc pl-6 text-sm text-zinc-400 space-y-2 font-body mt-2">
                    <li>Vision creates goals</li>
                    <li>Goals create tasks</li>
                    <li>Tasks create PRDs</li>
                    <li>Specialists complete work</li>
                    <li>Memory learns</li>
                    <li>Evolution improves</li>
                    <li>Workflows recover from failure</li>
                    <li>The system becomes more capable over time</li>
                  </ul>
                  <p className="text-zinc-300 text-base leading-8 font-semibold mt-4 font-body">
                    Every code change must move Abigail closer to becoming a true AI Framework, not a collection of LLM calls.
                  </p>
                  <div className="mt-4 pt-4 border-t border-zinc-900 text-xs sm:text-sm font-mono space-y-2 text-zinc-400">
                    <p>Think like a Framework Architect.</p>
                    <p>Build like a Systems Engineer.</p>
                    <p className="text-orange-400 font-semibold mt-2 text-sm sm:text-base">Preserve the vision.</p>
                  </div>
                </div>
              </section>
            )}

            {/* Section 6: Pipeline Architecture */}
            {activeTab === "architecture" && (
              <section className="space-y-10">
                <div className="space-y-6">
                  <span className="text-[10px] font-mono text-orange-400 uppercase tracking-widest font-semibold bg-orange-500/10 border border-orange-500/20 px-2 py-0.5 rounded">Chapter 06</span>
                  <h2 id="pipeline-architecture" className="text-3xl sm:text-4xl lg:text-5xl font-sans font-bold text-white tracking-tight mt-2">
                    Pipeline Architecture
                  </h2>
                  <p className="text-zinc-300 text-base sm:text-lg leading-8 font-body">
                    The full Abigail execution pipeline — from Vision Interview to delivered result. Every request passes through 9 CEO gates, is delegated by the Coordinator, executed by Specialists through a PRD loop, and stored in the Brain Memory system for continuous evolution.
                  </p>
                  <div className="flex flex-wrap gap-3 text-[11px] font-mono">
                    {[
                      { label: "CEO", colour: "bg-amber-500/10 text-amber-400 border-amber-500/20" },
                      { label: "Coordinator", colour: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20" },
                      { label: "Specialists", colour: "bg-sky-500/10 text-sky-400 border-sky-500/20" },
                      { label: "PRD Loop", colour: "bg-purple-500/10 text-purple-400 border-purple-500/20" },
                      { label: "Brain Memory", colour: "bg-sky-500/10 text-sky-400 border-sky-500/20" },
                      { label: "Evolution", colour: "bg-orange-500/10 text-orange-400 border-orange-500/20" },
                    ].map(b => (
                      <span key={b.label} className={cn("px-2.5 py-1 rounded-full border font-semibold", b.colour)}>{b.label}</span>
                    ))}
                  </div>
                </div>

                <AbigailPipelineFlow />

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                  {[
                    { title: "9 CEO Gates", desc: "Vision alignment, rules engine, budget control, auth, and architectural governance — every request is validated before execution begins.", colour: "border-amber-500/20 bg-amber-500/5" },
                    { title: "PRD Execution Loop", desc: "Every specialist works through a Product Requirements Document cycle: Requirements → Specialist Iterations → Evaluation → Memory recording.", colour: "border-purple-500/20 bg-purple-500/5" },
                    { title: "Continuous Evolution", desc: "Every task outcome feeds the Evolution Engine and Brain Memory. The system becomes smarter with every completed workflow.", colour: "border-orange-500/20 bg-orange-500/5" },
                  ].map(card => (
                    <div key={card.title} className={cn("rounded-xl border p-5 space-y-2", card.colour)}>
                      <h4 className="text-sm font-bold text-white font-sans">{card.title}</h4>
                      <p className="text-xs text-zinc-400 leading-relaxed font-body">{card.desc}</p>
                    </div>
                  ))}
                </div>

                <div className="rounded-xl border border-zinc-900 bg-zinc-950/60 p-5 space-y-3">
                  <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">Full execution path</p>
                  <p className="text-sm font-mono text-orange-400 leading-8">
                    User → CEO (9 Gates) → Coordinator → Specialists → PRD Loop → Brain Memory → Evolution Engine → Result
                  </p>
                </div>
              </section>
            )}

            {activeTab === "coding" && (
              <section className="space-y-10">
                <div className="space-y-6">
                  <span className="text-[10px] font-mono text-orange-400 uppercase tracking-widest font-semibold bg-orange-500/10 border border-orange-500/20 px-2 py-0.5 rounded">Chapter 07</span>
                  <h2 id="coding-solutions" className="text-3xl sm:text-4xl lg:text-5xl font-sans font-bold text-white tracking-tight mt-2">
                    Coding Solutions
                  </h2>
                  <p className="text-zinc-300 text-base sm:text-lg leading-8 font-body">
                    Abigail coordinates a team of 10 coding specialists who work together as a fully autonomous software development unit. Unlike Cursor or Copilot — which autocomplete one line at a time — Abigail runs the entire development cycle: decompose goals, dispatch specialists, review code, run tests, audit security, and push PRs. All while learning from every outcome.
                  </p>
                  <div className="flex flex-wrap gap-3 text-[11px] font-mono">
                    {[
                      { label: "Vision-Governed", colour: "bg-amber-500/10 text-amber-400 border-amber-500/20" },
                      { label: "PRD Loop", colour: "bg-purple-500/10 text-purple-400 border-purple-500/20" },
                      { label: "Self-Healing", colour: "bg-sky-500/10 text-sky-400 border-sky-500/20" },
                      { label: "Zero-Cost Rules", colour: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" },
                      { label: "Nightly Evolution", colour: "bg-orange-500/10 text-orange-400 border-orange-500/20" },
                    ].map(b => (
                      <span key={b.label} className={cn("px-2.5 py-1 rounded-full border font-semibold", b.colour)}>{b.label}</span>
                    ))}
                  </div>
                </div>

                {/* vs Competitors */}
                <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 overflow-hidden">
                  <div className="px-6 py-4 border-b border-zinc-800 bg-zinc-900/40">
                    <h3 id="coding-vs-competitors" className="text-sm font-bold text-white font-sans">Why DiveSeeks Beats Cursor, Copilot &amp; Claude Code</h3>
                    <p className="text-xs text-zinc-500 mt-0.5 font-body">Every competitor autocompletes code. Abigail runs the business.</p>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs font-body">
                      <thead>
                        <tr className="border-b border-zinc-800 text-left">
                          <th className="px-5 py-3 text-zinc-400 font-semibold w-56">Capability</th>
                          <th className="px-5 py-3 text-zinc-500 font-semibold">Copilot</th>
                          <th className="px-5 py-3 text-zinc-500 font-semibold">Cursor</th>
                          <th className="px-5 py-3 text-zinc-500 font-semibold">Claude Code</th>
                          <th className="px-5 py-3 text-orange-400 font-bold">DiveSeeks</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-900">
                        {[
                          ["Persistent memory across sessions", "✗", "✗", "✗", "✓ pgvector, permanent"],
                          ["Learns your specific codebase", "✗", "✗", "✗", "✓ parametric weights"],
                          ["Creates tasks autonomously", "✗", "✗", "✗", "✓ TCE daily gap analysis"],
                          ["Enforces your rules deterministically", "✗", "✗", "✗", "✓ expert system, zero LLM"],
                          ["Blocks forbidden tech (e.g. Prisma)", "✗", "✗", "✗", "✓ vision conflict guard"],
                          ["PRD loop — iterates until tests pass", "✗", "✗", "✗", "✓ boolean-flag loop"],
                          ["Self-improves specialist prompts", "✗", "✗", "✗", "✓ Evolve Engine nightly"],
                          ["Never touches main branch", "✗", "✗", "✗", "✓ always diveseeks/* + PR"],
                          ["Pays for code writing", "Yes", "Yes", "Yes", "No — developer's own key"],
                          ["Data sovereignty", "Vendor", "Vendor", "Vendor", "Your VPS, your DB"],
                        ].map(([cap, cop, cur, cc, ds]) => (
                          <tr key={cap} className="hover:bg-zinc-900/30 transition-colors">
                            <td className="px-5 py-3 text-zinc-300 font-medium">{cap}</td>
                            <td className="px-5 py-3 text-zinc-600">{cop}</td>
                            <td className="px-5 py-3 text-zinc-600">{cur}</td>
                            <td className="px-5 py-3 text-zinc-600">{cc}</td>
                            <td className="px-5 py-3 text-emerald-400 font-semibold">{ds}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* 10 Specialists */}
                <div className="space-y-4">
                  <h3 id="coding-specialists" className="text-xl font-bold text-white font-sans">The 10 Coding Specialists</h3>
                  <p className="text-sm text-zinc-400 font-body leading-relaxed">Each specialist has a single domain. They never cross boundaries. They run in parallel where safe (rex + kai, nova + kai, sage + pixel, felix + vex).</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {[
                      { name: "Rex", role: "Senior Backend Engineer", colour: "border-blue-500/30 bg-blue-500/5", badge: "bg-blue-500/10 text-blue-400", desc: "NestJS endpoints, TypeORM entities, business logic, migrations. Creates diveseeks/* branch + PR on every task." },
                      { name: "Nova", role: "Senior Frontend Engineer", colour: "border-purple-500/30 bg-purple-500/5", badge: "bg-purple-500/10 text-purple-400", desc: "Next.js App Router, Zustand, TanStack Query, Tailwind components. Branches and PRs always." },
                      { name: "Kai", role: "Code Reviewer", colour: "border-amber-500/30 bg-amber-500/5", badge: "bg-amber-500/10 text-amber-400", desc: "Read-only. Reviews every Rex and Nova PR for correctness, security, and vision alignment. Flags rule violations." },
                      { name: "Sage", role: "QA Lead", colour: "border-emerald-500/30 bg-emerald-500/5", badge: "bg-emerald-500/10 text-emerald-400", desc: "PRD-driven test loop. Plans, generates, and heals Playwright E2E, Jest unit tests, and Hurl API tests per requirement." },
                      { name: "Felix", role: "Security Auditor", colour: "border-red-500/30 bg-red-500/5", badge: "bg-red-500/10 text-red-400", desc: "OWASP audit, auth flow analysis, secret detection. Read-only. Flags findings with needsApproval before any action." },
                      { name: "Orion", role: "Architect", colour: "border-indigo-500/30 bg-indigo-500/5", badge: "bg-indigo-500/10 text-indigo-400", desc: "High-level system design, ADRs, technology decisions. Read-only — never writes implementation code." },
                      { name: "Pixel", role: "Debugger", colour: "border-rose-500/30 bg-rose-500/5", badge: "bg-rose-500/10 text-rose-400", desc: "Systematic root cause analysis, crash investigation, error pattern matching against episodic memory from past sessions." },
                      { name: "Luma", role: "Documentation", colour: "border-sky-500/30 bg-sky-500/5", badge: "bg-sky-500/10 text-sky-400", desc: "README, API docs, inline comments, PR descriptions. Keeps documentation in sync with every code change." },
                      { name: "Atlas", role: "DevOps Engineer", colour: "border-teal-500/30 bg-teal-500/5", badge: "bg-teal-500/10 text-teal-400", desc: "Docker, CI/CD pipelines, server management, Cloud Run deployments. Infrastructure as code, always reviewed." },
                      { name: "Vex", role: "Penetration Tester", colour: "border-orange-500/30 bg-orange-500/5", badge: "bg-orange-500/10 text-orange-400", desc: "XSS, CSRF, SQL injection, active security testing. Works alongside Felix — one audits, one attacks." },
                    ].map(s => (
                      <div key={s.name} className={cn("rounded-xl border p-4 space-y-2", s.colour)}>
                        <div className="flex items-center gap-2">
                          <span className={cn("text-[10px] font-mono font-bold px-2 py-0.5 rounded", s.badge)}>{s.name}</span>
                          <span className="text-xs font-semibold text-white font-sans">{s.role}</span>
                        </div>
                        <p className="text-xs text-zinc-400 leading-relaxed font-body">{s.desc}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Coding Execution Flow */}
                <div className="space-y-4">
                  <h3 id="coding-execution-flow" className="text-xl font-bold text-white font-sans">How a Coding Task Executes</h3>
                  <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-6 font-mono text-xs space-y-3 leading-7">
                    {[
                      { step: "Vision Check", desc: "CEO blocks if request contradicts locked tech stack, constraints, or architectural rules", colour: "text-amber-400" },
                      { step: "PRD Generated", desc: "PrdGeneratorService creates requirements[] with boolean flags per task (typecheck, test-pass, kai-approval, security-scan…)", colour: "text-purple-400" },
                      { step: "Rex / Nova Execute", desc: "Specialist writes code on diveseeks/* branch using developer's own API key — DiveSeeks pays nothing for code", colour: "text-blue-400" },
                      { step: "Evaluators Grade", desc: "Each requirement graded true/false: file-change, tsc --noEmit, Jest pass, Hurl pass, Kai review, vision-constraint", colour: "text-emerald-400" },
                      { step: "Loop Continues", desc: "Any flag false → specialist retries with prior failures injected — self-healing without human intervention", colour: "text-orange-400" },
                      { step: "Kai Reviews PR", desc: "Code review runs in parallel (safe pair). PR opened on GitHub. Developer reviews and merges — DiveSeeks never touches main", colour: "text-amber-400" },
                      { step: "Memory Written", desc: "Outcome stored in agent_episodes → pgvector → parametric_weights. Specialist prompt improves tonight via Evolve Engine", colour: "text-sky-400" },
                    ].map(({ step, desc, colour }) => (
                      <div key={step} className="flex gap-4 items-start">
                        <span className={cn("shrink-0 font-bold", colour)}>→ {step}</span>
                        <span className="text-zinc-400">{desc}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Key facts */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {[
                    { title: "~40% Zero LLM Cost", desc: "Once parametric weights accumulate from real tasks, most routing and governance decisions resolve without any LLM call.", colour: "border-emerald-500/20 bg-emerald-500/5" },
                    { title: "Never Touches Main", desc: "All specialist changes happen on diveseeks/* branches. Every change is a PR. Developer reviews and merges — full control.", colour: "border-blue-500/20 bg-blue-500/5" },
                    { title: "Self-Healing Loop", desc: "When a requirement fails, prior failures from episodic memory are injected into the next iteration. Specialists fix their own mistakes.", colour: "border-purple-500/20 bg-purple-500/5" },
                  ].map(card => (
                    <div key={card.title} className={cn("rounded-xl border p-5 space-y-2", card.colour)}>
                      <h4 className="text-sm font-bold text-white font-sans">{card.title}</h4>
                      <p className="text-xs text-zinc-400 leading-relaxed font-body">{card.desc}</p>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Next / Prev Navigation */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-zinc-900/60 pt-8 mt-12">
              {prevChapter ? (
                <button
                  onClick={() => setActiveTab(prevChapter.id)}
                  className="group flex flex-col items-start p-4.5 rounded-xl border border-zinc-900 hover:border-zinc-800 bg-zinc-950/20 text-left transition-all hover:-translate-x-1 duration-200"
                >
                  <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">Previous</span>
                  <span className="text-sm font-semibold text-zinc-300 group-hover:text-orange-400 mt-1">{prevChapter.label}</span>
                </button>
              ) : <div />}
              
              {nextChapter ? (
                <button
                  onClick={() => setActiveTab(nextChapter.id)}
                  className="group flex flex-col items-end p-4.5 rounded-xl border border-zinc-900 hover:border-zinc-800 bg-zinc-950/20 text-right transition-all hover:translate-x-1 duration-200"
                >
                  <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">Next Chapter</span>
                  <span className="text-sm font-semibold text-zinc-300 group-hover:text-orange-400 mt-1">{nextChapter.label} →</span>
                </button>
              ) : <div />}
            </div>

            {/* Feedback & Newsletter Section */}
            <div className="border-t border-zinc-900/60 pt-8 mt-12 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
              <div className="space-y-2">
                <p className="text-xs text-zinc-400 font-semibold font-body">Was this document helpful?</p>
                <div className="flex gap-2">
                  <button 
                    onClick={() => setFeedbackSubmitted(true)}
                    className="px-3 py-1.5 rounded-lg border border-zinc-900 bg-zinc-950/40 text-xs text-zinc-300 hover:text-white hover:border-zinc-800 active:scale-95 transition-all"
                  >
                    👍 Yes
                  </button>
                  <button 
                    onClick={() => setFeedbackSubmitted(true)}
                    className="px-3 py-1.5 rounded-lg border border-zinc-900 bg-zinc-950/40 text-xs text-zinc-300 hover:text-white hover:border-zinc-800 active:scale-95 transition-all"
                  >
                    👎 No
                  </button>
                  {feedbackSubmitted && (
                    <span className="text-xs text-emerald-400 font-medium self-center ml-2 animate-pulse">Thank you!</span>
                  )}
                </div>
              </div>

              <div className="w-full sm:w-auto space-y-2">
                <p className="text-xs text-zinc-400 font-semibold font-body">Subscribe to updates</p>
                <div className="flex gap-2">
                  <input
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="bg-zinc-950 border border-zinc-900 rounded-lg px-3 py-1.5 text-xs text-white placeholder-zinc-550 focus:outline-none focus:ring-1 focus:ring-orange-500/30 focus:border-orange-500 transition-all font-body w-full sm:w-48"
                  />
                  <button 
                    onClick={() => {
                      if (email) {
                        setEmailSubmitted(true);
                        setEmail("");
                      }
                    }}
                    className="px-3 py-1.5 rounded-lg bg-orange-500/10 border border-orange-500/20 text-xs text-orange-400 hover:bg-orange-500/20 active:scale-95 transition-all font-semibold"
                  >
                    Subscribe
                  </button>
                </div>
                {emailSubmitted && (
                  <p className="text-[10px] text-emerald-400 font-medium mt-1 animate-pulse">Subscribed successfully!</p>
                )}
              </div>
            </div>

          </div>
        </main>

        {/* Right Sidebar (Table of Contents) */}
        <aside className="w-56 shrink-0 hidden xl:block">
          <div className="sticky top-26 space-y-4">
            <p className="text-[10px] font-mono text-zinc-500 tracking-widest uppercase px-1 font-semibold">On This Page</p>
            <ul className="space-y-3 text-xs font-body text-zinc-400">
              {activeTab === "beyond-llm" && (
                <>
                  <li><a href="#beyond-modern-llm" className="hover:text-orange-400 transition-colors block border-l border-zinc-900 pl-3">Beyond the Modern LLM</a></li>
                  <li><a href="#abigail-stack" className="hover:text-orange-400 transition-colors block border-l border-zinc-900 pl-3 font-semibold">The Intelligence Stack</a></li>
                  <li><a href="#natural-language" className="hover:text-orange-400 transition-colors block border-l border-zinc-900 pl-3">Natural Language Governance</a></li>
                  <li><a href="#humanity-first" className="hover:text-orange-400 transition-colors block border-l border-zinc-900 pl-3">Humanity First</a></li>
                  <li><a href="#abigail-principle" className="hover:text-orange-400 transition-colors block border-l border-zinc-900 pl-3 font-semibold">The Abigail Principle</a></li>
                </>
              )}
              {activeTab === "why-exists" && (
                <>
                  <li><a href="#why-abigail-exists" className="hover:text-orange-400 transition-colors block border-l border-zinc-900 pl-3">Why Abigail Exists</a></li>
                  <li><a href="#abigail-approach" className="hover:text-orange-400 transition-colors block border-l border-zinc-900 pl-3">The Abigail Approach</a></li>
                  <li><a href="#brain-principle" className="hover:text-orange-400 transition-colors block border-l border-zinc-900 pl-3 font-mono">The Brain Principle</a></li>
                  <li><a href="#model-independence" className="hover:text-orange-400 transition-colors block border-l border-zinc-900 pl-3">Model Independence</a></li>
                  <li><a href="#enterprise-intelligence" className="hover:text-orange-400 transition-colors block border-l border-zinc-900 pl-3">Enterprise Intelligence</a></li>
                  <li><a href="#the-future" className="hover:text-orange-400 transition-colors block border-l border-zinc-900 pl-3 font-semibold">The Future</a></li>
                </>
              )}
              {activeTab === "vision" && (
                <>
                  <li><a href="#abigail-vision" className="hover:text-orange-400 transition-colors block border-l border-zinc-900 pl-3">The Abigail Vision</a></li>
                  <li><a href="#no-gpu-farm" className="hover:text-orange-400 transition-colors block border-l border-zinc-900 pl-3 font-semibold">No GPU Farm</a></li>
                  <li><a href="#intelligence-exists" className="hover:text-orange-400 transition-colors block border-l border-zinc-900 pl-3">Intelligence Already Exists</a></li>
                  <li><a href="#abigail-mission" className="hover:text-orange-400 transition-colors block border-l border-zinc-900 pl-3">Abigail's Mission</a></li>
                  <li><a href="#database-first" className="hover:text-orange-400 transition-colors block border-l border-zinc-900 pl-3 font-mono">Database First</a></li>
                  <li><a href="#enterprise-simplicity" className="hover:text-orange-400 transition-colors block border-l border-zinc-900 pl-3 font-semibold">Enterprise Simplicity</a></li>
                  <li><a href="#saas-first" className="hover:text-orange-400 transition-colors block border-l border-zinc-900 pl-3 font-semibold">SaaS First</a></li>
                  <li><a href="#human-controlled" className="hover:text-orange-400 transition-colors block border-l border-zinc-900 pl-3">Human Controlled</a></li>
                  <li><a href="#long-term-goal" className="hover:text-orange-400 transition-colors block border-l border-zinc-900 pl-3 font-semibold">The Long-Term Goal</a></li>
                </>
              )}
              {activeTab === "manifesto" && (
                <>
                  <li><a href="#abigail-manifesto" className="hover:text-orange-400 transition-colors block border-l border-zinc-900 pl-3 font-semibold">Abigail Manifesto</a></li>
                  <li><a href="#the-problem" className="hover:text-orange-400 transition-colors block border-l border-zinc-900 pl-3">The Problem</a></li>
                  <li><a href="#abigail-thesis" className="hover:text-orange-400 transition-colors block border-l border-zinc-900 pl-3">The Abigail Thesis</a></li>
                  <li><a href="#our-mission" className="hover:text-orange-400 transition-colors block border-l border-zinc-900 pl-3 font-semibold">Our Mission</a></li>
                  <li><a href="#fundamental-shift" className="hover:text-orange-400 transition-colors block border-l border-zinc-900 pl-3 font-mono">The Fundamental Shift</a></li>
                  <li><a href="#brain-philosophy" className="hover:text-orange-400 transition-colors block border-l border-zinc-900 pl-3">Brain Philosophy</a></li>
                  <li><a href="#human-control-manifesto" className="hover:text-orange-400 transition-colors block border-l border-zinc-900 pl-3 font-semibold">Human Control</a></li>
                  <li><a href="#memory-economy" className="hover:text-orange-400 transition-colors block border-l border-zinc-900 pl-3 font-semibold">The Memory Economy</a></li>
                  <li><a href="#evolution-engine" className="hover:text-orange-400 transition-colors block border-l border-zinc-900 pl-3">The Evolution Engine</a></li>
                  <li><a href="#vision-manifesto" className="hover:text-orange-400 transition-colors block border-l border-zinc-900 pl-3 font-semibold">The Long-Term Vision</a></li>
                </>
              )}
              {activeTab === "constitution" && (
                <>
                  <li><a href="#abigail-constitution" className="hover:text-orange-400 transition-colors block border-l border-zinc-900 pl-3 font-semibold">Abigail Constitution</a></li>
                  <li><a href="#constitution-core-principle" className="hover:text-orange-400 transition-colors block border-l border-zinc-900 pl-3">Core Principle</a></li>
                  <li><a href="#what-abigail-is" className="hover:text-orange-400 transition-colors block border-l border-zinc-900 pl-3 font-mono">What Abigail Is</a></li>
                  <li><a href="#architectural-vision" className="hover:text-orange-400 transition-colors block border-l border-zinc-900 pl-3 font-semibold">Architectural Vision</a></li>
                  <li><a href="#non-negotiable-rules" className="hover:text-orange-400 transition-colors block border-l border-zinc-900 pl-3">Non-Negotiable Rules</a></li>
                  <li><a href="#workflow-philosophy" className="hover:text-orange-400 transition-colors block border-l border-zinc-900 pl-3 font-mono">Workflow Philosophy</a></li>
                  <li><a href="#memory-philosophy" className="hover:text-orange-400 transition-colors block border-l border-zinc-900 pl-3 font-semibold">Memory Philosophy</a></li>
                  <li><a href="#evolution-philosophy" className="hover:text-orange-400 transition-colors block border-l border-zinc-900 pl-3">Evolution Philosophy</a></li>
                  <li><a href="#current-priority" className="hover:text-orange-400 transition-colors block border-l border-zinc-900 pl-3 font-semibold">Current Priority</a></li>
                  <li><a href="#future-vision" className="hover:text-orange-400 transition-colors block border-l border-zinc-900 pl-3 font-semibold">Future Vision</a></li>
                  <li><a href="#success-criteria" className="hover:text-orange-400 transition-colors block border-l border-zinc-900 pl-3 font-semibold">Success Criteria</a></li>
                </>
              )}
              {activeTab === "architecture" && (
                <>
                  <li><a href="#pipeline-architecture" className="hover:text-orange-400 transition-colors block border-l border-zinc-900 pl-3 font-semibold">Pipeline Architecture</a></li>
                  <li><a href="#pipeline-architecture" className="hover:text-orange-400 transition-colors block border-l border-zinc-900 pl-3">9 CEO Gates</a></li>
                  <li><a href="#pipeline-architecture" className="hover:text-orange-400 transition-colors block border-l border-zinc-900 pl-3">PRD Execution Loop</a></li>
                  <li><a href="#pipeline-architecture" className="hover:text-orange-400 transition-colors block border-l border-zinc-900 pl-3">Continuous Evolution</a></li>
                </>
              )}
              {activeTab === "coding" && (
                <>
                  <li><a href="#coding-solutions" className="hover:text-orange-400 transition-colors block border-l border-zinc-900 pl-3 font-semibold">Coding Solutions</a></li>
                  <li><a href="#coding-vs-competitors" className="hover:text-orange-400 transition-colors block border-l border-zinc-900 pl-3">vs Cursor / Copilot</a></li>
                  <li><a href="#coding-specialists" className="hover:text-orange-400 transition-colors block border-l border-zinc-900 pl-3">10 Specialists</a></li>
                  <li><a href="#coding-execution-flow" className="hover:text-orange-400 transition-colors block border-l border-zinc-900 pl-3">Execution Flow</a></li>
                </>
              )}
            </ul>
          </div>
        </aside>
      </div>

      {/* Footer */}
      <footer className="border-t border-zinc-900 bg-zinc-950 py-8 text-center text-xs text-zinc-550 mt-auto relative z-10">
        <div className="max-w-7xl mx-auto px-6 space-y-2">
          <p>© 2026 Dive Seeks. All rights reserved.</p>
          <p className="text-[10px] text-zinc-650 font-mono">
            Abigail Sovereign AI Framework · SQL Memory Engine · Self-Hosted Business Intelligence
          </p>
        </div>
      </footer>
    </div>
  );
}
