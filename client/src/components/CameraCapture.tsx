import React, { useRef, useState, useEffect } from 'react';
import { Camera, RefreshCw, Upload, X, RotateCw, CheckCircle, AlertTriangle } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

interface CameraCaptureProps {
  label: string;
  stepNumber?: string;
  onImageCaptured: (file: File) => void;
  previewUrl?: string | null;
  onClear?: () => void;
  onRotate?: () => void;
}

// Client-side auto compression: scales high-res mobile photos (5-12MB) to max 1280px (~150-250KB)
// Dramatically speeds up upload and Tesseract OCR processing time from 40s to 2-3s!
const compressImage = async (file: File, maxWidth = 1280, maxHeight = 1280, quality = 0.85): Promise<File> => {
  if (!file.type.startsWith('image/') || file.size < 350 * 1024) {
    return file;
  }

  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > maxWidth || height > maxHeight) {
          if (width > height) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          } else {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return resolve(file);

        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          (blob) => {
            if (blob) {
              const cleanName = file.name.replace(/\.[^/.]+$/, '') + '.jpg';
              resolve(new File([blob], cleanName, { type: 'image/jpeg', lastModified: Date.now() }));
            } else {
              resolve(file);
            }
          },
          'image/jpeg',
          quality
        );
      };
      img.onerror = () => resolve(file);
      img.src = e.target?.result as string;
    };
    reader.onerror = () => resolve(file);
    reader.readAsDataURL(file);
  });
};

export const CameraCapture: React.FC<CameraCaptureProps> = ({
  label,
  stepNumber,
  onImageCaptured,
  previewUrl,
  onClear,
  onRotate,
}) => {
  const { t } = useLanguage();
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [cameraError, setCameraError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Stop camera stream on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  // Close this camera if another camera is started on the page (prevents device hardware lock)
  useEffect(() => {
    const handleCloseOthers = (e: any) => {
      if (e.detail !== label) {
        stopCamera();
      }
    };
    window.addEventListener('camera:close_others', handleCloseOthers);
    return () => {
      window.removeEventListener('camera:close_others', handleCloseOthers);
    };
  }, [label]);

  const startCamera = async () => {
    setCameraError(null);
    stopCamera();

    // Notify other camera instance to close first to prevent hardware lock
    window.dispatchEvent(new CustomEvent('camera:close_others', { detail: label }));

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera API is not supported in this browser environment');
      }

      let stream: MediaStream | null = null;

      // 1. First attempt: standard ideal constraints
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: facingMode },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        });
      } catch (e1) {
        // 2. Second attempt: relaxed constraints without resolution lock
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: facingMode },
            audio: false,
          });
        } catch (e2) {
          // 3. Fallback: open any available camera device (webcam on desktop/laptop)
          stream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: false,
          });
        }
      }

      if (!stream) {
        throw new Error('No video stream acquired');
      }

      streamRef.current = stream;
      setIsCameraActive(true);
    } catch (err: any) {
      console.warn('Camera access issue:', err);
      setCameraError(
        'មិនអាចបើកកាមេរ៉ាបានទេ (សូមអនុញ្ញាត Camera Permissions ក្នុង Browser ឬប្រើប៊ូតុងជ្រើសរូបភាពជំនួស)'
      );
      setIsCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch {}
      });
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
  };

  const capturePhoto = () => {
    if (!videoRef.current) return;

    const video = videoRef.current;
    let width = video.videoWidth || 1280;
    let height = video.videoHeight || 720;

    // Constrain capture dimension to max 1280px for swift OCR execution
    const maxDim = 1280;
    if (width > maxDim || height > maxDim) {
      if (width > height) {
        height = Math.round((height * maxDim) / width);
        width = maxDim;
      } else {
        width = Math.round((width * maxDim) / height);
        height = maxDim;
      }
    }

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, width, height);

    canvas.toBlob(
      (blob) => {
        if (blob) {
          const file = new File([blob], `scan_${Date.now()}.jpg`, { type: 'image/jpeg' });
          onImageCaptured(file);
          stopCamera();
        }
      },
      'image/jpeg',
      0.85
    );
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const compressed = await compressImage(file);
      onImageCaptured(compressed);
      // Reset input value so re-selecting same image triggers change
      e.target.value = '';
    }
  };

  const toggleFacingMode = () => {
    const newMode = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(newMode);
    setTimeout(() => startCamera(), 100);
  };

  return (
    <div className="border border-slate-200/90 rounded-2xl bg-white p-3.5 sm:p-4 shadow-sm hover:shadow transition-shadow">
      <div className="flex items-center justify-between mb-2.5">
        <div className="flex items-center gap-2 min-w-0">
          {stepNumber && (
            <span className="w-5 h-5 rounded-full bg-duc-blue text-white text-[11px] font-bold flex items-center justify-center shrink-0 shadow-sm">
              {stepNumber}
            </span>
          )}
          <span className="text-xs sm:text-sm font-bold text-slate-800 truncate">{label}</span>
        </div>
        {previewUrl ? (
          <span className="inline-flex items-center gap-1 text-[11px] text-emerald-600 font-bold bg-emerald-50 border border-emerald-200/60 px-2 py-0.5 rounded-full shrink-0">
            <CheckCircle className="w-3.5 h-3.5" /> រួចរាល់
          </span>
        ) : (
          <span className="text-[10px] text-slate-400 font-medium shrink-0 bg-slate-100 px-2 py-0.5 rounded-full">
            ទាមទារ
          </span>
        )}
      </div>

      {/* Camera Live Viewfinder */}
      {isCameraActive ? (
        <div className="relative rounded-xl overflow-hidden bg-black aspect-[4/3] flex items-center justify-center shadow-inner">
          <video
            ref={(el) => {
              videoRef.current = el;
              if (el && streamRef.current && el.srcObject !== streamRef.current) {
                el.srcObject = streamRef.current;
                el.onloadedmetadata = () => {
                  el.play().catch((err) => console.warn('Video stream play issue:', err));
                };
                el.play().catch(() => {});
              }
            }}
            playsInline
            autoPlay
            muted
            className="w-full h-full object-cover"
          />

          {/* Viewfinder Guide Overlay with Animated Laser Scanning Line */}
          <div className="absolute inset-4 border-2 border-dashed border-duc-gold/60 rounded-lg pointer-events-none flex items-center justify-center overflow-hidden">
            {/* Animated Laser Scan Bar */}
            <div className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-duc-gold to-transparent shadow-[0_0_12px_#C5A880] animate-scanLine" />
            <div className="absolute top-2 inset-x-0 flex flex-col items-center px-2 text-center pointer-events-none">
              <span className="text-[11px] text-white/95 bg-black/60 px-3 py-1 rounded-full backdrop-blur-sm shadow z-10 font-medium">
                តម្រង់ទំព័រសៀវភៅក្នុងប្រអប់ / Align book
              </span>
            </div>
            <div className="absolute bottom-2 inset-x-0 flex justify-center px-2 text-center pointer-events-none">
              <span className="text-[10px] text-white/75 bg-black/40 px-2 py-0.5 rounded backdrop-blur-sm">
                💡 ប្រសិនបើសារកាមេរ៉ាខ្មៅ សូមពិនិត្យគម្របកាមេរ៉ា (Shutter) ឬចុចប្តូរកាមេរ៉ា 🔄
              </span>
            </div>
          </div>

          {/* Capture Controls */}
          <div className="absolute bottom-3 inset-x-0 flex items-center justify-center gap-4 z-20">
            <button
              type="button"
              onClick={toggleFacingMode}
              className="p-2.5 rounded-full bg-white/20 hover:bg-white/40 text-white backdrop-blur transition cursor-pointer active:scale-90"
              title="ប្តូរកាមេរ៉ាមុខ/ក្រោយ / Switch Camera"
            >
              <RefreshCw className="w-5 h-5" />
            </button>

            <button
              type="button"
              onClick={capturePhoto}
              className="w-14 h-14 rounded-full border-4 border-white bg-red-600 hover:bg-red-700 shadow-lg flex items-center justify-center transition scale-100 active:scale-95 cursor-pointer"
              title="ថតរូប / Capture"
            >
              <div className="w-6 h-6 rounded-full bg-white" />
            </button>

            <button
              type="button"
              onClick={stopCamera}
              className="p-2.5 rounded-full bg-white/20 hover:bg-white/40 text-white backdrop-blur transition cursor-pointer active:scale-90"
              title="បិទកាមេរ៉ា / Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      ) : previewUrl ? (
        /* Image Preview Box with Controls */
        <div className="relative rounded-xl overflow-hidden bg-slate-100 aspect-[16/10] sm:aspect-[4/3] flex items-center justify-center border border-slate-200">
          <img src={previewUrl} alt={label} className="w-full h-full object-contain" />

          <div className="absolute top-2 right-2 flex items-center gap-1.5 bg-black/60 p-1 rounded-lg backdrop-blur-sm">
            {onRotate && (
              <button
                type="button"
                onClick={onRotate}
                className="p-1.5 text-white hover:text-duc-gold rounded hover:bg-white/10 transition cursor-pointer"
                title={t.rotate}
              >
                <RotateCw className="w-4 h-4" />
              </button>
            )}
            {onClear && (
              <button
                type="button"
                onClick={onClear}
                className="p-1.5 text-white hover:text-red-400 rounded hover:bg-white/10 transition cursor-pointer"
                title={t.replaceImage}
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      ) : (
        /* Standby Selection View */
        <div className="rounded-xl border-2 border-dashed border-slate-200 hover:border-duc-gold/60 bg-slate-50/70 p-4 sm:p-5 flex flex-col items-center justify-center text-center transition-colors min-h-[160px]">
          <div className="w-11 h-11 rounded-full bg-white shadow-sm border border-slate-200 flex items-center justify-center text-duc-blue mb-2.5">
            <Camera className="w-5 h-5 text-duc-gold" />
          </div>
          <p className="text-xs text-slate-600 font-medium mb-3">
            ថតផ្ទាល់តាមកាមេរ៉ា ឬជ្រើសរូបភាពពីម៉ាស៊ីន
          </p>

          <div className="flex items-center justify-center gap-2 w-full max-w-xs">
            <button
              type="button"
              onClick={startCamera}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-duc-blue text-white rounded-xl text-xs font-bold hover:bg-duc-navy active:scale-95 transition shadow-sm cursor-pointer"
            >
              <Camera className="w-3.5 h-3.5 text-duc-gold" />
              <span>{t.openCamera}</span>
            </button>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-50 active:scale-95 transition shadow-sm cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5 text-slate-500" />
              <span>{t.uploadFile}</span>
            </button>
          </div>

          {cameraError && (
            <div className="mt-2.5 flex items-center gap-1 text-[11px] text-amber-700 bg-amber-50 border border-amber-200/60 p-2 rounded-lg">
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

