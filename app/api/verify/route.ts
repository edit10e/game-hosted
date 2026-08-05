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

    const stringId = String(telegramId);

    // 1. Check if the user already exists in the table
    const { data: existingUser } = await supabase
      .from('user_verify')
      .select('id')
      .eq('telegram_id', stringId)
      .maybeSingle();

    let error;

    if (existingUser) {
      // 2. Update if they already exist
      const res = await supabase
        .from('user_verify')
        .update({ verify: true })
        .eq('telegram_id', stringId);
      error = res.error;
    } else {
      // 3. Insert if they are new
      const res = await supabase
        .from('user_verify')
        .insert([{ telegram_id: stringId, verify: true }]);
      error = res.error;
    }

    if (error) throw error;

    return NextResponse.json({ success: true, message: 'Verified successfully' });
  } catch (err: any) {
    console.error('Verify API Error:', err.message);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}