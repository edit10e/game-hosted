'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

// Bypass missing module type declarations for TypeScript
declare module '@mediapipe/hands';
declare module '@mediapipe/camera_utils';

type FingerChallenge = {
  text: string;
  count: number;
  check: (fingersUp: boolean[], thumbUp: boolean) => boolean;
};

export default function VerifyView({ onVerified }: { onVerified: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [statusText, setStatusText] = useState<string>('กำลังเปิดกล้อง...');
  const [isSuccess, setIsSuccess] = useState<boolean>(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [challenge, setChallenge] = useState<FingerChallenge | null>(null);

  // Use ref to track countdown state inside MediaPipe async callbacks without stale closures
  const countdownRef = useRef<number | null>(null);
  countdownRef.current = countdown;

  // Define possible random challenges
  const challenges: FingerChallenge[] = [
    {
      text: 'ชู 1 นิ้ว (ชี้)',
      count: 1,
      check: (up) => up[0] && !up[1] && !up[2] && !up[3],
    },
    {
      text: 'ชู 2 นิ้ว (ชี้ + กลาง)',
      count: 2,
      check: (up) => up[0] && up[1] && !up[2] && !up[3],
    },
    {
      text: 'ชู 3 นิ้ว (ชี้ + กลาง + นาง)',
      count: 3,
      check: (up) => up[0] && up[1] && up[2] && !up[3],
    },
    {
      text: 'ชู 4 นิ้ว (ไม่เอาโป้ง)',
      count: 4,
      check: (up) => up[0] && up[1] && up[2] && up[3],
    },
    {
      text: 'ชู 5 นิ้ว (แบมือทั้งหมด)',
      count: 5,
      check: (up, thumbUp) => thumbUp && up[0] && up[1] && up[2] && up[3],
    },
    {
      text: 'ชูนิ้วที่ 1 และ 3 (ชี้ + นาง)',
      count: 2,
      check: (up) => up[0] && !up[1] && up[2] && !up[3],
    },
  ];

  const pickRandomChallenge = useCallback(() => {
    const randomIndex = Math.floor(Math.random() * challenges.length);
    setChallenge(challenges[randomIndex]);
  }, []);

  useEffect(() => {
    pickRandomChallenge();
  }, [pickRandomChallenge]);

  useEffect(() => {
    if (!challenge || isSuccess) return;

    let camera: any = null;
    let hands: any = null;
    let timer: NodeJS.Timeout | null = null;

    const loadMediaPipe = async () => {
      try {
        const { Hands } = await import('@mediapipe/hands');
        const { Camera } = await import('@mediapipe/camera_utils');

        if (!videoRef.current) return;

        hands = new Hands({
          locateFile: (file: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
        });

        hands.setOptions({
          maxNumHands: 1,
          modelComplexity: 1,
          minDetectionConfidence: 0.6,
          minTrackingConfidence: 0.6,
        });

        hands.onResults((results: any) => {
          if (isSuccess) return;

          let isMatched = false;

          if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
            const landmarks = results.multiHandLandmarks[0];

            const thumbUp = Math.abs(landmarks[4].x - landmarks[17].x) > 0.1;
            const indexUp = landmarks[8].y < landmarks[6].y;
            const middleUp = landmarks[12].y < landmarks[10].y;
            const ringUp = landmarks[16].y < landmarks[14].y;
            const pinkyUp = landmarks[20].y < landmarks[18].y;

            const fingersUpArray = [indexUp, middleUp, ringUp, pinkyUp];
            isMatched = challenge.check(fingersUpArray, thumbUp);
          }

          if (isMatched) {
            // If hand is matched, start countdown if not already started
            if (countdownRef.current === null) {
              setCountdown(3);
              setStatusText('✨ คงท่านี้ไว้... กำลังนับถอยหลัง');

              timer = setInterval(() => {
                setCountdown((prev) => {
                  if (prev === null) return null;
                  if (prev <= 1) {
                    if (timer) clearInterval(timer);
                    setIsSuccess(true);
                    setStatusText('🎉 ยืนยันตัวตนสำเร็จ!');
                    setTimeout(() => onVerified(), 600);
                    return 0;
                  }
                  return prev - 1;
                });
              }, 1000);
            }
          } else {
            // If hand is lost or incorrect during countdown, RESET everything!
            if (countdownRef.current !== null) {
              if (timer) clearInterval(timer);
              setCountdown(null);
            }
            setStatusText(`กรุณาทำตามคำสั่ง: ${challenge.text}`);
          }
        });

        camera = new Camera(videoRef.current, {
          onFrame: async () => {
            if (videoRef.current) {
              await hands.send({ image: videoRef.current });
            }
          },
          width: 320,
          height: 240,
        });

        await camera.start();
      } catch (err) {
        setStatusText('ไม่สามารถเปิดกล้องได้ กรุณาอนุญาตสิทธิ์การใช้งานกล้อง');
      }
    };

    loadMediaPipe();

    return () => {
      if (timer) clearInterval(timer);
      if (camera) {
        try {
          camera.stop();
        } catch (e) {
          // cleanup
        }
      }
    };
  }, [challenge, isSuccess, onVerified]);

  return (
    <div className="flex flex-col items-center justify-center p-6 text-center">
      <h2 className="text-2xl font-bold text-gray-800 mb-2">ยืนยันตัวตนด่วน</h2>
      
      <div className="mb-4 bg-indigo-50 border border-indigo-200 text-indigo-700 font-bold px-4 py-2 rounded-xl text-lg shadow-sm">
        {challenge ? challenge.text : 'กำลังโหลดภารกิจ...'}
      </div>

      <div className="relative w-72 h-72 rounded-2xl overflow-hidden shadow-lg border-4 border-indigo-500 bg-black flex items-center justify-center">
        <video
          ref={videoRef}
          className="w-full h-full object-cover transform -scale-x-100"
          playsInline
          muted
        />

        {/* Transparent Countdown Overlay */}
        {countdown !== null && (
          <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] flex flex-col items-center justify-center text-white z-10 transition-all">
            <span className="text-7xl font-extrabold text-green-400 drop-shadow-lg animate-pulse">
              {countdown > 0 ? countdown : '✓'}
            </span>
            <p className="mt-2 text-xs font-semibold tracking-wide bg-black/50 px-3 py-1 rounded-full">
              ห้ามขยับมือออก ({countdown}s)
            </p>
          </div>
        )}
      </div>

      <div
        className={`mt-6 text-base font-semibold px-4 py-2 rounded-xl transition-all ${
          isSuccess ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
        }`}
      >
        {statusText}
      </div>
    </div>
  );
}