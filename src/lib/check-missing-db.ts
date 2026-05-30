import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { adminDb } from './firebase/admin';
import { COMPANIES } from './companies';

async function checkMissing() {
  const snapshot = await adminDb.collection('jobs').get();
  
  const companyCounts: Record<string, number> = {};
  COMPANIES.forEach(c => companyCounts[c.name] = 0);

  snapshot.forEach(doc => {
    const d = doc.data();
    const name = d.companyName;
    if (companyCounts[name] !== undefined) {
      companyCounts[name]++;
    }
  });

  const missing = Object.entries(companyCounts).filter(([_, count]) => count === 0).map(([name]) => name);
  const found = Object.entries(companyCounts).filter(([_, count]) => count > 0);

  // Sort found by count desc
  found.sort((a, b) => b[1] - a[1]);

  console.log(`\n=== PROGRESS ===`);
  console.log(`Total jobs in DB: ${snapshot.size}`);
  console.log(`Companies with jobs: ${found.length} / ${COMPANIES.length}`);
  
  console.log(`\n=== TOP COMPANIES BY JOBS ===`);
  found.slice(0, 10).forEach(([name, count]) => {
    console.log(`  ${name}: ${count} jobs`);
  });

  console.log(`\n=== MISSING / 0 JOBS SO FAR (${missing.length}) ===`);
  // Print first 20 missing
  missing.slice(0, 20).forEach(name => console.log(`  - ${name}`));
  if (missing.length > 20) console.log(`  ... and ${missing.length - 20} more`);

  process.exit(0);
}
checkMissing();
