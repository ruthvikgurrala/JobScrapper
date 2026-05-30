import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { chromium } from 'playwright';

async function testWorkday() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
  });
  const page = await context.newPage();
  
  const urls = [
    { name: 'Walmart', url: 'https://walmart.wd5.myworkdayjobs.com/en-US/WalmartExternal?locationCountry=c4f78be1a8f14da0ab49ce1162348a5e' },
    { name: 'Sprinklr', url: 'https://sprinklr.wd1.myworkdayjobs.com/careers' },
  ];

  for (const test of urls) {
    console.log(`\n=== Testing ${test.name} (Workday) ===`);
    await page.goto(test.url, { waitUntil: 'domcontentloaded', timeout: 25000 });
    await page.waitForSelector('section[data-automation-id="jobResults"], li[class*="css-"]', { timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(3000);
    
    const items = await page.$$('li[class*="css-"]');
    console.log(`Found ${items.length} li[class*="css-"] elements`);
    
    let jobCount = 0;
    for (const item of items) {
      const titleEl = await item.$("a[data-automation-id='jobTitle']");
      if (!titleEl) continue;
      const title = await titleEl.innerText().catch(() => '');
      const href = await titleEl.getAttribute('href').catch(() => null);
      if (title && href) {
        jobCount++;
        if (jobCount <= 3) console.log(`  Job: ${title} → ${href.substring(0, 60)}`);
      }
    }
    console.log(`Total Workday jobs extracted: ${jobCount}`);
  }

  await browser.close();
  process.exit(0);
}
testWorkday();
