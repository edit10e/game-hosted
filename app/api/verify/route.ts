import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const telegramId = searchParams.get('telegramId');

    console.log('[CHECK-STATUS API] Incoming telegramId:', telegramId);

    if (!telegramId) {
      console.log('[CHECK-STATUS API] Error: Missing telegramId parameter');
      return NextResponse.json({ isVerified: false }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('user_verify')
      .select('verify, telegram_id')
      .eq('telegram_id', String(telegramId))
      .maybeSingle();

    console.log('[CHECK-STATUS API] Supabase query result:', { data, error });

    if (error || !data) {
      console.log('[CHECK-STATUS API] User not found or error occurred, isVerified: false');
      return NextResponse.json({ isVerified: false });
    }

    const isVerified = !!data.verify;
    console.log('[CHECK-STATUS API] Final resolved isVerified status:', isVerified);

    return NextResponse.json({ isVerified });
  } catch (err: any) {
    console.error('[CHECK-STATUS API] Exception caught:', err.message);
    return NextResponse.json({ isVerified: false }, { status: 500 });
  }
}