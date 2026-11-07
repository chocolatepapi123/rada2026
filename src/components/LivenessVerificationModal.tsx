import React, { useState, useRef, useEffect } from 'react';
import { 
  X, 
  Camera, 
  Upload, 
  ShieldCheck, 
  CheckCircle2, 
  Sparkles, 
  Scan, 
  AlertCircle, 
  RefreshCw, 
  ArrowRight, 
  Lock, 
  UserCheck,
  Smile
} from 'lucide-react';
import { UserProfile } from '../types';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import * as cloud from '../lib/cloudSync';
import type { ToastOptions } from './Toast.tsx';
import { loadFaceApi, profileDescriptor, runSelfieCheck, failureMessage } from '../lib/faceCheck';

export interface LivenessVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUserProfile: UserProfile;
  userId?: string;
  onVerificationSuccess: (verified: {
    avatar: string;
    isLivenessVerified: boolean;
    relationshipStatus: 'single';
  }) => Promise<void> | void;
  showToast: (msg: string, options?: ToastOptions) => void;
}

export const LivenessVerificationModal: React.FC<LivenessVerificationModalProps> = ({
  isOpen,
  onClose,
  currentUserProfile,
  userId,
  onVerificationSuccess,
  showToast,
}) => {
  // If user already has an avatar, start on camera directly, otherwise let them confirm/upload photo
  const [step, setStep] = useState<'photo' | 'camera' | 'verifying' | 'success'>('camera');
  const [selectedAvatar, setSelectedAvatar] = useState<string>(currentUserProfile.avatar || '');
  const [capturedLivePhoto, setCapturedLivePhoto] = useState<string | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [verificationProgress, setVerificationProgress] = useState(0);
  const [verificationStageText, setVerificationStageText] = useState('Detecting facial boundaries...');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [autoCloseCountdown, setAutoCloseCountdown] = useState<number | null>(null);
  const [checking, setChecking] = useState(false);
  const [checkPrompt, setCheckPrompt] = useState('');
  const [checkError, setCheckError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [lowLight, setLowLight] = useState(false);
  const streamRef = useRef<MediaStream | null>(null);
  const photoInputRef = useRef<HTMLInputElement | null>(null);
  const autoCloseTimerRef = useRef<any>(null);

  // Sync avatar and start camera when modal opens
  useEffect(() => {
    if (isOpen) {
      const avatar = currentUserProfile.avatar || '';
      setSelectedAvatar(avatar);
      // If user has no avatar yet, prompt them to pick a profile photo first, otherwise go straight to camera
      if (!avatar || avatar.trim() === '') {
        setStep('photo');
      } else {
        setStep('camera');
      }
      setCapturedLivePhoto(null);
      setCheckError(null);
      setChecking(false);
      setCheckPrompt('');
      setCameraError(null);
      setVerificationProgress(0);
      setAutoCloseCountdown(null);

      // Start camera if on camera step
      if (avatar && avatar.trim() !== '') {
        setTimeout(() => {
          startCamera();
        }, 120);
      }
    } else {
      stopCamera();
      if (autoCloseTimerRef.current) {
        clearTimeout(autoCloseTimerRef.current);
      }
    }
  }, [isOpen, currentUserProfile.avatar]);

  // Clean up camera stream and timers on unmount
  useEffect(() => {
    return () => {
      stopCamera();
      if (autoCloseTimerRef.current) {
        clearTimeout(autoCloseTimerRef.current);
      }
    };
  }, []);

  const stopCamera = () => {
    abortRef.current?.abort();
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
  };

  const startCamera = async () => {
    setCameraError(null);
    setIsCameraActive(true);

    try {
      if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
        throw new Error('Camera access is not supported by your browser or environment.');
      }

      // Ask for a good picture, but accept whatever the camera can give: cheap or old cameras still work.
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 24, min: 8 } },
          audio: false,
        });
      } catch (firstErr: any) {
        if (firstErr?.name === 'NotAllowedError' || firstErr?.name === 'PermissionDeniedError') throw firstErr;
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      }
      // Best effort: let the camera brighten itself in dim rooms (ignored where unsupported).
      try {
        const track = stream.getVideoTracks()[0];
        const caps: any = (track as any).getCapabilities?.() || {};
        const adv: any[] = [];
        if (caps.exposureMode?.includes?.('continuous')) adv.push({ exposureMode: 'continuous' });
        if (caps.whiteBalanceMode?.includes?.('continuous')) adv.push({ whiteBalanceMode: 'continuous' });
        if (caps.exposureCompensation && typeof caps.exposureCompensation.max === 'number') {
          adv.push({ exposureCompensation: Math.min(caps.exposureCompensation.max, (caps.exposureCompensation.min + caps.exposureCompensation.max) / 2 + (caps.exposureCompensation.max - caps.exposureCompensation.min) * 0.25) });
        }
        if (adv.length) await track.applyConstraints({ advanced: adv } as any);
      } catch { /* not supported */ }

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(e => {
          console.warn('Video play error:', e);
        });
      }
    } catch (err: any) {
      console.warn('Camera stream error:', err);
      const isDenied = err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError';
      setCameraError(
        isDenied
          ? 'Camera permission was denied. Allow camera access for RADA in your browser or phone settings, then tap Turn camera on.'
          : 'We could not start the camera. Close other apps that use it, then tap Turn camera on.'
      );
      setIsCameraActive(false);
    }
  };

  const handleProfilePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showToast('Please select a valid image file (JPG, PNG, WEBP).', { type: 'error' });
      return;
    }

    const reader = new FileReader();
    reader.onload = (evt) => {
      if (evt.target?.result) {
        setSelectedAvatar(evt.target.result as string);
        setStep('camera');
        setTimeout(() => {
          startCamera();
        }, 120);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleProceedToCamera = () => {
    if (!selectedAvatar || selectedAvatar.trim() === '') {
      showToast('A profile picture is required to match against your live facial capture.', { type: 'error' });
      return;
    }
    setStep('camera');
    setTimeout(() => {
      startCamera();
    }, 120);
  };

  /** Grabs the current camera frame as a small preview for the "matching" screen. Not uploaded or saved. */
  const grabPreview = (): string | null => {
    try {
      const video = videoRef.current;
      if (!video || video.readyState < 2) return null;
      const c = document.createElement('canvas');
      c.width = 160;
      c.height = Math.round(160 * ((video.videoHeight || 4) / (video.videoWidth || 3)));
      const ctx = c.getContext('2d');
      if (!ctx) return null;
      ctx.translate(c.width, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(video, 0, 0, c.width, c.height);
      return c.toDataURL('image/jpeg', 0.8);
    } catch {
      return null;
    }
  };

  /** Real check: face in profile photo, head-turn liveness, and match against the profile photo. */
  const handleStartCheck = async () => {
    if (checking) return;
    setCheckError(null);
    const video = videoRef.current;
    if (!video || !isCameraActive) {
      setCheckError('The camera is not on yet. Allow camera access and try again.');
      return;
    }
    if (!selectedAvatar || selectedAvatar.trim() === '') {
      setCheckError(failureMessage('no_profile_face'));
      return;
    }
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setChecking(true);
    try {
      setCheckPrompt('Getting ready…');
      try {
        await loadFaceApi();
      } catch {
        setCheckError(failureMessage('models'));
        return;
      }
      let profile: Float32Array | null = null;
      try {
        profile = await profileDescriptor(selectedAvatar);
      } catch {
        setCheckError(failureMessage('profile_image'));
        return;
      }
      if (!profile) {
        setCheckError(failureMessage('no_profile_face'));
        return;
      }
      const result = await runSelfieCheck(video, profile, setCheckPrompt, ctrl.signal, setLowLight);
      if (!result.ok) {
        if (result.reason !== 'cancelled') setCheckError(failureMessage(result.reason));
        return;
      }
      const preview = grabPreview();
      stopCamera();
      setCapturedLivePhoto(preview);
      await finishVerified();
    } finally {
      setChecking(false);
      setCheckPrompt('');
      setLowLight(false);
    }
  };

  // Persistence to Supabase profiles table: relationship_status = 'Single' and is_liveness_verified = true
  const persistToSupabase = async (avatarUrlToSave: string) => {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const uid = userId || sessionData?.session?.user?.id || currentUserProfile.id;

      if (uid && isSupabaseConfigured) {
        // photo + status only; the flag itself is switched on by the server function below
        const { error: upsertErr } = await supabase.from('profiles').upsert({
          id: uid,
          relationship_status: 'Single',
          ...(avatarUrlToSave ? { avatar_url: avatarUrlToSave } : {}),
          updated_at: new Date().toISOString()
        }, { onConflict: 'id' });
        if (upsertErr) console.warn('profiles upsert warning:', upsertErr.message);

        const { error: confirmErr } = await supabase.rpc('confirm_selfie_check');
        if (confirmErr) console.warn('confirm_selfie_check failed:', confirmErr.message);

        // Also call cloud sync utility
        await cloud.updateProfileVerification(uid, 'Single', true, avatarUrlToSave);
      }
    } catch (err) {
      console.warn('Supabase profile persistence notice:', err);
    }
  };

  const finishVerified = async () => {
    setStep('verifying');
    setVerificationProgress(100);
    setVerificationStageText('Face matched. Saving…');

    const finalAvatar = selectedAvatar;

    // Persist to Supabase profiles table
    await persistToSupabase(finalAvatar);

    // Update parent state to unlock Discover
    try {
      await onVerificationSuccess({
        avatar: finalAvatar,
        isLivenessVerified: true,
        relationshipStatus: 'single',
      });
    } catch (err) {
      console.warn('onVerificationSuccess callback notice:', err);
    }

    showToast('Selfie check passed', { category: 'profile' });
    setStep('success');

    setAutoCloseCountdown(2);
    autoCloseTimerRef.current = setTimeout(() => {
      stopCamera();
      onClose();
    }, 1500);
  };

  const handleManualClose = () => {
    if (autoCloseTimerRef.current) {
      clearTimeout(autoCloseTimerRef.current);
    }
    stopCamera();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
      <div 
        className="bg-white dark:bg-[#14171F] text-[#0F172A] dark:text-[#F8FAFC] rounded-3xl max-w-md w-full overflow-hidden shadow-2xl border border-slate-200/90 dark:border-[#222735] flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-[#222735] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#FF5733]/10 dark:bg-[#A94F3E]/10 text-[#FF5733] dark:text-[#D17A68] flex items-center justify-center shadow-xs">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="text-sm font-black tracking-tight">Single Verification Gate</h3>
                <span className="text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-[#10B981]/15 text-[#10B981]">
                  Discover Access
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                Quick selfie check for Nairobi singles
              </p>
            </div>
          </div>
          <button
            onClick={handleManualClose}
            className="w-8 h-8 rounded-full bg-slate-100 dark:bg-[#0A0C10] hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 flex items-center justify-center transition cursor-pointer"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
          {/* STEP 1: PROFILE PICTURE REQUIREMENT (Only if avatar missing) */}
          {step === 'photo' && (
            <div className="space-y-4 text-center">
              <div className="p-3 bg-orange-500/10 border border-orange-500/20 rounded-2xl text-left flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-[#FF5733] dark:text-[#D17A68] shrink-0 mt-0.5" />
                <div className="text-[11px] text-slate-700 dark:text-slate-300 leading-relaxed">
                  <strong className="text-slate-900 dark:text-slate-100">Step 1 of 2: Profile Photo</strong>
                  <p className="mt-0.5">
                    To maintain an authentic community in Nairobi, single members must have a clear profile picture before taking the selfie check.
                  </p>
                </div>
              </div>

              {/* Avatar Preview */}
              <div className="relative w-32 h-32 mx-auto">
                <div
                  className="w-32 h-32 rounded-3xl bg-cover bg-center border-4 border-[#FF5733] dark:border-[#D17A68] shadow-lg overflow-hidden bg-slate-900"
                  style={{ backgroundImage: selectedAvatar ? `url('${selectedAvatar}')` : undefined }}
                >
                  {!selectedAvatar && (
                    <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 text-xs font-bold p-2">
                      <Camera className="w-6 h-6 mb-1 text-slate-500" />
                      <span>No Photo</span>
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => photoInputRef.current?.click()}
                  className="absolute -bottom-2 -right-2 p-2 bg-[#FF5733] dark:bg-[#A94F3E] hover:bg-[#FF6B4A] dark:hover:bg-[#B85A48] text-white rounded-2xl shadow-lg transition cursor-pointer"
                  title="Upload New Photo"
                >
                  <Upload className="w-4 h-4" />
                </button>
              </div>

              <input
                type="file"
                ref={photoInputRef}
                accept="image/*"
                className="hidden"
                onChange={handleProfilePhotoChange}
              />

              <div className="space-y-1">
                <h4 className="font-black text-sm">Your Display Profile Picture</h4>
                <p className="text-[11px] text-slate-500">
                  Make sure your face is clearly visible, well lit, and centered.
                </p>
              </div>

              <div className="pt-2 flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => photoInputRef.current?.click()}
                  className="w-full py-2.5 px-4 bg-slate-100 dark:bg-[#0A0C10] hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold rounded-xl text-xs transition flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Upload className="w-3.5 h-3.5 text-[#FF5733] dark:text-[#D17A68]" />
                  <span>Choose / Change Profile Photo</span>
                </button>

                <button
                  type="button"
                  onClick={handleProceedToCamera}
                  disabled={!selectedAvatar}
                  className="w-full py-3 px-4 bg-[#FF5733] dark:bg-[#A94F3E] hover:bg-[#FF6B4A] dark:hover:bg-[#B85A48] disabled:opacity-50 text-white font-black rounded-xl text-xs shadow-md transition flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>Continue to Camera Liveness Check</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: CAMERA FEED & SLEEK OVAL FACE-FRAME OVERLAY */}
          {step === 'camera' && (
            <div className="space-y-3.5 text-center">
              {/* Directing Prompt Banner */}
              <div className="bg-[#FF5733]/10 dark:bg-[#A94F3E]/10 border border-[#FF5733]/25 dark:border-[#D17A68]/25 rounded-2xl p-2.5 sm:p-3 text-center shadow-xs">
                <p className="text-xs sm:text-[13px] font-bold text-slate-800 dark:text-slate-200 flex items-center justify-center gap-1.5">
                  <Smile className="w-4 h-4 text-[#FF5733] dark:text-[#D17A68] shrink-0" />
                  <span>{checking ? (checkPrompt || 'Hold still…') : 'Put your face in the frame, then tap Start. You will turn your head to one side and back.'}</span>
                </p>
              </div>

              {/* Sleek Oval Face-Frame Overlay. In a dark room the oval gets a bright white frame that lights the face. */}
              <div className={`mx-auto w-fit transition-all duration-300 ${lowLight ? 'bg-white rounded-[2.5rem] p-5 shadow-[0_0_60px_18px_rgba(255,255,255,0.85)]' : ''}`}>
              <div className="relative w-56 h-72 sm:w-64 sm:h-80 mx-auto rounded-[50%/58%] overflow-hidden bg-black border-4 border-[#FF5733] dark:border-[#D17A68] shadow-2xl flex items-center justify-center group ring-4 ring-[#FF5733]/25 dark:ring-[#D17A68]/25">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover scale-x-[-1]"
                />

                {/* Biometric Oval Guide Overlay */}
                <div className="absolute inset-3 border-2 border-dashed border-[#FF5733]/80 dark:border-[#D17A68]/80 rounded-[50%/58%] pointer-events-none flex flex-col items-center justify-between p-3.5 animate-pulse">
                  <div className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-black/60 text-white backdrop-blur-xs">
                    Face frame
                  </div>
                  <div className="w-2.5 h-2.5 rounded-full bg-[#FF5733] dark:bg-[#A94F3E] shadow-[0_0_8px_#FF5733]" />
                  <div className="text-[9px] font-bold text-white/90 bg-black/60 px-2 py-0.5 rounded-full backdrop-blur-xs">
                    Align Face Here
                  </div>
                </div>

                {/* Laser Scanning Sweep Line */}
                <div className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-[#FF5733] dark:via-[#A94F3E] to-transparent animate-bounce opacity-90 shadow-[0_0_10px_#FF5733]" />

                {/* Camera Starting State */}
                {!isCameraActive && !cameraError && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-white bg-slate-900/90 space-y-2">
                    <RefreshCw className="w-6 h-6 animate-spin text-[#FF5733] dark:text-[#D17A68]" />
                    <p className="text-xs font-bold">Starting camera…</p>
                  </div>
                )}
              </div>
              </div>

              {/* Graceful Camera Error Handling */}
              {cameraError && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-2xl text-left text-red-600 dark:text-red-400 space-y-1.5 text-[11px]">
                  <p className="font-bold flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>Camera access needed</span>
                  </p>
                  <p>{cameraError}</p>
                </div>
              )}

              {checkError && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-2xl text-left text-red-600 dark:text-red-400 text-[11px] flex items-start gap-1.5">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{checkError}</span>
                </div>
              )}

              {/* Actions & Buttons */}
              <div className="pt-1 flex flex-col gap-2">
                {isCameraActive ? (
                  <button
                    type="button"
                    onClick={handleStartCheck}
                    disabled={isSubmitting || checking}
                    className="w-full py-3.5 px-4 bg-[#FF5733] dark:bg-[#A94F3E] hover:bg-[#FF6B4A] dark:hover:bg-[#B85A48] disabled:opacity-50 text-white font-black rounded-xl text-xs sm:text-sm shadow-md transition flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Camera className="w-4 h-4" />
                    <span>{checking ? 'Checking…' : checkError ? 'Try again' : 'Start selfie check'}</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => startCamera()}
                    className="w-full py-3 px-4 bg-[#FF5733] dark:bg-[#A94F3E] hover:bg-[#FF6B4A] dark:hover:bg-[#B85A48] text-white font-black rounded-xl text-xs shadow-md transition flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Turn camera on</span>
                  </button>
                )}

                {selectedAvatar && (
                  <button
                    type="button"
                    onClick={() => {
                      stopCamera();
                      setStep('photo');
                    }}
                    className="text-[11px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 font-semibold transition py-0.5 cursor-pointer"
                  >
                    Change Reference Photo
                  </button>
                )}
              </div>
            </div>
          )}

          {/* STEP 3: BIOMETRIC VERIFYING ANIMATION */}
          {step === 'verifying' && (
            <div className="py-6 space-y-5 text-center">
              <div className="relative w-28 h-28 mx-auto flex items-center justify-center">
                <div className="absolute inset-0 rounded-full border-4 border-[#FF5733]/20 dark:border-[#D17A68]/20 border-t-[#FF5733] dark:border-t-[#D17A68] animate-spin" />
                <Scan className="w-10 h-10 text-[#FF5733] dark:text-[#D17A68] animate-pulse" />
              </div>

              <div className="space-y-1.5">
                <h4 className="font-black text-sm text-slate-900 dark:text-slate-100">Matching your face</h4>
                <p className="text-xs text-slate-500 font-medium">
                  {verificationStageText}
                </p>
              </div>

              {/* Progress bar */}
              <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2.5 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-[#FF5733] dark:from-[#A94F3E] to-[#10B981] h-2.5 rounded-full transition-all duration-300"
                  style={{ width: `${verificationProgress}%` }}
                />
              </div>

              {/* Side by side comparison preview */}
              <div className="flex items-center justify-center gap-3 pt-2">
                <div className="text-center">
                  <div
                    className="w-16 h-16 rounded-2xl bg-cover bg-center border-2 border-slate-300 dark:border-slate-700 mx-auto"
                    style={{ backgroundImage: selectedAvatar ? `url('${selectedAvatar}')` : undefined }}
                  />
                  <span className="text-[10px] font-bold text-slate-400 mt-1 block">Profile Photo</span>
                </div>

                <div className="text-[#FF5733] dark:text-[#D17A68] font-black text-xs">⟷</div>

                <div className="text-center">
                  <div
                    className="w-16 h-16 rounded-2xl bg-cover bg-center border-2 border-[#10B981] mx-auto shadow-sm"
                    style={{ backgroundImage: capturedLivePhoto ? `url('${capturedLivePhoto}')` : undefined }}
                  />
                  <span className="text-[10px] font-bold text-[#10B981] mt-1 block">Live Snapshot</span>
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: VERIFICATION SUCCESS (Visual Confirmation + Auto-Close) */}
          {step === 'success' && (
            <div className="py-4 space-y-4 text-center animate-in zoom-in-95 duration-200">
              <div className="w-20 h-20 rounded-full bg-emerald-500/15 text-emerald-500 border-2 border-emerald-500/30 flex items-center justify-center mx-auto shadow-xl ring-8 ring-emerald-500/10">
                <CheckCircle2 className="w-10 h-10" />
              </div>

              <div className="space-y-1">
                <h4 className="font-black text-lg text-slate-900 dark:text-slate-100">
                  Selfie check passed
                </h4>
                <p className="text-xs text-slate-500 font-medium">
                  Your selfie matched your profile photo and your Single status is set.
                </p>
              </div>

              {/* Verified Badge Summary */}
              <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-left space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                    <UserCheck className="w-4 h-4" />
                    <span>Single Profile Activated</span>
                  </span>
                  <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-emerald-500 text-white">
                    Selfie checked
                  </span>
                </div>
                <p className="text-[11px] text-emerald-700 dark:text-emerald-400/90 leading-relaxed">
                  Discover access is now unlocked! You can browse single Nairobi community members and match instantly.
                </p>
              </div>

              <button
                type="button"
                onClick={handleManualClose}
                className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl text-xs sm:text-sm shadow-md transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <Sparkles className="w-4 h-4" />
                <span>Close & Browse Discover Now</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
