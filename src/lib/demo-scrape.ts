import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { scrapeJobs } from "./scraper";

async function runDemo() {
  console.log("Starting demo scrape (First 5 companies)...");
  try {
    const scraped = await scrapeJobs(5);
    console.log(`Demo completed. Scraped ${scraped} jobs.`);
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

runDemo();
