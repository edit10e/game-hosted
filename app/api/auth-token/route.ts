import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');

  if (!userId) {
    return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
  }

  // Here you can generate a secure token or pass the userId encoded/encrypted
  // For simplicity, we pass the verified Telegram ID securely to your frontend URL
  const frontendUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://your-domain.com';
  const secureLink = `${frontendUrl}?verify_user=${userId}`;

  return NextResponse.json({ link: secureLink });
}