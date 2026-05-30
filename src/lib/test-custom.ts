import { chromium } from "playwright";
import { handleAmazon, handleGoogle, handleMeta, handleAtlassian } from "./scraper";

async function runTest() {
  console.log("Testing Custom Handlers...");
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();

  // Test Amazon
  try {
    const page = await context.newPage();
    console.log("Navigating to Amazon...");
    await page.goto("https://www.amazon.jobs", { waitUntil: "domcontentloaded", timeout: 30000 });
    const amazonJobs = await handleAmazon(page);
    console.log(`Amazon Handler found: ${amazonJobs.length} jobs.`);
    if (amazonJobs.length > 0) console.log(amazonJobs[0]);
    await page.close();
  } catch (e: any) {
    console.error("Amazon test failed:", e.message);
  }

  // Test Atlassian
  try {
    const page = await context.newPage();
    console.log("Navigating to Atlassian...");
    await page.goto("https://www.atlassian.com/company/careers", { waitUntil: "domcontentloaded", timeout: 30000 });
    const atlassianJobs = await handleAtlassian(page);
    console.log(`Atlassian Handler found: ${atlassianJobs.length} jobs.`);
    if (atlassianJobs.length > 0) console.log(atlassianJobs[0]);
    await page.close();
  } catch (e: any) {
    console.error("Atlassian test failed:", e.message);
  }

  await browser.close();
}

runTest().catch(console.error);
