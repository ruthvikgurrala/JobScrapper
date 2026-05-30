import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { chromium } from 'playwright';
import { COMPANIES } from './companies';

async function fullAudit() {
  console.log(`Full audit of ${COMPANIES.length} companies...\n`);
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
  });

  const ok: string[] = [];
  const fail: string[] = [];
  const errors: string[] = [];
  const noUrl: string[] = [];

  for (let i = 0; i < COMPANIES.length; i++) {
    const company = COMPANIES[i];
    const idx = `[${i+1}/${COMPANIES.length}]`;

    if (!company.careers) {
      noUrl.push(company.name);
      console.log(`${idx} ${company.name}: SKIP (no URL)`);
      continue;
    }

    const page = await context.newPage();
    try {
      await page.goto(company.careers, { waitUntil: 'domcontentloaded', timeout: 20000 });
      await page.waitForTimeout(2500);
      const finalUrl = page.url();

      // Detect platform
      let platform = 'heuristic';
      if (finalUrl.includes('darwinbox')) platform = 'darwinbox';
      else if (finalUrl.includes('myworkdayjobs')) platform = 'workday';
      else if (finalUrl.includes('lever.co')) platform = 'lever';
      else if (finalUrl.includes('greenhouse.io')) platform = 'greenhouse';
      else if (finalUrl.includes('oraclecloud')) platform = 'oraclecloud';
      else if (finalUrl.includes('turbohire')) platform = 'turbohire';
      else if (finalUrl.includes('trakstar')) platform = 'trakstar';
      else if (finalUrl.includes('freshteam')) platform = 'freshteam';
      else if (finalUrl.includes('keka')) platform = 'keka';
      else if (finalUrl.includes('linkedin.com')) platform = 'linkedin';
      else if (finalUrl.includes('zohorecruit')) platform = 'zohorecruit';
      else if (finalUrl.includes('sensehq')) platform = 'sensehq';
      else if (finalUrl.includes('eightfold')) platform = 'eightfold';
      else if (finalUrl.includes('smartrecruiters')) platform = 'smartrecruiters';
      else if (finalUrl.includes('param.ai')) platform = 'paramai';
      else if (finalUrl.includes('turbohire')) platform = 'turbohire';
      else if (finalUrl.includes('pinpointhq')) platform = 'pinpoint';
      else if (finalUrl.includes('talentrecruit')) platform = 'talentrecruit';
      else if (finalUrl.includes('pyjamahr')) platform = 'pyjamahr';
      else if (finalUrl.includes('gem.com')) platform = 'gem';
      else if (finalUrl.includes('kula.ai')) platform = 'kula';

      // Count job-like elements using platform-specific + generic selectors
      const jobCount = await page.evaluate(() => {
        const selectors = [
          // Workday
          'a[data-automation-id="jobTitle"]',
          // Darwinbox
          '.job-tile', 'ui-job-tile',
          // Oracle Cloud
          '.job-tile',
          // Lever
          'a.posting-title', 'div.posting',
          // Greenhouse  
          'div.opening a',
          // TurboHire / Trakstar
          'div[class*="opening"]',
          // Freshteam
          '.job-title',
          // Keka
          'a[href*="jobdetails"]',
          // Eightfold
          'div[class*="jobCard"]',
          // SmartRecruiters
          'li[class*="opening"]',
          // Generic fallbacks
          'a[href*="/jobs/"]', 'a[href*="/job/"]',
          'div[class*="job-card"]', 'div[class*="job-listing"]',
          'div[class*="position"]',
          'a[href*="/careers/"]',
          'div[class*="job"]', 'li[class*="job"]',
        ];
        let total = 0;
        const seen = new Set();
        for (const sel of selectors) {
          document.querySelectorAll(sel).forEach(el => {
            if (!seen.has(el)) { seen.add(el); total++; }
          });
        }
        return total;
      });

      if (jobCount > 0) {
        ok.push(`${company.name} [${platform}] (${jobCount})`);
        console.log(`${idx} ✅ ${company.name}: ${platform} → ${jobCount} elements`);
      } else {
        fail.push(`${company.name} [${platform}]`);
        console.log(`${idx} ❌ ${company.name}: ${platform} → 0 elements`);
      }
    } catch (err: any) {
      errors.push(`${company.name}: ${err.message.substring(0, 60)}`);
      console.log(`${idx} 💥 ${company.name}: ERROR - ${err.message.substring(0, 60)}`);
    } finally {
      await page.close();
    }
  }

  console.log(`\n${'='.repeat(70)}`);
  console.log(`FULL AUDIT COMPLETE`);
  console.log(`${'='.repeat(70)}`);
  console.log(`✅ Working: ${ok.length}`);
  console.log(`❌ No jobs found: ${fail.length}`);
  console.log(`💥 Errors: ${errors.length}`);
  console.log(`⏭️  No URL: ${noUrl.length}`);
  console.log(`\n--- FAILED (0 elements) ---`);
  fail.forEach(f => console.log(`  ${f}`));
  console.log(`\n--- ERRORS ---`);
  errors.forEach(e => console.log(`  ${e}`));
  console.log(`\n--- NO URL ---`);
  noUrl.forEach(n => console.log(`  ${n}`));

  await browser.close();
  process.exit(0);
}

fullAudit();
