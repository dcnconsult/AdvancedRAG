// app/api/csrf-token/route.ts
import { NextResponse } from 'next/server';
import { csrfService } from '@/lib/csrfService';

export async function GET(req: Request) {
  const res = new NextResponse(null);
  const token = csrfService.addTokenToResponse(res, req);

  return NextResponse.json({ token }, { headers: res.headers });
}
