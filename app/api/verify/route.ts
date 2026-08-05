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

    if (!telegramId) {
      return NextResponse.json({ isVerified: false }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('user_verify')
      .select('verify')
      .eq('telegram_id', String(telegramId).trim())
      .maybeSingle();

    if (error || !data) {
      return NextResponse.json({ isVerified: false });
    }

    return NextResponse.json({ isVerified: Boolean(data.verify) });
  } catch (err: any) {
    return NextResponse.json({ isVerified: false }, { status: 500 });
  }
}