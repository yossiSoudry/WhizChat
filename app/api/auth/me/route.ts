import { NextResponse } from "next/server";
import { getAuthenticatedAgent } from "@/lib/auth/get-agent";

export async function GET() {
  const result = await getAuthenticatedAgent();

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({ agent: result.agent });
}
