import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { adminDb } from './firebase/admin';

async function checkDB() {
  const snapshot = await adminDb.collection('jobs').get();
  console.log(`Total jobs in DB: ${snapshot.size}\n`);

  // Group by company
  const byCompany: Record<string, any[]> = {};
  const issues: string[] = [];

  snapshot.forEach(doc => {
    const d = doc.data();
    const name = d.companyName || 'UNKNOWN';
    if (!byCompany[name]) byCompany[name] = [];
    byCompany[name].push({
      title: d.title,
      url: d.url,
      location: d.location,
      rolesMatched: d.rolesMatched,
      yoe: d.yoe,
      skills: d.skills,
      jd: d.jd?.substring(0, 80),
    });

    // Check for issues
    if (!d.title || d.title.length < 3) issues.push(`[${name}] Empty/short title: "${d.title}"`);
    if (!d.url) issues.push(`[${name}] Missing URL`);
    if (!d.location) issues.push(`[${name}] Missing location`);
    if (d.location && !['india','remote','bengaluru','bangalore','hyderabad','pune','mumbai','delhi','gurgaon','gurugram','noida','chennai','kolkata'].some(l => d.location.toLowerCase().includes(l))) {
      issues.push(`[${name}] Non-India location: "${d.location}"`);
    }
    if (!d.rolesMatched || d.rolesMatched.length === 0) issues.push(`[${name}] No roles matched for: "${d.title}"`);
    if (d.title && d.title.includes('<')) issues.push(`[${name}] HTML in title: "${d.title.substring(0, 60)}"`);
    if (d.title && d.title.length > 200) issues.push(`[${name}] Very long title (${d.title.length} chars): "${d.title.substring(0, 60)}..."`);
    if (d.jd && d.jd.length < 20) issues.push(`[${name}] Very short JD: "${d.jd}"`);
  });

  // Print company summary sorted by count
  const sorted = Object.entries(byCompany).sort((a, b) => b[1].length - a[1].length);
  console.log('=== JOBS PER COMPANY ===');
  for (const [name, jobs] of sorted) {
    console.log(`  ${name}: ${jobs.length} jobs`);
  }

  console.log(`\n=== COMPANIES WITH JOBS: ${sorted.length} ===`);
  console.log(`=== TOTAL JOBS: ${snapshot.size} ===`);

  // Print sample jobs from top 3 companies
  console.log('\n=== SAMPLE JOBS (top 3 companies) ===');
  for (const [name, jobs] of sorted.slice(0, 3)) {
    console.log(`\n--- ${name} (${jobs.length} jobs) ---`);
    jobs.slice(0, 3).forEach(j => {
      console.log(`  Title: ${j.title}`);
      console.log(`  Location: ${j.location}`);
      console.log(`  Roles: ${j.rolesMatched?.join(', ')}`);
      console.log(`  URL: ${j.url?.substring(0, 80)}`);
      console.log('');
    });
  }

  // Print issues
  if (issues.length > 0) {
    console.log(`\n=== ISSUES FOUND: ${issues.length} ===`);
    // Group by type
    const issueTypes: Record<string, number> = {};
    issues.forEach(i => {
      const type = i.match(/\] (.+?):/)?.[1] || 'Other';
      issueTypes[type] = (issueTypes[type] || 0) + 1;
    });
    for (const [type, count] of Object.entries(issueTypes).sort((a,b) => b[1] - a[1])) {
      console.log(`  ${type}: ${count}`);
    }
    console.log('\nFirst 20 issues:');
    issues.slice(0, 20).forEach(i => console.log(`  ${i}`));
  } else {
    console.log('\n✅ No issues found!');
  }

  process.exit(0);
}
checkDB();
