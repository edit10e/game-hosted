'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

// Bypass missing module type declarations for TypeScript
declare module '@mediapipe/hands';
declare module '@mediapipe/face_mesh';
declare module '@mediapipe/camera_utils';

type FingerChallenge = {
  text: string;
  count: number;
  check: (fingersUp: boolean[], thumbUp: boolean) => boolean;
};

export default function VerifyView({ onVerified }: { onVerified: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [statusText, setStatusText] = useState<string>('กำลังเปิดกล้องและระบบ AI สแกนหน้า...');
  const [isLoadingModel, setIsLoadingModel] = useState<boolean>(true);
  const [isSuccess, setIsSuccess] = useState<boolean>(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [challenge, setChallenge] = useState<FingerChallenge | null>(null);

  const countdownRef = useRef<number | null>(null);
  countdownRef.current = countdown;

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
    let faceMesh: any = null;
    let timer: NodeJS.Timeout | null = null;

    let faceDetected = false;
    let handMatched = false;

    const loadMediaPipe = async () => {
      try {
        const { Hands } = await import('@mediapipe/hands');
        const { FaceMesh } = await import('@mediapipe/face_mesh');
        const { Camera } = await import('@mediapipe/camera_utils');

        if (!videoRef.current) return;

        // 1. Initialize Hands
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
          handMatched = false;

          if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
            const landmarks = results.multiHandLandmarks[0];
            const thumbUp = Math.abs(landmarks[4].x - landmarks[17].x) > 0.1;
            const indexUp = landmarks[8].y < landmarks[6].y;
            const middleUp = landmarks[12].y < landmarks[10].y;
            const ringUp = landmarks[16].y < landmarks[14].y;
            const pinkyUp = landmarks[20].y < landmarks[18].y;

            const fingersUpArray = [indexUp, middleUp, ringUp, pinkyUp];
            handMatched = challenge.check(fingersUpArray, thumbUp);
          }

          evaluateStatus();
        });

        // 2. Initialize Face Mesh
        faceMesh = new FaceMesh({
          locateFile: (file: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`,
        });
        faceMesh.setOptions({
          maxNumFaces: 1,
          refineLandmarks: true,
          minDetectionConfidence: 0.6,
          minTrackingConfidence: 0.6,
        });

        faceMesh.onResults((results: any) => {
          // Once face results arrive, mark loading as complete
          setIsLoadingModel(false);
          if (isSuccess) return;

          faceDetected = results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0;
          evaluateStatus();
        });

        // Evaluation core logic (requires BOTH face and gesture)
        const evaluateStatus = () => {
          if (isSuccess) return;

          if (!faceDetected) {
            if (countdownRef.current !== null) {
              if (timer) clearInterval(timer);
              setCountdown(null);
            }
            setStatusText('⚠️ ไม่พบใบหน้า กรุณาหันหน้าเข้าหากล้อง');
            return;
          }

          if (handMatched) {
            if (countdownRef.current === null) {
              setCountdown(3);
              setStatusText('✨ พบใบหน้าและท่าทางถูกต้อง! กำลังนับถอยหลัง');

              timer = setInterval(() => {
                setCountdown((prev) => {
                  if (prev === null) return null;
                  if (prev <= 1) {
                    if (timer) clearInterval(timer);
                    setIsSuccess(true);
                    setStatusText('🎉 ยืนยันตัวตนสำเร็จผ่านระบบ Face & Hand AI!');
                    setTimeout(() => onVerified(), 600);
                    return 0;
                  }
                  return prev - 1;
                });
              }, 1000);
            }
          } else {
            if (countdownRef.current !== null) {
              if (timer) clearInterval(timer);
              setCountdown(null);
            }
            setStatusText(`${challenge.text}`);
          }
        };

        // Camera pipeline loop feeding both AI models
        camera = new Camera(videoRef.current, {
          onFrame: async () => {
            if (videoRef.current) {
              // Send frame concurrently to face mesh and hands
              await faceMesh.send({ image: videoRef.current });
              await hands.send({ image: videoRef.current });
            }
          },
          width: 320,
          height: 240,
        });

        await camera.start();
      } catch (err) {
        setIsLoadingModel(false);
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
      <h2 className="text-2xl font-bold text-gray-800 mb-2">ยืนยันตัวตนขั้นสูง</h2>
      
      <div className="mb-4 bg-indigo-50 border border-indigo-200 text-indigo-700 font-bold px-4 py-2 rounded-xl text-lg shadow-sm">
        {challenge ? challenge.text : 'กำลังเตรียมภารกิจ...'}
      </div>

      <div className="relative w-72 h-72 rounded-2xl overflow-hidden shadow-lg border-4 border-indigo-500 bg-black flex items-center justify-center">
        <video
          ref={videoRef}
          className="w-full h-full object-cover transform -scale-x-100"
          playsInline
          muted
        />

        {/* Loading AI Models Overlay */}
        {isLoadingModel && (
          <div className="absolute inset-0 bg-black/70 backdrop-blur-xs flex flex-col items-center justify-center text-white z-20">
            <div className="w-10 h-10 border-4 border-indigo-400 border-t-transparent rounded-full animate-spin mb-3"></div>
            <p className="text-xs font-medium tracking-wide">กำลังโหลดระบบสแกนใบหน้าและมือ...</p>
          </div>
        )}

        {/* Transparent Countdown Overlay */}
        {countdown !== null && !isLoadingModel && (
          <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] flex flex-col items-center justify-center text-white z-10 transition-all">
            <span className="text-7xl font-extrabold text-green-400 drop-shadow-lg animate-pulse">
              {countdown > 0 ? countdown : '✓'}
            </span>
            <p className="mt-2 text-xs font-semibold tracking-wide bg-black/50 px-3 py-1 rounded-full">
              ห้ามขยับหน้าหรือเปลี่ยนมือ ({countdown}s)
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