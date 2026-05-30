const fs = require('fs');

const linksText = fs.readFileSync('links.txt', 'utf-8');
const lines = linksText.split('\n').filter(l => l.trim().length > 0);

// Load old companies to preserve their metadata
let oldCompanies = [];
try {
  const companiesContent = fs.readFileSync('src/lib/companies.ts', 'utf-8');
  const match = companiesContent.match(/export const COMPANIES: CompanyConfig\[\] = (\[[\s\S]*?\]);/);
  if (match) {
    oldCompanies = JSON.parse(match[1]);
  }
} catch (e) {
  console.error("Could not parse old companies.ts");
}

const newCompanies = [];

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  const parts = line.split(':');
  if (parts.length < 2) continue;
  
  const nameRaw = parts[0].trim();
  const valueRaw = parts.slice(1).join(':').trim();
  
  const urlMatch = valueRaw.match(/https?:\/\/[^\s]+/);
  const url = urlMatch ? urlMatch[0] : null;

  // Find old metadata
  const nameClean = nameRaw.toLowerCase().replace(/[^a-z0-9]/g, '');
  const oldC = oldCompanies.find(c => c.name.toLowerCase().replace(/[^a-z0-9]/g, '') === nameClean);

  const ctc = oldC && oldC.ctc !== 'Not Specified' ? oldC.ctc : (valueRaw.includes('LPA') || valueRaw.includes('lpa')) ? (valueRaw.match(/[\d.]+\s*-?\s*[\d.]*\s*(?:LPA|lpa)/) || ['Not Specified'])[0] : 'Not Specified';

  newCompanies.push({
    name: nameRaw,
    category: oldC ? oldC.category : "Startups / Others",
    sector: oldC ? oldC.sector : "Tech",
    roles: oldC ? oldC.roles : "Software Engineer",
    ctc: ctc,
    score: oldC ? oldC.score : 3.0,
    diff: oldC ? oldC.diff : "Medium",
    isnew: true,
    ...(url && { careers: url })
  });
}

const newTsContent = `export interface CompanyConfig {
  name: string;
  category: string;
  sector: string;
  roles: string;
  ctc: string;
  score: number;
  diff: string;
  isnew: boolean;
  careers?: string;
}

export const COMPANIES: CompanyConfig[] = ${JSON.stringify(newCompanies, null, 2)};
`;

fs.writeFileSync('src/lib/companies.ts', newTsContent);
console.log(`Successfully rebuilt companies.ts with exactly ${newCompanies.length} companies.`);
