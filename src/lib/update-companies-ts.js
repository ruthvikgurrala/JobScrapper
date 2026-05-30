const fs = require('fs');

const data = JSON.parse(fs.readFileSync('src/lib/companies_updated.json', 'utf8'));

const content = `export interface CompanyConfig {
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

export const COMPANIES: CompanyConfig[] = ${JSON.stringify(data, null, 2)};
`;

fs.writeFileSync('src/lib/companies.ts', content);
console.log('Updated companies.ts');
