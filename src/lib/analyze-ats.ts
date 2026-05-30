import { COMPANIES } from "./companies";

function analyzeATS() {
  const stats = {
    greenhouse: 0,
    lever: 0,
    workday: 0,
    icims: 0,
    smartrecruiters: 0,
    eightfold: 0,
    myworkdayjobs: 0,
    other: 0,
    total: 0
  };

  COMPANIES.forEach(c => {
    if (!c.careers) return;
    stats.total++;
    const url = c.careers.toLowerCase();
    
    if (url.includes("greenhouse.io")) stats.greenhouse++;
    else if (url.includes("lever.co")) stats.lever++;
    else if (url.includes("workday.com") || url.includes("myworkdayjobs.com")) {
      stats.workday++;
      stats.myworkdayjobs++;
    }
    else if (url.includes("icims.com")) stats.icims++;
    else if (url.includes("smartrecruiters.com")) stats.smartrecruiters++;
    else if (url.includes("eightfold.ai")) stats.eightfold++;
    else stats.other++;
  });

  console.log("ATS Distribution:", stats);
}

analyzeATS();
