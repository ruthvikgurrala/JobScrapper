import { chromium, Page } from "playwright";
import * as cheerio from "cheerio";
import { adminDb } from "./firebase/admin";
import { COMPANIES } from "./companies";

const ROLE_KEYWORDS = [
  "software engineer", "sde", "backend", "frontend", "fullstack",
  "data scientist", "data engineer", "machine learning", "devops",
  "cloud engineer", "developer", "programmer", "system engineer",
  "site reliability", "sre", "android", "ios", "mobile engineer"
];

const INDIA_LOCATIONS = [
  "india", "remote", "bengaluru", "bangalore", "hyderabad", "pune",
  "mumbai", "delhi", "gurgaon", "gurugram", "noida", "chennai", "kolkata"
];

const TECH_SKILLS = [
  "react", "node", "python", "java", "c++", "c#", "golang", "go",
  "aws", "azure", "gcp", "sql", "nosql", "mongodb", "postgresql",
  "docker", "kubernetes", "typescript", "javascript", "spring boot",
  "django", "flask", "ruby", "rails", "php", "laravel", "machine learning", "ai", "llm"
];

function extractYOE(text: string): string {
  const match = text.match(/(\d+)\+?\s*(?:to|-)?\s*(\d+)?\s*(?:\+)?\s*years?(?:\s+of)?\s+(?:hands-on\s+)?experience/i);
  if (match) {
    if (match[2]) return `${match[1]}-${match[2]} years`;
    return `${match[1]}+ years`;
  }
  
  const match2 = text.match(/experience.{0,20}(\d+)\+?\s*(?:to|-)?\s*(\d+)?\s*(?:\+)?\s*years?/i);
  if (match2) {
    if (match2[2]) return `${match2[1]}-${match2[2]} years`;
    return `${match2[1]}+ years`;
  }
  
  return "Not Specified";
}

function extractSkills(text: string, title: string): string[] {
  const lowerText = text.toLowerCase();
  const lowerTitle = title.toLowerCase();
  const foundSkills = new Set<string>();
  
  // Extract explicit skills
  for (const skill of TECH_SKILLS) {
    const regex = new RegExp(`\\b${skill.replace('+', '\\+')}\\b`, 'i');
    if (regex.test(lowerText)) foundSkills.add(skill);
  }
  
  // Skill Inference based on title
  if (foundSkills.size === 0) {
    if (lowerTitle.includes("frontend") || lowerTitle.includes("ui") || lowerTitle.includes("react")) {
      foundSkills.add("javascript"); foundSkills.add("react"); foundSkills.add("html/css");
    } else if (lowerTitle.includes("backend") || lowerTitle.includes("server")) {
      foundSkills.add("node.js"); foundSkills.add("python"); foundSkills.add("sql");
    } else if (lowerTitle.includes("data") || lowerTitle.includes("machine learning")) {
      foundSkills.add("python"); foundSkills.add("sql"); foundSkills.add("machine learning");
    } else if (lowerTitle.includes("devops") || lowerTitle.includes("sre") || lowerTitle.includes("cloud")) {
      foundSkills.add("aws"); foundSkills.add("docker"); foundSkills.add("kubernetes");
    } else {
      foundSkills.add("software development");
    }
  }
  
  return Array.from(foundSkills);
}

function checkLocation(text: string, fallbackUrl?: string): string | null {
  const lowerText = text.toLowerCase();
  let foundLocation = null;
  for (const loc of INDIA_LOCATIONS) {
    if (lowerText.includes(loc)) {
      foundLocation = loc.charAt(0).toUpperCase() + loc.slice(1);
      break;
    }
  }
  
  // If text parsing fails, check URL for clues (some ATS put location in url)
  if (!foundLocation && fallbackUrl && fallbackUrl.toLowerCase().includes("india")) {
    foundLocation = "India";
  }
  
  return foundLocation;
}

// ---------------- ATS ROUTING ENGINE ----------------

async function handleGreenhouse(page: Page, companyUrl: string): Promise<any[]> {
  const jobs: any[] = [];
  // Greenhouse confirmed: a[href*="/jobs/"] (13), div[class*="job"] (13)
  await page.waitForSelector('div.opening, a[href*="/jobs/"], div[class*="job"]', { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(2000);
  
  // Primary: standard Greenhouse opening divs
  const openings = await page.$$('div.opening a, a[href*="/jobs/"]');
  for (const link of openings) {
    const title = await link.innerText().catch(() => '');
    const href = await link.getAttribute('href').catch(() => null);
    const locationEl = await link.$('span.location');
    const location = locationEl ? await locationEl.innerText().catch(() => '') : '';
    
    if (href && title.trim().length > 3) {
      jobs.push({ title: title.split('\n')[0].trim(), url: new URL(href, companyUrl).toString(), preLocation: location });
    }
  }
  return dedupeJobs(jobs);
}

async function handleLever(page: Page, companyUrl: string): Promise<any[]> {
  const jobs: any[] = [];
  const links = await page.$$("div.posting a.posting-title");
  
  for (const link of links) {
    const titleEl = await link.$("h5[data-qa='posting-name']");
    const title = titleEl ? await titleEl.innerText() : "";
    const href = await link.getAttribute("href");
    const locationEl = await link.$("span.sort-by-location");
    const location = locationEl ? await locationEl.innerText() : "";
    
    if (href && title && ROLE_KEYWORDS.some(kw => title.toLowerCase().includes(kw))) {
      jobs.push({ title, url: new URL(href, companyUrl).toString(), preLocation: location });
    }
  }
  return jobs;
}

async function handleHeuristic(page: Page, companyUrl: string): Promise<any[]> {
  const html = await page.content();
  const $ = cheerio.load(html);
  const jobLinksToVisit: any[] = [];
  const JOB_URL_PATTERNS = ['/jobs/', '/careers/', '/positions/', '/openings/', '/job-detail/', '/requisition/', '/job/', '/apply/', '/vacancy/'];
  
  // Strategy 1: Scan all links for role keywords in text
  $("a").each((_, el) => {
    const text = $(el).text().trim();
    const href = $(el).attr("href");
    if (!text || !href || href.includes("privacy") || href.includes("terms") || href.includes("login")) return;
    const matchedRoles = ROLE_KEYWORDS.filter(kw => text.toLowerCase().includes(kw));
    if (matchedRoles.length > 0) {
      const fullUrl = href.startsWith("http") ? href : new URL(href, companyUrl).toString();
      if (!jobLinksToVisit.some(j => j.url === fullUrl)) {
        jobLinksToVisit.push({ title: text.split('\n')[0].trim(), url: fullUrl });
      }
    }
  });

  // Strategy 2: Scan links whose href looks like a job detail URL
  $("a[href]").each((_, el) => {
    const href = $(el).attr("href") || '';
    const text = $(el).text().trim() || $(el).closest('div, li, article').text().trim();
    if (!text || text.length < 5 || text.length > 200) return;
    const lowerHref = href.toLowerCase();
    if (JOB_URL_PATTERNS.some(p => lowerHref.includes(p))) {
      const fullUrl = href.startsWith("http") ? href : new URL(href, companyUrl).toString();
      if (!jobLinksToVisit.some(j => j.url === fullUrl) && !fullUrl.includes("privacy") && !fullUrl.includes("terms")) {
        jobLinksToVisit.push({ title: text.split('\n')[0].trim(), url: fullUrl });
      }
    }
  });

  // Strategy 3: Scan job-card-like containers (div, li, article) that contain links
  $('div[class*="job"], li[class*="job"], article[class*="job"], div[class*="career"], div[class*="opening"], div[class*="position"]').each((_, el) => {
    const link = $(el).find('a[href]').first();
    const href = link.attr('href');
    const title = link.text().trim() || $(el).find('h3, h4, h5, span[class*="title"]').first().text().trim();
    if (title && href && title.length > 3) {
      const fullUrl = href.startsWith("http") ? href : new URL(href, companyUrl).toString();
      if (!jobLinksToVisit.some(j => j.url === fullUrl)) {
        jobLinksToVisit.push({ title: title.split('\n')[0].trim(), url: fullUrl });
      }
    }
  });

  // Strategy 4: For SPAs that render client-side, use Playwright's JS evaluation
  // This catches React/Angular pages where Cheerio sees empty HTML but the real DOM has content
  if (jobLinksToVisit.length === 0) {
    const spaLinks = await page.evaluate(() => {
      const results: {title: string, url: string}[] = [];
      const JOB_PATTERNS = ['/jobs/', '/careers/', '/positions/', '/openings/', '/job/', '/apply/', '/vacancy/', '/job-detail/'];
      document.querySelectorAll('a[href]').forEach(a => {
        const el = a as HTMLAnchorElement;
        const href = el.href || '';
        const text = el.innerText?.trim() || '';
        if (!text || text.length < 5 || text.length > 200) return;
        if (href.includes('privacy') || href.includes('terms') || href.includes('login') || href.includes('#')) return;
        const lowerHref = href.toLowerCase();
        if (JOB_PATTERNS.some(p => lowerHref.includes(p))) {
          results.push({ title: text.split('\n')[0].trim(), url: href });
        }
      });
      return results;
    }).catch(() => []);
    for (const link of spaLinks) {
      if (link.title && link.url && !jobLinksToVisit.some(j => j.url === link.url)) {
        jobLinksToVisit.push(link);
      }
    }
  }

  return jobLinksToVisit;
}

async function handleWorkday(page: Page, companyUrl: string): Promise<any[]> {
  const jobs: any[] = [];
  // Wait for Workday's SPA to render job results
  await page.waitForSelector('section[data-automation-id="jobResults"], li[class*="css-"]', { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(2000);
  
  // Workday uses dynamic CSS class names, so match by pattern
  const items = await page.$$('li[class*="css-"]');
  for (const item of items) {
    const titleEl = await item.$("a[data-automation-id='jobTitle']");
    if (!titleEl) continue;
    const title = await titleEl.innerText().catch(() => '');
    const href = await titleEl.getAttribute("href").catch(() => null);
    
    // Location can be in dd or span elements
    const locationEl = await item.$('dd[class*="css-"], span[class*="css-"]');
    const location = locationEl ? await locationEl.innerText().catch(() => '') : '';
    
    if (href && title) {
      jobs.push({ title: title.trim(), url: new URL(href, companyUrl).toString(), preLocation: location.trim() });
    }
  }
  return dedupeJobs(jobs);
}

async function handleDarwinbox(page: Page, companyUrl: string): Promise<any[]> {
  const jobs: any[] = [];
  // Darwinbox uses Angular components, wait for cards to render
  await page.waitForSelector('.job-tile, ui-job-tile, div.card, div[class*="job"]', { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(2000);
  
  const tiles = await page.$$('.job-tile, ui-job-tile, div.card');
  for (const tile of tiles) {
    const titleEl = await tile.$('span.job-title, .job-title, h3, h4, a');
    const title = titleEl ? await titleEl.innerText().catch(() => '') : '';
    
    const linkEl = await tile.$('a.action-btn, a[href*="/job/"], a[href*="/careers/"], a[href]');
    const href = linkEl ? await linkEl.getAttribute('href').catch(() => null) : null;
    
    const locationEl = await tile.$('.location-icon + span, .job-location, span[class*="location"]');
    const location = locationEl ? await locationEl.innerText().catch(() => '') : '';
    
    if (href && title && title.length > 3) {
      jobs.push({ title: title.trim(), url: new URL(href, companyUrl).toString(), preLocation: location.trim() });
    }
  }
  return dedupeJobs(jobs);
}

// ---------------- NEW ATS PLATFORM HANDLERS ----------------

async function handleOracleCloud(page: Page, companyUrl: string): Promise<any[]> {
  const jobs: any[] = [];
  // Oracle Cloud HCM is a heavy SPA, needs extra wait
  // If we landed on a portal home page (not /jobs), navigate to /jobs
  const currentUrl = page.url();
  if (!currentUrl.includes('/jobs')) {
    const jobsUrl = currentUrl.replace(/\/$/, '') + '/jobs';
    await page.goto(jobsUrl, { waitUntil: 'domcontentloaded', timeout: 20000 }).catch(() => {});
  }
  await page.waitForSelector('.job-tile, a[href*="/job/"], li[class*="job"]', { timeout: 20000 }).catch(() => {});
  await page.waitForTimeout(4000);
  
  // Primary: .job-tile elements (confirmed working on JPMC, Dell, Icertis)
  const tiles = await page.$$('.job-tile');
  for (const tile of tiles) {
    const linkEl = await tile.$('a[href*="/job/"]');
    const href = linkEl ? await linkEl.getAttribute('href').catch(() => null) : null;
    const title = linkEl ? await linkEl.innerText().catch(() => '') : '';
    const locEl = await tile.$('span[class*="location"], div[class*="location"]');
    const loc = locEl ? await locEl.innerText().catch(() => '') : '';
    if (href && title.trim().length > 3) {
      jobs.push({ title: title.trim(), url: new URL(href, companyUrl).toString(), preLocation: loc.trim() });
    }
  }
  
  // Fallback: direct links
  if (jobs.length === 0) {
    const links = await page.$$('a[href*="/job/"]');
    for (const link of links) {
      const title = await link.innerText().catch(() => '');
      const href = await link.getAttribute('href').catch(() => null);
      if (href && title.trim().length > 3) {
        jobs.push({ title: title.split('\n')[0].trim(), url: new URL(href, companyUrl).toString() });
      }
    }
  }
  return dedupeJobs(jobs);
}

async function handleTurboHire(page: Page, companyUrl: string): Promise<any[]> {
  const jobs: any[] = [];
  await page.waitForSelector('div[class*="job"], div[class*="card"], a[href*="job"]', { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(3000);
  const cards = await page.$$('div[class*="jobCard"], div[class*="job-card"], div[class*="JobCard"], tr[class*="job"], div.card');
  for (const card of cards) {
    const titleEl = await card.$('a, h3, h4, span[class*="title"], div[class*="title"]');
    const title = titleEl ? await titleEl.innerText().catch(() => '') : '';
    const linkEl = await card.$('a[href]');
    const href = linkEl ? await linkEl.getAttribute('href').catch(() => null) : null;
    const locEl = await card.$('span[class*="location"], div[class*="location"]');
    const loc = locEl ? await locEl.innerText().catch(() => '') : '';
    if (title && href) {
      jobs.push({ title: title.trim(), url: new URL(href, companyUrl).toString(), preLocation: loc.trim() });
    }
  }
  return dedupeJobs(jobs);
}

async function handleTrakstar(page: Page, companyUrl: string): Promise<any[]> {
  const jobs: any[] = [];
  // Trakstar confirmed: div[class*="opening"] (51 elements), a[href*="/jobs/"] (25 elements)
  await page.waitForSelector('div[class*="opening"], a[href*="/jobs/"]', { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(2000);
  const cards = await page.$$('div[class*="opening"]');
  for (const card of cards) {
    const linkEl = await card.$('a[href*="/jobs/"]');
    const href = linkEl ? await linkEl.getAttribute('href').catch(() => null) : null;
    const title = linkEl ? await linkEl.innerText().catch(() => '') : '';
    const locEl = await card.$('span[class*="location"], div[class*="location"], span[class*="dept"]');
    const loc = locEl ? await locEl.innerText().catch(() => '') : '';
    if (title.trim().length > 3 && href) {
      jobs.push({ title: title.trim(), url: new URL(href, companyUrl).toString(), preLocation: loc.trim() });
    }
  }
  return dedupeJobs(jobs);
}

async function handleFreshteam(page: Page, companyUrl: string): Promise<any[]> {
  const jobs: any[] = [];
  // Freshteam confirmed: .job-title (5), a[href*="/jobs/"] (5), div[class*="job"] (28)
  await page.waitForSelector('.job-title, a[href*="/jobs/"], div[class*="job"]', { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(2000);
  const links = await page.$$('a[href*="/jobs/"]');
  for (const link of links) {
    const title = await link.innerText().catch(() => '');
    const href = await link.getAttribute('href').catch(() => null);
    if (title.trim().length > 3 && href) {
      jobs.push({ title: title.trim(), url: new URL(href, companyUrl).toString() });
    }
  }
  // Fallback: look in job containers
  if (jobs.length === 0) {
    const cards = await page.$$('div[class*="job"]');
    for (const card of cards) {
      const titleEl = await card.$('.job-title, a, h5');
      const title = titleEl ? await titleEl.innerText().catch(() => '') : '';
      const linkEl = await card.$('a[href]');
      const href = linkEl ? await linkEl.getAttribute('href').catch(() => null) : null;
      if (title.trim().length > 3 && href) {
        jobs.push({ title: title.trim(), url: new URL(href, companyUrl).toString() });
      }
    }
  }
  return dedupeJobs(jobs);
}

async function handleKeka(page: Page, companyUrl: string): Promise<any[]> {
  const jobs: any[] = [];
  // Keka confirmed: div[class*="position"] (2), a[href*="jobdetails"] (1), div[class*="job"] (2)
  await page.waitForSelector('div[class*="position"], a[href*="jobdetails"], div[class*="job"]', { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(3000);
  // Try jobdetails links first
  const detailLinks = await page.$$('a[href*="jobdetails"]');
  for (const link of detailLinks) {
    const title = await link.innerText().catch(() => '');
    const href = await link.getAttribute('href').catch(() => null);
    if (title.trim().length > 3 && href) {
      jobs.push({ title: title.trim(), url: new URL(href, companyUrl).toString() });
    }
  }
  // Fallback: position/job containers
  if (jobs.length === 0) {
    const cards = await page.$$('div[class*="position"], div[class*="job"]');
    for (const card of cards) {
      const linkEl = await card.$('a[href]');
      const href = linkEl ? await linkEl.getAttribute('href').catch(() => null) : null;
      const titleEl = await card.$('a, h3, h4, span[class*="title"]');
      const title = titleEl ? await titleEl.innerText().catch(() => '') : '';
      if (title.trim().length > 3 && href) {
        jobs.push({ title: title.trim(), url: new URL(href, companyUrl).toString() });
      }
    }
  }
  return dedupeJobs(jobs);
}

async function handleLinkedIn(page: Page, companyUrl: string): Promise<any[]> {
  // LinkedIn aggressively blocks headless browsers. Best-effort attempt.
  const jobs: any[] = [];
  await page.waitForSelector('a[href*="/jobs/view/"], div.job-card', { timeout: 10000 }).catch(() => {});
  const cards = await page.$$('a[href*="/jobs/view/"]');
  for (const card of cards) {
    const title = await card.innerText().catch(() => '');
    const href = await card.getAttribute('href').catch(() => null);
    if (title && href) {
      jobs.push({ title: title.split('\n')[0].trim(), url: new URL(href, 'https://www.linkedin.com').toString() });
    }
  }
  return dedupeJobs(jobs);
}

async function handleZohoRecruit(page: Page, companyUrl: string): Promise<any[]> {
  const jobs: any[] = [];
  await page.waitForSelector('div[class*="job"], a[href*="jobdetails"]', { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(3000);
  const cards = await page.$$('div[class*="cJobListing"], tr[class*="job"], div[class*="job-row"], a[href*="jobdetails"]');
  for (const card of cards) {
    const titleEl = await card.$('a, span[class*="title"], td[class*="title"]');
    const title = titleEl ? await titleEl.innerText().catch(() => '') : '';
    const linkEl = await card.$('a[href]');
    const href = linkEl ? await linkEl.getAttribute('href').catch(() => null) : null;
    if (title && href) {
      jobs.push({ title: title.trim(), url: new URL(href, companyUrl).toString() });
    }
  }
  return dedupeJobs(jobs);
}

async function handleSenseHQ(page: Page, companyUrl: string): Promise<any[]> {
  const jobs: any[] = [];
  // SenseHQ is an Angular SPA — needs extended wait for JS rendering
  await page.waitForTimeout(6000);
  // Extract jobs via JS evaluation since DOM is dynamically rendered
  const extracted = await page.evaluate(() => {
    const results: {title: string, url: string}[] = [];
    // Try all clickable job elements
    document.querySelectorAll('a[href], div[role="link"], tr, li').forEach(el => {
      const text = (el as HTMLElement).innerText?.trim() || '';
      const href = (el as HTMLAnchorElement).href || '';
      if (text.length > 5 && text.length < 150 && (href.includes('job') || href.includes('career') || href.includes('position'))) {
        results.push({ title: text.split('\n')[0].trim(), url: href });
      }
    });
    return results;
  });
  for (const item of extracted) {
    if (item.title && item.url) jobs.push(item);
  }
  return dedupeJobs(jobs);
}

async function handleKula(page: Page, companyUrl: string): Promise<any[]> {
  const jobs: any[] = [];
  await page.waitForSelector('div[class*="job"], a[href*="job"]', { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(3000);
  const cards = await page.$$('div[class*="job-card"], div[class*="opening"], li[class*="job"]');
  for (const card of cards) {
    const titleEl = await card.$('a, h3, h4, span[class*="title"]');
    const title = titleEl ? await titleEl.innerText().catch(() => '') : '';
    const linkEl = await card.$('a[href]');
    const href = linkEl ? await linkEl.getAttribute('href').catch(() => null) : null;
    if (title && href) {
      jobs.push({ title: title.trim(), url: new URL(href, companyUrl).toString() });
    }
  }
  return dedupeJobs(jobs);
}

async function handlePinpoint(page: Page, companyUrl: string): Promise<any[]> {
  const jobs: any[] = [];
  await page.waitForSelector('a[class*="job"], li[class*="job"], div[class*="job"]', { timeout: 15000 }).catch(() => {});
  const cards = await page.$$('a[class*="job"], li[class*="job"], div[class*="vacancy"]');
  for (const card of cards) {
    const titleEl = await card.$('h3, h4, span[class*="title"], a');
    const title = titleEl ? await titleEl.innerText().catch(() => '') : await card.innerText().catch(() => '');
    const linkEl = await card.$('a[href]');
    const href = linkEl ? await linkEl.getAttribute('href').catch(() => null) : await card.getAttribute('href').catch(() => null);
    if (title && href) {
      jobs.push({ title: title.split('\n')[0].trim(), url: new URL(href, companyUrl).toString() });
    }
  }
  return dedupeJobs(jobs);
}

async function handleTalentRecruit(page: Page, companyUrl: string): Promise<any[]> {
  const jobs: any[] = [];
  // TalentRecruit is a pure SPA — needs extended wait for React hydration
  await page.waitForTimeout(8000);
  // Try to find any rendered job elements after hydration
  const extracted = await page.evaluate(() => {
    const results: {title: string, url: string}[] = [];
    document.querySelectorAll('a[href], div[class*="job"], div[class*="card"], tr').forEach(el => {
      const text = (el as HTMLElement).innerText?.trim() || '';
      const href = (el as HTMLAnchorElement).href || el.querySelector('a')?.href || '';
      if (text.length > 5 && text.length < 150 && href && !href.includes('login') && !href.includes('privacy')) {
        results.push({ title: text.split('\n')[0].trim(), url: href });
      }
    });
    return results;
  });
  for (const item of extracted) {
    if (item.title && item.url) jobs.push(item);
  }
  return dedupeJobs(jobs);
}

async function handleEightfold(page: Page, companyUrl: string): Promise<any[]> {
  const jobs: any[] = [];
  // Eightfold confirmed: div[class*="jobCard"] (10), a[href*="/job/"] (20)
  await page.waitForSelector('div[class*="jobCard"], a[href*="/job/"], div[class*="position"]', { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(3000);
  
  // Primary: jobCard containers
  const cards = await page.$$('div[class*="jobCard"]');
  for (const card of cards) {
    const linkEl = await card.$('a[href*="/job/"], a[href]');
    const href = linkEl ? await linkEl.getAttribute('href').catch(() => null) : null;
    const titleEl = await card.$('a, h3, h4, span[class*="title"], p[class*="title"]');
    const title = titleEl ? await titleEl.innerText().catch(() => '') : '';
    const locEl = await card.$('span[class*="location"], div[class*="location"]');
    const loc = locEl ? await locEl.innerText().catch(() => '') : '';
    if (title.trim().length > 3 && href) {
      jobs.push({ title: title.split('\n')[0].trim(), url: new URL(href, companyUrl).toString(), preLocation: loc.trim() });
    }
  }
  
  // Fallback: direct job links
  if (jobs.length === 0) {
    const links = await page.$$('a[href*="/job/"]');
    for (const link of links) {
      const title = await link.innerText().catch(() => '');
      const href = await link.getAttribute('href').catch(() => null);
      if (title.trim().length > 3 && href) {
        jobs.push({ title: title.split('\n')[0].trim(), url: new URL(href, companyUrl).toString() });
      }
    }
  }
  return dedupeJobs(jobs);
}

async function handlePyjamaHR(page: Page, companyUrl: string): Promise<any[]> {
  const jobs: any[] = [];
  await page.waitForSelector('div[class*="job"], a[href*="job"]', { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(3000);
  const cards = await page.$$('div[class*="job-card"], div[class*="opening"], a[href*="/job/"]');
  for (const card of cards) {
    const titleEl = await card.$('a, h3, h4, span[class*="title"]');
    const title = titleEl ? await titleEl.innerText().catch(() => '') : '';
    const linkEl = await card.$('a[href]');
    const href = linkEl ? await linkEl.getAttribute('href').catch(() => null) : null;
    const locEl = await card.$('span[class*="location"]');
    const loc = locEl ? await locEl.innerText().catch(() => '') : '';
    if (title && href) {
      jobs.push({ title: title.trim(), url: new URL(href, companyUrl).toString(), preLocation: loc.trim() });
    }
  }
  return dedupeJobs(jobs);
}

async function handleSmartRecruiters(page: Page, companyUrl: string): Promise<any[]> {
  const jobs: any[] = [];
  // SmartRecruiters confirmed: li[class*="opening"] (11), .job-title (11)
  await page.waitForSelector('li[class*="opening"], .job-title', { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(2000);
  const cards = await page.$$('li[class*="opening"]');
  for (const card of cards) {
    const linkEl = await card.$('a[href]');
    const href = linkEl ? await linkEl.getAttribute('href').catch(() => null) : null;
    const titleEl = await card.$('.job-title, h4, a');
    const title = titleEl ? await titleEl.innerText().catch(() => '') : '';
    const locEl = await card.$('span[class*="location"], div[class*="location"]');
    const loc = locEl ? await locEl.innerText().catch(() => '') : '';
    if (title.trim().length > 3 && href) {
      jobs.push({ title: title.trim(), url: new URL(href, companyUrl).toString(), preLocation: loc.trim() });
    }
  }
  return dedupeJobs(jobs);
}

async function handleGem(page: Page, companyUrl: string): Promise<any[]> {
  const jobs: any[] = [];
  await page.waitForSelector('a[href*="/job/"], div[class*="job"]', { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(3000);
  const cards = await page.$$('a[href*="/job/"], div[class*="job-listing"], div[class*="job-card"]');
  for (const card of cards) {
    const title = await card.innerText().catch(() => '');
    const href = await card.getAttribute('href').catch(() => null) || await (await card.$('a'))?.getAttribute('href').catch(() => null);
    if (title && href) {
      jobs.push({ title: title.split('\n')[0].trim(), url: new URL(href, companyUrl).toString() });
    }
  }
  return dedupeJobs(jobs);
}

async function handleParamAI(page: Page, companyUrl: string): Promise<any[]> {
  const jobs: any[] = [];
  await page.waitForSelector('div[class*="job"], a[href*="job"]', { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(3000);
  const cards = await page.$$('div[class*="job-card"], div[class*="job-listing"], a[href*="/jobs/"]');
  for (const card of cards) {
    const titleEl = await card.$('a, h3, h4, span[class*="title"]');
    const title = titleEl ? await titleEl.innerText().catch(() => '') : '';
    const linkEl = await card.$('a[href]');
    const href = linkEl ? await linkEl.getAttribute('href').catch(() => null) : null;
    if (title && href) {
      jobs.push({ title: title.trim(), url: new URL(href, companyUrl).toString() });
    }
  }
  return dedupeJobs(jobs);
}

// Utility: deduplicate jobs by URL
function dedupeJobs(jobs: any[]): any[] {
  const seen = new Map<string, any>();
  for (const job of jobs) {
    if (job.title && job.url && !seen.has(job.url)) seen.set(job.url, job);
  }
  return Array.from(seen.values());
}

// ---------------- CUSTOM HANDLERS ----------------

export async function handleAmazon(page: Page): Promise<{title: string, url: string, preLocation?: string}[]> {
  const jobs: {title: string, url: string, preLocation?: string}[] = [];
  const searchTerms = ["Software", "SDE", "Data", "Machine Learning", "Cloud", "Frontend", "Backend"];
  
  for (const term of searchTerms) {
    try {
      const query = encodeURIComponent(term);
      await page.goto(`https://amazon.jobs/en/search?base_query=${query}&country%5B%5D=IND`, { waitUntil: "domcontentloaded", timeout: 30000 });
      
      await page.waitForTimeout(2000); 
      await page.waitForSelector('.job-tile', { timeout: 10000 }).catch(() => {});

      const jobElements = page.locator('.job-tile');
      const count = await jobElements.count();
      
      for (let i = 0; i < count; i++) {
        const card = jobElements.nth(i);
        const title = await card.locator('.job-title').first().innerText().catch(() => '');
        const href = await card.locator('a.job-link').first().getAttribute('href').catch(() => null);
        const location = await card.locator('.location-and-id').first().innerText().catch(() => '');
        
        if (title && href) {
          const fullUrl = new URL(href, "https://amazon.jobs").toString();
          if (!jobs.some(j => j.url === fullUrl)) {
            jobs.push({
              title: title.trim(),
              url: fullUrl,
              preLocation: location.split('|')[0].trim()
            });
          }
        }
      }
    } catch (err) {
      console.error(`Amazon handler error for ${term}:`, err);
    }
  }
  return jobs;
}

export async function handleGoogle(page: Page): Promise<{title: string, url: string, preLocation?: string}[]> {
  const jobs: {title: string, url: string, preLocation?: string}[] = [];
  const searchTerms = ["Software", "Data", "Machine%20Learning", "Cloud"];
  
  for (const term of searchTerms) {
    try {
      await page.goto(`https://www.google.com/about/careers/applications/jobs/results/?q=${term}&location=India`, { waitUntil: "domcontentloaded", timeout: 30000 });
      await page.waitForTimeout(2000);
      await page.waitForSelector('.gc-card', { timeout: 10000 }).catch(() => {});
      
      const jobElements = page.locator('.gc-card');
      const count = await jobElements.count();
      
      for (let i = 0; i < count; i++) {
        const card = jobElements.nth(i);
        const title = await card.locator('.gc-card__title').first().innerText().catch(() => '');
        const href = await card.locator('a').first().getAttribute('href').catch(() => null);
        const location = await card.locator('.gc-job-tags__location').first().innerText().catch(() => '');
        
        if (title && href) {
          const fullUrl = new URL(href, "https://www.google.com/about/careers/applications/").toString();
          if (!jobs.some(j => j.url === fullUrl)) {
            jobs.push({
              title: title.trim(),
              url: fullUrl,
              preLocation: location.trim()
            });
          }
        }
      }
    } catch (err) {
      console.error(`Google handler error for ${term}:`, err);
    }
  }
  return jobs;
}

export async function handleMeta(page: Page): Promise<{title: string, url: string, preLocation?: string}[]> {
  const jobs: {title: string, url: string, preLocation?: string}[] = [];
  const searchTerms = ["Software", "Data", "Machine%20Learning", "AI"];
  
  for (const term of searchTerms) {
    try {
      await page.goto(`https://www.metacareers.com/jobs/?q=${term}&locations[0]=India`, { waitUntil: "domcontentloaded", timeout: 30000 });
      await page.waitForTimeout(2000);
      
      const jobElements = page.locator('a[href*="/jobs/v/"]');
      const count = await jobElements.count();
      
      for (let i = 0; i < count; i++) {
        const card = jobElements.nth(i);
        const title = await card.locator('div').first().innerText().catch(() => '');
        const href = await card.getAttribute('href').catch(() => null);
        
        // Navigate up to find the container with location
        const parent = card.locator('xpath=../..');
        const text = await parent.innerText().catch(() => '');
        
        if (title && href) {
          const cleanTitle = title.split('\n')[0].trim();
          const fullUrl = new URL(href, "https://www.metacareers.com").toString();
          
          if (!jobs.some(j => j.url === fullUrl)) {
            jobs.push({
              title: cleanTitle,
              url: fullUrl,
              preLocation: text.replace(cleanTitle, '').replace(/\n/g, ' ').trim()
            });
          }
        }
      }
    } catch (err) {
      console.error(`Meta handler error for ${term}:`, err);
    }
  }
  return jobs;
}

export async function handleAtlassian(page: Page): Promise<{title: string, url: string, preLocation?: string}[]> {
  const jobs: {title: string, url: string, preLocation?: string}[] = [];
  try {
    await page.goto("https://www.atlassian.com/company/careers/all-jobs?team=Engineering&location=India", { waitUntil: "domcontentloaded", timeout: 30000 });

    await page.waitForTimeout(3000);
    
    // Atlassian usually links to jobs with tracking params
    const jobElements = page.locator('a[href*="/company/careers/detail/"]');
    const count = await jobElements.count();
    
    for (let i = 0; i < count; i++) {
      const link = jobElements.nth(i);
      const href = await link.getAttribute('href').catch(() => null);
      
      if (href) {
         const title = await link.innerText().catch(() => '');
         const parentText = await link.locator('xpath=../..').innerText().catch(() => '');
         
         jobs.push({
           title: title.trim(),
           url: new URL(href, "https://www.atlassian.com").toString(),
           preLocation: parentText.replace(title, '').replace(/\n/g, ' ').trim()
         });
      }
    }
  } catch (err) {
    console.error('Atlassian handler error:', err);
  }
  
  const uniqueMap = new Map();
  for (const job of jobs) {
    if (job.title && job.url) uniqueMap.set(job.url, job);
  }
  
  return Array.from(uniqueMap.values());
}

// ---------------- MAIN SCRAPER ----------------

export async function scrapeJobs(limit?: number) {
  const fs = require('fs');
  const logStream = fs.createWriteStream('scrape_logs.txt', { flags: 'a' });
  const originalLog = console.log;
  const originalError = console.error;
  
  console.log = (...args: any[]) => {
    originalLog.apply(console, args);
    logStream.write(args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ') + '\n');
  };
  
  console.error = (...args: any[]) => {
    originalError.apply(console, args);
    logStream.write('[ERROR] ' + args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ') + '\n');
  };

  let totalScraped = 0;

  try {
    console.log(`\n--- NEW SCRAPE STARTED AT ${new Date().toISOString()} ---`);
    console.log("Starting ATS Routing Scraper...");
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
  });
  
  // Manual Stealth Injection to bypass WAFs (avoids Next.js build errors)
  await context.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => false });
    Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
    Object.defineProperty(navigator, 'languages', { get: () => ['en-US', 'en'] });
    (window as any).chrome = { runtime: {} };
  });

  const targetCompanies = limit ? COMPANIES.slice(0, limit) : COMPANIES;

  for (const company of targetCompanies) {
    if (!company.careers) continue;
    
    console.log(`Routing ${company.name} at ${company.careers}`);
    const page = await context.newPage();
    try {
      await page.goto(company.careers, { waitUntil: "domcontentloaded", timeout: 30000 });
      await page.waitForTimeout(3000); // Wait for SPAs to hydrate
      
      let jobLinksToVisit: any[] = [];
      const currentUrl = page.url();
      
      // Determine ATS Type or Custom Handler
      if (company.name === "Amazon") {
        console.log(`Using custom handler for ${company.name}`);
        jobLinksToVisit = await handleAmazon(page);
      } else if (company.name === "Google") {
        console.log(`Using custom handler for ${company.name}`);
        jobLinksToVisit = await handleGoogle(page);
      } else if (company.name === "Meta") {
        console.log(`Using custom handler for ${company.name}`);
        jobLinksToVisit = await handleMeta(page);
      } else if (company.name === "Atlassian") {
        console.log(`Using custom handler for ${company.name}`);
        jobLinksToVisit = await handleAtlassian(page);
      } else if (currentUrl.includes("boards.greenhouse.io") || currentUrl.includes("greenhouse.io")) {
        console.log(`Detected Greenhouse ATS for ${company.name}`);
        jobLinksToVisit = await handleGreenhouse(page, currentUrl);
      } else if (currentUrl.includes("jobs.lever.co")) {
        console.log(`Detected Lever ATS for ${company.name}`);
        jobLinksToVisit = await handleLever(page, currentUrl);
      } else if (currentUrl.includes("myworkdayjobs.com")) {
        console.log(`Detected Workday ATS for ${company.name}`);
        jobLinksToVisit = await handleWorkday(page, currentUrl);
      } else if (currentUrl.includes("darwinbox.in")) {
        console.log(`Detected Darwinbox ATS for ${company.name}`);
        jobLinksToVisit = await handleDarwinbox(page, currentUrl);
      } else if (currentUrl.includes("oraclecloud.com")) {
        console.log(`Detected Oracle Cloud HCM for ${company.name}`);
        jobLinksToVisit = await handleOracleCloud(page, currentUrl);
      } else if (currentUrl.includes("turbohire.co")) {
        console.log(`Detected TurboHire for ${company.name}`);
        jobLinksToVisit = await handleTurboHire(page, currentUrl);
      } else if (currentUrl.includes("trakstar.com")) {
        console.log(`Detected Trakstar for ${company.name}`);
        jobLinksToVisit = await handleTrakstar(page, currentUrl);
      } else if (currentUrl.includes("freshteam.com")) {
        console.log(`Detected Freshteam for ${company.name}`);
        jobLinksToVisit = await handleFreshteam(page, currentUrl);
      } else if (currentUrl.includes("keka.com") || currentUrl.includes("keka.")) {
        console.log(`Detected Keka for ${company.name}`);
        jobLinksToVisit = await handleKeka(page, currentUrl);
      } else if (currentUrl.includes("linkedin.com")) {
        console.log(`Detected LinkedIn for ${company.name}`);
        jobLinksToVisit = await handleLinkedIn(page, currentUrl);
      } else if (currentUrl.includes("zohorecruit")) {
        console.log(`Detected Zoho Recruit for ${company.name}`);
        jobLinksToVisit = await handleZohoRecruit(page, currentUrl);
      } else if (currentUrl.includes("sensehq.com")) {
        console.log(`Detected SenseHQ for ${company.name}`);
        jobLinksToVisit = await handleSenseHQ(page, currentUrl);
      } else if (currentUrl.includes("kula.ai")) {
        console.log(`Detected Kula for ${company.name}`);
        jobLinksToVisit = await handleKula(page, currentUrl);
      } else if (currentUrl.includes("pinpointhq.com")) {
        console.log(`Detected Pinpoint for ${company.name}`);
        jobLinksToVisit = await handlePinpoint(page, currentUrl);
      } else if (currentUrl.includes("talentrecruit.com")) {
        console.log(`Detected TalentRecruit for ${company.name}`);
        jobLinksToVisit = await handleTalentRecruit(page, currentUrl);
      } else if (currentUrl.includes("eightfold.ai")) {
        console.log(`Detected Eightfold for ${company.name}`);
        jobLinksToVisit = await handleEightfold(page, currentUrl);
      } else if (currentUrl.includes("pyjamahr.com")) {
        console.log(`Detected PyjamaHR for ${company.name}`);
        jobLinksToVisit = await handlePyjamaHR(page, currentUrl);
      } else if (currentUrl.includes("smartrecruiters.com")) {
        console.log(`Detected SmartRecruiters for ${company.name}`);
        jobLinksToVisit = await handleSmartRecruiters(page, currentUrl);
      } else if (currentUrl.includes("gem.com")) {
        console.log(`Detected Gem for ${company.name}`);
        jobLinksToVisit = await handleGem(page, currentUrl);
      } else if (currentUrl.includes("param.ai")) {
        console.log(`Detected Param.ai for ${company.name}`);
        jobLinksToVisit = await handleParamAI(page, currentUrl);
      } else {
        console.log(`Using Heuristic Router for ${company.name}`);
        jobLinksToVisit = await handleHeuristic(page, currentUrl);
      }
      
      console.log(`Found ${jobLinksToVisit.length} potential job links for ${company.name}. Visiting them...`);
      
      for (const job of jobLinksToVisit) {
        try {
          // STRICT FILTER: Skip navigation links and non-tech roles
          const matchedRoles = ROLE_KEYWORDS.filter(kw => job.title.toLowerCase().includes(kw));
          if (matchedRoles.length === 0) {
            console.log(`Skipped non-tech role: ${job.title}`);
            continue;
          }

          const docId = Buffer.from(job.url).toString("base64").replace(/\//g, "_").replace(/\+/g, "-");
          const jobRef = adminDb.collection("jobs").doc(docId);
          const doc = await jobRef.get();
          if (doc.exists) continue;
          
          await page.goto(job.url, { waitUntil: "domcontentloaded", timeout: 20000 });
          await page.waitForTimeout(2000);
          const bodyText = await page.evaluate(() => document.body.innerText || "");
          
          // Use pre-location from ATS if available, else parse body
          let location = job.preLocation;
          let isValidLocation = false;
          
          if (location) {
             // If preLocation exists, STRICTLY check if it's in India
             isValidLocation = INDIA_LOCATIONS.some(loc => location!.toLowerCase().includes(loc));
          } 
          
          if (!location) {
             // Only fallback to scanning the entire body text if preLocation was completely missing
             location = checkLocation(bodyText, job.url);
             isValidLocation = !!location;
          }
          
          if (!isValidLocation) {
            console.log(`Skipped ${job.title} - Not in India/Remote (Location found: ${location || 'None'})`);
            continue;
          }
          
          const yoe = extractYOE(bodyText);
          const skills = extractSkills(bodyText, job.title);
          const jd = bodyText.substring(0, 500).replace(/\s+/g, ' ').trim() + "...";
          
          await jobRef.set({
            companyName: company.name,
            title: job.title,
            url: job.url,
            rolesMatched: matchedRoles,
            location: location,
            yoe: yoe,
            skills: skills,
            jd: jd,
            firstSeen: Date.now()
          });
          
          totalScraped++;
          console.log(`Scraped: ${job.title} (${location})`);
        } catch (e: any) {
          console.error(`Error visiting job ${job.url}: ${e.message}`);
        }
      }
    } catch (err: any) {
      console.error(`Failed to route ${company.name}: ${err.message}`);
    } finally {
      await page.close();
    }
  }

  await browser.close();
  console.log(`Scraping finished. Added ${totalScraped} new jobs.`);
  } finally {
    console.log = originalLog;
    console.error = originalError;
    logStream.end();
  }
  return totalScraped;
}
