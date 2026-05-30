import { chromium } from "playwright";

async function handleDarwinbox(page: any, companyUrl: string): Promise<any[]> {
  const jobs: any[] = [];
  await page.waitForSelector('.job-tile, ui-job-tile, .card', { timeout: 15000 }).catch(() => {});
  
  const tiles = await page.$$(".job-tile, ui-job-tile, .card");
  for (const tile of tiles) {
    const titleEl = await tile.$("span.job-title, .job-title, h3");
    const title = titleEl ? await titleEl.innerText() : "";
    
    // Look for any link
    const linkEl = await tile.$("a.action-btn, a[href*='/job/'], a");
    const href = linkEl ? await linkEl.getAttribute("href") : null;
    
    const locationEl = await tile.$(".location-icon + span, .job-location, .location");
    const location = locationEl ? await locationEl.innerText() : "";
    
    if (href && title) {
      jobs.push({ title: title.trim(), url: new URL(href, companyUrl).toString(), preLocation: location.trim() });
    }
  }
  return jobs;
}

async function run() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();

  console.log("Testing Darwinbox (Delhivery)...");
  const page2 = await context.newPage();
  await page2.goto("https://delhivery.darwinbox.in/ms/candidatev2/main/careers/allJobs", { waitUntil: "domcontentloaded", timeout: 30000 });
  await page2.waitForTimeout(3000);
  const dbJobs = await handleDarwinbox(page2, "https://delhivery.darwinbox.in");
  console.log(`Found ${dbJobs.length} Darwinbox jobs.`);
  if (dbJobs.length > 0) console.log(dbJobs.slice(0, 3));
  await page2.close();

  await browser.close();
}

run().catch(console.error);
