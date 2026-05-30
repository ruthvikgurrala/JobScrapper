import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { location, yoe } = body;

    const jobRef = adminDb.collection("jobs").doc(id);
    await jobRef.update({
      location: location,
      yoe: yoe
    });

    return NextResponse.json({ success: true, message: "Job updated successfully" });
  } catch (error: any) {
    console.error("Error updating job via admin SDK:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
