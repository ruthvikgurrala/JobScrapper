import { chromium } from "playwright";

async function testStealth() {
  console.log("Launching browser...");
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
  });

  // Apply stealth manually
  await context.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => false });
    Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
    Object.defineProperty(navigator, 'languages', { get: () => ['en-US', 'en'] });
    (window as any).chrome = { runtime: {} } as any;
  });

  const page = await context.newPage();
  
  const testUrl = "https://careers.cred.club/openings";
  console.log(`Testing WAF bypass on: ${testUrl}`);
  
  try {
    await page.goto(testUrl, { waitUntil: "domcontentloaded", timeout: 15000 });
    await page.waitForTimeout(3000); // let SPA hydrate
    
    const bodyText = await page.evaluate(() => document.body.innerText || "");
    
    if (bodyText.length < 100) {
       console.log("FAIL: Page returned blank or blocked.");
       console.log("Body snippet:", bodyText);
    } else {
       console.log("SUCCESS: Page loaded successfully!");
       console.log("Body snippet:", bodyText.substring(0, 200).replace(/\n/g, ' '));
    }
  } catch (err: any) {
    console.error("Error:", err.message);
  } finally {
    await browser.close();
  }
}

testStealth();
