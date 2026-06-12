import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  Site,
  SiteConfig,
  TemplateFamily,
} from '../sites/entities/site.entity';
import { UpdateSiteConfigDto } from './dto/update-site-config.dto';
import { SiteConfigResponseDto } from './dto/site-config-response.dto';
import { AiProviderRouter } from '../common/ai-provider-router.service';

const CLASSIC_VARIANTS = [
  'resonance-home-1',
  'resonance-home-2',
  'resonance-home-3',
  'resonance-home-4',
  'resonance-home-5',
];
const MODERN_VARIANTS = [
  'rayo-home-main',
  'rayo-home-digital-agency',
  'rayo-home-designer',
  'rayo-home-web-agency',
  'rayo-home-creative-design-studio',
];

@Injectable()
export class WebsiteBuilderService {
  constructor(
    @InjectRepository(Site)
    private readonly siteRepository: Repository<Site>,
    private readonly aiRouter: AiProviderRouter,
  ) {}

  async getSiteConfig(
    siteId: string,
    businessId: string,
  ): Promise<SiteConfigResponseDto> {
    const site = await this.siteRepository.findOne({
      where: { id: siteId, businessId },
    });
    if (!site) throw new NotFoundException(`Site ${siteId} not found`);
    return this.toResponse(site);
  }

  async updateSiteConfig(
    siteId: string,
    businessId: string,
    dto: UpdateSiteConfigDto,
  ): Promise<SiteConfigResponseDto> {
    const site = await this.siteRepository.findOne({
      where: { id: siteId, businessId },
    });
    if (!site) throw new NotFoundException(`Site ${siteId} not found`);

    const existing = site.websiteConfig ?? ({} as Partial<SiteConfig>);
    site.websiteConfig = {
      templateFamily: existing.templateFamily ?? 'classic',
      templateId: dto.templateId ?? existing.templateId ?? 'resonance-home-1',
      theme: dto.theme ??
        existing.theme ?? {
          primaryColor: '#c0392b',
          fontFamily: 'Inter',
          darkMode: false,
        },
      puckData: (dto.puckData as any) ??
        existing.puckData ?? { content: [], root: { props: {} } },
      seo: dto.seo ?? existing.seo ?? { title: site.name, description: '' },
      generatedAt: existing.generatedAt ?? new Date().toISOString(),
    };

    if (dto.subdomain) {
      site.subdomain = dto.subdomain.toLowerCase().replace(/[^a-z0-9-]/g, '-');
    }

    const saved = await this.siteRepository.save(site);
    return this.toResponse(saved);
  }

  async generateSite(
    siteId: string,
    businessId: string,
    templateFamily: TemplateFamily,
    merchantHint?: string,
  ): Promise<SiteConfigResponseDto> {
    const site = await this.siteRepository.findOne({
      where: { id: siteId, businessId },
    });
    if (!site) throw new NotFoundException(`Site ${siteId} not found`);

    site.websiteStatus = 'generating';
    await this.siteRepository.save(site);

    const config = await this.callAI(site, templateFamily, merchantHint);
    site.websiteConfig = config;
    site.websiteStatus = 'draft';

    const saved = await this.siteRepository.save(site);
    return this.toResponse(saved);
  }

  async publishSite(
    siteId: string,
    businessId: string,
  ): Promise<SiteConfigResponseDto> {
    const site = await this.siteRepository.findOne({
      where: { id: siteId, businessId },
    });
    if (!site) throw new NotFoundException(`Site ${siteId} not found`);
    site.websiteStatus = 'published';
    const saved = await this.siteRepository.save(site);
    return this.toResponse(saved);
  }

  async setSubdomain(
    siteId: string,
    businessId: string,
    subdomain: string,
  ): Promise<SiteConfigResponseDto> {
    const site = await this.siteRepository.findOne({
      where: { id: siteId, businessId },
    });
    if (!site) throw new NotFoundException(`Site ${siteId} not found`);
    site.subdomain = subdomain.toLowerCase().replace(/[^a-z0-9-]/g, '-');
    const saved = await this.siteRepository.save(site);
    return this.toResponse(saved);
  }

  async getPublicSiteBySubdomain(
    subdomain: string,
  ): Promise<SiteConfigResponseDto> {
    const site = await this.siteRepository.findOne({
      where: { subdomain, websiteStatus: 'published' },
    });
    if (!site)
      throw new NotFoundException(`No published site for: ${subdomain}`);
    return this.toResponse(site);
  }

  private async callAI(
    site: Site,
    templateFamily: TemplateFamily,
    merchantHint?: string,
  ): Promise<SiteConfig> {
    const { generateText } = await import('ai');

    const variants =
      templateFamily === 'classic' ? CLASSIC_VARIANTS : MODERN_VARIANTS;

    const prompt = `You are a website design AI for a POS merchant platform called Dive POS.
Generate a SiteConfig JSON for a merchant website using the Puck page builder format.

Merchant:
- Business name: ${site.name}
- Site type: ${site.type}
- Template family: ${templateFamily} (${templateFamily === 'classic' ? 'warm Bootstrap traditional' : 'bold GSAP modern premium'})
${merchantHint ? `- Merchant vibe: ${merchantHint}` : ''}

Available templateId values: ${variants.join(', ')}

Available Puck component types:
- Hero:         { headline, subtext, cta } — always include first
- Menu:         { title, subtitle, items: [{ name: "...", price: "£0.00", description: "..." }] } — always include
- About:        { title, body }
- Contact:      { address, phone, email }
- OrderingCta:  { headline, subtext }
- OpeningHours: { title, days: [{ day: "Mon-Fri", hours: "9am-10pm" }] }

Return ONLY valid JSON, no markdown, no explanation:
{
  "templateFamily": "${templateFamily}",
  "templateId": "<pick best variant from list>",
  "theme": {
    "primaryColor": "<hex — warm reds/ambers for classic, bold navy/crimson for modern>",
    "fontFamily": "<Inter|Playfair Display|Montserrat|Lato>",
    "darkMode": <true if hint suggests dark/luxury, else false>
  },
  "puckData": {
    "content": [
      { "type": "Hero", "props": { "id": "hero-1", "headline": "...", "subtext": "...", "cta": "..." } },
      { "type": "Menu", "props": { "id": "menu-1", "title": "...", "subtitle": "...", "items": [{ "name": "...", "price": "£...", "description": "..." }] } },
      { "type": "About", "props": { "id": "about-1", "title": "...", "body": "..." } },
      { "type": "Contact", "props": { "id": "contact-1", "address": "...", "phone": "...", "email": "..." } },
      { "type": "OrderingCta", "props": { "id": "cta-1", "headline": "...", "subtext": "..." } },
      { "type": "OpeningHours", "props": { "id": "hours-1", "title": "Opening Hours", "days": [{ "day": "Mon-Fri", "hours": "9am-10pm" }] } }
    ],
    "root": { "props": {} }
  },
  "seo": {
    "title": "<under 60 chars>",
    "description": "<under 160 chars>"
  },
  "generatedAt": "${new Date().toISOString()}"
}`;

    const { text } = await generateText({
      model: this.aiRouter.getModel('specialist'),
      prompt: prompt,
    });

    const config: SiteConfig = JSON.parse(
      text
        .trim()
        .replace(/^```json/, '')
        .replace(/```$/, ''),
    );
    config.generatedAt = new Date().toISOString();
    return config;
  }

  private toResponse(site: Site): SiteConfigResponseDto {
    return {
      id: site.id,
      name: site.name,
      type: site.type,
      subdomain: site.subdomain,
      websiteStatus: site.websiteStatus,
      websiteConfig: site.websiteConfig,
      updatedAt: site.updatedAt,
    };
  }
}
