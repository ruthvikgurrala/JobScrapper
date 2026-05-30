import { chromium } from "playwright";

async function scan(url: string, prefix: string) {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  console.log(`Scanning ${prefix}...`);
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.waitForTimeout(5000); // Give SPAs time to fetch and render jobs
  
  const links = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('a')).map(a => ({
      text: a.innerText.replace(/\\n/g, ' ').trim(),
      href: a.href,
      class: a.className
    })).filter(a => a.href && a.text && !a.href.includes('privacy') && !a.href.includes('terms') && !a.href.includes('login'));
  });
  
  console.log(`\n--- ${prefix} Links ---`);
  links.slice(0, 15).forEach(l => console.log(l));
  await browser.close();
}

async function run() {
  await scan("https://upgrad.darwinbox.in/ms/candidatev2/main/careers/allJobs", "Darwinbox");
  await scan("https://intel.wd1.myworkdayjobs.com/External", "Workday");
}
run().catch(console.error);
