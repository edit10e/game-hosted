import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
  try {
    const { telegramId } = await request.json();

    if (!telegramId) {
      return NextResponse.json({ success: false, message: 'Missing telegramId' }, { status: 400 });
    }

    // Using exact columns: telegram_id and verify
    const { error } = await supabase
      .from('user_verify')
      .upsert(
        { 
          telegram_id: String(telegramId), 
          verify: true 
        },
        { onConflict: 'telegram_id' }
      );

    if (error) throw error;

    return NextResponse.json({ success: true, message: 'Verified successfully' });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}