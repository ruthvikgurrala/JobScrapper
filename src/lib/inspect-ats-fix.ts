import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { chromium } from 'playwright';

async function inspectATS() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
  });

  const targets = [
    { name: 'Zepto (TalentRecruit)', url: 'https://zepto.talentrecruit.com/career-page' },
    { name: 'Practo (Param.ai)', url: 'https://practo.app.param.ai/jobs/' },
    { name: 'Zetwerk (SenseHQ)', url: 'https://zetwerk.sensehq.com/careers/jobs' },
    { name: 'Infor (Pinpoint)', url: 'https://infor.pinpointhq.com/' },
    { name: 'Apollo 24/7 (OracleCloud)', url: 'https://cgs.fa.ap2.oraclecloud.com/hcmUI/CandidateExperience/en/sites/CX_2/' },
  ];

  for (const t of targets) {
    const page = await context.newPage();
    console.log(`\n${'='.repeat(60)}`);
    console.log(`${t.name}`);
    console.log(`URL: ${t.url}`);
    try {
      await page.goto(t.url, { waitUntil: 'domcontentloaded', timeout: 25000 });
      await page.waitForTimeout(5000); // extra wait for heavy SPAs
      
      const finalUrl = page.url();
      console.log(`Final URL: ${finalUrl}`);

      // Dump ALL elements with class/tag info
      const domReport = await page.evaluate(() => {
        const result: string[] = [];
        
        // Find all links
        const allLinks = document.querySelectorAll('a[href]');
        let jobLinks = 0;
        allLinks.forEach(a => {
          const href = (a as HTMLAnchorElement).href.toLowerCase();
          const text = (a as HTMLElement).innerText?.trim().substring(0, 80) || '';
          if (href.includes('job') || href.includes('position') || href.includes('career') || href.includes('opening') || href.includes('requisition')) {
            if (jobLinks < 5) result.push(`  LINK: "${text}" → ${href.substring(0, 100)}`);
            jobLinks++;
          }
        });
        result.push(`  Total job-related links: ${jobLinks}`);

        // Check common container selectors
        const checks = [
          'div[class*="job"]', 'li[class*="job"]', 'div[class*="position"]',
          'div[class*="career"]', 'div[class*="opening"]', 'div[class*="listing"]',
          'div[class*="card"]', 'tr[class*="job"]', 'div[class*="vacancy"]',
          'article', 'section[class*="job"]',
          '.job-tile', '.job-card', '.job-title', '.posting',
          'a.posting-title', 'div.posting',
          // Specific ATS patterns
          'div[class*="JobCard"]', 'div[class*="requisition"]',
          'mat-card', 'app-job-card', 'div[role="listitem"]',
        ];
        
        for (const sel of checks) {
          const count = document.querySelectorAll(sel).length;
          if (count > 0) {
            const first = document.querySelector(sel);
            const tag = first?.tagName;
            const cls = (first as HTMLElement)?.className?.substring(0, 60);
            result.push(`  SEL [${count}]: ${sel} → <${tag} class="${cls}">`);
          }
        }
        
        // Body text snippet
        const bodyText = document.body.innerText.substring(0, 300).replace(/\n/g, ' | ');
        result.push(`  BODY: ${bodyText}`);
        
        return result.join('\n');
      });

      console.log(domReport);
    } catch (err: any) {
      console.log(`  ERROR: ${err.message.substring(0, 80)}`);
    } finally {
      await page.close();
    }
  }

  await browser.close();
  process.exit(0);
}
inspectATS();
