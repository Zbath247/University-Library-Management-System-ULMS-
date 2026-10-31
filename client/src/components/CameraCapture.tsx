import React, { useRef, useState, useEffect } from 'react';
import { Camera, RefreshCw, Upload, X, RotateCw, CheckCircle, AlertTriangle } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

interface CameraCaptureProps {
  label: string;
  onImageCaptured: (file: File) => void;
  previewUrl?: string | null;
  onClear?: () => void;
  onRotate?: () => void;
}

export const CameraCapture: React.FC<CameraCaptureProps> = ({
  label,
  onImageCaptured,
  previewUrl,
  onClear,
  onRotate,
}) => {
  const { t } = useLanguage();
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [cameraError, setCameraError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Stop camera stream on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  const startCamera = async () => {
    setCameraError(null);
    stopCamera();

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera API is not supported in this browser environment');
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: facingMode },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setIsCameraActive(true);
    } catch (err: any) {
      console.warn('Camera access issue:', err);
      setCameraError(
        'មិនអាចបើកកាមេរ៉ាបានទេ (សូមអនុញ្ញាត Camera Permissions ឬប្រើ Upload ជំនួស) / Camera access denied'
      );
      setIsCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
  };

  const capturePhoto = () => {
    if (!videoRef.current) return;

    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob((blob) => {
      if (blob) {
        const file = new File([blob], `scan_${Date.now()}.jpg`, { type: 'image/jpeg' });
        onImageCaptured(file);
        stopCamera();
      }
    }, 'image/jpeg', 0.92);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onImageCaptured(file);
    }
  };

  const toggleFacingMode = () => {
    const newMode = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(newMode);
    startCamera();
  };

  return (
    <div className="border border-slate-200 rounded-xl bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-bold text-slate-800">{label}</span>
        {previewUrl && (
          <span className="inline-flex items-center gap-1 text-xs text-emerald-600 font-semibold bg-emerald-50 px-2 py-0.5 rounded-full">
            <CheckCircle className="w-3.5 h-3.5" /> រួចរាល់ / Ready
          </span>
        )}
      </div>

      {/* Camera Live Viewfinder */}
      {isCameraActive ? (
        <div className="relative rounded-lg overflow-hidden bg-black aspect-[4/3] flex items-center justify-center">
          <video ref={videoRef} playsInline autoPlay muted className="w-full h-full object-cover" />

          {/* Viewfinder Guide Overlay with Animated Laser Scanning Line */}
          <div className="absolute inset-4 border-2 border-dashed border-duc-gold/60 rounded-lg pointer-events-none flex items-center justify-center overflow-hidden">
            {/* Animated Laser Scan Bar */}
            <div className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-duc-gold to-transparent shadow-[0_0_12px_#C5A880] animate-scanLine" />
            <span className="text-[11px] text-white/95 bg-black/60 px-3 py-1 rounded-full backdrop-blur-sm shadow z-10 font-medium">
              តម្រង់ទំព័រសៀវភៅក្នុងប្រអប់ / Align book inside frame
            </span>
          </div>

          {/* Capture Controls */}
          <div className="absolute bottom-3 inset-x-0 flex items-center justify-center gap-4">
            <button
              type="button"
              onClick={toggleFacingMode}
              className="p-2.5 rounded-full bg-white/20 hover:bg-white/40 text-white backdrop-blur transition"
              title="ប្តូរកាមេរ៉ាមុខ/ក្រោយ / Switch Camera"
            >
              <RefreshCw className="w-5 h-5" />
            </button>

            <button
              type="button"
              onClick={capturePhoto}
              className="w-14 h-14 rounded-full border-4 border-white bg-red-600 hover:bg-red-700 shadow-lg flex items-center justify-center transition scale-100 active:scale-95"
              title="ថតរូប / Capture"
            >
              <div className="w-6 h-6 rounded-full bg-white" />
            </button>

            <button
              type="button"
              onClick={stopCamera}
              className="p-2.5 rounded-full bg-white/20 hover:bg-white/40 text-white backdrop-blur transition"
              title="បិទកាមេរ៉ា / Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      ) : previewUrl ? (
        /* Image Preview Box with Controls */
        <div className="relative rounded-lg overflow-hidden bg-slate-100 aspect-[4/3] flex items-center justify-center border border-slate-200">
          <img src={previewUrl} alt={label} className="w-full h-full object-contain" />

          <div className="absolute top-2 right-2 flex items-center gap-1.5 bg-black/60 p-1 rounded-lg backdrop-blur-sm">
            {onRotate && (
              <button
                type="button"
                onClick={onRotate}
                className="p-1.5 text-white hover:text-duc-gold rounded hover:bg-white/10 transition"
                title={t.rotate}
              >
                <RotateCw className="w-4 h-4" />
              </button>
            )}
            {onClear && (
              <button
                type="button"
                onClick={onClear}
                className="p-1.5 text-white hover:text-red-400 rounded hover:bg-white/10 transition"
                title={t.replaceImage}
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      ) : (
        /* Standby Selection View */
        <div className="rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 aspect-[4/3] flex flex-col items-center justify-center p-4 text-center">
          <Camera className="w-10 h-10 text-slate-400 mb-2" />
          <p className="text-xs text-slate-600 font-medium mb-3">
            ថតដោយផ្ទាល់ ឬបញ្ចូលរូបភាពពីឧបករណ៍របស់អ្នក
          </p>

          <div className="flex flex-wrap items-center justify-center gap-2">
            <button
              type="button"
              onClick={startCamera}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-duc-blue text-white rounded-lg text-xs font-semibold hover:bg-duc-navy transition shadow-sm"
            >
              <Camera className="w-3.5 h-3.5" />
              <span>{t.openCamera}</span>
            </button>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-300 text-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-100 transition shadow-sm"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>{t.uploadFile}</span>
            </button>
          </div>

          {cameraError && (
            <div className="mt-2 flex items-center gap-1 text-[11px] text-amber-700 bg-amber-50 p-1.5 rounded">
              <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
              <span>{cameraError}</span>
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleFileUpload}
            className="hidden"
          />
        </div>
      )}
    </div>
  );
};

