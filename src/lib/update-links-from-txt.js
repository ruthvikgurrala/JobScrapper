const fs = require('fs');

// Read current companies
const companiesContent = fs.readFileSync('src/lib/companies.ts', 'utf-8');
// Use a regex to extract the JSON array of COMPANIES
const match = companiesContent.match(/export const COMPANIES: CompanyConfig\[\] = (\[[\s\S]*?\]);/);
if (!match) {
  console.error("Could not find COMPANIES array in companies.ts");
  process.exit(1);
}

let companies = [];
try {
  // It might be pure JSON because we generated it that way earlier
  companies = JSON.parse(match[1]);
} catch (e) {
  console.error("Failed to parse COMPANIES array:", e);
  process.exit(1);
}

// Read links.txt
const linksText = fs.readFileSync('links.txt', 'utf-8');
const lines = linksText.split('\n');

const updates = {};
for (const line of lines) {
  if (!line.trim()) continue;
  const parts = line.split(':');
  if (parts.length < 2) continue;
  
  const nameRaw = parts[0].trim().toLowerCase();
  const valueRaw = parts.slice(1).join(':').trim(); // Re-join in case URL has 'https:'
  
  // Extract URL if it exists, ignore comments
  const urlMatch = valueRaw.match(/https?:\/\/[^\s]+/);
  const url = urlMatch ? urlMatch[0] : null;
  
  updates[nameRaw] = url;
}

// Map of names to handle mismatches
const aliases = {
  "cultfit": "cult.fit",
  "physicswallah": "physics wallah",
  "pristyncare": "pristyn care",
  "tata1mg": "tata 1mg",
  "oyorooms": "oyo",
  "dailyhunt": "josh", // Josh is by dailyhunt
  "livspace": "livespace (livpure)",
  "surveysparrow": "survey sparrow",
  "redio ai": "redio ai",
  "catterpillar": "caterpillar",
  "spinzone": "spinny", // Assuming spinzone is spinny
  "nazaara": "nazara technologies",
  "thomsonreuters": "thomson reuters",
  "volksowagon": "volkswagen",
  "texasinstruments": "texas instruments",
  "mobile premier league": "mpl (mobile premier)",
  "perfios.ai": "perfios",
  "agora(100ms)": "agora (100ms)",
  "gupshup.ai": "gupshup",
  "jupiter money": "jupiter money",
  "yellow.ai": "yellow.ai"
};

let updatedCount = 0;
for (let i = 0; i < companies.length; i++) {
  const comp = companies[i];
  const compNameLower = comp.name.toLowerCase();
  
  // Try exact match, then alias, then substring
  let foundKey = Object.keys(updates).find(k => k === compNameLower);
  if (!foundKey) {
    foundKey = Object.keys(updates).find(k => aliases[k] && aliases[k] === compNameLower);
  }
  if (!foundKey) {
     foundKey = Object.keys(updates).find(k => compNameLower.includes(k) || k.includes(compNameLower));
  }
  
  if (foundKey) {
    const newUrl = updates[foundKey];
    if (newUrl) {
      comp.careers = newUrl;
      updatedCount++;
    } else {
      // Doesn't have a valid link in links.txt. The user said: "for some which doesnt have link give their website link"
      // Instead of losing the URL, let's just make it a clean website link.
      const cleanName = comp.name.split(' ')[0].toLowerCase().replace(/[^a-z0-9]/g, '');
      comp.careers = `https://www.${cleanName}.com`;
    }
  }
}

const newContent = `export interface CompanyConfig {
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

export const COMPANIES: CompanyConfig[] = ${JSON.stringify(companies, null, 2)};
`;

fs.writeFileSync('src/lib/companies.ts', newContent);
console.log(`Successfully updated ${updatedCount} companies based on links.txt`);
