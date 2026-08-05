'use client';

import { useState, useEffect } from 'react';
import VerifyView from '@/components/VerifyView';
import { LuShieldCheck, LuLock, LuArrowLeft } from 'react-icons/lu';

export default function Home() {
  const [currentView, setCurrentView] = useState<'home' | 'verify'>('home');
  const [isVerifiedUser, setIsVerifiedUser] = useState<boolean>(false);
  const [telegramId, setTelegramId] = useState<string | null>(null);
  const [accessDenied, setAccessDenied] = useState<boolean>(false);

  useEffect(() => {
    // 1. Check official Telegram WebApp environment
    const tg = (window as any).Telegram?.WebApp;
    const tgUserId = tg?.initDataUnsafe?.user?.id;

    // 2. Check URL query parameter (for test id or direct routing like ?id=12345)
    const params = new URLSearchParams(window.location.search);
    const queryId = params.get('id') || params.get('userId');

    // Determine active target ID (prioritize Telegram SDK, fallback to URL test query param)
    const activeId = tgUserId ? String(tgUserId) : queryId;

    if (activeId) {
      setTelegramId(activeId);
    } else {
      // If no valid Telegram context or test ID provided in URL, restrict access
      setAccessDenied(true);
    }
  }, []);

  if (accessDenied) {
    return (
      <main className="min-h-screen bg-white flex flex-col items-center justify-center px-6 text-center">
        <div className="max-w-md w-full p-6 space-y-4">
          <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto text-2xl font-bold">
            !
          </div>
          <h1 className="text-2xl font-black text-gray-900">ไม่ได้รับอนุญาตให้เข้าถึง</h1>
          <p className="text-sm text-gray-500">
            ลิงก์นี้ไม่ถูกต้องหรือไม่มีรหัสประจำตัวผู้ใช้ กรุณาขอลิงก์ยืนยันตัวตนใหม่ผ่านบอท Telegram เท่านั้น
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-white flex flex-col justify-between px-6 py-8">
      {/* Top Header / Branding */}
      <div className="max-w-md mx-auto w-full text-center pt-2">
        <div className="inline-flex items-center justify-center w-14 h-14">
        </div>
        <h1 className="text-3xl font-black tracking-tight text-gray-900">Game Hoster</h1>
        <p className="text-sm text-gray-400 mt-1">ระบบยืนยันตัวตน</p>
        {telegramId && (
          <p className="text-xs text-indigo-500 mt-1 font-mono">
            ID: {telegramId}
          </p>
        )}
      </div>

      {/* Main Content Area */}
      <div className="max-w-md mx-auto w-full my-auto py-4">
        {currentView === 'home' ? (
          <div className="text-center space-y-6">
            <div className="p-6 flex flex-col items-center">
              <div className="text-indigo-600 mb-3">
                {isVerifiedUser ? (
                  <LuShieldCheck className="w-12 h-12 text-emerald-500" />
                ) : (
                  <LuLock className="w-12 h-12 text-amber-500" />
                )}
              </div>
              <h2 className="text-lg font-bold text-gray-800">สถานะการยืนยันตัวตน</h2>
              <p className={`mt-2 font-semibold text-sm ${isVerifiedUser ? 'text-emerald-600' : 'text-amber-500'}`}>
                {isVerifiedUser ? 'ยืนยันตัวตนสำเร็จแล้ว (Verified)' : 'ยังไม่ได้ยืนยันตัวตนเพื่อเข้ากลุ่ม'}
              </p>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-3xl overflow-hidden">
            <VerifyView
              onVerified={async () => {
                if (telegramId) {
                  try {
                    await fetch('/api/verify', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ telegramId }),
                    });
                  } catch (e) {
                    console.error('Failed to sync verification to backend', e);
                  }
                }
                setIsVerifiedUser(true);
                setCurrentView('home');
              }}
            />
            <div className="p-4 bg-gray-50 text-center">
              <button
                onClick={() => setCurrentView('home')}
                className="text-xs text-gray-500 hover:text-gray-900 font-medium py-2 px-4 rounded-xl transition-all inline-flex items-center space-x-1.5"
              >
                <LuArrowLeft className="w-4 h-4" />
                <span>กลับสู่หน้าหลัก</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Sticky Action Button (Mobile First) */}
      <div className="max-w-md mx-auto w-full pb-4">
        {currentView === 'home' && !isVerifiedUser && (
          <button
            onClick={() => setCurrentView('verify')}
            className="w-full py-4 px-6 bg-indigo-600 active:scale-98 text-white font-bold text-lg rounded-2xl transition-all flex items-center justify-center space-x-2"
          >
            <span>เริ่มยืนยันตัวตนทันที</span>
          </button>
        )}

        {currentView === 'home' && isVerifiedUser && (
          <div className="w-full py-4 px-6 bg-emerald-50 text-emerald-700 font-bold text-center rounded-2xl border border-emerald-100 flex items-center justify-center space-x-2">
            <span>ยืนยันตัวตนเสร็จสิ้น</span>
          </div>
        )}

        <footer className="text-center text-[10px] text-gray-300 mt-6">
          Game Hoster Mini App &copy; 2026
        </footer>
      </div>
    </main>
  );
}