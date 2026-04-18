'use client';

import { useRef, useState } from 'react';
import { Camera, RotateCcw, Check, SkipForward, X } from 'lucide-react';
import { compressImage } from '@/lib/image';

export type CapturedImage = {
  type: 'front' | 'bottom' | 'expiry';
  base64: string;
  mediaType: 'image/jpeg';
  previewUrl: string;
};

const STEPS = [
  {
    type: 'front' as const,
    title: '① 產品正面',
    instruction: '影清楚產品名同品牌。對正光源，唔好有反光。',
    required: true,
  },
  {
    type: 'bottom' as const,
    title: '② 底部 (PAO + 批號)',
    instruction:
      '翻轉產品影底部。搵個開蓋罐仔icon，入面寫住數字（例如 6M、12M、24M）。',
    required: false,
  },
  {
    type: 'expiry' as const,
    title: '③ 到期日 (如有)',
    instruction:
      '有啲產品會印到期日（例如 "EXP 03/2027"）。搵唔到可以skip。',
    required: false,
  },
];

export default function CameraCapture({
  onComplete,
  onCancel,
}: {
  onComplete: (images: CapturedImage[]) => void;
  onCancel: () => void;
}) {
  const [step, setStep] = useState(0);
  const [captured, setCaptured] = useState<CapturedImage[]>([]);
  const [previewing, setPreviewing] = useState<CapturedImage | null>(null);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const currentStep = STEPS[step];

  function openCamera() {
    fileInputRef.current?.click();
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setProcessing(true);
    setError(null);

    try {
      const { base64, mediaType } = await compressImage(file);
      const previewUrl = URL.createObjectURL(file);
      setPreviewing({
        type: currentStep.type,
        base64,
        mediaType,
        previewUrl,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : '相片處理失敗');
    } finally {
      setProcessing(false);
      // Reset input so user can pick again
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  function confirmPhoto() {
    if (!previewing) return;
    const next = [...captured.filter((c) => c.type !== previewing.type), previewing];
    setCaptured(next);
    setPreviewing(null);

    if (step < STEPS.length - 1) {
      setStep(step + 1);
    } else {
      // Done
      onComplete(next);
    }
  }

  function retakePhoto() {
    if (previewing?.previewUrl) URL.revokeObjectURL(previewing.previewUrl);
    setPreviewing(null);
  }

  function skipStep() {
    if (step < STEPS.length - 1) {
      setStep(step + 1);
    } else {
      onComplete(captured);
    }
  }

  function finishEarly() {
    // Used if user wants to submit with only front photo
    if (captured.length === 0 && !previewing) return;
    const final = previewing
      ? [...captured.filter((c) => c.type !== previewing.type), previewing]
      : captured;
    onComplete(final);
  }

  return (
    <div className="fixed inset-0 bg-ink-900/95 z-50 flex flex-col animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between p-4 text-white">
        <button
          onClick={onCancel}
          className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20"
          aria-label="取消"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex-1 text-center">
          <div className="text-caption opacity-70">
            第 {step + 1} / {STEPS.length} 步
          </div>
          <div className="text-title font-medium">{currentStep.title}</div>
        </div>

        <div className="w-10" />
      </div>

      {/* Step indicator dots */}
      <div className="flex justify-center gap-2 pb-4">
        {STEPS.map((s, i) => {
          const isCaptured = captured.some((c) => c.type === s.type);
          const isCurrent = i === step;
          return (
            <div
              key={s.type}
              className={`
                h-1.5 rounded-full transition-all
                ${isCurrent ? 'w-8 bg-white' : 'w-1.5'}
                ${isCaptured ? 'bg-brand-400' : isCurrent ? '' : 'bg-white/30'}
              `}
            />
          );
        })}
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col items-center justify-center px-6">
        {previewing ? (
          // Preview mode
          <div className="w-full max-w-md space-y-4">
            <img
              src={previewing.previewUrl}
              alt="Preview"
              className="w-full rounded-md shadow-float"
            />
            <div className="flex gap-2">
              <button onClick={retakePhoto} className="btn-secondary flex-1">
                <RotateCcw className="w-4 h-4 mr-2" />
                重拍
              </button>
              <button onClick={confirmPhoto} className="btn-primary flex-1">
                <Check className="w-4 h-4 mr-2" />
                {step < STEPS.length - 1 ? '下一步' : '完成'}
              </button>
            </div>
          </div>
        ) : (
          // Capture mode
          <div className="w-full max-w-md text-center space-y-6">
            <div className="text-white/80 text-body leading-relaxed px-4">
              {currentStep.instruction}
            </div>

            {error && (
              <div className="bg-red-500/20 border border-red-500/40 rounded p-3 text-caption text-red-100">
                {error}
              </div>
            )}

            <button
              onClick={openCamera}
              disabled={processing}
              className="w-full py-6 bg-white text-ink-900 rounded-md font-medium shadow-float
                         hover:bg-ink-100 active:bg-ink-200 transition-colors
                         disabled:opacity-50 disabled:cursor-not-allowed
                         flex items-center justify-center gap-3"
            >
              <Camera className="w-6 h-6" />
              {processing ? '處理緊...' : '開camera拍照'}
            </button>

            {!currentStep.required && (
              <button
                onClick={skipStep}
                className="text-white/70 hover:text-white text-caption inline-flex items-center gap-1"
              >
                <SkipForward className="w-4 h-4" />
                跳過呢步
              </button>
            )}
          </div>
        )}
      </div>

      {/* Bottom — finish early */}
      {captured.length > 0 && !previewing && (
        <div className="p-4">
          <button
            onClick={finishEarly}
            className="w-full py-3 bg-brand-500 text-white rounded-md font-medium
                       hover:bg-brand-600 transition-colors"
          >
            即刻識別（已影 {captured.length} 張）
          </button>
        </div>
      )}

      {/* Hidden file input — triggers native camera on mobile */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFileChange}
      />
    </div>
  );
}
