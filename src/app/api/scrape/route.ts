import { NextResponse } from "next/server";
import { scrapeJobs } from "@/lib/scraper";

export async function POST(req: Request) {
  try {
    let limit;
    try {
      const body = await req.json();
      limit = body.limit;
    } catch (e) {
      // ignore
    }
    
    scrapeJobs(limit).catch(console.error);

    return NextResponse.json({ message: `Scraping started in the background${limit ? ` for first ${limit} companies` : ''}.` });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
