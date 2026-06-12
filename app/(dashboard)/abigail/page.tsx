'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';

const DOMAIN_ICONS: Record<string, string> = {
  // Restaurant domains
  menu: '🍽️', marketing: '📢', images: '🖼️',
  website: '🌐', analytics: '📊', inventory: '📦', customer: '👥',
  // Retail domains
  pricing: '🏷️', customer_support: '🎧', content: '✍️',
  inventory_ops: '📦', analytics_report: '📈', merchandising: '🛒', promotions: '🎁',
  // Ecommerce domains
  product_catalogue: '🛍️', seo_cro: '🔍', email_sms: '✉️',
  fulfilment: '🚚', analytics_cx: '📉', reviews_loyalty: '⭐',
  // Cross-business
  ads: '📣',
};

const STATUS_BADGE: Record<string, { label: string; class: string }> = {
  healthy:         { label: 'Healthy',         class: 'bg-muted text-foreground' },
  needs_attention: { label: 'Needs Attention', class: 'bg-muted text-muted-foreground' },
  in_progress:     { label: 'In Progress',     class: 'bg-muted text-foreground' },
  not_started:     { label: 'Not Started',     class: 'bg-muted text-muted-foreground' },
};

const NEXT_ACTION_INTENT: Record<string, string> = {
  // Restaurant
  add_modifiers: 'add_modifiers',
  add_items: 'add_items',
  onboard: 'generate_menu_items',
  complete_about: 'build_website_page',
  reorder_rules: 'create_reorder_rule',
  // Retail
  onboard_pricing: 'adjust_prices',
  onboard_support: 'handle_customer_query',
  onboard_content: 'write_product_descriptions',
  onboard_inventory_ops: 'check_shelf_stock',
  onboard_analytics_report: 'generate_sales_report',
  onboard_merchandising: 'run_merchandising_report',
  onboard_promotions: 'create_promotion',
  set_ad_budget: 'set_ad_budget',
  none: '',
};

/** Maps retail domain → onboard intent key so 'onboard' resolves correctly per domain */
const RETAIL_ONBOARD_INTENT: Record<string, string> = {
  pricing: 'adjust_prices',
  customer_support: 'handle_customer_query',
  content: 'write_product_descriptions',
  inventory_ops: 'check_shelf_stock',
  analytics_report: 'generate_sales_report',
  merchandising: 'run_merchandising_report',
  promotions: 'create_promotion',
};

/** Maps ecommerce domain → onboard intent key */
const ECOMMERCE_ONBOARD_INTENT: Record<string, string> = {
  product_catalogue: 'optimise_product_listings',
  seo_cro:           'optimise_seo_cro',
  email_sms:         'create_email_campaign',
  fulfilment:        'check_fulfilment_health',
  analytics_cx:      'run_cx_analytics',
  reviews_loyalty:   'design_loyalty_programme',
};

interface DomainTile {
  domain: string;
  status: string;
  score: string;
  last_touched: string;
  next_action: string;
}

export default function AbigailPage() {
  const router = useRouter();
  const [tiles, setTiles] = useState<DomainTile[]>([]);
  const [businessType, setBusinessType] = useState<string>('RESTAURANT');
  const [loading, setLoading] = useState(true);
  const [budgetError, setBudgetError] = useState(false);
  const [launching, setLaunching] = useState<string | null>(null);

  const [growthReport, setGrowthReport] = useState<{
    compositeScore: number;
    phaseBadge: string;
    progressPct: number;
    adBudgetSet: boolean;
    priorityDomain: string;
  } | null>(null);
  const [settingBudget, setSettingBudget] = useState(false);
  const [budgetInput, setBudgetInput] = useState('');

  useEffect(() => {
    Promise.all([
      api.get('/jos/snapshot'),
      api.get('/jos/business-type'),
      api.get('/jos/growth-report'),
    ]).then(([snapshotRes, btRes, growthRes]) => {
      const fetchedTiles: DomainTile[] = snapshotRes.data.data ?? [];
      // Inject ads tile if not already in snapshot
      const hasAdsTile = fetchedTiles.some(t => t.domain === 'ads');
      if (!hasAdsTile) {
        fetchedTiles.push({
          domain: 'ads',
          status: 'not_started',
          score: '0',
          last_touched: 'never',
          next_action: 'set_ad_budget',
        });
      }
      setTiles(fetchedTiles);
      setBusinessType(btRes.data.data?.type ?? btRes.data?.type ?? 'RESTAURANT');
      setGrowthReport(growthRes.data.data ?? growthRes.data ?? null);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  async function launch(tile: DomainTile) {
    // For 'onboard', look up the correct retail intent if applicable
    let intent = NEXT_ACTION_INTENT[tile.next_action];
    if (!intent) {
      if (businessType === 'RETAIL' && RETAIL_ONBOARD_INTENT[tile.domain]) {
        intent = RETAIL_ONBOARD_INTENT[tile.domain];
      } else if (businessType === 'ECOMMERCE' && ECOMMERCE_ONBOARD_INTENT[tile.domain]) {
        intent = ECOMMERCE_ONBOARD_INTENT[tile.domain];
      } else {
        intent = `generate_${tile.domain}_items`;
      }
    }

    setLaunching(tile.domain);
    try {
      const res = await api.post('/jos/request', { intent, context: {}, surface: 'sidebar' });
      const { sessionId, domain } = res.data.data;
      if (sessionId) {
        router.push(`/abigail/${domain}?sessionId=${sessionId}`);
      }
    } catch (e: any) {
      if (e.response?.status === 402) setBudgetError(true);
    } finally {
      setLaunching(null);
    }
  }

  async function handleSetBudget() {
    const cents = Math.round(parseFloat(budgetInput) * 100);
    if (!cents || cents <= 0) return;
    setSettingBudget(true);
    try {
      await api.post('/jos/set-ad-budget', { monthlyBudgetCents: cents });
      const growthRes = await api.get('/jos/growth-report');
      setGrowthReport(growthRes.data.data ?? growthRes.data ?? null);
    } catch {} finally {
      setSettingBudget(false);
      setBudgetInput('');
    }
  }

  const isRetail = businessType === 'RETAIL';
  const isEcommerce = businessType === 'ECOMMERCE';
  const pageSubtitle = isRetail
    ? 'Your retail AI workforce worked through the night. Here\'s what needs your attention.'
    : isEcommerce
    ? 'Your ecommerce AI workforce worked through the night. Here\'s what needs your attention.'
    : 'Your agency worked through the night. Here\'s what needs your attention.';

  if (loading) return <div className="p-8 text-muted-foreground">Loading AI Workforce...</div>;

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="flex items-start justify-between mb-2">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">AI Workforce</h1>
        <div className="flex gap-2">
          <a href="/abigail/brain" className="text-xs text-muted-foreground hover:text-foreground border border-border rounded-md px-3 py-1.5 transition-colors">
            What your AI knows →
          </a>
          <a href="/abigail/evolution" className="text-xs text-muted-foreground hover:text-foreground border border-border rounded-md px-3 py-1.5 transition-colors">
            Evolution timeline →
          </a>
        </div>
      </div>
      <p className="text-muted-foreground mb-8">{pageSubtitle}</p>

      {budgetError && (
        <div className="mb-6 p-4 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm font-medium">
          Monthly AI budget exhausted. <a href="/settings/billing" className="underline hover:opacity-80">Manage budget →</a>
        </div>
      )}

      {/* Growth Score Banner — restaurant + ecommerce tenants */}
      {!isRetail && growthReport && (
        <div className="mb-6 p-5 bg-card border border-border rounded-xl">
          <div className="flex items-center justify-between mb-3">
            <div>
              <span className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
                {growthReport.phaseBadge} Phase
              </span>
              <p className="text-2xl font-semibold text-foreground mt-0.5">
                {growthReport.compositeScore}
                <span className="text-sm font-normal text-muted-foreground ml-1">/ 100 composite score</span>
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground uppercase tracking-wider">90-day target: 2000% growth</p>
              <p className="text-sm font-semibold text-foreground">{growthReport.progressPct}% there</p>
            </div>
          </div>
          <div className="w-full bg-muted rounded-full h-1.5">
            <div
              className="bg-foreground h-1.5 rounded-full transition-all duration-500"
              style={{ width: `${growthReport.progressPct}%` }}
            />
          </div>
        </div>
      )}

      {/* Ad Budget Prompt — show if budget not yet set, non-retail tenants */}
      {!isRetail && growthReport && !growthReport.adBudgetSet && (
        <div className="mb-6 p-5 bg-muted border border-border rounded-xl">
          <p className="font-semibold text-foreground mb-1">Set your monthly ad budget to unlock growth</p>
          <p className="text-sm text-muted-foreground mb-4">
            Even £20/month in ads can accelerate your results. Your AI Ad Manager will track every penny,
            kill underperforming ads fast, and scale winners — you approve every decision.
          </p>
          <div className="flex gap-2 items-center">
            <span className="text-muted-foreground font-medium">£</span>
            <input
              type="number"
              min="1"
              placeholder="e.g. 50"
              value={budgetInput}
              onChange={e => setBudgetInput(e.target.value)}
              className="border border-border bg-background rounded-lg px-3 py-1.5 text-sm w-28 focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <span className="text-muted-foreground text-xs uppercase tracking-wide">/ month</span>
            <button
              onClick={handleSetBudget}
              disabled={settingBudget || !budgetInput}
              className="ml-2 px-4 py-1.5 bg-foreground text-background text-sm rounded-lg font-medium disabled:opacity-50 hover:opacity-90 transition-opacity"
            >
              {settingBudget ? 'Saving…' : 'Set Budget'}
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {tiles.map(tile => {
          const badge = STATUS_BADGE[tile.status] ?? STATUS_BADGE.not_started;
          const ctaLabel = tile.status === 'not_started' ? 'Start' : tile.status === 'healthy' ? 'Review' : 'Continue';
          return (
            <div key={tile.domain} className="border border-border rounded-xl p-5 bg-card flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <span className="text-2xl">{DOMAIN_ICONS[tile.domain] ?? '🤖'}</span>
                <span className="font-semibold text-sm capitalize">{tile.domain.replace(/_/g, ' ')}</span>
                <span className={`ml-auto text-xs px-2 py-0.5 rounded-full font-medium ${badge.class}`}>{badge.label}</span>
              </div>

              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-primary rounded-full" style={{ width: `${tile.score}%` }} />
              </div>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Score: {tile.score}/100</span>
                <span>{tile.last_touched === 'never' ? 'Never touched' : `Last: ${tile.last_touched}`}</span>
              </div>

              <button
                onClick={() => launch(tile)}
                disabled={launching === tile.domain}
                className="mt-auto w-full py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50"
              >
                {launching === tile.domain ? 'Launching...' : ctaLabel}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
