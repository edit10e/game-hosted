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

    // Update user status in Supabase database
    const { error } = await supabase
      .from('users')
      .upsert({ 
        telegram_id: String(telegramId), 
        is_verified: true, 
        verified_at: new Date() 
      });

    if (error) throw error;

    // Optional: If you want the API to also un-mute the user in Telegram immediately upon success, 
    // you can call the Telegram Bot API `restrictChatMember` or `unbanChatMember` here!

    return NextResponse.json({ success: true, message: 'Verified successfully in database' });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}