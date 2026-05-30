import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { chromium } from 'playwright';
import { COMPANIES } from './companies';

async function auditHandlers() {
  console.log(`Auditing ${COMPANIES.length} companies...\n`);
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
  });

  const results: { name: string; url: string; platform: string; status: string }[] = [];
  
  // Only test first 15 to get a quick picture
  const testCompanies = COMPANIES.slice(0, 15);

  for (const company of testCompanies) {
    if (!company.careers) {
      results.push({ name: company.name, url: 'NONE', platform: 'N/A', status: 'NO_URL' });
      continue;
    }

    const page = await context.newPage();
    try {
      await page.goto(company.careers, { waitUntil: 'domcontentloaded', timeout: 20000 });
      await page.waitForTimeout(2000);
      const finalUrl = page.url();
      
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
      
      // Count any visible job-related elements
      const jobCount = await page.evaluate(() => {
        const selectors = [
          'a[href*="/jobs/"]', 'a[href*="/job/"]', 'a[href*="/careers/"]',
          'div[class*="job"]', 'li[class*="job"]', 'div[class*="opening"]',
          'div[class*="position"]', '.job-tile', '.job-card', '.job-title',
          'a[href*="requisition"]', 'a.posting-title'
        ];
        let total = 0;
        for (const sel of selectors) {
          total += document.querySelectorAll(sel).length;
        }
        return total;
      });

      const status = jobCount > 0 ? `OK (${jobCount} elements)` : 'NO_JOBS_FOUND';
      results.push({ name: company.name, url: company.careers.substring(0, 60), platform, status });
      console.log(`${company.name}: ${platform} → ${status}`);
    } catch (err: any) {
      results.push({ name: company.name, url: company.careers.substring(0, 60), platform: '?', status: `ERROR: ${err.message.substring(0, 50)}` });
      console.log(`${company.name}: ERROR - ${err.message.substring(0, 60)}`);
    } finally {
      await page.close();
    }
  }

  await browser.close();
  
  console.log('\n=== AUDIT RESULTS ===');
  console.log('Name | Platform | Status');
  console.log('-'.repeat(80));
  for (const r of results) {
    console.log(`${r.name.padEnd(25)} | ${r.platform.padEnd(15)} | ${r.status}`);
  }
  
  process.exit(0);
}

auditHandlers();
