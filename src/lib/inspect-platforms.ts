import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { chromium } from 'playwright';

// Test one URL per platform to find correct selectors
const testUrls = [
  { platform: 'workday', url: 'https://walmart.wd5.myworkdayjobs.com/en-US/WalmartExternal?locationCountry=c4f78be1a8f14da0ab49ce1162348a5e' },
  { platform: 'darwinbox', url: 'https://upgrad.darwinbox.in/ms/candidatev2/main/careers/allJobs' },
  { platform: 'turbohire', url: 'https://flipkart.turbohire.co/dashboardv2?orgId=4d757ba0-3d57-448a-b82c-238ed87ac90f&type=0' },
  { platform: 'trakstar', url: 'https://medibuddy.hire.trakstar.com/' },
  { platform: 'freshteam', url: 'https://mudrex.freshteam.com/jobs' },
  { platform: 'keka', url: 'https://surveysparrow.keka.com/careers' },
  { platform: 'oraclecloud', url: 'https://jpmc.fa.oraclecloud.com/hcmUI/CandidateExperience/en/sites/CX_1001/jobs?location=India&locationId=300000000289360&locationLevel=country&mode=location' },
  { platform: 'lever', url: 'https://jobs.lever.co/epifi' },
  { platform: 'greenhouse', url: 'https://job-boards.eu.greenhouse.io/groww' },
  { platform: 'eightfold', url: 'https://paypal.eightfold.ai/careers?start=0&location=india&pid=274919648411&sort_by=distance&filter_include_remote=1' },
  { platform: 'smartrecruiters', url: 'https://careers.smartrecruiters.com/Freshworks' },
  { platform: 'zohorecruit', url: 'https://ultrahuman.zohorecruit.in/jobs/Careers' },
];

async function inspectPlatforms() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
  });

  for (const test of testUrls) {
    const page = await context.newPage();
    try {
      console.log(`\n=== ${test.platform.toUpperCase()} ===`);
      console.log(`URL: ${test.url.substring(0, 80)}`);
      await page.goto(test.url, { waitUntil: 'domcontentloaded', timeout: 25000 });
      await page.waitForTimeout(4000);

      const finalUrl = page.url();
      console.log(`Final URL: ${finalUrl.substring(0, 80)}`);

      // Dump key selectors and their counts
      const selectorReport = await page.evaluate(() => {
        const report: Record<string, number> = {};
        const selectors = [
          // Workday
          'li.css-1q2dra3', 'a[data-automation-id="jobTitle"]', 'section[data-automation-id="jobResults"]',
          'li[class*="css-"]', 'a[href*="/job/"]', 'ul[role="list"]',
          // Darwinbox
          '.job-tile', 'ui-job-tile', '.job-title', 'a.action-btn',
          // TurboHire
          'div[class*="jobCard"]', 'div[class*="JobCard"]', 'div.card',
          // Trakstar
          'div.job-post', 'div[class*="opening"]',
          // Freshteam
          'li.job-role', 'div.job-role', 'li[class*="position"]',
          // Keka
          'div[class*="job-card"]', 'div[class*="career-card"]',
          // Oracle
          'a[href*="/jobs/"]', 'a[href*="/requisition"]',
          // Lever
          'a.posting-title', 'div.posting', 'h5[data-qa="posting-name"]',
          // Greenhouse
          'div.opening', 'div.opening a',
          // Eightfold
          'div[class*="position-card"]', 'a[href*="position"]', 'div[class*="position"]',
          // SmartRecruiters
          'li[class*="opening"]', 'article[class*="job"]',
          // ZohoRecruit
          'div[class*="cJobListing"]', 'a[href*="jobdetails"]',
          // Generic
          'a[href*="/jobs/"]', 'a[href*="/careers/"]', 'div[class*="job"]', 'li[class*="job"]',
        ];
        for (const sel of selectors) {
          const count = document.querySelectorAll(sel).length;
          if (count > 0) report[sel] = count;
        }
        return report;
      });

      if (Object.keys(selectorReport).length === 0) {
        console.log('  ⚠️ NO matching selectors found!');
        // Dump first 500 chars of body for inspection
        const bodySnippet = await page.evaluate(() => document.body.innerText.substring(0, 300));
        console.log(`  Body preview: ${bodySnippet.replace(/\n/g, ' ').substring(0, 200)}`);
      } else {
        for (const [sel, count] of Object.entries(selectorReport)) {
          console.log(`  ✅ ${sel}: ${count}`);
        }
      }
    } catch (err: any) {
      console.log(`  ❌ ERROR: ${err.message.substring(0, 80)}`);
    } finally {
      await page.close();
    }
  }

  await browser.close();
  process.exit(0);
}

inspectPlatforms();
