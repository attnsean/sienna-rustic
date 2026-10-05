import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get('url');
  if (!url) return NextResponse.json({ error: 'Missing url' }, { status: 400 });

  try {
    const match = url.match(/\/d\/([a-zA-Z0-9-_]+)/);
    if (!match) return NextResponse.json({ error: 'Invalid Google Sheet URL. Make sure it is a full docs.google.com link.' }, { status: 400 });
    const sheetId = match[1];
    
    const gidMatch = url.match(/[#&]gid=([0-9]+)/);
    const gid = gidMatch ? gidMatch[1] : '0';

    const exportUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}`;
    
    const response = await fetch(exportUrl);
    if (!response.ok) throw new Error('Failed to fetch from Google Sheets. Make sure the sheet is set to "Anyone with the link can view".');
    
    const csvText = await response.text();
    return new NextResponse(csvText, { headers: { 'Content-Type': 'text/csv' } });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
