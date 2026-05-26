import { useCallback, useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { useTelegram } from '../hooks/useTelegram';

/**
 * Brauzer / Telegram ichida jonli kamera — rasm olingach File qaytaradi.
 * getUserMedia ishlamasa onFallback chaqiriladi (yashirin file input).
 */
export default function ImageCameraCapture({ open, onClose, onCapture, onFallback }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');
  const { haptic } = useTelegram();

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  useEffect(() => {
    if (!open) {
      stopStream();
      setReady(false);
      setError('');
      return undefined;
    }

    let cancelled = false;

    const start = async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        onFallback?.();
        onClose();
        return;
      }

      const constraints = [
        { video: { facingMode: { ideal: 'environment' } }, audio: false },
        { video: true, audio: false },
      ];

      for (const constraint of constraints) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia(constraint);
          if (cancelled) {
            stream.getTracks().forEach((t) => t.stop());
            return;
          }
          streamRef.current = stream;
          const video = videoRef.current;
          if (video) {
            video.srcObject = stream;
            video.setAttribute('playsinline', 'true');
            video.setAttribute('webkit-playsinline', 'true');
            await video.play();
            setReady(true);
            setError('');
          }
          return;
        } catch {
          /* keyingi constraint */
        }
      }

      setError('Kamera ochilmadi');
      onFallback?.();
      onClose();
    };

    start();

    return () => {
      cancelled = true;
      stopStream();
    };
  }, [open, onClose, onFallback, stopStream]);

  const takePhoto = () => {
    const video = videoRef.current;
    if (!video?.videoWidth) return;

    haptic('medium');
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);

    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const file = new File([blob], `camera-${Date.now()}.jpg`, {
          type: 'image/jpeg',
          lastModified: Date.now(),
        });
        stopStream();
        onCapture(file);
        onClose();
      },
      'image/jpeg',
      0.9
    );
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70] flex flex-col bg-black">
      <div className="flex shrink-0 items-center justify-between px-4 pb-2 pt-[calc(var(--tg-header-offset,0px)+8px)]">
        <button
          type="button"
          onClick={() => {
            haptic('light');
            stopStream();
            onClose();
          }}
          className="press-fluid flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-white"
          aria-label="Yopish"
        >
          <X className="h-5 w-5" />
        </button>
        <span className="text-[15px] font-semibold text-white">Rasmga olish</span>
        <span className="w-10" />
      </div>

      <div className="relative min-h-0 flex-1 bg-black">
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          className="h-full w-full object-cover"
        />
        {!ready && !error && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="h-10 w-10 animate-spin rounded-full border-2 border-white border-t-transparent" />
          </div>
        )}
      </div>

      <div className="flex shrink-0 flex-col items-center gap-3 px-4 pb-[calc(env(safe-area-inset-bottom,16px)+20px)] pt-4">
        <button
          type="button"
          disabled={!ready}
          onClick={takePhoto}
          className="press-fluid flex h-[72px] w-[72px] items-center justify-center rounded-full border-4 border-white bg-white/20 disabled:opacity-40"
          aria-label="Rasmga olish"
        >
          <span className="h-14 w-14 rounded-full bg-white" />
        </button>
        <p className="text-center text-[13px] text-white/70">
          Mahsulotni kameraga tuting va tugmani bosing
        </p>
      </div>
    </div>
  );
}
