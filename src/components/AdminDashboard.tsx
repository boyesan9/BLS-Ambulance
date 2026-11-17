import React, { useState } from 'react';
import {
  AmbulanceVehicle,
  EquipmentInspectionRecord,
  EquipmentRequisitionRecord,
  FuelLogRecord,
  InspectionRecord,
  UserProfile,
  UserRole,
  UserStatus,
  VehicleDamageItem,
  VehicleStatus,
} from '../types';
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Truck,
  FileSpreadsheet,
  Search,
  Download,
  Plus,
  Eye,
  Edit2,
  Trash2,
  Users,
  Shield,
  Phone,
  UserCheck,
  Building,
  Printer,
  FolderSync,
  ExternalLink,
  Camera,
  Briefcase,
  LayoutDashboard,
  PackageCheck,
  PackagePlus,
  Car,
  Fuel,
  ArrowRight,
  X,
  Gauge,
  Calendar,
} from 'lucide-react';
import { ConfirmDeleteModal } from './ConfirmDeleteModal';
import {
  generateSvgCarPlaceholder,
  getDriveImageFallbackUrls,
  toDisplayableDriveImageUrl,
} from '../services/storage';

interface AdminDashboardProps {
  currentUser: UserProfile;
  vehicles: AmbulanceVehicle[];
  inspections: InspectionRecord[];
  staffList: UserProfile[];
  onOpenNewInspection: () => void;
  onViewRecordDetail: (record: InspectionRecord) => void;
  onOpenVehicleModal: (vehicle?: AmbulanceVehicle) => void;
  onDeleteVehicle: (vehicleId: string) => void;
  onUpdateVehicleStatus: (vehicleId: string, status: VehicleStatus) => void;
  onOpenStaffModal: (staff?: UserProfile) => void;
  onDeleteStaff: (staffId: string) => void;
  onUpdateStaffStatus: (staffId: string, status: UserStatus) => void;
  onDeleteInspection: (recordId: string) => void;
  onClearAllInspections: () => void;
  onClearAllSystemData?: (clearFleetAndStaff?: boolean) => void;
  onResetDemoData: () => void;
  onOpenGoogleSheetsModal: () => void;
  spreadsheetUrl?: string;
  onExportCsv: () => void;
  onPrintInspection?: (record: InspectionRecord) => void;
  equipmentInspections?: EquipmentInspectionRecord[];
  equipmentRequisitions?: EquipmentRequisitionRecord[];
  damageRecords?: VehicleDamageItem[];
  fuelLogs?: FuelLogRecord[];
  onNavigateView?: (
    view: 'form' | 'equipment' | 'requisition' | 'dashboard' | 'damage' | 'fuel'
  ) => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  currentUser,
  vehicles,
  inspections,
  staffList,
  onOpenNewInspection,
  onViewRecordDetail,
  onOpenVehicleModal,
  onDeleteVehicle,
  onUpdateVehicleStatus,
  onOpenStaffModal,
  onDeleteStaff,
  onUpdateStaffStatus,
  onDeleteInspection,
  onClearAllInspections,
  onClearAllSystemData,
  onResetDemoData,
  onOpenGoogleSheetsModal,
  spreadsheetUrl,
  onExportCsv,
  onPrintInspection,
  equipmentInspections = [],
  equipmentRequisitions = [],
  damageRecords = [],
  fuelLogs = [],
  onNavigateView,
}) => {
  const isAdmin = currentUser.role === 'admin';
  const isExecutive = currentUser.role === 'executive';

  const [activeTab, setActiveTab] = useState<
    'overview' | 'history' | 'photos_gallery' | 'vehicles' | 'staff'
  >(() => (currentUser.role === 'executive' ? 'overview' : 'history'));

  React.useEffect(() => {
    if (currentUser.role === 'executive') {
      setActiveTab('overview');
    }
  }, [currentUser.role]);

  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterShift, setFilterShift] = useState<string>('all');
  const [photoFilterVehicle, setPhotoFilterVehicle] = useState<string>('all');
  const [photoSearchDate, setPhotoSearchDate] = useState('');
  const [staffSearchTerm, setStaffSearchTerm] = useState('');
  const [viewVehicleDetail, setViewVehicleDetail] = useState<AmbulanceVehicle | null>(null);

  // Delete modal state
  const [deleteTarget, setDeleteTarget] = useState<{
    type: 'vehicle' | 'staff' | 'inspection' | 'clear_all' | 'clear_all_system';
    id: string;
    name: string;
  } | null>(null);

  // Vehicle KPI calculations
  const totalVehicles = vehicles.length;
  const availableVehicles = vehicles.filter((v) => v.status === 'available').length;
  const issueVehicles = vehicles.filter((v) => v.status === 'issue_found').length;
  const maintenanceVehicles = vehicles.filter((v) => v.status === 'maintenance').length;
  const readinessRate = totalVehicles > 0 ? Math.round((availableVehicles / totalVehicles) * 100) : 0;

  // Staff KPI calculations
  const totalStaff = staffList.length;
  const activeStaff = staffList.filter((s) => s.status === 'active' || !s.status).length;
  const onLeaveStaff = staffList.filter((s) => s.status === 'on_leave').length;
  const adminCount = staffList.filter((s) => s.role === 'admin').length;
  const executiveCount = staffList.filter((s) => s.role === 'executive').length;

  // Multi-module KPIs for Executive Overview
  const eqReadyCount = equipmentInspections.filter((e) => e.overallStatus === 'ready').length;
  const eqIncompleteCount = equipmentInspections.filter((e) => e.overallStatus === 'incomplete').length;
  const eqCriticalCount = equipmentInspections.filter((e) => e.overallStatus === 'critical').length;

  const reqPendingCount = equipmentRequisitions.filter((r) => r.status === 'pending').length;
  const reqApprovedCount = equipmentRequisitions.filter((r) => r.status === 'approved').length;
  const reqDispensedCount = equipmentRequisitions.filter((r) => r.status === 'dispensed').length;

  const damageUnresolvedCount = damageRecords.filter((d) => !d.resolved).length;
  const damageResolvedCount = damageRecords.filter((d) => d.resolved).length;

  const totalFuelDistance = fuelLogs.reduce((sum, l) => sum + (l.distanceDriven || 0), 0);
  const totalFuelLiters = fuelLogs.reduce((sum, l) => sum + (l.liters || 0), 0);
  const totalFuelCost = fuelLogs.reduce((sum, l) => sum + (l.totalCost || 0), 0);
  const avgFuelKmPerL =
    totalFuelDistance > 0 && totalFuelLiters > 0
      ? (totalFuelDistance / totalFuelLiters).toFixed(2)
      : '-';

  // Inspections in last 24h
  const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
  const recentInspectionsCount = inspections.filter((i) => i.createdAt >= oneDayAgo).length;

  // Filtered Inspections
  const filteredInspections = inspections.filter((rec) => {
    const matchesSearch =
      rec.plateNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      rec.vehicleCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      rec.inspectorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      rec.id.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus =
      filterStatus === 'all' || rec.overallStatus === filterStatus;

    const matchesShift =
      filterShift === 'all' || rec.shift === filterShift;

    return matchesSearch && matchesStatus && matchesShift;
  });

  // Filtered Staff (deduplicated by id to guarantee unique keys)
  const uniqueStaffList = React.useMemo(() => {
    const map = new Map<string, UserProfile>();
    staffList.forEach((s) => {
      if (s.id && !map.has(s.id)) {
        map.set(s.id, s);
      }
    });
    return Array.from(map.values());
  }, [staffList]);

  const filteredStaff = uniqueStaffList.filter((s) => {
    const term = staffSearchTerm.toLowerCase();
    return (
      s.name.toLowerCase().includes(term) ||
      s.employeeId.toLowerCase().includes(term) ||
      (s.position && s.position.toLowerCase().includes(term)) ||
      (s.department && s.department.toLowerCase().includes(term))
    );
  });

  const handleConfirmDelete = () => {
    if (!deleteTarget) return;
    if (deleteTarget.type === 'vehicle') {
      onDeleteVehicle(deleteTarget.id);
    } else if (deleteTarget.type === 'staff') {
      onDeleteStaff(deleteTarget.id);
    } else if (deleteTarget.type === 'inspection') {
      onDeleteInspection(deleteTarget.id);
    } else if (deleteTarget.type === 'clear_all') {
      onClearAllInspections();
    } else if (deleteTarget.type === 'clear_all_system' && onClearAllSystemData) {
      onClearAllSystemData(true);
    }
    setDeleteTarget(null);
  };

  return (
    <div className="space-y-6">
      {/* Top Header / Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            {isExecutive && <Briefcase className="h-5 w-5 text-indigo-600 dark:text-indigo-400 shrink-0" />}
            <span>
              {isAdmin
                ? 'แดชบอร์ดผู้ดูแลระบบยานพาหนะและบุคลากร (Admin Console)'
                : isExecutive
                ? 'แดชบอร์ดผู้บริหาร — ภาพรวมทุกระบบและรายละเอียดรถยนต์ส่วนกลาง (รถกู้ชีพ)'
                : 'แดชบอร์ดภาพรวมรถกู้ชีพ BLS และประวัติการตรวจ (Staff Dashboard)'}
            </span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {isAdmin
              ? 'ภาพรวมความพร้อมของรถกู้ชีพ BLS ส่วนกลาง · ระบบจัดการพนักงาน · สถิติและการซิงค์ข้อมูล'
              : isExecutive
              ? 'ติดตามภาพรวมความพร้อมรถยนต์ส่วนกลาง (รถกู้ชีพ) อุปกรณ์ BLS ใบเบิก รอยรอบตัวรถ น้ำมัน พร้อมตรวจสอบรายละเอียดและพิมพ์รายงาน .PDF'
              : 'ภาพรวมสถานะความพร้อมของรถกู้ชีพส่วนกลาง · ประวัติการตรวจสภาพประจำเวร · พิมพ์ใบรายงานผล'}
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {isAdmin && (
            <button
              type="button"
              onClick={onOpenGoogleSheetsModal}
              className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-300 bg-emerald-50 px-3.5 py-2 text-xs font-semibold text-emerald-700 shadow-sm hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
            >
              <FileSpreadsheet className="h-4 w-4" />
              <span>Google Sheets Auto-Sync</span>
            </button>
          )}

          {isExecutive && (
            <span className="inline-flex items-center gap-1.5 rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-2 text-xs font-bold text-indigo-700 dark:border-indigo-800 dark:bg-indigo-950/50 dark:text-indigo-300">
              <Eye className="h-4 w-4" />
              <span>สิทธิ์ผู้บริหาร (ดูข้อมูล & รายละเอียดทั้งหมด)</span>
            </span>
          )}

          {!isExecutive && (
            <button
              type="button"
              onClick={onOpenNewInspection}
              className="inline-flex items-center gap-1.5 rounded-xl bg-sky-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-sky-500"
            >
              <Plus className="h-4 w-4" />
              <span>เริ่มตรวจสภาพรถใหม่</span>
            </button>
          )}
        </div>
      </div>

      {/* KPI Summary Cards Strip */}
      <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 lg:grid-cols-6">
        {/* Total Ambulances */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            รถกู้ชีพทั้งหมด
          </span>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="font-mono text-2xl font-bold tabular-nums text-slate-900 dark:text-white">
              {totalVehicles}
            </span>
            <span className="text-xs text-slate-400">คัน</span>
          </div>
          <p className="mt-1 text-[11px] text-slate-400">รถกู้ชีพ BLS ในระบบ</p>
        </div>

        {/* Available / Normal */}
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-4 shadow-sm dark:border-emerald-950 dark:bg-emerald-950/20">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-emerald-800 dark:text-emerald-300">
            พร้อมปฏิบัติการ (ปกติ)
          </span>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="font-mono text-2xl font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
              {availableVehicles}
            </span>
            <CheckCircle2 className="h-5 w-5 text-emerald-500" />
          </div>
          <p className="mt-1 text-[11px] text-emerald-700 dark:text-emerald-400">ระบบไฟ/เครื่องยนต์ 100%</p>
        </div>

        {/* Issue Found */}
        <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-4 shadow-sm dark:border-amber-950 dark:bg-amber-950/20">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-amber-800 dark:text-amber-300">
            พบปัญหา (เฝ้าระวัง)
          </span>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="font-mono text-2xl font-bold tabular-nums text-amber-600 dark:text-amber-400">
              {issueVehicles}
            </span>
            <AlertTriangle className="h-5 w-5 text-amber-500" />
          </div>
          <p className="mt-1 text-[11px] text-amber-700 dark:text-amber-400">มีรายการต้องซ่อม/อะไหล่</p>
        </div>

        {/* Maintenance */}
        <div className="rounded-2xl border border-red-200 bg-red-50/50 p-4 shadow-sm dark:border-red-950 dark:bg-red-950/20">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-red-800 dark:text-red-300">
            อยู่ระหว่างซ่อม (งดใช้)
          </span>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="font-mono text-2xl font-bold tabular-nums text-red-600 dark:text-red-400">
              {maintenanceVehicles}
            </span>
            <XCircle className="h-5 w-5 text-red-500" />
          </div>
          <p className="mt-1 text-[11px] text-red-700 dark:text-red-400">ส่งศูนย์ซ่อมบำรุง</p>
        </div>

        {/* Staff Active Count */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            พนักงานพร้อมเข้าเวร
          </span>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="font-mono text-2xl font-bold tabular-nums text-sky-600 dark:text-sky-400">
              {activeStaff}/{totalStaff}
            </span>
            <Users className="h-5 w-5 text-sky-500" />
          </div>
          <p className="mt-1 text-[11px] text-slate-400">
            พักเวร {onLeaveStaff} · ผู้บริหาร {executiveCount} · ผู้ดูแล {adminCount}
          </p>
        </div>

        {/* Readiness Rate */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            อัตราความพร้อมรถ
          </span>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="font-mono text-2xl font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
              {readinessRate}%
            </span>
            <div className="h-2 w-10 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
              <div
                className="h-full bg-emerald-500"
                style={{ width: `${readinessRate}%` }}
              />
            </div>
          </div>
          <p className="mt-1 text-[11px] text-slate-400">ความพร้อมรถยนต์ส่วนกลาง (รถกู้ชีพ) ทั้งหมด</p>
        </div>
      </div>

      {/* Main Tab Navigation */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2.5 dark:border-slate-800 overflow-x-auto scrollbar-thin">
        {(isExecutive || isAdmin) && (
          <button
            onClick={() => setActiveTab('overview')}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all whitespace-nowrap ${
              activeTab === 'overview'
                ? 'bg-indigo-600 text-white shadow-sm dark:bg-indigo-500'
                : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
            }`}
          >
            <LayoutDashboard className="h-3.5 w-3.5" />
            <span>ภาพรวมทุกระบบ (แดชบอร์ด)</span>
          </button>
        )}

        <button
          onClick={() => setActiveTab('history')}
          className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all whitespace-nowrap ${
            activeTab === 'history'
              ? 'bg-slate-900 text-white shadow-sm dark:bg-sky-500'
              : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
          }`}
        >
          <span>ตารางประวัติการตรวจสภาพรถ ({inspections.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('photos_gallery')}
          className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all whitespace-nowrap ${
            activeTab === 'photos_gallery'
              ? 'bg-slate-900 text-white shadow-sm dark:bg-sky-500'
              : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
          }`}
        >
          <Camera className="h-3.5 w-3.5" />
          <span>ดูรูปถ่าย 4 ด้านย้อนหลัง (รายวัน)</span>
        </button>

        <button
          onClick={() => setActiveTab('vehicles')}
          className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all whitespace-nowrap ${
            activeTab === 'vehicles'
              ? 'bg-slate-900 text-white shadow-sm dark:bg-sky-500'
              : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
          }`}
        >
          <Truck className="h-3.5 w-3.5" />
          <span>
            {isAdmin
              ? `จัดการข้อมูลรถกู้ชีพ BLS (${vehicles.length})`
              : `รายการรถกู้ชีพส่วนกลาง (${vehicles.length})`}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('staff')}
          className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all whitespace-nowrap ${
            activeTab === 'staff'
              ? 'bg-slate-900 text-white shadow-sm dark:bg-sky-500'
              : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
          }`}
        >
          <Users className="h-3.5 w-3.5" />
          <span>
            {isAdmin
              ? `ระบบจัดการพนักงาน (${staffList.length})`
              : `รายชื่อเจ้าหน้าที่ประจำการ (${staffList.length})`}
          </span>
        </button>
      </div>

      {/* TAB 0: Executive / Multi-System Overview Hub */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* 4 Module Dashboard Summary Cards */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            {/* Module 1: Equipment Readiness */}
            <div className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
                      <PackageCheck className="h-4.5 w-4.5" />
                    </div>
                    <div>
                      <h3 className="text-xs font-bold text-slate-900 dark:text-white">
                        ตรวจความพร้อมอุปกรณ์ BLS
                      </h3>
                      <p className="text-[11px] text-slate-400">
                        ทั้งหมด {equipmentInspections.length} ครั้ง
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-3 gap-2 rounded-xl bg-slate-50 p-2.5 text-center dark:bg-slate-850">
                  <div>
                    <span className="block text-[10px] text-slate-400">พร้อมใช้</span>
                    <span className="font-mono text-sm font-extrabold text-emerald-600 dark:text-emerald-400">
                      {eqReadyCount}
                    </span>
                  </div>
                  <div>
                    <span className="block text-[10px] text-slate-400">ไม่ครบ</span>
                    <span className="font-mono text-sm font-extrabold text-amber-600 dark:text-amber-400">
                      {eqIncompleteCount}
                    </span>
                  </div>
                  <div>
                    <span className="block text-[10px] text-slate-400">ชำรุด</span>
                    <span className="font-mono text-sm font-extrabold text-red-600 dark:text-red-400">
                      {eqCriticalCount}
                    </span>
                  </div>
                </div>

                {equipmentInspections[0] && (
                  <p className="mt-2.5 text-[11px] text-slate-500 dark:text-slate-400 truncate">
                    ล่าสุด: {equipmentInspections[0].teamLabel} · {equipmentInspections[0].inspectDateFormatted}
                  </p>
                )}
              </div>

              {onNavigateView && (
                <button
                  type="button"
                  onClick={() => onNavigateView('equipment')}
                  className="mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700 hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
                >
                  <span>ดูแดชบอร์ด & รายละเอียดอุปกรณ์</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Module 2: Equipment Requisitions */}
            <div className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div>
                <div className="flex items-center gap-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-100 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300">
                    <PackagePlus className="h-4.5 w-4.5" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-slate-900 dark:text-white">
                      ใบเบิกอุปกรณ์และเวชภัณฑ์
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      ทั้งหมด {equipmentRequisitions.length} ใบเบิก
                    </p>
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-3 gap-2 rounded-xl bg-slate-50 p-2.5 text-center dark:bg-slate-850">
                  <div>
                    <span className="block text-[10px] text-slate-400">รออนุมัติ</span>
                    <span className="font-mono text-sm font-extrabold text-amber-600 dark:text-amber-400">
                      {reqPendingCount}
                    </span>
                  </div>
                  <div>
                    <span className="block text-[10px] text-slate-400">อนุมัติแล้ว</span>
                    <span className="font-mono text-sm font-extrabold text-sky-600 dark:text-sky-400">
                      {reqApprovedCount}
                    </span>
                  </div>
                  <div>
                    <span className="block text-[10px] text-slate-400">จ่ายแล้ว</span>
                    <span className="font-mono text-sm font-extrabold text-emerald-600 dark:text-emerald-400">
                      {reqDispensedCount}
                    </span>
                  </div>
                </div>

                {equipmentRequisitions[0] && (
                  <p className="mt-2.5 text-[11px] text-slate-500 dark:text-slate-400 truncate">
                    ล่าสุด: {equipmentRequisitions[0].requisitionNo} · {equipmentRequisitions[0].requesterName}
                  </p>
                )}
              </div>

              {onNavigateView && (
                <button
                  type="button"
                  onClick={() => onNavigateView('requisition')}
                  className="mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-xs font-bold text-sky-700 hover:bg-sky-100 dark:border-sky-800 dark:bg-sky-950/40 dark:text-sky-300"
                >
                  <span>ดูแดชบอร์ด & รายละเอียดใบเบิก</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Module 3: Vehicle Damage */}
            <div className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div>
                <div className="flex items-center gap-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300">
                    <Car className="h-4.5 w-4.5" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-slate-900 dark:text-white">
                      รอยรอบตัวรถ & จุดเสียหาย
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      บันทึกสะสม {damageRecords.length} จุด
                    </p>
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2 rounded-xl bg-slate-50 p-2.5 text-center dark:bg-slate-850">
                  <div>
                    <span className="block text-[10px] text-slate-400">รอซ่อม / มีรอย</span>
                    <span className="font-mono text-sm font-extrabold text-amber-600 dark:text-amber-400">
                      {damageUnresolvedCount}
                    </span>
                  </div>
                  <div>
                    <span className="block text-[10px] text-slate-400">ซ่อมสีแล้ว</span>
                    <span className="font-mono text-sm font-extrabold text-emerald-600 dark:text-emerald-400">
                      {damageResolvedCount}
                    </span>
                  </div>
                </div>

                {damageRecords[0] && (
                  <p className="mt-2.5 text-[11px] text-slate-500 dark:text-slate-400 truncate">
                    ล่าสุด: {damageRecords[0].vehicleCode} · {damageRecords[0].positionArea}
                  </p>
                )}
              </div>

              {onNavigateView && (
                <button
                  type="button"
                  onClick={() => onNavigateView('damage')}
                  className="mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-800 hover:bg-amber-100 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300"
                >
                  <span>ดูรอยรอบตัวรถ & รายงาน .PDF</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Module 4: Fuel Log & Efficiency */}
            <div className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div>
                <div className="flex items-center gap-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300">
                    <Fuel className="h-4.5 w-4.5" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-slate-900 dark:text-white">
                      ประวัติเติมน้ำมัน & สิ้นเปลือง
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      เติมทั้งหมด {fuelLogs.length} ครั้ง
                    </p>
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-3 gap-2 rounded-xl bg-slate-50 p-2.5 text-center dark:bg-slate-850">
                  <div>
                    <span className="block text-[10px] text-slate-400">ระยะทาง</span>
                    <span className="font-mono text-xs font-extrabold text-slate-800 dark:text-slate-200">
                      {totalFuelDistance.toLocaleString()}
                    </span>
                  </div>
                  <div>
                    <span className="block text-[10px] text-slate-400">กม./ลิตร</span>
                    <span className="font-mono text-xs font-extrabold text-emerald-600 dark:text-emerald-400">
                      {avgFuelKmPerL}
                    </span>
                  </div>
                  <div>
                    <span className="block text-[10px] text-slate-400">ยอดรวม(฿)</span>
                    <span className="font-mono text-xs font-extrabold text-sky-600 dark:text-sky-400">
                      {totalFuelCost.toLocaleString()}
                    </span>
                  </div>
                </div>

                {fuelLogs[0] && (
                  <p className="mt-2.5 text-[11px] text-slate-500 dark:text-slate-400 truncate">
                    ล่าสุด: {fuelLogs[0].vehicleCode} · {fuelLogs[0].liters} ลิตร ({fuelLogs[0].fuelDate})
                  </p>
                )}
              </div>

              {onNavigateView && (
                <button
                  type="button"
                  onClick={() => onNavigateView('fuel')}
                  className="mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-2 text-xs font-bold text-indigo-700 hover:bg-indigo-100 dark:border-indigo-800 dark:bg-indigo-950/40 dark:text-indigo-300"
                >
                  <span>ดูแดชบอร์ดน้ำมัน & สลิป</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Fleet Status Snapshot + Recent Inspections */}
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
            {/* Recent Vehicle Inspections */}
            <div className="lg:col-span-7 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    ผลการตรวจสภาพรถกู้ชีพ BLS ล่าสุด ({recentInspectionsCount} ครั้งใน 24 ชม.)
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    คลิก “ดูรายละเอียด” เพื่อดูรายการตรวจ 22 ข้อ และรูปถ่าย 4 ด้าน
                  </p>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setActiveTab('photos_gallery')}
                    className="rounded-lg border border-slate-200 px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                  >
                    รูป 4 ด้านรายวัน
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('history')}
                    className="rounded-lg bg-slate-900 px-2.5 py-1 text-[11px] font-bold text-white hover:bg-slate-800 dark:bg-sky-600"
                  >
                    ดูทั้งหมด ({inspections.length})
                  </button>
                </div>
              </div>

              {inspections.length > 0 ? (
                <div className="divide-y divide-slate-100 dark:divide-slate-800 mt-1">
                  {inspections.slice(0, 6).map((rec) => (
                    <div
                      key={rec.id}
                      className="flex flex-wrap items-center justify-between gap-2 py-2.5"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-sky-600 dark:text-sky-400">
                            {rec.vehicleCode}
                          </span>
                          <span className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                            {rec.plateNumber}
                          </span>
                          {rec.overallStatus === 'normal' && (
                            <span className="rounded px-1.5 py-0.5 text-[10px] font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                              ปกติ
                            </span>
                          )}
                          {rec.overallStatus === 'issue_found' && (
                            <span className="rounded px-1.5 py-0.5 text-[10px] font-semibold bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
                              พบปัญหา
                            </span>
                          )}
                          {rec.overallStatus === 'needs_repair' && (
                            <span className="rounded px-1.5 py-0.5 text-[10px] font-semibold bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300">
                              ส่งซ่อม
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          {rec.uploadTimestamp} · ผู้ตรวจ: {rec.inspectorName} · ไมล์{' '}
                          {rec.odometerReading ? rec.odometerReading.toLocaleString() : '-'} กม.
                        </p>
                      </div>

                      <div className="flex items-center gap-1.5">
                        {onPrintInspection && (
                          <button
                            type="button"
                            onClick={() => onPrintInspection(rec)}
                            className="inline-flex items-center gap-1 rounded-lg border border-sky-200 bg-sky-50 px-2 py-1 text-[11px] font-semibold text-sky-700 hover:bg-sky-100 dark:border-sky-800 dark:bg-sky-950/40 dark:text-sky-300"
                          >
                            <Printer className="h-3 w-3" />
                            <span>.PDF</span>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => onViewRecordDetail(rec)}
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                        >
                          <Eye className="h-3 w-3 text-sky-600" />
                          <span>ดูรายละเอียด</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-10 text-center text-xs text-slate-400">
                  ยังไม่มีประวัติการตรวจสภาพรถในระบบ
                </div>
              )}
            </div>

            {/* Fleet Status Overview */}
            <div className="lg:col-span-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    สถานะรถยนต์ส่วนกลาง (รถกู้ชีพ) ({vehicles.length} คัน)
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    คลิกที่รถเพื่อตรวจสอบข้อมูลรถและประวัติการตรวจ
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('vehicles')}
                  className="rounded-lg border border-slate-200 px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  รถยนต์ส่วนกลาง (รถกู้ชีพ) ทั้งหมด
                </button>
              </div>

              {vehicles.length > 0 ? (
                <div className="mt-3 space-y-2.5 max-h-[340px] overflow-y-auto pr-1">
                  {vehicles.map((veh) => (
                    <button
                      key={veh.id}
                      type="button"
                      onClick={() =>
                        isAdmin ? onOpenVehicleModal(veh) : setViewVehicleDetail(veh)
                      }
                      className="w-full flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50/70 p-2.5 text-left hover:border-sky-300 hover:bg-sky-50/40 transition-all dark:border-slate-800 dark:bg-slate-850 dark:hover:border-sky-700"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <img
                          src={
                            toDisplayableDriveImageUrl(veh.imageUrl, veh.drivePhotoUrl) ||
                            generateSvgCarPlaceholder(veh.code, veh.brandModel, '#0284c7')
                          }
                          alt={veh.code}
                          className="h-11 w-16 rounded-lg object-cover shrink-0 border border-slate-200 dark:border-slate-700"
                          referrerPolicy="no-referrer"
                          onError={(e) => {
                            const fallback = generateSvgCarPlaceholder(veh.code, veh.brandModel, '#0284c7');
                            if (e.currentTarget.src !== fallback) e.currentTarget.src = fallback;
                          }}
                        />
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-xs font-bold text-sky-600 dark:text-sky-400">
                              {veh.code}
                            </span>
                            <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                              {veh.plateNumber}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                            ไมล์ {veh.currentOdometer.toLocaleString()} กม. · ตรวจล่าสุด {veh.lastInspectionDate || '-'}
                          </p>
                        </div>
                      </div>

                      <span
                        className={`shrink-0 rounded-md px-2 py-0.5 text-[10px] font-bold ${
                          veh.status === 'available'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                            : veh.status === 'issue_found'
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                            : 'bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300'
                        }`}
                      >
                        {veh.status === 'available'
                          ? 'พร้อมใช้'
                          : veh.status === 'issue_found'
                          ? 'พบปัญหา'
                          : 'ส่งซ่อม'}
                      </span>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="py-10 text-center text-xs text-slate-400">
                  ยังไม่มีข้อมูลรถกู้ชีพในระบบ
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 1: Inspection History */}
      {activeTab === 'history' && (
        <div className="space-y-4">
          {/* Search & Filter Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-3.5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex flex-1 items-center gap-2 min-w-[240px]">
              <Search className="h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="ค้นหาตามทะเบียนรถ, รหัสรถ, หรือชื่อผู้ตรวจ..."
                className="w-full bg-transparent text-xs text-slate-800 placeholder-slate-400 focus:outline-none dark:text-slate-200"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              >
                <option value="all">สถานะทั้งหมด</option>
                <option value="normal">ปกติ (พร้อมใช้)</option>
                <option value="issue_found">พบปัญหา</option>
                <option value="needs_repair">ส่งซ่อมบำรุง</option>
              </select>

              <select
                value={filterShift}
                onChange={(e) => setFilterShift(e.target.value)}
                className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              >
                <option value="all">ทุกรอบเวร</option>
                <option value="24hr">เวร 24 ชม.</option>
                <option value="morning">เวรเช้า</option>
                <option value="afternoon">เวรบ่าย</option>
                <option value="night">เวรดึก</option>
              </select>

              <button
                type="button"
                onClick={onExportCsv}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              >
                <Download className="h-3.5 w-3.5" />
                <span>ส่งออก CSV</span>
              </button>

              {currentUser.role === 'admin' && (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setDeleteTarget({
                        type: 'clear_all',
                        id: 'all_inspections',
                        name: `ประวัติการตรวจสภาพทั้งหมด (${inspections.length} รายการ)`,
                      });
                    }}
                    className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-2.5 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300"
                    title="ล้างเฉพาะประวัติการตรวจสภาพรถทั้งหมด (เฉพาะ Admin)"
                  >
                    <Trash2 className="h-3 w-3" />
                    <span>เคลียร์ข้อมูลประวัติ</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setDeleteTarget({
                        type: 'clear_all_system',
                        id: 'complete_wipe',
                        name: `ข้อมูลระบบทั้งหมด (ล้างประวัติการตรวจและรายชื่อรถทั้งหมดเพื่อเริ่มทดสอบใหม่จาก 0)`,
                      });
                    }}
                    className="inline-flex items-center gap-1 rounded-lg border border-amber-300 bg-amber-50 px-2.5 py-1.5 text-xs font-semibold text-amber-800 hover:bg-amber-100 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300"
                    title="ล้างข้อมูลระบบทั้งหมดเพื่อเริ่มทดสอบตั้งแต่ศูนย์ (เฉพาะ Admin)"
                  >
                    <Trash2 className="h-3 w-3" />
                    <span>ล้างข้อมูลระบบทั้งหมดเพื่อทดสอบ</span>
                  </button>

                  <button
                    type="button"
                    onClick={onResetDemoData}
                    className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                    title="ล้างแคชในเครื่องแล้วโหลดข้อมูลจริงล่าสุดจาก Google Drive & Google Sheets"
                  >
                    <span>ซิงค์ข้อมูลใหม่จาก Cloud</span>
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Table Container */}
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:border-slate-800 dark:bg-slate-850 dark:text-slate-400">
                  <tr>
                    <th className="px-4 py-3">วัน-เวลาตรวจ</th>
                    <th className="px-4 py-3">รอบเวร</th>
                    <th className="px-4 py-3">รถกู้ชีพ BLS</th>
                    <th className="px-4 py-3">ผู้ตรวจเช็ค</th>
                    <th className="px-4 py-3">สถานะผลตรวจ</th>
                    <th className="px-4 py-3">รูป 4 ด้าน</th>
                    {(isAdmin || isExecutive) && (
                      <th className="px-4 py-3">Sheets & Drive</th>
                    )}
                    <th className="px-4 py-3 text-right">การจัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredInspections.length > 0 ? (
                    filteredInspections.map((rec) => {
                      const photoCount = [
                        rec.photos.front || rec.driveLinks?.frontPhotoUrl,
                        rec.photos.rear || rec.driveLinks?.rearPhotoUrl,
                        rec.photos.left || rec.driveLinks?.leftPhotoUrl,
                        rec.photos.right || rec.driveLinks?.rightPhotoUrl,
                      ].filter(Boolean).length;

                      return (
                        <tr
                          key={rec.id}
                          className="hover:bg-slate-50/70 transition-colors dark:hover:bg-slate-800/40"
                        >
                          <td className="px-4 py-3.5">
                            <span className="font-mono tabular-nums text-slate-900 dark:text-white font-medium">
                              {rec.uploadTimestamp}
                            </span>
                          </td>

                          <td className="px-4 py-3.5">
                            <span className="text-slate-600 dark:text-slate-300">
                              {rec.shift === '24hr' ? 'เวร 24 ชม.' : rec.shiftLabel}
                            </span>
                          </td>

                          <td className="px-4 py-3.5">
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono font-bold text-sky-600 dark:text-sky-400">
                                {rec.vehicleCode}
                              </span>
                              <span className="text-slate-300 dark:text-slate-700">·</span>
                              <span className="font-semibold text-slate-900 dark:text-white">
                                {rec.plateNumber}
                              </span>
                            </div>
                            <span className="font-mono text-[10px] text-slate-400 tabular-nums">
                              ไมล์: {rec.odometerReading ? rec.odometerReading.toLocaleString() : '-'} กม.
                            </span>
                          </td>

                          <td className="px-4 py-3.5">
                            <div className="font-medium text-slate-900 dark:text-white">
                              {rec.inspectorName}
                            </div>
                            <span className="text-[10px] text-slate-400">
                              {rec.inspectorRole === 'admin'
                                ? 'Admin'
                                : rec.inspectorRole === 'executive'
                                ? 'ผู้บริหาร'
                                : 'พนักงานประจำเวร'}
                            </span>
                          </td>

                          <td className="px-4 py-3.5">
                            {rec.overallStatus === 'normal' && (
                              <span className="inline-flex items-center gap-1 rounded px-2 py-0.5 text-[11px] font-semibold text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-300">
                                <CheckCircle2 className="h-3 w-3" /> ปกติ
                              </span>
                            )}
                            {rec.overallStatus === 'issue_found' && (
                              <span className="inline-flex items-center gap-1 rounded px-2 py-0.5 text-[11px] font-semibold text-amber-700 bg-amber-50 dark:bg-amber-950/40 dark:text-amber-300">
                                <AlertTriangle className="h-3 w-3" /> พบปัญหา
                              </span>
                            )}
                            {rec.overallStatus === 'needs_repair' && (
                              <span className="inline-flex items-center gap-1 rounded px-2 py-0.5 text-[11px] font-semibold text-red-700 bg-red-50 dark:bg-red-950/40 dark:text-red-300">
                                <XCircle className="h-3 w-3" /> ส่งซ่อม
                              </span>
                            )}
                          </td>

                          <td className="px-4 py-3.5">
                            <button
                              type="button"
                              onClick={() => onViewRecordDetail(rec)}
                              className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 font-mono text-xs tabular-nums font-semibold hover:underline ${
                                photoCount === 4
                                  ? 'text-emerald-600 dark:text-emerald-400'
                                  : 'text-amber-600 dark:text-amber-400'
                              }`}
                              title="คลิกเพื่อดูรูปถ่ายสภาพรถ 4 ด้านย้อนหลัง"
                            >
                              {photoCount}/4 ด้าน
                            </button>
                          </td>

                          {(isAdmin || isExecutive) && (
                            <td className="px-4 py-3.5">
                              <div className="flex flex-col gap-1 items-start">
                                <span
                                  className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium ${
                                    rec.googleSheetsSyncStatus === 'synced'
                                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                      : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                                  }`}
                                >
                                  {rec.googleSheetsSyncStatus === 'synced' ? 'ชีต: ซิงค์แล้ว' : 'ชีต: ยังไม่ซิงค์'}
                                </span>

                                {rec.driveLinks?.folderUrl && (
                                  <a
                                    href={rec.driveLinks.folderUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium bg-sky-50 text-sky-700 hover:bg-sky-100 dark:bg-sky-950 dark:text-sky-300"
                                    title="เปิดดูรูปถ่ายใน Google Drive"
                                  >
                                    <FolderSync className="h-3 w-3" />
                                    <span>Drive รูป</span>
                                    <ExternalLink className="h-2.5 w-2.5" />
                                  </a>
                                )}
                              </div>
                            </td>
                          )}

                          <td className="px-4 py-3.5 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {onPrintInspection && (
                                <button
                                  type="button"
                                  onClick={() => onPrintInspection(rec)}
                                  className="inline-flex items-center gap-1 rounded-lg border border-sky-300 bg-sky-50 px-2 py-1 text-xs font-semibold text-sky-700 hover:bg-sky-100 dark:border-sky-800 dark:bg-sky-950/40 dark:text-sky-300 shadow-sm"
                                  title="พิมพ์ใบรายงานผลการตรวจสภาพรถ"
                                >
                                  <Printer className="h-3 w-3" />
                                  <span>พิมพ์</span>
                                </button>
                              )}

                              <button
                                type="button"
                                onClick={() => onViewRecordDetail(rec)}
                                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                              >
                                <Eye className="h-3 w-3" />
                                <span>เปิดดู</span>
                              </button>

                              {currentUser.role === 'admin' && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setDeleteTarget({
                                      type: 'inspection',
                                      id: rec.id,
                                      name: `ประวัติการตรวจรถ ${rec.vehicleCode} (${rec.plateNumber}) วันที่ ${rec.uploadTimestamp}`,
                                    })
                                  }
                                  className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40 dark:hover:text-red-400"
                                  title="ลบประวัติการตรวจนี้ (เฉพาะ Admin)"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={isAdmin || isExecutive ? 8 : 7} className="p-8 text-center text-slate-400">
                        ไม่พบข้อมูลการตรวจตามเงื่อนไขที่ค้นหา
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 1B: Daily 4-Side Photos Gallery */}
      {activeTab === 'photos_gallery' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-3.5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex flex-1 flex-wrap items-center gap-2 min-w-[220px]">
              <Search className="h-4 w-4 text-slate-400 shrink-0" />
              <input
                type="text"
                value={photoSearchDate}
                onChange={(e) => setPhotoSearchDate(e.target.value)}
                placeholder="ค้นหาตามวันที่ (เช่น 17/11/2569), รหัสรถ, ทะเบียน หรือผู้ตรวจ..."
                className="flex-1 bg-transparent text-xs text-slate-800 placeholder-slate-400 focus:outline-none dark:text-slate-200"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <select
                value={photoFilterVehicle}
                onChange={(e) => setPhotoFilterVehicle(e.target.value)}
                className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              >
                <option value="all">รถกู้ชีพทั้งหมด</option>
                {vehicles.map((v) => (
                  <option key={v.id} value={v.code}>
                    {v.code} ({v.plateNumber})
                  </option>
                ))}
              </select>

              {spreadsheetUrl && (
                <a
                  href={spreadsheetUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
                >
                  <FileSpreadsheet className="h-3.5 w-3.5" />
                  <span>ดูแท็บ ถ่ายสภาพรถ4ด้าน_BLS</span>
                  <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>
          </div>

          {(() => {
            const matching = inspections.filter((rec) => {
              const q = photoSearchDate.trim().toLowerCase();
              const matchesQuery =
                !q ||
                rec.uploadTimestamp.toLowerCase().includes(q) ||
                rec.vehicleCode.toLowerCase().includes(q) ||
                rec.plateNumber.toLowerCase().includes(q) ||
                rec.inspectorName.toLowerCase().includes(q);
              const matchesVeh =
                photoFilterVehicle === 'all' || rec.vehicleCode === photoFilterVehicle;
              return matchesQuery && matchesVeh;
            });

            if (matching.length === 0) {
              return (
                <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-xs text-slate-400 dark:border-slate-800 dark:bg-slate-900">
                  ไม่พบประวัติรูปถ่าย 4 ด้านที่ตรงกับเงื่อนไข
                </div>
              );
            }

            return (
              <div className="space-y-4">
                {matching.map((rec) => {
                  const sides = [
                    { label: 'ด้านหน้า (Front)', url: rec.photos.front, driveUrl: rec.driveLinks?.frontPhotoUrl },
                    { label: 'ด้านหลัง (Rear)', url: rec.photos.rear, driveUrl: rec.driveLinks?.rearPhotoUrl },
                    { label: 'ด้านซ้าย (Left)', url: rec.photos.left, driveUrl: rec.driveLinks?.leftPhotoUrl },
                    { label: 'ด้านขวา (Right)', url: rec.photos.right, driveUrl: rec.driveLinks?.rightPhotoUrl },
                  ];

                  return (
                    <div
                      key={rec.id}
                      className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900"
                    >
                      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2.5 dark:border-slate-800">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-lg bg-sky-50 px-2.5 py-1 font-mono text-xs font-bold text-sky-700 dark:bg-sky-950/50 dark:text-sky-300">
                            {rec.uploadTimestamp}
                          </span>
                          <span className="font-mono text-xs font-bold text-slate-900 dark:text-white">
                            {rec.vehicleCode}
                          </span>
                          <span className="text-xs text-slate-500 dark:text-slate-400">
                            ทะเบียน {rec.plateNumber} · ผู้ตรวจ: {rec.inspectorName}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          {rec.driveLinks?.folderUrl && (
                            <a
                              href={rec.driveLinks.folderUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 rounded-lg border border-sky-200 bg-sky-50 px-2.5 py-1 text-[11px] font-semibold text-sky-700 hover:bg-sky-100 dark:border-sky-800 dark:bg-sky-950/40 dark:text-sky-300"
                            >
                              <FolderSync className="h-3 w-3" />
                              <span>โฟลเดอร์ Drive</span>
                            </a>
                          )}
                          <button
                            type="button"
                            onClick={() => onViewRecordDetail(rec)}
                            className="inline-flex items-center gap-1 rounded-lg bg-slate-900 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-slate-700 dark:bg-sky-600 dark:hover:bg-sky-500"
                          >
                            <Eye className="h-3 w-3" />
                            <span>ดูรายละเอียดเต็ม</span>
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                        {sides.map((side, idx) => {
                          const candidates = getDriveImageFallbackUrls(side.url, side.driveUrl);
                          const imgSrc = candidates[0] || '';
                          const linkHref = side.driveUrl || rec.driveLinks?.folderUrl;
                          return (
                            <div
                              key={idx}
                              className="group relative aspect-[4/3] overflow-hidden rounded-xl border border-slate-200 bg-slate-100 dark:border-slate-800 dark:bg-slate-800"
                            >
                              {imgSrc ? (
                                <>
                                  <img
                                    src={imgSrc}
                                    alt={`${rec.vehicleCode} ${side.label}`}
                                    className="h-full w-full cursor-pointer object-cover transition-transform duration-200 group-hover:scale-105"
                                    referrerPolicy="no-referrer"
                                    onClick={() => onViewRecordDetail(rec)}
                                    onError={(e) => {
                                      const img = e.currentTarget;
                                      const nextIdx = Number(img.dataset.attempt || '0') + 1;
                                      if (nextIdx < candidates.length) {
                                        img.dataset.attempt = String(nextIdx);
                                        img.src = candidates[nextIdx];
                                      }
                                    }}
                                  />
                                  {linkHref && (
                                    <a
                                      href={linkHref}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="absolute right-1.5 top-1.5 rounded-md bg-sky-600/90 p-1 text-white hover:bg-sky-500 shadow"
                                      title="เปิดดูใน Google Drive"
                                    >
                                      <ExternalLink className="h-3 w-3" />
                                    </a>
                                  )}
                                </>
                              ) : (
                                <div className="flex h-full w-full flex-col items-center justify-center gap-1 text-[11px] text-slate-400">
                                  <span>ไม่มีภาพ</span>
                                  {linkHref && (
                                    <a
                                      href={linkHref}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center gap-1 rounded bg-sky-600 px-2 py-0.5 text-[10px] font-semibold text-white"
                                    >
                                      <ExternalLink className="h-3 w-3" /> Drive
                                    </a>
                                  )}
                                </div>
                              )}
                              <div className="pointer-events-none absolute bottom-1.5 left-1.5 rounded bg-slate-950/75 px-1.5 py-0.5 text-[10px] font-medium text-white">
                                {side.label}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </div>
      )}

      {/* TAB 2: Vehicle Management */}
      {activeTab === 'vehicles' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                รายการรถยนต์กู้ชีพส่วนกลางในระบบ (Fleet List)
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {currentUser.role === 'admin'
                  ? 'เพิ่ม/แก้ไขข้อมูลรถกู้ชีพ BLS และอัปเดตสถานะความพร้อมใช้งาน'
                  : 'ตรวจสอบข้อมูลรถกู้ชีพ BLS สถานะความพร้อม และเลขไมล์ล่าสุด'}
              </p>
            </div>

            {currentUser.role === 'admin' && (
              <button
                type="button"
                onClick={() => onOpenVehicleModal()}
                className="inline-flex items-center gap-1.5 rounded-xl bg-sky-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-sky-500"
              >
                <Plus className="h-4 w-4" />
                <span>เพิ่มรถกู้ชีพคันใหม่</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {vehicles.map((veh) => (
              <div
                key={veh.id}
                className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900"
              >
                {/* Vehicle Image */}
                <div
                  className="relative aspect-[16/10] w-full overflow-hidden bg-slate-950/20 group cursor-pointer"
                  onClick={() => (isAdmin ? onOpenVehicleModal(veh) : setViewVehicleDetail(veh))}
                  title={isAdmin ? 'คลิกเพื่อแก้ไขข้อมูลหรือเปลี่ยนรูปรถ' : 'คลิกเพื่อดูรายละเอียดรถและประวัติล่าสุด'}
                >
                  <img
                    src={
                      toDisplayableDriveImageUrl(veh.imageUrl, veh.drivePhotoUrl) ||
                      generateSvgCarPlaceholder(veh.code, veh.brandModel, '#0284c7')
                    }
                    alt={veh.code}
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      const fallback = generateSvgCarPlaceholder(veh.code, veh.brandModel, '#0284c7');
                      if (e.currentTarget.src !== fallback) {
                        e.currentTarget.src = fallback;
                      }
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center pb-2.5 pointer-events-none">
                    <span className="inline-flex items-center gap-1.5 rounded-lg bg-sky-600/90 px-2.5 py-1 text-[11px] font-semibold text-white backdrop-blur-sm shadow-md">
                      {isAdmin ? (
                        <>
                          <Camera className="h-3.5 w-3.5 text-white" /> ใส่ / เปลี่ยนรูปรถ
                        </>
                      ) : (
                        <>
                          <Eye className="h-3.5 w-3.5 text-white" /> ดูรายละเอียดรถ
                        </>
                      )}
                    </span>
                  </div>
                  <div className="absolute left-2.5 top-2.5 flex items-center gap-1.5">
                    <span className="rounded-md bg-slate-950/80 px-2 py-0.5 font-mono text-xs font-bold text-sky-400 backdrop-blur-sm">
                      {veh.code}
                    </span>
                    {(isAdmin || isExecutive) && veh.drivePhotoUrl && (
                      <a
                        href={veh.drivePhotoUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="inline-flex items-center gap-1 rounded-md bg-emerald-600/90 px-1.5 py-0.5 text-[10px] font-bold text-white backdrop-blur-sm hover:bg-emerald-500"
                        title="ดูรูปรถใน Google Drive"
                      >
                        <ExternalLink className="h-2.5 w-2.5" />
                        <span>Drive</span>
                      </a>
                    )}
                  </div>

                  <div className="absolute right-2.5 top-2.5">
                    <span
                      className={`inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-bold backdrop-blur-sm ${
                        veh.status === 'available'
                          ? 'bg-emerald-600 text-white'
                          : veh.status === 'issue_found'
                          ? 'bg-amber-600 text-white'
                          : 'bg-red-600 text-white'
                      }`}
                    >
                      {veh.status === 'available'
                        ? 'พร้อมใช้งาน'
                        : veh.status === 'issue_found'
                        ? 'พบปัญหา'
                        : 'ส่งซ่อม'}
                    </span>
                  </div>
                </div>

                {/* Details */}
                <div className="p-4 space-y-2.5">
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                      {veh.plateNumber}
                    </h4>
                    <p className="line-clamp-1 text-xs text-slate-500 dark:text-slate-400">
                      {veh.brandModel} ({veh.year})
                    </p>
                  </div>

                  <div className="space-y-1 text-[11px] text-slate-500 dark:text-slate-400 border-t border-slate-100 pt-2 dark:border-slate-800">
                    <div className="flex justify-between">
                      <span>เลขไมล์ล่าสุด:</span>
                      <span className="font-mono font-semibold tabular-nums text-slate-800 dark:text-slate-200">
                        {veh.currentOdometer.toLocaleString()} กม.
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>ตรวจล่าสุด:</span>
                      <span className="font-medium text-slate-700 dark:text-slate-300">
                        {veh.lastInspectionDate || '-'}
                      </span>
                    </div>
                  </div>

                  {/* Status Toggle & Actions */}
                  {currentUser.role === 'admin' ? (
                    <div className="border-t border-slate-100 pt-3 dark:border-slate-800">
                      <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                        ปรับสถานะด่วน:
                      </label>
                      <select
                        value={veh.status}
                        onChange={(e) => onUpdateVehicleStatus(veh.id, e.target.value as VehicleStatus)}
                        className="w-full rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-semibold text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                      >
                        <option value="available">พร้อมใช้งาน (ปกติ)</option>
                        <option value="issue_found">พบปัญหา (เฝ้าระวัง)</option>
                        <option value="maintenance">อยู่ระหว่างซ่อม (งดใช้)</option>
                      </select>

                      <div className="mt-2.5 flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => onOpenVehicleModal(veh)}
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                        >
                          <Edit2 className="h-3 w-3" /> แก้ไข
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setDeleteTarget({
                              type: 'vehicle',
                              id: veh.id,
                              name: `รถกู้ชีพ ${veh.code} (ทะเบียน ${veh.plateNumber})`,
                            });
                          }}
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40 dark:hover:text-red-400"
                          title="ลบรถ"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="border-t border-slate-100 pt-3 dark:border-slate-800 flex items-center justify-between gap-2">
                      <span
                        className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-bold ${
                          veh.status === 'available'
                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300'
                            : veh.status === 'issue_found'
                            ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300'
                            : 'bg-red-50 text-red-700 dark:bg-red-950/50 dark:text-red-300'
                        }`}
                      >
                        {veh.status === 'available'
                          ? 'พร้อมใช้งาน'
                          : veh.status === 'issue_found'
                          ? 'พบปัญหา'
                          : 'ส่งซ่อม'}
                      </span>

                      <button
                        type="button"
                        onClick={() => setViewVehicleDetail(veh)}
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                      >
                        <Eye className="h-3 w-3 text-sky-600" />
                        <span>ดูรายละเอียด</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: Staff Management (ระบบจัดการพนักงาน) */}
      {activeTab === 'staff' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                {currentUser.role === 'admin'
                  ? 'ระบบจัดการรายชื่อพนักงานและเจ้าหน้าที่กู้ชีพ (Staff Management)'
                  : 'ทำเนียบรายชื่อเจ้าหน้าที่กู้ชีพประจำการ (Staff Directory)'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {currentUser.role === 'admin'
                  ? 'เพิ่ม/แก้ไขข้อมูลเจ้าหน้าที่ กำหนดระดับสิทธิ์การเข้าใช้งาน และสถานะการเข้าเวร'
                  : 'ตรวจสอบรายชื่อเจ้าหน้าที่ประจำการ ข้อมูลติดต่อ และสถานะการเข้าเวร'}
              </p>
            </div>

            {currentUser.role === 'admin' && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => onOpenStaffModal()}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-sky-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-sky-500"
                >
                  <Plus className="h-4 w-4" />
                  <span>เพิ่มพนักงานใหม่</span>
                </button>
              </div>
            )}
          </div>

          {/* Search bar */}
          <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <Search className="h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={staffSearchTerm}
              onChange={(e) => setStaffSearchTerm(e.target.value)}
              placeholder="ค้นหาเจ้าหน้าที่ตามชื่อ, รหัสพนักงาน, ตำแหน่ง หรือสังกัด..."
              className="w-full bg-transparent text-xs text-slate-800 placeholder-slate-400 focus:outline-none dark:text-slate-200"
            />
          </div>

          {/* Staff Table */}
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:border-slate-800 dark:bg-slate-850 dark:text-slate-400">
                  <tr>
                    <th className="px-4 py-3">รหัสพนักงาน</th>
                    <th className="px-4 py-3">ชื่อ-นามสกุล</th>
                    <th className="px-4 py-3">ตำแหน่ง / สังกัด</th>
                    <th className="px-4 py-3">เบอร์ติดต่อ / อีเมล</th>
                    <th className="px-4 py-3">ระดับสิทธิ์</th>
                    <th className="px-4 py-3">สถานะ</th>
                    <th className="px-4 py-3 text-right">การจัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredStaff.length > 0 ? (
                    filteredStaff.map((staff) => (
                      <tr
                        key={staff.id}
                        className="hover:bg-slate-50/70 transition-colors dark:hover:bg-slate-800/40"
                      >
                        <td className="px-4 py-3.5">
                          <span className="font-mono font-bold text-sky-600 dark:text-sky-400">
                            {staff.employeeId}
                          </span>
                        </td>

                        <td className="px-4 py-3.5">
                          <div className="font-semibold text-slate-900 dark:text-white">
                            {staff.name}
                          </div>
                          {staff.id === currentUser.id && (
                            <span className="text-[10px] text-emerald-600 dark:text-emerald-400">
                              (กำลังเข้าสู่ระบบอยู่ขณะนี้)
                            </span>
                          )}
                        </td>

                        <td className="px-4 py-3.5">
                          <div className="text-slate-800 dark:text-slate-200 font-medium">
                            {staff.position || 'เจ้าหน้าที่กู้ชีพ'}
                          </div>
                          <span className="text-[11px] text-slate-400">
                            {staff.department || 'งานกู้ชีพ BLS'}
                          </span>
                        </td>

                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-1 text-slate-700 dark:text-slate-300">
                            <Phone className="h-3 w-3 text-slate-400" />
                            <span>{staff.phone || '-'}</span>
                          </div>
                          <span className="text-[10px] text-slate-400">
                            {staff.email || '-'}
                          </span>
                        </td>

                        <td className="px-4 py-3.5">
                          {staff.role === 'admin' ? (
                            <span className="inline-flex items-center gap-1 rounded px-2 py-0.5 text-[11px] font-semibold text-sky-700 bg-sky-50 dark:bg-sky-950/40 dark:text-sky-300">
                              <Shield className="h-3 w-3" /> ผู้ดูแลระบบ (Admin)
                            </span>
                          ) : staff.role === 'executive' ? (
                            <span className="inline-flex items-center gap-1 rounded px-2 py-0.5 text-[11px] font-semibold text-indigo-700 bg-indigo-50 dark:bg-indigo-950/40 dark:text-indigo-300">
                              <Briefcase className="h-3 w-3" /> ผู้บริหาร (Executive)
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded px-2 py-0.5 text-[11px] font-semibold text-slate-700 bg-slate-100 dark:bg-slate-800 dark:text-slate-300">
                              <UserCheck className="h-3 w-3" /> พนักงานทั่วไป (Staff)
                            </span>
                          )}
                        </td>

                        <td className="px-4 py-3.5">
                          {currentUser.role === 'admin' ? (
                            <select
                              value={staff.status || 'active'}
                              onChange={(e) => onUpdateStaffStatus(staff.id, e.target.value as UserStatus)}
                              className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-semibold text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                            >
                              <option value="active">พร้อมปฏิบัติงาน</option>
                              <option value="on_leave">พักเวร / ลา</option>
                              <option value="inactive">ระงับการใช้งาน</option>
                            </select>
                          ) : (
                            <span
                              className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-[11px] font-semibold ${
                                staff.status === 'on_leave'
                                  ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300'
                                  : staff.status === 'inactive'
                                  ? 'bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300'
                                  : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                              }`}
                            >
                              {staff.status === 'on_leave'
                                ? 'พักเวร / ลา'
                                : staff.status === 'inactive'
                                ? 'ไม่ได้ปฏิบัติงาน'
                                : 'พร้อมปฏิบัติงาน'}
                            </span>
                          )}
                        </td>

                        <td className="px-4 py-3.5 text-right">
                          {currentUser.role === 'admin' ? (
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => onOpenStaffModal(staff)}
                                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                              >
                                <Edit2 className="h-3 w-3" /> แก้ไข
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setDeleteTarget({
                                    type: 'staff',
                                    id: staff.id,
                                    name: `${staff.name} (รหัส ${staff.employeeId})`,
                                  });
                                }}
                                className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40 dark:hover:text-red-400"
                                title="ลบพนักงาน"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          ) : (
                            <span className="text-[11px] text-slate-400">-</span>
                          )}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-slate-400">
                        ไม่พบข้อมูลพนักงานที่ค้นหา
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Read-Only Vehicle Detail Modal (for Executive / Staff) */}
      {viewVehicleDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-3 sm:p-6 backdrop-blur-sm overflow-y-auto">
          <div className="my-auto w-full max-w-2xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <Truck className="h-5 w-5 text-sky-500" />
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    รายละเอียดรถกู้ชีพ {viewVehicleDetail.code} · {viewVehicleDetail.plateNumber}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {viewVehicleDetail.brandModel} (ปี {viewVehicleDetail.year})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setViewVehicleDetail(null)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="max-h-[80vh] overflow-y-auto p-6 space-y-5">
              <div className="relative aspect-[16/9] w-full overflow-hidden rounded-2xl border border-slate-200 bg-slate-900 dark:border-slate-800">
                <img
                  src={
                    toDisplayableDriveImageUrl(viewVehicleDetail.imageUrl, viewVehicleDetail.drivePhotoUrl) ||
                    generateSvgCarPlaceholder(viewVehicleDetail.code, viewVehicleDetail.brandModel, '#0284c7')
                  }
                  alt={viewVehicleDetail.code}
                  className="h-full w-full object-cover"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute right-3 top-3">
                  <span
                    className={`rounded-lg px-2.5 py-1 text-xs font-bold shadow ${
                      viewVehicleDetail.status === 'available'
                        ? 'bg-emerald-600 text-white'
                        : viewVehicleDetail.status === 'issue_found'
                        ? 'bg-amber-600 text-white'
                        : 'bg-red-600 text-white'
                    }`}
                  >
                    {viewVehicleDetail.status === 'available'
                      ? 'พร้อมใช้งาน (ปกติ)'
                      : viewVehicleDetail.status === 'issue_found'
                      ? 'พบปัญหา (เฝ้าระวัง)'
                      : 'อยู่ระหว่างซ่อม (งดใช้)'}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                <div className="rounded-xl border border-slate-100 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-850">
                  <span className="flex items-center gap-1 text-[11px] text-slate-400">
                    <Gauge className="h-3 w-3 text-sky-500" /> เลขไมล์ล่าสุด
                  </span>
                  <p className="mt-1 font-mono text-sm font-bold text-slate-900 dark:text-white">
                    {viewVehicleDetail.currentOdometer.toLocaleString()} กม.
                  </p>
                </div>
                <div className="rounded-xl border border-slate-100 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-850">
                  <span className="flex items-center gap-1 text-[11px] text-slate-400">
                    <Calendar className="h-3 w-3 text-sky-500" /> ตรวจสภาพล่าสุด
                  </span>
                  <p className="mt-1 font-bold text-slate-900 dark:text-white">
                    {viewVehicleDetail.lastInspectionDate || '-'}
                  </p>
                </div>
                <div className="col-span-2 sm:col-span-1 rounded-xl border border-slate-100 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-850">
                  <span className="flex items-center gap-1 text-[11px] text-slate-400">
                    <UserCheck className="h-3 w-3 text-sky-500" /> ผู้ตรวจล่าสุด
                  </span>
                  <p className="mt-1 font-bold text-slate-900 dark:text-white truncate">
                    {viewVehicleDetail.lastInspector || '-'}
                  </p>
                </div>
              </div>

              {viewVehicleDetail.notes && (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700 dark:border-slate-800 dark:bg-slate-850 dark:text-slate-300">
                  <span className="font-bold text-slate-900 dark:text-white">หมายเหตุประจำรถ: </span>
                  {viewVehicleDetail.notes}
                </div>
              )}

              <div>
                <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 mb-2">
                  ประวัติการตรวจสภาพของ {viewVehicleDetail.code} ล่าสุด
                </h4>
                {(() => {
                  const vehHistory = inspections
                    .filter(
                      (i) =>
                        i.vehicleId === viewVehicleDetail.id ||
                        i.vehicleCode === viewVehicleDetail.code
                    )
                    .slice(0, 5);
                  if (vehHistory.length === 0) {
                    return (
                      <p className="rounded-xl border border-dashed border-slate-200 p-4 text-center text-xs text-slate-400 dark:border-slate-800">
                        ยังไม่มีประวัติการตรวจสำหรับรถคันนี้
                      </p>
                    );
                  }
                  return (
                    <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 dark:divide-slate-800 dark:border-slate-800">
                      {vehHistory.map((rec) => (
                        <div
                          key={rec.id}
                          className="flex items-center justify-between gap-2 px-3 py-2.5 text-xs"
                        >
                          <div>
                            <p className="font-semibold text-slate-900 dark:text-white">
                              {rec.uploadTimestamp} · {rec.inspectorName}
                            </p>
                            <p className="text-[11px] text-slate-400">
                              ไมล์ {rec.odometerReading.toLocaleString()} กม. ·{' '}
                              {rec.overallStatus === 'normal'
                                ? 'ปกติ'
                                : rec.overallStatus === 'issue_found'
                                ? 'พบปัญหา'
                                : 'ส่งซ่อม'}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setViewVehicleDetail(null);
                              onViewRecordDetail(rec);
                            }}
                            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                          >
                            <Eye className="h-3 w-3 text-sky-600" />
                            <span>ดูรายละเอียด</span>
                          </button>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal (In-App Modal to avoid iframe confirm block) */}
      <ConfirmDeleteModal
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleConfirmDelete}
        title={
          deleteTarget?.type === 'vehicle'
            ? 'ยืนยันการลบรถกู้ชีพ BLS'
            : deleteTarget?.type === 'staff'
            ? 'ยืนยันการลบพนักงาน'
            : deleteTarget?.type === 'clear_all'
            ? 'ยืนยันการล้างประวัติการตรวจทั้งหมด'
            : deleteTarget?.type === 'clear_all_system'
            ? 'ยืนยันการล้างข้อมูลระบบทั้งหมดเพื่อทดสอบ'
            : 'ยืนยันการลบประวัติการตรวจสภาพรถ'
        }
        message={
          deleteTarget?.type === 'vehicle'
            ? 'คุณแน่ใจหรือไม่ว่าต้องการลบรถกู้ชีพคันนี้ออกจากระบบส่วนกลาง?'
            : deleteTarget?.type === 'staff'
            ? 'คุณแน่ใจหรือไม่ว่าต้องการลบรายชื่อพนักงานท่านนี้ออกจากระบบ?'
            : deleteTarget?.type === 'clear_all'
            ? 'คุณแน่ใจหรือไม่ว่าต้องการลบประวัติการตรวจสภาพรถทั้งหมดออกจากระบบเพื่อเริ่มทดสอบใหม่? (สิทธิ์เฉพาะ Admin เท่านั้น)'
            : deleteTarget?.type === 'clear_all_system'
            ? 'ระบบจะทำการล้างประวัติการตรวจและรายชื่อรถทั้งหมดออกเพื่อให้คุณสามารถทดสอบสร้างรถและบันทึกตรวจสภาพใหม่ตั้งแต่ต้น คุณแน่ใจหรือไม่?'
            : 'คุณแน่ใจหรือไม่ว่าต้องการลบประวัติการตรวจสภาพรถรอบนี้ออกจากระบบ? (สิทธิ์เฉพาะ Admin เท่านั้น)'
        }
        itemName={deleteTarget?.name || ''}
      />
    </div>
  );
};
