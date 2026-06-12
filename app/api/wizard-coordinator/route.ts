import { streamText, tool, convertToModelMessages, stepCountIs } from 'ai';
import { getAgentModel, getFallbackModel } from '../agents/_shared/get-model';
import { z } from 'zod';
import { getSession, createSession, updateSession, type SessionMemory } from './session-memory';
import { randomUUID } from 'crypto';

const BACKEND_URL = process.env.API_PROXY_TARGET ?? 'http://localhost:7771';
const FRONTEND_URL = process.env.NEXTAUTH_URL ?? 'http://localhost:7777';

async function backendGet(path: string, authToken: string): Promise<{ data: any; status: number }> {
  try {
    const res = await fetch(`${BACKEND_URL}${path}`, {
      headers: { Authorization: authToken },
    });
    if (res.status === 404) return { data: null, status: 404 };
    if (!res.ok) return { data: null, status: res.status };
    const json = await res.json();
    return { data: json.data ?? json, status: res.status };
  } catch {
    return { data: null, status: 500 };
  }
}

async function callSpecialist(route: string, body: object, authToken: string): Promise<any> {
  try {
    const res = await fetch(`${FRONTEND_URL}${route}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: authToken },
      body: JSON.stringify(body),
    });
    if (res.status === 401) {
      throw new Error('UNAUTHORIZED_SPECIALIST');
    }
    if (!res.ok) {
      const errorText = await res.text();
      console.error(`[Coordinator] Specialist ${route} failed (${res.status}):`, errorText);
      throw new Error(`Specialist ${route} failed: ${res.status}`);
    }
    return res.json();
  } catch (err: any) {
    if (err.message === 'UNAUTHORIZED_SPECIALIST') throw err;
    console.error(`[Coordinator] Error calling specialist ${route}:`, err);
    throw err;
  }
}

export async function POST(req: Request) {
  const body = await req.json();
  const { messages, sessionId: incomingSessionId } = body;
  const authToken = req.headers.get('Authorization') ?? '';
  // Accept session ID from header (frontend-generated) OR body
  const headerSessionId = req.headers.get('X-Session-Id') ?? undefined;
  const siteId = req.headers.get('X-Site-Id') ?? body.siteId;

  if (!siteId) {
    const { data: config } = await backendGet('/api/ai-integration/config', authToken);
    const modelName = config?.model || 'gemini-flash-latest';

    const result = streamText({
      model: getAgentModel('specialist'),
      messages: await convertToModelMessages(messages),
      system: 'The user has not selected a store site. You must respond EXACTLY with: "Please select a store site before we talk." Do not add anything else.',
      providerOptions: {
        deepseek: { caching: true }
      }
    });
    const response = result.toUIMessageStreamResponse();
    return new Response(response.body, { status: response.status, headers: response.headers });
  }

  let sessionId = (headerSessionId ?? incomingSessionId) as string | undefined;
  // Namespace session by site to keep session memory isolated
  if (sessionId && !sessionId.includes(siteId)) {
    sessionId = `${siteId}_${sessionId}`;
  }
  let session = sessionId ? getSession(sessionId) : null;

  if (!session) {
    sessionId = sessionId ?? `${siteId}_${randomUUID()}`;
    const { data: profile, status: profileStatus } = await backendGet(`/api/wizard-profiles/me?siteId=${siteId}`, authToken);
    
    if (profileStatus === 401) {
       const { data: config } = await backendGet('/api/ai-integration/config', authToken);
       const modelName = config?.model || 'gemini-flash-latest';

       const result = streamText({
        model: getAgentModel('specialist'),
        messages: await convertToModelMessages(messages),
        system: 'The users session has expired. You must respond EXACTLY with: "I apologize, but your session seems to have expired. Please refresh the page to continue our conversation." Do not add anything else.',
        providerOptions: {
          deepseek: { caching: true }
        }
      });
      const response = result.toUIMessageStreamResponse();
      return new Response(response.body, { status: response.status, headers: response.headers });
    }

    session = createSession(sessionId, '', siteId, profile ? {
      businessType: profile.businessType ?? 'RESTAURANT',
      cuisines: profile.cuisines ?? [],
      keywords: profile.keywords ?? [],
      dietaryType: profile.dietaryType ?? null,
      spiceRange: profile.spiceRange ?? null,
      serviceModel: profile.serviceModel ?? null,
      allergenPolicy: profile.allergenPolicy ?? null,
      globalAttributes: profile.globalAttributes ?? {},
    } : {});
  }

  const mem = session;
  const isReturningUser = mem.cuisines.length > 0;

  const sessionSummary = [
    mem.businessType !== 'RESTAURANT' ? `Business: ${mem.businessType}` : '',
    mem.cuisines.length ? `Cuisines: ${mem.cuisines.join(', ')}` : '',
    mem.dietaryType ? `Dietary: ${mem.dietaryType}` : '',
    mem.spiceRange ? `Spice: ${mem.spiceRange}` : '',
    mem.serviceModel ? `Service: ${mem.serviceModel}` : '',
    mem.journey ? `Journey: ${mem.journey}` : '',
  ].filter(Boolean).join(' | ');

  const modelMessages = await convertToModelMessages(messages);

  const { data: config } = await backendGet('/api/ai-integration/config', authToken);
  let modelName = config?.model || 'gemini-flash-latest';
  
  // Sanitize and map deprecated/non-existent models
  if (modelName === 'gemini-2.5-flash' || modelName === 'gemini-flash-latest') {
    modelName = 'gemini-flash-latest';
  }

  const result = streamText({
    model: getAgentModel('specialist'),
    stopWhen: stepCountIs(12),
    providerOptions: {
      deepseek: { caching: true }
    },
    system: `You are Abigail, the AI menu coordinator for Dive POS. Warm, professional, concise.

SPECIALIST TEAM:
- Researcher — DeepSeek-powered knowledge expert. Runs ONCE invisibly after discovery.
- Zara  — categories architect ("I've asked Zara to design your menu structure...")
- Marco — cuisine & items expert ("Marco knows this cuisine inside out...")
- Kai   — pricing & modifiers ("Kai's great at add-ons...")
- Rex   — dietary & compliance ("Let me loop in Rex on allergens...")
- Sage  — SEO & discoverability ("Sage will check how your menu looks online...")

SESSION STATE: ${sessionSummary || 'Fresh session'}
Current step: ${mem.currentStep}
Journey: ${mem.journey || 'not detected yet'}
${mem.pendingApproval ? `⚠️ PENDING APPROVAL: ${mem.pendingApproval.type} from ${mem.pendingApproval.specialist} — wait for user to confirm BEFORE calling another specialist` : ''}
${isReturningUser ? `✅ RETURNING USER — greet them: "Welcome back! I remember you run a ${mem.cuisines.join('/')} ${mem.businessType.toLowerCase()} — shall we continue or start fresh?"` : ''}

JOURNEY DETECTION (MANDATORY FIRST STEP):
- If Journey is "not detected yet", you MUST call detectJourney immediately.
- Journey A (no menu): Discovery -> Researcher (invisible) -> Rex -> Zara -> Marco -> Kai -> Sage -> complete
- Journey B (menu exists): Sage audit first -> present issues -> user picks fixes -> apply surgically
- Journey C (menu exists + specific request): skip audit -> route directly to right specialist

HUMAN-IN-THE-LOOP CONTRACT (CRITICAL — never break these):
1. NEVER apply any specialist suggestion without user confirming it
2. After calling a specialist, present the result and ask "Does this look right?"
3. ONLY call recordApproval when user clearly says: "yes", "perfect", "looks good", "proceed", "great"
4. ONLY call recordRejection when user says "no", "change", "remove", "different"
5. One specialist call per turn maximum
6. Default: 1-3 sentences, no bullet lists. EXCEPTION: when the user explicitly asks to "list", "show all", "please list", or "what are the items", you MUST provide the full detailed list grouped by category, with every item name shown. Do not summarise when a full list is requested.

HYGIENE QUESTIONS (Journey A only — after Rex confirms + user approves Rex):
- Ask these 3 questions one at a time in plain language:
  1. "Do you have a hygiene rating from your local council? In the UK it's a score from 1 to 5. Showing it on your menu helps customers trust you."
  2. "Some dishes may contain nuts, dairy, or gluten. Do you want a clear warning on those items so customers with allergies stay safe?"
  3. "Should we add a note saying your kitchen handles both vegetarian and non-vegetarian ingredients? This is important for strict vegetarian customers."
- Use short plain sentences. No technical or legal terms.
- If user says "skip", "not sure", or "later" → call recordHygieneAnswers with hygieneRating: "awaiting" and proceed.
- After all 3 answers collected → call recordHygieneAnswers to save, then proceed to callZara.`,

    messages: modelMessages,

    tools: {
      detectJourney: tool({
        description: 'Check if tenant has an existing menu. Call on first turn to determine Journey A, B, or C.',
        inputSchema: z.object({}),
        execute: async () => {
          try {
            // Check for active menu on the specific site
            const { data: activeMenu, status } = await backendGet(`/api/menus/active/${siteId}`, authToken);
            
            if (status === 401) return { error: 'UNAUTHORIZED', message: 'Session expired' };
            
            const hasMenu = !!(activeMenu?.id || activeMenu?.data?.id);
            const journey = hasMenu ? 'existing_menu' : 'new_menu';
            updateSession(sessionId!, { journey, currentStep: hasMenu ? 'detection' : 'discovery' });
            return { journey, hasMenu, menuFound: hasMenu };
          } catch {
            updateSession(sessionId!, { journey: 'new_menu', currentStep: 'discovery' });
            return { journey: 'new_menu', hasMenu: false };
          }
        },
      }),

      updateDiscoveryFacts: tool({
        description: 'Update session memory with facts about the business. Call whenever user reveals new information.',
        inputSchema: z.object({
          businessType: z.enum(['RESTAURANT', 'CAFE', 'BAR', 'RETAIL']).optional(),
          cuisines: z.array(z.string()).optional(),
          keywords: z.array(z.string()).optional(),
          dietaryType: z.string().optional(),
          spiceRange: z.string().optional(),
          serviceModel: z.string().optional(),
          allergenPolicy: z.string().optional(),
        }),
        execute: async (facts) => {
          const patch: Partial<SessionMemory> = {};
          if (facts.businessType) patch.businessType = facts.businessType;
          if (facts.cuisines?.length) patch.cuisines = facts.cuisines;
          if (facts.keywords?.length) patch.keywords = facts.keywords;
          if (facts.dietaryType) patch.dietaryType = facts.dietaryType;
          if (facts.spiceRange) patch.spiceRange = facts.spiceRange;
          if (facts.serviceModel) patch.serviceModel = facts.serviceModel;
          if (facts.allergenPolicy) patch.allergenPolicy = facts.allergenPolicy;
          updateSession(sessionId!, patch);
          return { updated: true, facts };
        },
      }),

      callResearcher: tool({
        description: 'Ask the Researcher agent to gather industry knowledge, trends, or specific data about the cuisine/business type. Runs invisibly.',
        inputSchema: z.object({
          abigailIntro: z.string().describe('Internal note about why we are calling the researcher'),
          query: z.string().describe('The specific research question based on the user business'),
          webSearchRequested: z.boolean().default(false).describe('Only set to true if user explicitly asked to search the web'),
        }),
        execute: async ({ abigailIntro, query, webSearchRequested }) => {
          try {
            const s = getSession(sessionId!)!;
            const result = await callSpecialist('/api/agents/researcher', {
              query,
              webSearchRequested,
              cuisines: s.cuisines,
              businessType: s.businessType,
              sessionSummary,
            }, authToken);
            
            // Researcher runs invisibly, no approval needed
            updateSession(sessionId!, {
              specialistCalls: [...s.specialistCalls, { specialist: 'researcher', calledAt: Date.now(), summary: abigailIntro }],
              // Store findings in global attributes or a new field so Abigail has the context
              globalAttributes: {
                ...s.globalAttributes,
                researchFindings: result.findings,
              }
            });
            
            return { specialist: 'researcher', specialistName: 'Researcher', role: 'Knowledge Expert', result, abigailIntro };
          } catch (err: any) {
            if (err.message === 'UNAUTHORIZED_SPECIALIST') return { error: 'UNAUTHORIZED' };
            throw err;
          }
        },
      }),

      callZara: tool({
        description: 'Ask Zara to suggest menu categories. Call after discovery is complete (Journey A) or when user wants to add categories (Journey B/C).',
        inputSchema: z.object({
          abigailIntro: z.string(),
          existingCategories: z.array(z.unknown()).optional(),
        }),
        execute: async ({ abigailIntro, existingCategories = [] }) => {
          try {
            const s = getSession(sessionId!)!;
            const result = await callSpecialist('/api/agents/zara', {
              cuisines: s.cuisines,
              keywords: s.keywords,
              dietaryType: s.dietaryType,
              businessType: s.businessType,
              sessionSummary,
              existingCategories,
            }, authToken);
            updateSession(sessionId!, {
              pendingApproval: { specialist: 'zara', type: 'categories', suggestion: result, abigailIntro, askedAt: Date.now() },
              specialistCalls: [...s.specialistCalls, { specialist: 'zara', calledAt: Date.now(), summary: abigailIntro }],
            });
            return { specialist: 'zara', specialistName: 'Zara', role: 'Categories Architect', result, abigailIntro };
          } catch (err: any) {
            if (err.message === 'UNAUTHORIZED_SPECIALIST') return { error: 'UNAUTHORIZED' };
            throw err;
          }
        },
      }),

      callMarco: tool({
        description: 'Ask Marco to suggest menu items for categories.',
        inputSchema: z.object({
          abigailIntro: z.string(),
          targetCategories: z.array(z.unknown()).optional(),
          existingItems: z.array(z.unknown()).optional(),
        }),
        execute: async ({ abigailIntro, targetCategories, existingItems = [] }) => {
          try {
            const s = getSession(sessionId!)!;
            const result = await callSpecialist('/api/agents/marco', {
              cuisines: s.cuisines,
              keywords: s.keywords,
              dietaryType: s.dietaryType,
              categories: targetCategories ?? s.approvedCategories,
              sessionSummary,
              existingItems,
            }, authToken);
            updateSession(sessionId!, {
              pendingApproval: { specialist: 'marco', type: 'items', suggestion: result, abigailIntro, askedAt: Date.now() },
              specialistCalls: [...s.specialistCalls, { specialist: 'marco', calledAt: Date.now(), summary: abigailIntro }],
            });
            return { specialist: 'marco', specialistName: 'Marco', role: 'Cuisine & Items Expert', result, abigailIntro };
          } catch (err: any) {
            if (err.message === 'UNAUTHORIZED_SPECIALIST') return { error: 'UNAUTHORIZED' };
            throw err;
          }
        },
      }),

      callKai: tool({
        description: 'Ask Kai to suggest modifier groups.',
        inputSchema: z.object({ abigailIntro: z.string() }),
        execute: async ({ abigailIntro }) => {
          try {
            const s = getSession(sessionId!)!;
            const result = await callSpecialist('/api/agents/kai', {
              categories: s.approvedCategories,
              businessType: s.businessType,
              keywords: s.keywords,
              dietaryType: s.dietaryType,
              sessionSummary,
            }, authToken);
            updateSession(sessionId!, {
              pendingApproval: { specialist: 'kai', type: 'modifiers', suggestion: result, abigailIntro, askedAt: Date.now() },
              specialistCalls: [...s.specialistCalls, { specialist: 'kai', calledAt: Date.now(), summary: abigailIntro }],
            });
            return { specialist: 'kai', specialistName: 'Kai', role: 'Pricing & Modifiers Expert', result, abigailIntro };
          } catch (err: any) {
            if (err.message === 'UNAUTHORIZED_SPECIALIST') return { error: 'UNAUTHORIZED' };
            throw err;
          }
        },
      }),

      callRex: tool({
        description: 'Ask Rex to check dietary and allergen compliance.',
        inputSchema: z.object({ abigailIntro: z.string() }),
        execute: async ({ abigailIntro }) => {
          try {
            const s = getSession(sessionId!)!;
            const result = await callSpecialist('/api/agents/rex', {
              dietaryType: s.dietaryType,
              allergenPolicy: s.allergenPolicy,
              cuisines: s.cuisines,
              spiceRange: s.spiceRange,
              serviceModel: s.serviceModel ? [s.serviceModel] : [],
              keywords: s.keywords,
              sessionSummary,
            }, authToken);
            updateSession(sessionId!, {
              pendingApproval: { specialist: 'rex', type: 'attributes', suggestion: result, abigailIntro, askedAt: Date.now() },
              specialistCalls: [...s.specialistCalls, { specialist: 'rex', calledAt: Date.now(), summary: abigailIntro }],
            });
            return { specialist: 'rex', specialistName: 'Rex', role: 'Dietary & Compliance Expert', result, abigailIntro };
          } catch (err: any) {
            if (err.message === 'UNAUTHORIZED_SPECIALIST') return { error: 'UNAUTHORIZED' };
            throw err;
          }
        },
      }),

      callSage: tool({
        description: 'Ask Sage to audit SEO or rewrite descriptions. Use at end of Journey A, or at start of Journey B.',
        inputSchema: z.object({
          abigailIntro: z.string(),
          mode: z.enum(['audit', 'rewrite']).default('audit'),
          items: z.array(z.unknown()).optional(),
        }),
        execute: async ({ abigailIntro, mode, items }) => {
          try {
            const s = getSession(sessionId!)!;
            const targetItems = items ?? s.approvedItems;
            const result = await callSpecialist('/api/agents/sage', {
              items: targetItems,
              businessType: s.businessType,
              cuisines: s.cuisines,
              tenantId: s.tenantId,
              sessionSummary,
              mode,
            }, authToken) as any;

            if (result?.topIssues) {
              updateSession(sessionId!, {
                existingMenuSummary: {
                  totalCategories: 0,
                  totalItems: (targetItems as unknown[]).length,
                  itemsWithNoDescription: result.auditResults?.filter((r: any) => !r.currentDescription).length ?? 0,
                  itemsWithNoModifiers: 0,
                  seoScore: result.overallScore ?? result.seoScore ?? 0,
                  topIssues: result.topIssues ?? [],
                },
              });
            }

            updateSession(sessionId!, {
              pendingApproval: { specialist: 'sage', type: 'seo_fixes', suggestion: result, abigailIntro, askedAt: Date.now() },
              specialistCalls: [...s.specialistCalls, { specialist: 'sage', calledAt: Date.now(), summary: abigailIntro }],
            });
            return { specialist: 'sage', specialistName: 'Sage', role: 'SEO & Discoverability', result, abigailIntro };
          } catch (err: any) {
            if (err.message === 'UNAUTHORIZED_SPECIALIST') return { error: 'UNAUTHORIZED' };
            throw err;
          }
        },
      }),

      recordApproval: tool({
        description: 'Record user approval of pending specialist suggestion. Call when user says yes/perfect/looks good/proceed.',
        inputSchema: z.object({
          confirmationMessage: z.string(),
        }),
        execute: async ({ confirmationMessage }) => {
          const s = getSession(sessionId!)!;
          if (!s.pendingApproval) return { error: 'No pending approval' };
          const { type, suggestion } = s.pendingApproval;
          const patch: Partial<SessionMemory> = { pendingApproval: null };

          if (type === 'categories') {
            patch.approvedCategories = (suggestion as any).categories ?? [];
            patch.currentStep = 'items';
          } else if (type === 'items') {
            const rawItems = (suggestion as any).itemsByCategory ?? [];
            patch.approvedItems = rawItems.flatMap((c: any) => c.items ?? []);
            patch.currentStep = 'modifiers';
          } else if (type === 'modifiers') {
            patch.approvedModifiers = (suggestion as any).modifiers ?? (suggestion as any).modifierGroups ?? [];
            patch.currentStep = 'seo';
          } else if (type === 'attributes') {
            patch.globalAttributes = {
              ...s.globalAttributes,
              ...Object.fromEntries(
                ((suggestion as any).globalAttributes ?? []).map((a: any) => [a.attributeKey, a.attributeValue])
              ),
            };
          } else if (type === 'seo_fixes' || type === 'descriptions') {
            patch.currentStep = 'complete';
          }

          updateSession(sessionId!, patch);
          return { approved: true, type, confirmationMessage, nextStep: patch.currentStep ?? s.currentStep };
        },
      }),

      recordRejection: tool({
        description: 'Record user rejection or modification request of pending suggestion.',
        inputSchema: z.object({ userFeedback: z.string() }),
        execute: async ({ userFeedback }) => {
          updateSession(sessionId!, { pendingApproval: null });
          return { rejected: true, feedback: userFeedback };
        },
      }),

      recordHygieneAnswers: tool({
        description: 'Save hygiene questioner answers to session. Call after collecting hygiene rating, allergen notice preference, and shared kitchen notice preference.',
        inputSchema: z.object({
          hygieneRating: z.string().describe('e.g. "5", "3", "awaiting", "not applicable"'),
          allergenNotice: z.boolean().describe('true if user wants allergen warnings on items'),
          sharedKitchen: z.boolean().describe('true if user wants a shared kitchen notice on menu'),
        }),
        execute: async ({ hygieneRating, allergenNotice, sharedKitchen }) => {
          updateSession(sessionId!, {
            hygieneChecked: true,
            hygieneRating,
            allergenNotice,
            sharedKitchen,
          });
          return { saved: true, hygieneRating, allergenNotice, sharedKitchen };
        },
      }),

      applyDirectDBWrite: tool({
        description: 'Journey B/C only: write an approved fix directly to the database via NestJS API.',
        inputSchema: z.object({
          endpoint: z.string().describe('NestJS PATCH/POST endpoint path'),
          method: z.enum(['POST', 'PATCH', 'PUT']),
          body: z.record(z.string(), z.unknown()),
          description: z.string().describe('Human-readable description of what is being written'),
        }),
        execute: async ({ endpoint, method, body, description }) => {
          try {
            const res = await fetch(`${BACKEND_URL}${endpoint}`, {
              method,
              headers: { 'Content-Type': 'application/json', Authorization: authToken },
              body: JSON.stringify(body),
            });
            return { success: res.ok, status: res.status, description };
          } catch (err: any) {
            return { success: false, error: err.message, description };
          }
        },
      }),

      completeWizard: tool({
        description: 'Journey A: mark wizard complete and save business profile to DB.',
        inputSchema: z.object({ closingMessage: z.string() }),
        execute: async ({ closingMessage }) => {
          const s = getSession(sessionId!)!;
          try {
            await fetch(`${BACKEND_URL}/api/wizard-profiles/upsert`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', Authorization: authToken },
              body: JSON.stringify({
                siteId: s.siteId,
                businessType: s.businessType,
                cuisines: s.cuisines,
                keywords: s.keywords,
                dietaryType: s.dietaryType,
                spiceRange: s.spiceRange,
                serviceModel: s.serviceModel,
                allergenPolicy: s.allergenPolicy,
                globalAttributes: s.globalAttributes,
                lastWizardCompletedAt: new Date(),
                hygieneRating: s.hygieneRating,
                sharedKitchen: s.sharedKitchen,
                allergenNotice: s.allergenNotice,
              }),
            });
          } catch (err) {
            console.error('[Coordinator] Failed to save business profile:', err);
          }
          updateSession(sessionId!, { currentStep: 'complete' });
          return {
            complete: true,
            closingMessage,
            summary: {
              categories: s.approvedCategories.length,
              items: s.approvedItems.length,
              modifiers: s.approvedModifiers.length,
            },
          };
        },
      }),
    },
  });

  const response = result.toUIMessageStreamResponse();
  const headers = new Headers(response.headers);
  headers.set('X-Session-Id', sessionId!);
  return new Response(response.body, { status: response.status, headers });
}
