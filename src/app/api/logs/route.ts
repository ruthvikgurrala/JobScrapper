import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
  try {
    const logPath = path.join(process.cwd(), 'scrape_logs.txt');
    
    if (!fs.existsSync(logPath)) {
      return new NextResponse("No active logs found. Run a scrape to generate logs.", { status: 200 });
    }

    // Read the file
    const content = fs.readFileSync(logPath, 'utf8');
    
    // To prevent browser lag, only send the last 300 lines
    const lines = content.split('\n');
    const lastLines = lines.slice(-300).join('\n');

    return new NextResponse(lastLines, {
      status: 200,
      headers: {
        'Content-Type': 'text/plain',
        'Cache-Control': 'no-store, max-age=0'
      }
    });
  } catch (error: any) {
    return new NextResponse(`Error reading logs: ${error.message}`, { status: 500 });
  }
}
