import { chromium } from "playwright";

async function dumpHTML(url: string, name: string) {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  console.log(`Navigating to ${name}...`);
  await page.goto(url, { waitUntil: "networkidle", timeout: 30000 });
  
  const links = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('a')).map(a => ({
      text: a.innerText,
      href: a.href,
      class: a.className
    })).filter(a => a.href && a.text);
  });
  
  console.log(`\n--- ${name} Links ---`);
  links.slice(0, 15).forEach(l => console.log(l));
  
  await browser.close();
}

async function run() {
  await dumpHTML("https://upgrad.darwinbox.in/ms/candidatev2/main/careers/allJobs", "Darwinbox");
  await dumpHTML("https://intel.wd1.myworkdayjobs.com/External", "Workday");
}
run().catch(console.error);
