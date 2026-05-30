import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { chromium } from 'playwright';

async function testFixes() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
  });

  const targets = [
    { name: 'Apollo 24/7 (OracleCloud - with /jobs nav)', url: 'https://cgs.fa.ap2.oraclecloud.com/hcmUI/CandidateExperience/en/sites/CX_2/' },
    { name: 'CRED (SPA heuristic)', url: 'https://careers.cred.club/openings' },
    { name: 'Swiggy (SPA heuristic)', url: 'https://careers.swiggy.com/#/careers?career_page_category=Technology' },
    { name: 'Zomato (SPA heuristic)', url: 'https://www.eternal.com/careers/' },
    { name: 'Myntra (SPA heuristic)', url: 'https://jobs.myntra.com/home' },
  ];

  for (const t of targets) {
    const page = await context.newPage();
    try {
      console.log(`\nTesting: ${t.name}`);
      await page.goto(t.url, { waitUntil: 'domcontentloaded', timeout: 25000 });
      await page.waitForTimeout(4000);
      
      // For Apollo, simulate OracleCloud handler nav
      if (t.name.includes('OracleCloud')) {
        const cur = page.url();
        if (!cur.includes('/jobs')) {
          const jobsUrl = cur.replace(/\/$/, '') + '/jobs';
          console.log(`  Navigating to: ${jobsUrl}`);
          await page.goto(jobsUrl, { waitUntil: 'domcontentloaded', timeout: 20000 }).catch(() => {});
          await page.waitForTimeout(4000);
        }
        const tiles = await page.$$('.job-tile');
        const jobLinks = await page.$$('a[href*="/job/"]');
        console.log(`  .job-tile: ${tiles.length}, a[href*="/job/"]: ${jobLinks.length}`);
      }
      
      // For SPAs, test the Playwright evaluate approach (Strategy 4)
      const spaLinks = await page.evaluate(() => {
        const results: string[] = [];
        const JOB_PATTERNS = ['/jobs/', '/careers/', '/positions/', '/openings/', '/job/', '/apply/'];
        document.querySelectorAll('a[href]').forEach(a => {
          const el = a as HTMLAnchorElement;
          const href = el.href || '';
          const text = el.innerText?.trim() || '';
          if (!text || text.length < 5 || text.length > 200) return;
          if (href.includes('privacy') || href.includes('terms') || href.includes('login') || href.includes('#')) return;
          const lowerHref = href.toLowerCase();
          if (JOB_PATTERNS.some(p => lowerHref.includes(p))) {
            results.push(`${text.split('\n')[0].substring(0, 60)} → ${href.substring(0, 80)}`);
          }
        });
        return results;
      });
      console.log(`  SPA Strategy 4 found: ${spaLinks.length} links`);
      spaLinks.slice(0, 3).forEach(l => console.log(`    ${l}`));
    } catch (err: any) {
      console.log(`  ERROR: ${err.message.substring(0, 80)}`);
    } finally {
      await page.close();
    }
  }

  await browser.close();
  process.exit(0);
}
testFixes();
