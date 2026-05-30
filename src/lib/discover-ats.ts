import { chromium } from "playwright";
import { COMPANIES } from "./companies";
import * as fs from "fs";

const KNOWN_ATS_DOMAINS = [
  "greenhouse.io",
  "lever.co",
  "myworkdayjobs.com",
  "icims.com",
  "smartrecruiters.com",
  "eightfold.ai",
  "ashbyhq.com",
  "breezy.hr",
  "workable.com"
];

async function discoverATSLinks() {
  console.log("Starting ATS discovery crawler...");
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const updatedCompanies = [];
  
  let i = 0;
  for (const company of COMPANIES) {
    i++;
    // if (i > 15) break; // test first 15

    let finalUrl = company.careers;
    if (!finalUrl) {
      updatedCompanies.push(company);
      continue;
    }
    
    // Check if it's already an ATS link
    if (KNOWN_ATS_DOMAINS.some(d => finalUrl!.includes(d))) {
      updatedCompanies.push(company);
      continue;
    }
    
    console.log(`[${i}/${COMPANIES.length}] Scanning ${company.name}...`);
    const page = await context.newPage();
    try {
      // Go to landing page
      await page.goto(finalUrl, { waitUntil: "domcontentloaded", timeout: 15000 });
      
      // Get all links
      const hrefs = await page.evaluate(() => {
        return Array.from(document.querySelectorAll("a")).map(a => a.href);
      });
      
      let atsLink = null;
      for (const href of hrefs) {
        if (KNOWN_ATS_DOMAINS.some(d => href.includes(d))) {
          atsLink = href;
          break; // Found an ATS link!
        }
      }
      
      if (atsLink) {
        console.log(`  -> Found ATS link for ${company.name}: ${atsLink}`);
        finalUrl = atsLink;
      } else {
        // Also check if there's an iframe containing an ATS
        const iframes = await page.evaluate(() => {
          return Array.from(document.querySelectorAll("iframe")).map(i => i.src);
        });
        for (const src of iframes) {
          if (KNOWN_ATS_DOMAINS.some(d => src.includes(d))) {
            atsLink = src;
            console.log(`  -> Found ATS iframe for ${company.name}: ${atsLink}`);
            finalUrl = atsLink;
            break;
          }
        }
      }
      
    } catch (e: any) {
      console.log(`  -> Failed to scan ${company.name}: ${e.message.split('\n')[0]}`);
    } finally {
      await page.close();
    }
    
    updatedCompanies.push({
      ...company,
      careers: finalUrl
    });
  }
  
  await browser.close();
  
  // Save results
  fs.writeFileSync(
    "src/lib/companies_updated.json", 
    JSON.stringify(updatedCompanies, null, 2)
  );
  console.log("Discovery complete. Saved to companies_updated.json");
}

discoverATSLinks().catch(console.error);
