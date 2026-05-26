import { useCallback, useEffect, useRef, useState } from 'react';
import { Camera, Image as ImageIcon } from 'lucide-react';
import { IconSearch } from './icons/TabIcons';
import { useTelegram } from '../hooks/useTelegram';
import ImageCameraCapture from './ImageCameraCapture';

function CameraOptionContent() {
  return (
    <>
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-ios-blue/10 text-ios-blue">
        <Camera className="h-5 w-5" strokeWidth={2} />
      </span>
      <span>
        <span className="block text-[15px] font-semibold text-neutral-900">
          Kameradan rasmga olish
        </span>
        <span className="block text-[12px] text-neutral-500">Take a Photo</span>
      </span>
    </>
  );
}

function ImageSearchSheet({
  open,
  onClose,
  onTakePhoto,
  onChooseGallery,
  cameraInputId,
  galleryInputId,
  useNativeCameraLabel,
}) {
  const [entered, setEntered] = useState(false);

  useEffect(() => {
    if (!open) {
      setEntered(false);
      return undefined;
    }
    const id = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(id);
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex flex-col justify-end">
      <button
        type="button"
        aria-label="Yopish"
        className={`absolute inset-0 bg-black/40 transition-opacity duration-300 ${
          entered ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={onClose}
      />
      <div
        className={`relative rounded-t-[20px] bg-white px-4 pb-[calc(env(safe-area-inset-bottom,16px)+12px)] pt-3 shadow-[0_-8px_32px_rgba(0,0,0,0.12)] transition-transform duration-300 ease-in-out ${
          entered ? 'translate-y-0' : 'translate-y-full'
        }`}
        role="dialog"
        aria-modal="true"
        aria-label="Rasm orqali qidirish"
      >
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-neutral-200" />
        <h3 className="mb-1 text-[17px] font-semibold text-neutral-900">AI Kamera qidiruv</h3>
        <p className="mb-4 text-[13px] text-neutral-500">
          Mahsulot rasmini yuklang — tizim tahlil qiladi
        </p>
        <div className="space-y-2">
          {useNativeCameraLabel ? (
            <label
              htmlFor={cameraInputId}
              onClick={onTakePhoto}
              className="press-fluid flex w-full cursor-pointer items-center gap-3 rounded-2xl bg-neutral-50 px-4 py-3.5 text-left transition-colors hover:bg-neutral-100"
            >
              <CameraOptionContent />
            </label>
          ) : (
            <button
              type="button"
              onClick={onTakePhoto}
              className="press-fluid flex w-full items-center gap-3 rounded-2xl bg-neutral-50 px-4 py-3.5 text-left transition-colors hover:bg-neutral-100"
            >
              <CameraOptionContent />
            </button>
          )}
          <label
            htmlFor={galleryInputId}
            onClick={onChooseGallery}
            className="press-fluid flex w-full cursor-pointer items-center gap-3 rounded-2xl bg-neutral-50 px-4 py-3.5 text-left transition-colors hover:bg-neutral-100"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-ios-blue/10 text-ios-blue">
              <ImageIcon className="h-5 w-5" strokeWidth={2} />
            </span>
            <span>
              <span className="block text-[15px] font-semibold text-neutral-900">
                Galereyadan rasm yuklash
              </span>
              <span className="block text-[12px] text-neutral-500">Choose from Gallery</span>
            </span>
          </label>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="press-fluid mt-3 w-full rounded-xl py-3 text-[15px] font-medium text-neutral-500"
        >
          Bekor qilish
        </button>
      </div>
    </div>
  );
}

export default function SearchBar({
  value,
  onChange,
  placeholder = 'Mahsulot qidirish...',
  onImageSelect,
  imageAnalyzing = false,
}) {
  const { haptic, isTelegram } = useTelegram();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const cameraInputRef = useRef(null);
  const galleryInputRef = useRef(null);
  const cameraInputId = 'search-camera-input';
  const galleryInputId = 'search-gallery-input';
  const imageSearchEnabled = Boolean(onImageSelect);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file && onImageSelect) onImageSelect(file);
    e.target.value = '';
  };

  /** Tizim kamerasini to'g'ridan-to'g'ri ochish (WebView uchun muhim: sinxron click) */
  const triggerNativeCamera = useCallback(() => {
    const input = cameraInputRef.current;
    if (!input) return;
    input.click();
  }, []);

  const openCamera = () => {
    haptic('light');
    requestAnimationFrame(() => setSheetOpen(false));

    if (!isTelegram && navigator.mediaDevices?.getUserMedia) {
      setCameraOpen(true);
    }
  };

  const openGallery = () => {
    haptic('light');
    requestAnimationFrame(() => setSheetOpen(false));
  };

  const handleCameraCapture = (file) => {
    if (onImageSelect) onImageSelect(file);
  };

  return (
    <div className="w-full">
      {imageSearchEnabled && (
        <>
          <input
            id={galleryInputId}
            ref={galleryInputRef}
            type="file"
            accept="image/*"
            className="sr-only"
            tabIndex={-1}
            onChange={handleFileChange}
          />
          <input
            id={cameraInputId}
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="sr-only"
            tabIndex={-1}
            onChange={handleFileChange}
          />
        </>
      )}

      <div className="glass-float relative w-full">
        <span className="pointer-events-none absolute left-4 top-1/2 z-10 -translate-y-1/2">
          <IconSearch />
        </span>
        <input
          type="search"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          disabled={imageAnalyzing}
          className={`w-full border-0 bg-transparent py-3.5 pl-11 text-[15px] font-medium text-neutral-800 shadow-none outline-none transition-fluid placeholder:text-neutral-400 focus:ring-2 focus:ring-ios-blue/25 disabled:opacity-60 ${
            imageSearchEnabled ? 'pr-12' : 'pr-4'
          }`}
        />
        {imageSearchEnabled && (
          <button
            type="button"
            onClick={() => {
              haptic('light');
              setSheetOpen(true);
            }}
            disabled={imageAnalyzing}
            className="absolute right-2 top-1/2 z-10 flex h-9 w-9 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full text-ios-blue transition-colors hover:bg-ios-blue/10 disabled:cursor-not-allowed disabled:opacity-40"
            aria-label="Rasm orqali qidirish"
          >
            <Camera className="h-5 w-5" strokeWidth={2} />
          </button>
        )}
      </div>

      {imageAnalyzing && (
        <div
          className="mt-2.5 flex items-center justify-center gap-2.5 rounded-2xl border border-ios-blue/15 bg-ios-blue/5 px-4 py-3"
          role="status"
          aria-live="polite"
        >
          <span className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-ios-blue border-t-transparent" />
          <span className="text-[14px] font-medium text-ios-blue">Rasm tahlil qilinmoqda...</span>
        </div>
      )}

      {imageSearchEnabled && (
        <>
          <ImageSearchSheet
            open={sheetOpen}
            onClose={() => setSheetOpen(false)}
            onTakePhoto={openCamera}
            onChooseGallery={openGallery}
            cameraInputId={cameraInputId}
            galleryInputId={galleryInputId}
            useNativeCameraLabel={isTelegram}
          />
          <ImageCameraCapture
            open={cameraOpen}
            onClose={() => setCameraOpen(false)}
            onCapture={handleCameraCapture}
            onFallback={triggerNativeCamera}
          />
        </>
      )}
    </div>
  );
}
