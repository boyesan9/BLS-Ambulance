import React, { useState } from 'react';
import { UserProfile, UserRole } from '../types';
import { Shield, User, ArrowRight, UserCheck, Phone, Lock, Briefcase, KeyRound } from 'lucide-react';
import { AdminAuthModal } from './AdminAuthModal';
import { StaffPinAuthModal } from './StaffPinAuthModal';
import { User as FirebaseUser } from 'firebase/auth';
import { RedirectLoginIntent } from '../services/firebaseAuth';

interface LoginViewProps {
  onLogin: (user: UserProfile) => void;
  staffList: UserProfile[];
  onSetStaffPin?: (staffId: string, newPin: string) => Promise<UserProfile | undefined>;
  onGoogleLogin?: (
    intent?: Omit<RedirectLoginIntent, 'timestamp'>,
    forcePopup?: boolean
  ) => Promise<'success' | 'redirected' | boolean | void>;
  isGoogleLoading?: boolean;
  googleUser?: FirebaseUser | null;
}

export const LoginView: React.FC<LoginViewProps> = ({
  onLogin,
  staffList,
  onSetStaffPin,
  onGoogleLogin,
  isGoogleLoading = false,
  googleUser = null,
}) => {
  const [selectedRole, setSelectedRole] = useState<UserRole>('staff');
  const [customName, setCustomName] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [showCustomForm, setShowCustomForm] = useState(false);
  const [customError, setCustomError] = useState<string | null>(null);

  // Admin Auth Modal state
  const [adminAuthModalOpen, setAdminAuthModalOpen] = useState(false);
  const [pendingAdminUser, setPendingAdminUser] = useState<UserProfile | null>(null);

  // Staff PIN / Password Auth Modal state
  const [pendingPinStaff, setPendingPinStaff] = useState<UserProfile | null>(null);

  const handleCustomLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setCustomError(null);
    if (!customName.trim()) {
      setCustomError('กรุณากรอกชื่อ-นามสกุลผู้เข้าใช้งาน');
      return;
    }

    const newUser: UserProfile = {
      id: `user-${Date.now()}`,
      name: customName.trim(),
      role: selectedRole,
      employeeId:
        employeeId.trim() ||
        (selectedRole === 'admin'
          ? 'ADM-001'
          : selectedRole === 'executive'
          ? 'EXE-001'
          : 'EMT-001'),
      position:
        selectedRole === 'executive'
          ? 'ผู้บริหาร / ผู้บังคับบัญชา'
          : selectedRole === 'admin'
          ? 'ผู้ดูแลระบบ (Admin)'
          : 'เจ้าหน้าที่กู้ชีพ',
      department: selectedRole === 'executive' ? 'ฝ่ายบริหาร' : 'ชุดปฏิบัติการที่ 1',
      email: `${customName.trim().replace(/\s+/g, '.').toLowerCase()}@ems-fleet.go.th`,
      status: 'active',
    };

    if (selectedRole === 'admin') {
      setPendingAdminUser(newUser);
      setAdminAuthModalOpen(true);
    } else {
      onLogin(newUser);
    }
  };

  const handleSelectStaff = (staff: UserProfile) => {
    if (staff.role === 'admin') {
      setPendingAdminUser(staff);
      setAdminAuthModalOpen(true);
    } else if (staff.role === 'staff' || (staff.pin_code && staff.pin_code.trim() !== '')) {
      setPendingPinStaff(staff);
    } else {
      onLogin(staff);
    }
  };

  const handleQuickAdminLogin = () => {
    const adminProfile: UserProfile = {
      id: googleUser ? `user-admin-${googleUser.uid.slice(0, 8)}` : `user-admin-${Date.now()}`,
      name: googleUser?.displayName || 'ผู้ดูแลระบบ (Admin)',
      role: 'admin',
      employeeId: 'ADM-001',
      position: 'ผู้ดูแลระบบส่วนกลาง (Admin)',
      department: 'ศูนย์กู้ชีพ BLS',
      email: googleUser?.email || '',
      status: 'active',
    };

    setPendingAdminUser(adminProfile);
    setAdminAuthModalOpen(true);
  };

  const handleQuickExecutiveLogin = () => {
    const executiveProfile: UserProfile = {
      id: googleUser ? `user-exec-${googleUser.uid.slice(0, 8)}` : `user-exec-${Date.now()}`,
      name: googleUser?.displayName || 'ผู้บริหาร (Executive)',
      role: 'executive',
      employeeId: 'EXE-001',
      position: 'ผู้บริหาร / ผู้กำกับดูแล',
      department: 'ฝ่ายบริหาร',
      email: googleUser?.email || '',
      status: 'active',
    };

    onLogin(executiveProfile);
  };

  // Group staff by role with strictly unique IDs
  const uniqueStaff = Array.from(new Map((staffList || []).map((s) => [s.id, s])).values());
  const staffByRole = uniqueStaff.filter((s) => s.role === selectedRole);

  return (
    <div className="flex min-h-[90vh] items-center justify-center p-4">
      <div className="w-full max-w-lg overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl dark:border-slate-800 dark:bg-slate-900">
        {/* Header Hero Banner */}
        <div className="bg-gradient-to-br from-slate-900 via-slate-850 to-sky-950 p-6 text-white text-center">
          <div className="mx-auto mb-3 flex items-center justify-center gap-4">
            <img
              src="/assets/aistudio/178779920854_ffc824b3.png"
              alt="ตรา อบต.หงษ์เจริญ อ.ท่าแซะ จ.ชุมพร"
              className="h-20 w-20 sm:h-24 sm:w-24 rounded-2xl bg-white/95 p-1.5 object-contain shadow-lg ring-1 ring-white/30"
            />
            <img
              src="/assets/aistudio/______cca77961.png"
              alt="กู้ชีพ อบต.หงษ์เจริญ 1669 EMS"
              className="h-20 w-20 sm:h-24 sm:w-24 rounded-2xl bg-white/95 p-1.5 object-contain shadow-lg ring-1 ring-white/30"
            />
          </div>
          <h2 className="text-xl font-bold tracking-tight">
            <span className="mb-1 block text-2xl font-bold text-sky-300">
              องค์การบริหารส่วนตำบลหงษ์เจริญ
            </span>
            ระบบตรวจรถยนต์ส่วนกลาง
          </h2>
          <p className="mt-1 text-xs text-sky-200">
            รถกู้ชีพ BLS (Basic Life Support) ส่วนกลาง
          </p>
        </div>

        <div className="p-6 space-y-5">
          {/* Role selector tabs */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
              เลือกระดับการเข้าใช้งาน:
            </label>
            <div className="grid grid-cols-3 gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
              <button
                type="button"
                onClick={() => {
                  setSelectedRole('staff');
                  setShowCustomForm(false);
                }}
                className={`rounded-lg py-2 px-1 text-[11px] sm:text-xs font-bold transition-all flex items-center justify-center gap-1 ${
                  selectedRole === 'staff'
                    ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white'
                    : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
                }`}
              >
                <User className="h-3 w-3 shrink-0" />
                <span>พนักงาน (Staff)</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setSelectedRole('executive');
                  setShowCustomForm(false);
                }}
                className={`rounded-lg py-2 px-1 text-[11px] sm:text-xs font-bold transition-all flex items-center justify-center gap-1 ${
                  selectedRole === 'executive'
                    ? 'bg-white text-indigo-700 shadow-sm dark:bg-slate-700 dark:text-indigo-300'
                    : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
                }`}
              >
                <Briefcase className="h-3 w-3 shrink-0 text-indigo-500" />
                <span>ผู้บริหาร</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setSelectedRole('admin');
                  setShowCustomForm(false);
                }}
                className={`rounded-lg py-2 px-1 text-[11px] sm:text-xs font-bold transition-all flex items-center justify-center gap-1 ${
                  selectedRole === 'admin'
                    ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white'
                    : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
                }`}
              >
                <Lock className="h-3 w-3 shrink-0 text-sky-500" />
                <span>ผู้ดูแล (Admin)</span>
              </button>
            </div>
          </div>

          {/* Registered Staff List Selector */}
          {!showCustomForm ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  {selectedRole === 'executive'
                    ? `เลือกบัญชีผู้บริหาร (${staffByRole.length} ท่าน):`
                    : selectedRole === 'admin'
                    ? `เลือกบัญชีผู้ดูแลระบบ (${staffByRole.length} ท่าน):`
                    : `เลือกบัญชีเจ้าหน้าที่ประจำการ (${staffByRole.length} ท่าน):`}
                </span>
                <button
                  type="button"
                  onClick={() => setShowCustomForm(true)}
                  className="text-xs font-semibold text-sky-600 hover:underline dark:text-sky-400"
                >
                  {selectedRole === 'executive'
                    ? '+ ระบุชื่อผู้บริหารใหม่'
                    : '+ ระบุชื่อเจ้าหน้าที่ใหม่'}
                </button>
              </div>

              <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
                {staffByRole.length > 0 ? (
                  <>
                    {staffByRole.map((staff) => (
                      <div
                        key={staff.id}
                        onClick={() => handleSelectStaff(staff)}
                        className="group cursor-pointer rounded-xl border border-slate-200 bg-slate-50/70 p-3 transition-all hover:border-sky-400 hover:bg-sky-50/50 dark:border-slate-800 dark:bg-slate-800/60 dark:hover:border-sky-500"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2.5">
                            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-sky-600 shadow-xs dark:bg-slate-700 dark:text-sky-400">
                              {staff.role === 'admin' ? (
                                <Shield className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                              ) : staff.role === 'executive' ? (
                                <Briefcase className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                              ) : (
                                <User className="h-4 w-4" />
                              )}
                            </div>
                            <div>
                              <p className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-sky-600">
                                {staff.name}
                              </p>
                              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                                {staff.position || 'เจ้าหน้าที่กู้ชีพ'} · รหัส {staff.employeeId}
                              </p>
                            </div>
                          </div>

                          <div className="text-right">
                            <div className="flex flex-wrap items-center justify-end gap-1">
                              {staff.role === 'staff' && (
                                staff.pin_code && staff.pin_code.trim() !== '' ? (
                                  <span className="inline-flex items-center gap-0.5 rounded bg-sky-100 px-1.5 py-0.5 text-[10px] font-semibold text-sky-700 dark:bg-sky-950/70 dark:text-sky-300">
                                    <Lock className="h-2.5 w-2.5" />
                                    <span>มีรหัสผ่าน</span>
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-0.5 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800 dark:bg-amber-950/70 dark:text-amber-300">
                                    <KeyRound className="h-2.5 w-2.5" />
                                    <span>ตั้งรหัสครั้งแรก</span>
                                  </span>
                                )
                              )}
                              <span
                                className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                                  staff.status === 'on_leave'
                                    ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                                    : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                }`}
                              >
                                {staff.status === 'on_leave' ? 'พักเวร' : 'พร้อมปฏิบัติงาน'}
                              </span>
                            </div>
                            <div className="mt-1 flex items-center justify-end gap-1 text-[10px] text-slate-400">
                              <Phone className="h-2.5 w-2.5" />
                              <span>{staff.phone || '-'}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </>
                ) : selectedRole === 'admin' ? (
                  <div className="rounded-2xl border border-sky-200 bg-sky-50/60 p-5 text-center dark:border-sky-900/60 dark:bg-sky-950/30">
                    <Shield className="mx-auto h-9 w-9 text-sky-600 dark:text-sky-400 mb-2" />
                    <p className="text-xs font-bold text-slate-800 dark:text-white">
                      เข้าสู่ระบบในฐานะผู้ดูแลระบบ (Admin)
                    </p>
                    <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                      ยืนยันตัวตนผู้ดูแลระบบเพื่อเข้าจัดการข้อมูลและระบบซิงค์ส่วนกลาง
                    </p>
                    <div className="mt-3.5 flex flex-col sm:flex-row items-center justify-center gap-2">
                      <button
                        type="button"
                        onClick={handleQuickAdminLogin}
                        className="inline-flex w-full sm:w-auto items-center justify-center gap-1.5 rounded-xl bg-sky-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-sky-500 transition-all"
                      >
                        <Shield className="h-3.5 w-3.5" />
                        <span>เข้าสู่ระบบด้วย Admin</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowCustomForm(true)}
                        className="inline-flex w-full sm:w-auto items-center justify-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                      >
                        <span>+ ระบุชื่อ Admin ใหม่</span>
                      </button>
                    </div>
                  </div>
                ) : selectedRole === 'executive' ? (
                  <div className="rounded-2xl border border-indigo-200 bg-indigo-50/60 p-5 text-center dark:border-indigo-900/60 dark:bg-indigo-950/30">
                    <Briefcase className="mx-auto h-9 w-9 text-indigo-600 dark:text-indigo-400 mb-2" />
                    <p className="text-xs font-bold text-slate-800 dark:text-white">
                      เข้าสู่ระบบในฐานะผู้บริหาร (Executive)
                    </p>
                    <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                      ดูแดชบอร์ดภาพรวมทุกระบบ สถิติรถยนต์ส่วนกลาง (รถกู้ชีพ) อุปกรณ์ ใบเบิก รอยรอบตัวรถ น้ำมัน และรายละเอียดข้อมูลทั้งหมด
                    </p>
                    <div className="mt-3.5 flex flex-col sm:flex-row items-center justify-center gap-2">
                      <button
                        type="button"
                        onClick={handleQuickExecutiveLogin}
                        className="inline-flex w-full sm:w-auto items-center justify-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-indigo-500 transition-all"
                      >
                        <Briefcase className="h-3.5 w-3.5" />
                        <span>เข้าสู่ระบบด้วยผู้บริหาร</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowCustomForm(true)}
                        className="inline-flex w-full sm:w-auto items-center justify-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                      >
                        <span>+ ระบุชื่อผู้บริหารใหม่</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 p-6 text-center dark:border-slate-800 dark:bg-slate-800/40">
                    <UserCheck className="mx-auto h-8 w-8 text-slate-300 dark:text-slate-600 mb-2" />
                    <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                      ยังไม่มีรายชื่อเจ้าหน้าที่ในระบบ
                    </p>
                    <p className="mt-1 text-[11px] text-slate-400">
                      กรุณาระบุชื่อผู้ปฏิบัติงานเพื่อเข้าใช้งานระบบตรวจรถได้ทันที
                    </p>
                    <button
                      type="button"
                      onClick={() => setShowCustomForm(true)}
                      className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-sky-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-sky-500"
                    >
                      <span>+ ระบุชื่อเข้าใช้งาน</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* Custom form */
            <form onSubmit={handleCustomLogin} className="space-y-3.5 border-t border-slate-100 pt-3 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  กรอกข้อมูลเจ้าหน้าที่:
                </span>
                <button
                  type="button"
                  onClick={() => setShowCustomForm(false)}
                  className="text-xs text-slate-500 hover:underline"
                >
                  กลับไปเลือกจากรายชื่อ
                </button>
              </div>

              {customError && (
                <div className="rounded-xl border border-red-200 bg-red-50 p-2.5 text-xs font-medium text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
                  {customError}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  ชื่อ-นามสกุล ผู้ตรวจ (Uploader Name)
                </label>
                <input
                  type="text"
                  required
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  placeholder="เช่น วิภาวัลย์ แจ่มใส (EMT-B)"
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs text-slate-800 shadow-sm focus:border-sky-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  รหัสประจำตัวพนักงาน / สังกัด
                </label>
                <input
                  type="text"
                  value={employeeId}
                  onChange={(e) => setEmployeeId(e.target.value)}
                  placeholder="เช่น EMT-67089"
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 font-mono text-xs text-slate-800 shadow-sm focus:border-sky-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                />
              </div>

              <button
                type="submit"
                className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-xl bg-slate-900 py-2.5 text-xs font-bold text-white shadow-md hover:bg-slate-800 dark:bg-sky-600 dark:hover:bg-sky-500"
              >
                <span>
                  {selectedRole === 'executive'
                    ? 'เข้าสู่ระบบแดชบอร์ดผู้บริหาร'
                    : 'เข้าสู่ระบบตรวจรถ'}
                </span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </form>
          )}
        </div>
      </div>

      {/* Admin Security Auth Modal */}
      {adminAuthModalOpen && (
        <AdminAuthModal
          isOpen={adminAuthModalOpen}
          onClose={() => {
            setAdminAuthModalOpen(false);
            setPendingAdminUser(null);
          }}
          onSuccess={() => {
            setAdminAuthModalOpen(false);
            if (pendingAdminUser) {
              onLogin(pendingAdminUser);
              setPendingAdminUser(null);
            }
          }}
          onGoogleLogin={onGoogleLogin || (async () => {})}
          isGoogleLoading={isGoogleLoading}
          googleUser={googleUser}
          targetUserName={pendingAdminUser?.name}
          targetUser={pendingAdminUser}
        />
      )}
      {/* Staff PIN / Password Auth & First-Time Setup Modal */}
      <StaffPinAuthModal
        isOpen={Boolean(pendingPinStaff)}
        staff={pendingPinStaff}
        onClose={() => setPendingPinStaff(null)}
        onVerifySuccess={(verifiedStaff) => {
          setPendingPinStaff(null);
          onLogin(verifiedStaff);
        }}
        onFirstTimeSetup={async (targetStaff, newPin) => {
          const updatedStaff = onSetStaffPin
            ? (await onSetStaffPin(targetStaff.id, newPin)) || { ...targetStaff, pin_code: newPin }
            : { ...targetStaff, pin_code: newPin };
          setPendingPinStaff(null);
          onLogin(updatedStaff);
        }}
      />
    </div>
  );
};
