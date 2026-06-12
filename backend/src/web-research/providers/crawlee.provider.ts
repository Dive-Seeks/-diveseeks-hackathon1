import { Injectable, Logger } from '@nestjs/common';
import { PlaywrightCrawler, playwrightUtils } from 'crawlee';
import { IBrowserProvider } from './browser-provider.interface';

@Injectable()
export class CrawleeProvider implements IBrowserProvider {
  readonly name = 'crawlee';
  private readonly logger = new Logger(CrawleeProvider.name);

  async isAvailable(): Promise<boolean> {
    try {
      // Crawlee is always available — it runs in-process with the installed Playwright browser
      require('playwright');
      return true;
    } catch {
      return false;
    }
  }

  async search(_query: string): Promise<string[]> {
    // URL discovery handled by SearchApiProvider — Crawlee is scrape-only
    return [];
  }

  async scrape(url: string): Promise<string> {
    const isJustEat =
      url.includes('just-eat.co.uk') || url.includes('just-eat.com');
    const maxChars = isJustEat
      ? 256000
      : parseInt(process.env.BROWSER_MAX_CONTENT_CHARS ?? '8000');
    let result = '';

    const crawler = new PlaywrightCrawler({
      headless: true,
      maxRequestsPerCrawl: 1,
      navigationTimeoutSecs: 60,
      requestHandlerTimeoutSecs: 90,
      browserPoolOptions: {
        useFingerprints: false,
      },
      launchContext: {
        userAgent:
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
      // Block images, fonts, media to speed up — but NOT CSS (needed for layout/lazy load triggers)
      // For Just Eat, do NOT block images since we need to extract their loaded URLs!
      preNavigationHooks: [
        async ({ page }) => {
          if (!isJustEat) {
            await page.route(
              '**/*.{mp4,mp3,ogg,webm,woff,woff2,ttf,eot}',
              (r) => r.abort(),
            );
          } else {
            await page.route(
              '**/*.{mp4,mp3,ogg,webm,woff,woff2,ttf,eot}',
              (r) => r.abort(),
            );
          }
        },
      ],
      requestHandler: async ({ page, log }) => {
        this.logger.log(`[Crawlee] requestHandler started for: ${page.url()}`);

        // Wait for main content to appear
        await page.waitForLoadState('domcontentloaded');

        if (isJustEat) {
          this.logger.log(
            `[Crawlee] Detected Just Eat URL, initializing wait...`,
          );
          await page.waitForTimeout(5000);

          // Accept cookies
          try {
            const cookieButton = await page.$(
              'button[data-test-id="accept-all-cookies-button"], button:has-text("Accept all")',
            );
            if (cookieButton) {
              await cookieButton.click();
              this.logger.log(`[Crawlee] Accepted cookies`);
              await page.waitForTimeout(1000);
            }
          } catch (e) {
            this.logger.log(
              `[Crawlee] Cookie button not found or error: ${e.message}`,
            );
          }

          // Progressive scroll down to load cards
          let scrollAttempts = 0;
          this.logger.log(`[Crawlee] Beginning progressive scroll...`);
          while (scrollAttempts < 30) {
            await page.evaluate(() => window.scrollBy(0, 1200));
            await page.waitForTimeout(300);
            scrollAttempts++;
            const currentCards = await page.evaluate(
              () => document.querySelectorAll('[data-qa="card"]').length,
            );
            this.logger.log(
              `[Crawlee] Scroll attempt ${scrollAttempts}: found ${currentCards} cards`,
            );
            if (currentCards >= 120) break;
          }

          // Scroll through each card individually to trigger image load
          this.logger.log(
            `[Crawlee] Scrolling through cards to trigger image loads...`,
          );
          await page.evaluate(async () => {
            const cards = Array.from(
              document.querySelectorAll('[data-qa="card"]'),
            );
            for (const card of cards) {
              card.scrollIntoView({ block: 'center' });
              await new Promise((resolve) => setTimeout(resolve, 60));
            }
          });
          await page.waitForTimeout(3000);

          // Parse menu items
          this.logger.log(`[Crawlee] Parsing menu items...`);
          const menuItems = await page.evaluate(() => {
            const cards = Array.from(
              document.querySelectorAll('[data-qa="card"]'),
            );
            return cards.map((card) => {
              const nameEl = card.querySelector('[data-qa="item-name"]');
              const name = nameEl?.textContent?.trim() || '';
              const priceEl = card.querySelector('[data-qa="item-price"]');
              const price = priceEl?.textContent?.trim() || '';
              const descEl = card.querySelector(
                '[data-qa="item-description"], [class*="item-description"]',
              );
              const description = descEl?.textContent?.trim() || '';
              const imgEl = card.querySelector('img');
              const image = imgEl ? imgEl.src : null;

              // Category lookup
              let category = 'Unknown';
              const section = card.closest(
                'section, [data-qa="menu-section"], [data-test-id="menu-section"]',
              );
              if (section) {
                const heading = section.querySelector(
                  'h2, h3, [data-qa="section-header"]',
                );
                if (heading && heading.textContent) {
                  category = heading.textContent.trim();
                }
              }
              if (category === 'Unknown' || category === '') {
                let sibling = card.previousElementSibling;
                while (sibling) {
                  const h =
                    sibling.querySelector('h2, h3') ||
                    (sibling.tagName.match(/^H[2-3]$/) ? sibling : null);
                  if (h && h.textContent) {
                    category = h.textContent.trim();
                    break;
                  }
                  sibling = sibling.previousElementSibling;
                }
              }

              return { name, price, description, image, category };
            });
          });

          const validItems = menuItems.filter((item) => item.name !== '');
          this.logger.log(
            `[Crawlee] Found ${validItems.length} valid menu items out of ${menuItems.length} cards`,
          );
          const withImages = validItems.filter((item) => item.image);
          this.logger.log(
            `[Crawlee] Valid items with images: ${withImages.length}`,
          );

          // Format as markdown
          let markdown = `# Just Eat Restaurant Menu\n\n`;
          const itemsByCategory: Record<string, typeof validItems> = {};
          for (const item of validItems) {
            const cat = item.category || 'General';
            if (!itemsByCategory[cat]) itemsByCategory[cat] = [];
            itemsByCategory[cat].push(item);
          }

          for (const [category, items] of Object.entries(itemsByCategory)) {
            markdown += `## ${category}\n\n`;
            for (const item of items) {
              markdown += `### ${item.name}\n`;
              if (item.price) markdown += `- **Price**: ${item.price}\n`;
              if (item.description)
                markdown += `- **Description**: ${item.description}\n`;
              if (item.image) markdown += `- **Image**: ${item.image}\n`;
              markdown += `\n`;
            }
          }

          result = markdown.substring(0, maxChars);
          return;
        }

        // Scroll to trigger lazy-loaded images and infinite-scroll content
        await playwrightUtils.infiniteScroll(page, {
          timeoutSecs: 8,
          waitForSecs: 1,
        });

        // Use Crawlee's Cheerio parser on the fully rendered HTML
        const $ = await playwrightUtils.parseWithCheerio(page);

        // Remove noise nodes
        $(
          'script, style, noscript, iframe, svg, video, audio, [aria-hidden="true"]',
        ).remove();

        // Extract text — prefer main content, fall back to body
        const mainText =
          $('main, [role="main"], article, #content, .content').text() ||
          $('body').text();

        result = mainText.replace(/\s+/g, ' ').trim().substring(0, maxChars);
      },
      failedRequestHandler({ request, log }) {
        log.warning(`Crawlee failed: ${request.url}`);
      },
    });

    try {
      await crawler.run([url]);
    } catch (err) {
      this.logger.warn(
        `[Crawlee] scrape failed for ${url}: ${(err as Error).message}`,
      );
    }

    return result;
  }
}
