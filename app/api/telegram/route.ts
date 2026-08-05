import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const update = await request.json();

    // Check if a user sent a message with text "/verify"
    if (update.message && update.message.text === '/verify') {
      const chatId = update.message.chat.id;
      const userId = update.message.from.id;
      const userName = update.message.from.first_name || 'User';

      const botToken = process.env.TELEGRAM_BOT_TOKEN;
      const webAppUrl = `https://game-hosted.vercel.app?id=${userId}`;

      // Send message with an inline button opening your Mini App
      await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: `สวัสดีคุณ ${userName}\nกรุณาคลิกปุ่มด้านล่างเพื่อยืนยันตัวตน (เฉพาะคุณเท่านั้น)`,
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: 'ยืนยันตัวตน',
                  web_app: { url: webAppUrl }
                }
              ]
            ]
          }
        })
      });
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}