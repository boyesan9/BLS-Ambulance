import React, { useState, useEffect, useRef } from 'react';
import {
  Lock,
  KeyRound,
  Eye,
  EyeOff,
  X,
  AlertCircle,
  CheckCircle2,
  ShieldCheck,
  User,
  ArrowRight,
} from 'lucide-react';
import { UserProfile } from '../types';

interface StaffPinAuthModalProps {
  isOpen: boolean;
  staff: UserProfile | null;
  onClose: () => void;
  onVerifySuccess: (staff: UserProfile) => void;
  onFirstTimeSetup: (staff: UserProfile, newPin: string) => Promise<void> | void;
}

export const StaffPinAuthModal: React.FC<StaffPinAuthModalProps> = ({
  isOpen,
  staff,
  onClose,
  onVerifySuccess,
  onFirstTimeSetup,
}) => {
  const [pinInput, setPinInput] = useState('');
  const [confirmPinInput, setConfirmPinInput] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [showConfirmPin, setShowConfirmPin] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const primaryInputRef = useRef<HTMLInputElement | null>(null);

  const isFirstTimeSetup = !staff?.pin_code || staff.pin_code.trim() === '';

  useEffect(() => {
    if (isOpen) {
      setPinInput('');
      setConfirmPinInput('');
      setShowPin(false);
      setShowConfirmPin(false);
      setErrorMessage(null);
      setIsSaving(false);
      setTimeout(() => {
        primaryInputRef.current?.focus();
      }, 60);
    }
  }, [isOpen, staff?.id]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isSaving) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isSaving, onClose]);

  if (!isOpen || !staff) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const cleanedPin = pinInput.trim();

    if (isFirstTimeSetup) {
      if (!cleanedPin) {
        setErrorMessage('กรุณาตั้งรหัสผ่าน (PIN/Password) ใหม่ก่อนเข้าใช้งาน');
        return;
      }
      if (cleanedPin.length < 4) {
        setErrorMessage('รหัสผ่านต้องมีความยาวอย่างน้อย 4 ตัวอักษรหรือตัวเลข');
        return;
      }
      if (cleanedPin !== confirmPinInput.trim()) {
        setErrorMessage('รหัสผ่านทั้งสองช่องไม่ตรงกัน กรุณาตรวจสอบอีกครั้ง');
        return;
      }

      try {
        setIsSaving(true);
        await onFirstTimeSetup(staff, cleanedPin);
      } catch (err: any) {
        setErrorMessage(err?.message || 'ไม่สามารถบันทึกรหัสผ่านได้ กรุณาลองใหม่อีกครั้ง');
      } finally {
        setIsSaving(false);
      }
      return;
    }

    // Standard PIN/Password Verification
    if (!cleanedPin) {
      setErrorMessage('กรุณากรอกรหัสผ่าน (PIN/Password) ของคุณ');
      return;
    }

    if (cleanedPin === (staff.pin_code || '').trim()) {
      onVerifySuccess(staff);
    } else {
      setErrorMessage('รหัสผ่านไม่ถูกต้อง กรุณาลองใหม่อีกครั้ง (หากลืมรหัส กรุณาแจ้งผู้ดูแลระบบรีเซ็ตรหัสผ่าน)');
      setPinInput('');
      primaryInputRef.current?.focus();
    }
  };

  return (
    <div
      className="fixed inset-0 z-60 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm animate-in fade-in"
      onClick={() => {
        if (!isSaving) onClose();
      }}
    >
      <div
        className="relative w-full max-w-md overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className={`relative p-6 text-center text-white ${
            isFirstTimeSetup
              ? 'bg-gradient-to-br from-amber-700 via-amber-800 to-slate-900'
              : 'bg-gradient-to-br from-slate-900 via-slate-850 to-sky-950'
          }`}
        >
          <button
            type="button"
            disabled={isSaving}
            onClick={onClose}
            className="absolute top-4 right-4 rounded-full p-1.5 text-white/70 hover:bg-white/10 hover:text-white transition-colors disabled:opacity-40"
            aria-label="ปิดหน้าต่าง"
          >
            <X className="h-5 w-5" />
          </button>

          <div
            className={`mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl ring-1 ${
              isFirstTimeSetup
                ? 'bg-amber-400/20 ring-amber-300/50 text-amber-200'
                : 'bg-sky-500/20 ring-sky-400/40 text-sky-300'
            }`}
          >
            {isFirstTimeSetup ? (
              <KeyRound className="h-7 w-7" />
            ) : (
              <Lock className="h-7 w-7" />
            )}
          </div>

          <h3 className="text-base font-bold tracking-tight">
            {isFirstTimeSetup
              ? 'ตั้งรหัสผ่านครั้งแรก (First-Time Setup)'
              : 'ยืนยันตัวตนด้วยรหัสผ่าน (PIN / Password)'}
          </h3>
          <p className="mt-1 text-xs text-white/80">
            {isFirstTimeSetup
              ? 'บัญชีนี้ยังไม่เคยตั้งรหัสผ่าน กรุณาตั้งรหัสผ่านใหม่เพื่อความปลอดภัย'
              : 'กรุณากรอกรหัสผ่านประจำบัญชีของคุณเพื่อเข้าใช้งานระบบ'}
          </p>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Selected Staff Card */}
          <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50/80 p-3 dark:border-slate-800 dark:bg-slate-800/60">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-sky-600 shadow-xs dark:bg-slate-700 dark:text-sky-400">
              <User className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-bold text-slate-900 dark:text-white">
                {staff.name}
              </p>
              <p className="truncate text-[11px] text-slate-500 dark:text-slate-400">
                {staff.position || 'เจ้าหน้าที่กู้ชีพ'} · รหัส {staff.employeeId}
              </p>
            </div>
            <span
              className={`shrink-0 rounded-lg px-2 py-0.5 text-[10px] font-bold ${
                isFirstTimeSetup
                  ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300'
                  : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300'
              }`}
            >
              {isFirstTimeSetup ? 'ตั้งรหัสใหม่' : 'มีรหัสผ่านแล้ว'}
            </span>
          </div>

          {isFirstTimeSetup && (
            <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50/80 p-3 text-[11px] text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
              <p className="leading-relaxed">
                ตั้งได้ทั้งรหัสตัวเลข (PIN) หรือรหัสผ่านผสมตัวอักษร ความยาวอย่างน้อย <strong>4 ตัวขึ้นไป</strong> เพื่อใช้ยืนยันตัวตนในการเข้าใช้งานครั้งถัดไป
              </p>
            </div>
          )}

          {errorMessage && (
            <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-medium text-red-700 dark:border-red-900/70 dark:bg-red-950/50 dark:text-red-300">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* PIN / Password Input */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              {isFirstTimeSetup ? 'ตั้งรหัสผ่าน / PIN ใหม่ *' : 'กรอกรหัสผ่าน / PIN *'}
            </label>
            <div className="relative">
              <input
                ref={primaryInputRef}
                type={showPin ? 'text' : 'password'}
                value={pinInput}
                onChange={(e) => {
                  setPinInput(e.target.value);
                  if (errorMessage) setErrorMessage(null);
                }}
                autoComplete={isFirstTimeSetup ? 'new-password' : 'current-password'}
                placeholder={
                  isFirstTimeSetup
                    ? 'กรอกรหัส PIN หรือรหัสผ่านอย่างน้อย 4 ตัว'
                    : 'กรอกรหัสผ่านประจำตัวของคุณ'
                }
                className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-3.5 pr-10 font-mono text-sm tracking-wider text-slate-900 shadow-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
              <button
                type="button"
                onClick={() => setShowPin((prev) => !prev)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-700 dark:hover:text-slate-200"
                title={showPin ? 'ซ่อนรหัสผ่าน' : 'แสดงรหัสผ่าน'}
              >
                {showPin ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* Confirm PIN Input (First-Time Setup only) */}
          {isFirstTimeSetup && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                ยืนยันรหัสผ่าน / PIN อีกครั้ง *
              </label>
              <div className="relative">
                <input
                  type={showConfirmPin ? 'text' : 'password'}
                  value={confirmPinInput}
                  onChange={(e) => {
                    setConfirmPinInput(e.target.value);
                    if (errorMessage) setErrorMessage(null);
                  }}
                  autoComplete="new-password"
                  placeholder="กรอกรหัสผ่านเดิมซ้ำอีกครั้ง"
                  className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-3.5 pr-10 font-mono text-sm tracking-wider text-slate-900 shadow-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPin((prev) => !prev)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-700 dark:hover:text-slate-200"
                  title={showConfirmPin ? 'ซ่อนรหัสผ่าน' : 'แสดงรหัสผ่าน'}
                >
                  {showConfirmPin ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {confirmPinInput.length > 0 && pinInput.trim() === confirmPinInput.trim() && pinInput.trim().length >= 4 && (
                <p className="mt-1.5 flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span>รหัสผ่านตรงกัน พร้อมบันทึก</span>
                </p>
              )}
            </div>
          )}

          {!isFirstTimeSetup && (
            <p className="text-[11px] text-slate-400 dark:text-slate-500">
              ลืมรหัสผ่าน? กรุณาแจ้งผู้ดูแลระบบ (Admin) กดปุ่ม <strong>&ldquo;รีเซ็ตรหัสผ่าน&rdquo;</strong> ในหน้าจัดการรายชื่อเจ้าหน้าที่ เพื่อตั้งรหัสผ่านใหม่
            </p>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              disabled={isSaving}
              onClick={onClose}
              className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 disabled:opacity-50"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className={`inline-flex items-center justify-center gap-1.5 rounded-xl px-4 py-2.5 text-xs font-bold text-white shadow-md transition-all active:scale-95 disabled:opacity-50 ${
                isFirstTimeSetup
                  ? 'bg-amber-600 hover:bg-amber-500'
                  : 'bg-sky-600 hover:bg-sky-500'
              }`}
            >
              <span>
                {isSaving
                  ? 'กำลังบันทึกรหัสผ่าน...'
                  : isFirstTimeSetup
                  ? 'บันทึกรหัสผ่านและเข้าสู่ระบบ'
                  : 'ยืนยันและเข้าสู่ระบบ'}
              </span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
