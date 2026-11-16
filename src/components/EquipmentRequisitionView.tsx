import React, { useMemo, useState } from 'react';
import {
  AmbulanceVehicle,
  EquipmentRequisitionCatalogItem,
  EquipmentRequisitionLineItem,
  EquipmentRequisitionRecord,
  EquipmentRequisitionStatus,
  EquipmentTeamType,
  UserProfile,
} from '../types';
import {
  EQUIPMENT_REQUISITION_CATALOG,
  REQUISITION_CATEGORIES,
} from '../data/equipmentRequisition';
import {
  ORGANIZATION_NAME,
  THAI_MONTHS,
  getDefaultThaiDateParts,
} from '../data/equipmentChecklist';
import { ConfirmDeleteModal } from './ConfirmDeleteModal';
import {
  PackagePlus,
  Search,
  Plus,
  Minus,
  Trash2,
  Printer,
  Eye,
  ExternalLink,
  X,
  CheckCircle2,
  Clock,
  PackageCheck,
  Users,
  Truck,
  Calendar,
  Send,
  RotateCcw,
  AlertCircle,
  Filter,
} from 'lucide-react';

interface EquipmentRequisitionViewProps {
  currentUser: UserProfile;
  vehicles: AmbulanceVehicle[];
  records: EquipmentRequisitionRecord[];
  onSaveRecord: (record: EquipmentRequisitionRecord) => void | Promise<void>;
  onUpdateStatus: (id: string, status: EquipmentRequisitionStatus) => void | Promise<void>;
  onDeleteRecord: (id: string) => void | Promise<void>;
  isSubmitting?: boolean;
}

export const EquipmentRequisitionView: React.FC<EquipmentRequisitionViewProps> = ({
  currentUser,
  vehicles,
  records,
  onSaveRecord,
  onUpdateStatus,
  onDeleteRecord,
  isSubmitting = false,
}) => {
  const defaultDate = useMemo(() => getDefaultThaiDateParts(), []);

  const [activeTab, setActiveTab] = useState<'create' | 'history'>('create');
  const [team, setTeam] = useState<EquipmentTeamType>('team_1');
  const [inspectDay, setInspectDay] = useState(defaultDate.day);
  const [inspectMonth, setInspectMonth] = useState(defaultDate.month);
  const [inspectYear, setInspectYear] = useState(defaultDate.year);
  const [selectedVehicleId, setSelectedVehicleId] = useState('');
  const [requesterName, setRequesterName] = useState(currentUser.name || '');
  const [purposeNotes, setPurposeNotes] = useState('');

  // Catalog + custom items state
  const [customCatalog, setCustomCatalog] = useState<EquipmentRequisitionCatalogItem[]>([]);
  const [qtyMap, setQtyMap] = useState<Record<string, number>>({});
  const [notesMap, setNotesMap] = useState<Record<string, string>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [onlySelected, setOnlySelected] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Custom item input
  const [showCustomForm, setShowCustomForm] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customUnit, setCustomUnit] = useState('ชิ้น');
  const [customQty, setCustomQty] = useState(1);

  // History filters & modals
  const [historyStatusFilter, setHistoryStatusFilter] = useState<'all' | EquipmentRequisitionStatus>('all');
  const [historySearch, setHistorySearch] = useState('');
  const [detailRecord, setDetailRecord] = useState<EquipmentRequisitionRecord | null>(null);
  const [printRecord, setPrintRecord] = useState<EquipmentRequisitionRecord | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<EquipmentRequisitionRecord | null>(null);
  const [printStatus, setPrintStatus] = useState<string | null>(null);

  const allCatalog = useMemo(
    () => [...EQUIPMENT_REQUISITION_CATALOG, ...customCatalog],
    [customCatalog]
  );

  const selectedItems: EquipmentRequisitionLineItem[] = useMemo(() => {
    return allCatalog
      .filter((item) => (qtyMap[item.id] || 0) > 0)
      .map((item) => ({
        id: item.id,
        category: item.category,
        name: item.name,
        unit: item.unit,
        requestedQty: qtyMap[item.id] || 0,
        notes: notesMap[item.id]?.trim() || undefined,
      }));
  }, [allCatalog, qtyMap, notesMap]);

  const totalSelectedUnits = useMemo(
    () => selectedItems.reduce((sum, item) => sum + item.requestedQty, 0),
    [selectedItems]
  );

  const visibleCatalog = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return allCatalog.filter((item) => {
      if (categoryFilter !== 'all' && item.category !== categoryFilter) return false;
      if (onlySelected && (qtyMap[item.id] || 0) <= 0) return false;
      if (q && !item.name.toLowerCase().includes(q) && !item.category.toLowerCase().includes(q)) {
        return false;
      }
      return true;
    });
  }, [allCatalog, categoryFilter, onlySelected, qtyMap, searchQuery]);

  const groupedVisible = useMemo(() => {
    const groups: Array<{ category: string; items: EquipmentRequisitionCatalogItem[] }> = [];
    for (const item of visibleCatalog) {
      const existing = groups.find((g) => g.category === item.category);
      if (existing) {
        existing.items.push(item);
      } else {
        groups.push({ category: item.category, items: [item] });
      }
    }
    return groups;
  }, [visibleCatalog]);

  const setItemQty = (id: string, qty: number) => {
    setFormError(null);
    const cleanQty = Math.max(0, Math.floor(Number.isFinite(qty) ? qty : 0));
    setQtyMap((prev) => ({ ...prev, [id]: cleanQty }));
  };

  const handleAddCustomItem = () => {
    const nameTrimmed = customName.trim();
    if (!nameTrimmed) return;
    const newId = `req-custom-${Date.now()}`;
    const newItem: EquipmentRequisitionCatalogItem = {
      id: newId,
      category: '5. รายการอุปกรณ์เพิ่มเติม (ระบุเอง)',
      name: nameTrimmed,
      unit: customUnit.trim() || 'ชิ้น',
    };
    setCustomCatalog((prev) => [...prev, newItem]);
    setQtyMap((prev) => ({ ...prev, [newId]: Math.max(1, Math.floor(customQty || 1)) }));
    setCustomName('');
    setCustomQty(1);
    setShowCustomForm(false);
    setFormError(null);
  };

  const handleClearSelection = () => {
    setQtyMap({});
    setNotesMap({});
    setFormError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedItems.length === 0) {
      setFormError('กรุณาเลือกจำนวนอุปกรณ์ที่ต้องการเบิกอย่างน้อย 1 รายการ');
      return;
    }

    const matchedVehicle = vehicles.find((v) => v.id === selectedVehicleId);
    const teamLabel = team === 'team_1' ? 'ชุดปฏิบัติการที่ 1' : 'ชุดปฏิบัติการที่ 2';
    const dayStr = inspectDay.trim() || defaultDate.day;
    const monthStr = inspectMonth || defaultDate.month;
    const yearStr = inspectYear.trim() || defaultDate.year;
    const dayNum = parseInt(dayStr, 10);
    const dayPadded = String(Number.isNaN(dayNum) ? new Date().getDate() : dayNum).padStart(2, '0');
    const monthIdx = THAI_MONTHS.indexOf(monthStr);
    const monthNum = monthIdx >= 0 ? monthIdx + 1 : new Date().getMonth() + 1;
    const monthPadded = String(monthNum).padStart(2, '0');
    const yearShort = yearStr.replace(/\D/g, '').slice(-2).padStart(2, '0');
    const dateSuffix = `${dayPadded}${monthPadded}${yearShort}`;
    const sameDateSeqs = records
      .filter((r) => r.requisitionNo.endsWith(`-${dateSuffix}`))
      .map((r) => parseInt(r.requisitionNo.split('-')[0], 10))
      .filter((n) => !Number.isNaN(n) && n > 0);
    const nextSeq = sameDateSeqs.length > 0 ? Math.max(...sameDateSeqs) + 1 : 1;
    const reqNo = `${String(nextSeq).padStart(3, '0')}-${dateSuffix}`;

    const record: EquipmentRequisitionRecord = {
      id: `req-${Date.now()}`,
      requisitionNo: reqNo,
      organizationName: ORGANIZATION_NAME,
      team,
      teamLabel,
      inspectDay: dayStr,
      inspectMonth: monthStr,
      inspectYear: yearStr,
      requestDateFormatted: `${dayStr} ${monthStr} ${yearStr}`,
      vehicleId: matchedVehicle?.id,
      vehicleCode: matchedVehicle?.code,
      plateNumber: matchedVehicle?.plateNumber,
      requesterName: requesterName.trim() || currentUser.name || 'เจ้าหน้าที่',
      requesterRole: currentUser.role,
      items: selectedItems,
      totalItemTypes: selectedItems.length,
      totalQuantity: totalSelectedUnits,
      status: 'pending',
      purposeNotes: purposeNotes.trim(),
      createdAt: Date.now(),
      uploadTimestamp: new Date().toLocaleString('th-TH'),
      googleSheetsSyncStatus: 'pending',
    };

    await onSaveRecord(record);
    setQtyMap({});
    setNotesMap({});
    setPurposeNotes('');
    setOnlySelected(false);
    setFormError(null);
    setActiveTab('history');
  };

  const filteredRecords = useMemo(() => {
    const q = historySearch.trim().toLowerCase();
    return records.filter((rec) => {
      if (historyStatusFilter !== 'all' && rec.status !== historyStatusFilter) return false;
      if (q) {
        const itemsText = rec.items.map((i) => i.name).join(' ');
        const hay = `${rec.requisitionNo} ${rec.requestDateFormatted} ${rec.teamLabel} ${rec.requesterName} ${
          rec.vehicleCode || ''
        } ${itemsText}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [records, historyStatusFilter, historySearch]);

  const buildRequisitionPrintHtml = (rec: EquipmentRequisitionRecord) => {
    const rowsHtml = rec.items
      .map(
        (item, idx) => `
      <tr>
        <td style="padding:5px 6px; border:1px solid #94a3b8; text-align:center; font-size:11px;">${idx + 1}</td>
        <td style="padding:5px 8px; border:1px solid #94a3b8; font-size:11px;">${item.name}</td>
        <td style="padding:5px 6px; border:1px solid #94a3b8; text-align:center; font-weight:700; font-size:11px;">${item.requestedQty}</td>
        <td style="padding:5px 6px; border:1px solid #94a3b8; text-align:center; font-size:11px;">${item.unit}</td>
        <td style="padding:5px 8px; border:1px solid #94a3b8; font-size:10.5px; color:#475569;">${item.notes || '-'}</td>
      </tr>
    `
      )
      .join('');

    return `<!DOCTYPE html>
<html lang="th">
<head>
  <meta charset="utf-8" />
  <title>ใบเบิกอุปกรณ์กู้ชีพ_${rec.requisitionNo}</title>
  <style>
    @page { size: A4 portrait; margin: 12mm 14mm; }
    * { box-sizing: border-box; }
    body {
      font-family: 'Sarabun', 'Prompt', -apple-system, BlinkMacSystemFont, sans-serif;
      color: #0f172a;
      background: #ffffff;
      margin: 0;
      padding: 12px 16px;
      font-size: 11.5px;
      line-height: 1.4;
    }
    .header {
      text-align: center;
      border-bottom: 2px solid #0f172a;
      padding-bottom: 8px;
      margin-bottom: 10px;
    }
    .title { font-size: 16px; font-weight: 700; margin: 0; }
    .org { font-size: 13.5px; font-weight: 700; margin-top: 2px; }
    .meta {
      background: #f8fafc;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      padding: 10px 14px;
      margin-bottom: 10px;
      font-size: 11.5px;
      line-height: 1.7;
    }
    table { width: 100%; border-collapse: collapse; margin-top: 6px; }
    th {
      background: #0f172a;
      color: #ffffff;
      padding: 6px;
      border: 1px solid #475569;
      font-size: 11px;
    }
    .sign-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 18px;
      margin-top: 16px;
      page-break-inside: avoid;
    }
    .sign-box {
      border: 1px dashed #94a3b8;
      padding: 8px;
      text-align: center;
      border-radius: 6px;
      font-size: 10.5px;
    }
    @media print { body { padding: 0; } }
  </style>
</head>
<body>
  <div class="header">
    <div style="text-align:right; font-size:11px; margin-bottom:4px;">
      เลขที่ใบเบิก: <strong style="font-family:monospace; font-size:12px;">${rec.requisitionNo}</strong>
    </div>
    <div class="title">ใบเบิกจ่าย วัสดุวิทยาศาสตร์หรือการแพทย์ (สำนักงานปลัด)</div>
    <div class="org">${rec.organizationName}</div>
    <div style="font-size:11px; margin-top:3px;">
      ประจำวันที่ <strong>${rec.inspectDay}</strong> เดือน <strong>${rec.inspectMonth}</strong> พ.ศ. <strong>${rec.inspectYear}</strong>
    </div>
  </div>

  <div class="meta">
    <div><strong>เรียน</strong> นายกองค์การบริหารส่วนตำบลหงษ์เจริญ</div>
    <div style="margin-top:2px;">
      <strong>ข้าพเจ้า</strong> <span style="display:inline-block; min-width:140px; text-align:center; border-bottom:1px dotted #64748b; font-weight:700; padding:0 8px;">${rec.requesterName}</span>
      &nbsp;&nbsp;<strong>ตำแหน่ง</strong> <span style="display:inline-block; min-width:140px; text-align:center; border-bottom:1px dotted #64748b; font-weight:700; padding:0 8px;">คนงานทั่วไป</span>
    </div>
    <div style="margin-top:2px;">สังกัด/ส่วน <strong>สำนักงานปลัด</strong> มีความประสงค์ขอเบิกวัสดุเพื่อใช้ในราชการ ตามรายการดังต่อไปนี้</div>
  </div>

  <table>
    <thead>
      <tr>
        <th style="width:8%; text-align:center;">ลำดับ</th>
        <th style="width:50%; text-align:left;">รายการอุปกรณ์ / เวชภัณฑ์</th>
        <th style="width:12%; text-align:center;">จำนวนเบิก</th>
        <th style="width:12%; text-align:center;">หน่วย</th>
        <th style="width:18%; text-align:left;">หมายเหตุ</th>
      </tr>
    </thead>
    <tbody>
      ${rowsHtml}
    </tbody>
  </table>

  ${
    rec.purposeNotes
      ? `<div style="margin-top:8px; padding:6px 10px; border:1px solid #cbd5e1; background:#f8fafc; font-size:11px;">
          <strong>เหตุผล / หมายเหตุการขอเบิก:</strong> ${rec.purposeNotes}
         </div>`
      : ''
  }

  <div class="sign-grid">
    <div class="sign-box" style="display:flex; flex-direction:column; justify-content:flex-end;">
      <div style="height:24px;"></div>
      <div>ลงชื่อ.................................................. ผู้เบิก</div>
      <div style="margin-top:3px; font-weight:700;">( ${currentUser.name || rec.requesterName} )</div>
      <div style="margin-top:2px; font-size:10px;">คนงานทั่วไป</div>
      <div style="margin-top:2px; font-size:10px;">วันที่ ${rec.inspectDay} เดือน ${rec.inspectMonth} พ.ศ. ${rec.inspectYear}</div>
    </div>
    <div class="sign-box">
      <div style="text-align:left; margin-bottom:10px; line-height:1.6;">
        <div>(&nbsp;&nbsp;) อนุมัติ</div>
        <div>(&nbsp;&nbsp;) ไม่อนุมัติ เพราะ....................................................</div>
      </div>
      <div style="height:18px;"></div>
      <div>ลงชื่อ.......................................................... ผู้อนุมัติ</div>
      <div style="margin-top:3px; font-weight:700; white-space:pre;">(     นางสาวอภิญญา  จินาห้อง     )</div>
      <div style="margin-top:2px; font-size:10px;">หัวหน้าสำนักปลัด</div>
      <div style="margin-top:2px; font-size:10px;">วันที่...........เดือน.............................. พ.ศ.............</div>
    </div>
  </div>

  <div style="margin-top:14px; display:flex; justify-content:center; page-break-inside:avoid;">
    <div class="sign-box" style="width:65%; max-width:380px;">
      <div style="font-weight:700; margin-bottom:4px;">จึงเรียนมาเพื่อโปรดทราบ</div>
      <div style="height:24px;"></div>
      <div>ลงชื่อ.....................................................................</div>
      <div style="margin-top:3px; font-weight:700; white-space:pre;">(        นายนิยม   สังข์เอียด        )</div>
      <div style="margin-top:2px; font-size:10.5px;">นายกองค์การบริหารส่วนตำบลหงษ์เจริญ</div>
      <div style="margin-top:2px; font-size:10px;">วันที่............เดือน........................พ.ศ. .......................</div>
    </div>
  </div>
</body>
</html>`;
  };

  const handlePrintViaIframe = (rec: EquipmentRequisitionRecord) => {
    try {
      setPrintStatus('กำลังเตรียมใบเบิกสำหรับสั่งพิมพ์...');
      const htmlContent = buildRequisitionPrintHtml(rec);
      const printFrame = document.createElement('iframe');
      printFrame.setAttribute(
        'style',
        'visibility:hidden; height:0; width:0; position:absolute; left:-9999px; bottom:0;'
      );
      document.body.appendChild(printFrame);

      const frameDoc = printFrame.contentDocument || printFrame.contentWindow?.document;
      if (frameDoc) {
        frameDoc.open();
        frameDoc.write(htmlContent);
        frameDoc.close();
        setTimeout(() => {
          try {
            printFrame.contentWindow?.focus();
            printFrame.contentWindow?.print();
            setPrintStatus('เปิดหน้าต่างสั่งพิมพ์แล้ว');
          } catch {
            window.print();
          } finally {
            setTimeout(() => {
              if (document.body.contains(printFrame)) {
                document.body.removeChild(printFrame);
              }
              setPrintStatus(null);
            }, 2500);
          }
        }, 400);
      }
    } catch {
      window.print();
    }
  };

  const handleOpenStandaloneTab = (rec: EquipmentRequisitionRecord) => {
    try {
      const htmlContent = buildRequisitionPrintHtml(rec);
      const win = window.open('', '_blank');
      if (win) {
        win.document.open();
        win.document.write(htmlContent);
        win.document.close();
      } else {
        handlePrintViaIframe(rec);
      }
    } catch {
      handlePrintViaIframe(rec);
    }
  };

  const getStatusBadge = (status: EquipmentRequisitionStatus) => {
    if (status === 'dispensed') {
      return (
        <span className="inline-flex items-center gap-1 rounded-xl bg-emerald-100 px-2.5 py-1 text-[11px] font-bold text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
          <PackageCheck className="h-3.5 w-3.5" />
          <span>จ่ายอุปกรณ์แล้ว</span>
        </span>
      );
    }
    if (status === 'approved') {
      return (
        <span className="inline-flex items-center gap-1 rounded-xl bg-sky-100 px-2.5 py-1 text-[11px] font-bold text-sky-800 dark:bg-sky-950/60 dark:text-sky-300">
          <CheckCircle2 className="h-3.5 w-3.5" />
          <span>อนุมัติแล้ว (รอจ่าย)</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 rounded-xl bg-amber-100 px-2.5 py-1 text-[11px] font-bold text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
        <Clock className="h-3.5 w-3.5" />
        <span>รออนุมัติ</span>
      </span>
    );
  };

  return (
    <div className="space-y-5">
      {/* Header Banner */}
      <div className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500 to-indigo-700 text-white shadow-sm">
              <PackagePlus className="h-6 w-6" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-lg bg-sky-100 px-2 py-0.5 text-[11px] font-bold text-sky-800 dark:bg-sky-950/60 dark:text-sky-300">
                  {ORGANIZATION_NAME}
                </span>
                <span className="rounded-lg bg-indigo-100 px-2 py-0.5 text-[11px] font-bold text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300">
                  คลังอุปกรณ์ & เวชภัณฑ์ {allCatalog.length} รายการ
                </span>
              </div>
              <h1 className="mt-1 text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white leading-snug">
                ระบบเบิกอุปกรณ์และเวชภัณฑ์กู้ชีพ
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                เลือกรายการและระบุจำนวนที่ต้องการเบิก พร้อมพิมพ์ใบเบิกอุปกรณ์มาตรฐานและติดตามสถานะการจ่าย
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 rounded-2xl bg-slate-100 p-1.5 dark:bg-slate-800 self-start lg:self-auto">
            <button
              type="button"
              onClick={() => setActiveTab('create')}
              className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold transition-all ${
                activeTab === 'create'
                  ? 'bg-white text-sky-700 shadow-xs dark:bg-slate-900 dark:text-sky-400'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white'
              }`}
            >
              <PackagePlus className="h-4 w-4" />
              <span>สร้างใบเบิกอุปกรณ์</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('history')}
              className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold transition-all ${
                activeTab === 'history'
                  ? 'bg-white text-indigo-700 shadow-xs dark:bg-slate-900 dark:text-indigo-400'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white'
              }`}
            >
              <Calendar className="h-4 w-4" />
              <span>ประวัติใบเบิก ({records.length})</span>
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* TAB 1: CREATE REQUISITION FORM                            */}
      {/* ========================================================= */}
      {activeTab === 'create' && (
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Metadata Card */}
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
              <div className="lg:col-span-5">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
                  ชุดปฏิบัติการที่ขอเบิก ({ORGANIZATION_NAME})
                </label>
                <div className="grid grid-cols-2 gap-2.5">
                  {[
                    { id: 'team_1' as EquipmentTeamType, label: 'ชุดปฏิบัติการที่ 1' },
                    { id: 'team_2' as EquipmentTeamType, label: 'ชุดปฏิบัติการที่ 2' },
                  ].map((opt) => {
                    const selected = team === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setTeam(opt.id)}
                        className={`flex items-center justify-center gap-2 rounded-2xl border-2 px-3 py-3 text-xs font-bold transition-all ${
                          selected
                            ? 'border-sky-500 bg-sky-50 text-sky-800 shadow-xs dark:border-sky-600 dark:bg-sky-950/50 dark:text-sky-300'
                            : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-white dark:border-slate-800 dark:bg-slate-850 dark:text-slate-300'
                        }`}
                      >
                        <Users className="h-3.5 w-3.5 shrink-0" />
                        <span>{opt.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="lg:col-span-7">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
                  วันที่ขอเบิก (พ.ศ.)
                </label>
                <div className="grid grid-cols-3 gap-2.5">
                  <div>
                    <span className="block text-[10px] text-slate-400 mb-1">วันที่</span>
                    <input
                      type="number"
                      min={1}
                      max={31}
                      value={inspectDay}
                      onChange={(e) => setInspectDay(e.target.value)}
                      required
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-bold text-slate-900 focus:border-sky-500 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    />
                  </div>
                  <div>
                    <span className="block text-[10px] text-slate-400 mb-1">เดือน</span>
                    <select
                      value={inspectMonth}
                      onChange={(e) => setInspectMonth(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-bold text-slate-900 focus:border-sky-500 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    >
                      {THAI_MONTHS.map((m) => (
                        <option key={m} value={m}>
                          {m}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <span className="block text-[10px] text-slate-400 mb-1">พ.ศ.</span>
                    <input
                      type="number"
                      min={2560}
                      max={2650}
                      value={inspectYear}
                      onChange={(e) => setInspectYear(e.target.value)}
                      required
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-bold text-slate-900 focus:border-sky-500 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 pt-2 border-t border-slate-100 dark:border-slate-800">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  รถปฏิบัติการที่ใช้ (ไม่บังคับ)
                </label>
                <div className="relative">
                  <Truck className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <select
                    value={selectedVehicleId}
                    onChange={(e) => setSelectedVehicleId(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 py-2.5 text-xs font-semibold text-slate-900 focus:border-sky-500 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  >
                    <option value="">-- เบิกเข้าคลังชุด / ไม่ระบุรถ --</option>
                    {vehicles.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.code} · {v.plateNumber}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  ชื่อผู้ขอเบิกอุปกรณ์
                </label>
                <input
                  type="text"
                  value={requesterName}
                  onChange={(e) => setRequesterName(e.target.value)}
                  placeholder="ระบุชื่อ-นามสกุลผู้ขอเบิก"
                  required
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs font-semibold text-slate-900 focus:border-sky-500 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  เหตุผล / หมายเหตุการขอเบิก
                </label>
                <input
                  type="text"
                  value={purposeNotes}
                  onChange={(e) => setPurposeNotes(e.target.value)}
                  placeholder="เช่น เติมสต๊อกประจำสัปดาห์ หรือทดแทนของใช้หมด"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs font-semibold text-slate-900 focus:border-sky-500 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>
            </div>
          </div>

          {/* Search, Category Filter & Selected Summary */}
          <div className="rounded-3xl border border-slate-200 bg-white p-4 sm:p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-3.5">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="ค้นหารายการอุปกรณ์ เช่น ก๊อซ, ถุงมือ, ออกซิเจน, น้ำเกลือ, Transpore..."
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 pl-10 pr-4 py-2.5 text-xs font-semibold text-slate-900 focus:border-sky-500 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setOnlySelected(!onlySelected)}
                  className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold border transition-all ${
                    onlySelected
                      ? 'border-emerald-500 bg-emerald-600 text-white'
                      : 'border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300'
                  }`}
                >
                  <Filter className="h-3.5 w-3.5" />
                  <span>เฉพาะที่เลือกเบิก ({selectedItems.length})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowCustomForm(!showCustomForm)}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-xs font-bold text-sky-800 hover:bg-sky-100 dark:border-sky-800 dark:bg-sky-950/40 dark:text-sky-300"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>เพิ่มรายการนอกบัญชี</span>
                </button>

                {selectedItems.length > 0 && (
                  <button
                    type="button"
                    onClick={handleClearSelection}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    <span>ล้างทั้งหมด</span>
                  </button>
                )}
              </div>
            </div>

            {/* Category Filter Buttons */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <button
                type="button"
                onClick={() => setCategoryFilter('all')}
                className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-all ${
                  categoryFilter === 'all'
                    ? 'bg-slate-900 text-white dark:bg-sky-600'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
                }`}
              >
                ทั้งหมด ({allCatalog.length})
              </button>
              {REQUISITION_CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategoryFilter(cat)}
                  className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-all ${
                    categoryFilter === cat
                      ? 'bg-slate-900 text-white dark:bg-sky-600'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Add Custom Item Panel */}
            {showCustomForm && (
              <div className="rounded-2xl border border-sky-200 bg-sky-50/60 p-3.5 dark:border-sky-900/50 dark:bg-sky-950/30">
                <p className="text-xs font-bold text-sky-900 dark:text-sky-200 mb-2">
                  เพิ่มรายการอุปกรณ์/เวชภัณฑ์เพิ่มเติม
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                  <input
                    type="text"
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                    placeholder="ชื่อรายการอุปกรณ์"
                    className="sm:col-span-6 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                  />
                  <input
                    type="text"
                    value={customUnit}
                    onChange={(e) => setCustomUnit(e.target.value)}
                    placeholder="หน่วย (เช่น กล่อง, ชิ้น)"
                    className="sm:col-span-3 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                  />
                  <input
                    type="number"
                    min={1}
                    value={customQty}
                    onChange={(e) => setCustomQty(Number(e.target.value))}
                    className="sm:col-span-1 rounded-xl border border-slate-200 bg-white px-2 py-2 text-center font-mono text-xs font-bold text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                  />
                  <button
                    type="button"
                    onClick={handleAddCustomItem}
                    className="sm:col-span-2 rounded-xl bg-sky-600 px-3 py-2 text-xs font-bold text-white hover:bg-sky-500"
                  >
                    + เพิ่ม
                  </button>
                </div>
              </div>
            )}
          </div>

          {formError && (
            <div className="flex items-center gap-2 rounded-2xl border border-red-300 bg-red-50 px-4 py-3 text-xs font-bold text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          {/* Categorized Supply Items List */}
          {groupedVisible.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-8 text-center dark:border-slate-700 dark:bg-slate-900">
              <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
                ไม่พบรายการอุปกรณ์ตามเงื่อนไขที่ค้นหา
              </p>
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setCategoryFilter('all');
                  setOnlySelected(false);
                }}
                className="mt-2 text-xs font-bold text-sky-600 hover:underline"
              >
                แสดงรายการทั้งหมด
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {groupedVisible.map((group) => (
                <div
                  key={group.category}
                  className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900"
                >
                  <div className="flex items-center justify-between border-b border-slate-200 bg-slate-900 px-5 py-3 text-white dark:border-slate-800">
                    <h2 className="text-xs sm:text-sm font-bold">{group.category}</h2>
                    <span className="rounded-lg bg-white/15 px-2 py-0.5 text-[11px] font-bold">
                      {group.items.length} รายการ
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:gap-px bg-slate-100 dark:bg-slate-800">
                    {group.items.map((item) => {
                      const qty = qtyMap[item.id] || 0;
                      const isSelected = qty > 0;
                      return (
                        <div
                          key={item.id}
                          className={`p-3.5 sm:p-4 transition-colors ${
                            isSelected
                              ? 'bg-emerald-50/70 dark:bg-emerald-950/25'
                              : 'bg-white hover:bg-slate-50/80 dark:bg-slate-900 dark:hover:bg-slate-850'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div className="min-w-0 flex-1">
                              <p
                                className={`text-xs sm:text-sm font-bold leading-snug ${
                                  isSelected
                                    ? 'text-emerald-900 dark:text-emerald-200'
                                    : 'text-slate-900 dark:text-white'
                                }`}
                              >
                                {item.name}
                              </p>
                              <span className="mt-1 inline-block rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                                หน่วย: {item.unit}
                              </span>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0">
                              <button
                                type="button"
                                onClick={() => setItemQty(item.id, qty - 1)}
                                className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 active:scale-95 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                                aria-label="ลดจำนวน"
                              >
                                <Minus className="h-3.5 w-3.5" />
                              </button>
                              <input
                                type="number"
                                min={0}
                                value={qty}
                                onChange={(e) => setItemQty(item.id, Number(e.target.value))}
                                className={`w-14 rounded-xl border px-1.5 py-1.5 text-center font-mono text-sm font-extrabold focus:outline-none ${
                                  isSelected
                                    ? 'border-emerald-400 bg-white text-emerald-700 dark:border-emerald-700 dark:bg-slate-900 dark:text-emerald-300'
                                    : 'border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'
                                }`}
                              />
                              <button
                                type="button"
                                onClick={() => setItemQty(item.id, qty + 1)}
                                className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 active:scale-95 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                                aria-label="เพิ่มจำนวน"
                              >
                                <Plus className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>

                          {isSelected && (
                            <div className="mt-2.5">
                              <input
                                type="text"
                                value={notesMap[item.id] || ''}
                                onChange={(e) =>
                                  setNotesMap((prev) => ({ ...prev, [item.id]: e.target.value }))
                                }
                                placeholder="หมายเหตุรายการนี้ (ถ้ามี)..."
                                className="w-full rounded-xl border border-emerald-200 bg-white px-2.5 py-1.5 text-xs text-slate-800 focus:border-emerald-500 focus:outline-none dark:border-emerald-800 dark:bg-slate-900 dark:text-slate-100"
                              />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Submit Summary Footer */}
          <div className="rounded-3xl border border-sky-200 bg-sky-50/80 p-4 sm:p-5 dark:border-sky-900/60 dark:bg-sky-950/30 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="text-xs text-sky-950 dark:text-sky-200">
              <p className="font-extrabold">
                สรุปใบเบิกอุปกรณ์: เลือกแล้ว {selectedItems.length} รายการ · จำนวนรวม {totalSelectedUnits} หน่วย
              </p>
              <p className="mt-0.5 text-[11px] opacity-80">
                {ORGANIZATION_NAME} · {team === 'team_1' ? 'ชุดปฏิบัติการที่ 1' : 'ชุดปฏิบัติการที่ 2'} · วันที่ {inspectDay} {inspectMonth} {inspectYear}
              </p>
            </div>
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-2xl bg-sky-600 px-6 py-3 text-sm font-extrabold text-white shadow-sm hover:bg-sky-500 active:scale-95 transition-all disabled:opacity-50"
            >
              <Send className="h-4 w-4" />
              <span>{isSubmitting ? 'กำลังบันทึกใบเบิก...' : 'บันทึกใบเบิกอุปกรณ์'}</span>
            </button>
          </div>
        </form>
      )}

      {/* ========================================================= */}
      {/* TAB 2: REQUISITION HISTORY                                */}
      {/* ========================================================= */}
      {activeTab === 'history' && (
        <div className="space-y-4">
          <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-1.5">
              {[
                { id: 'all' as const, label: 'ทั้งหมด' },
                { id: 'pending' as const, label: 'รออนุมัติ' },
                { id: 'approved' as const, label: 'อนุมัติแล้ว' },
                { id: 'dispensed' as const, label: 'จ่ายอุปกรณ์แล้ว' },
              ].map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setHistoryStatusFilter(opt.id)}
                  className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-all ${
                    historyStatusFilter === opt.id
                      ? 'bg-sky-600 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            <div className="relative sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={historySearch}
                onChange={(e) => setHistorySearch(e.target.value)}
                placeholder="ค้นหาเลขที่ใบเบิก, ผู้ขอเบิก, ชื่ออุปกรณ์..."
                className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 py-2 text-xs font-medium text-slate-900 focus:border-sky-500 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>
          </div>

          {filteredRecords.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center dark:border-slate-700 dark:bg-slate-900">
              <PackagePlus className="mx-auto h-10 w-10 text-slate-300 dark:text-slate-600" />
              <p className="mt-3 text-sm font-bold text-slate-700 dark:text-slate-300">
                ยังไม่มีประวัติการเบิกอุปกรณ์และเวชภัณฑ์
              </p>
              <button
                type="button"
                onClick={() => setActiveTab('create')}
                className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-sky-600 px-4 py-2 text-xs font-bold text-white hover:bg-sky-500"
              >
                <PackagePlus className="h-4 w-4" />
                <span>สร้างใบเบิกอุปกรณ์ใหม่</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredRecords.map((rec) => (
                <div
                  key={rec.id}
                  className="rounded-3xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900 flex flex-col justify-between gap-4"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="rounded-lg bg-indigo-100 px-2 py-0.5 font-mono text-[11px] font-bold text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300">
                            {rec.requisitionNo}
                          </span>
                          <span className="rounded-lg bg-sky-100 px-2 py-0.5 text-[11px] font-bold text-sky-800 dark:bg-sky-950/60 dark:text-sky-300">
                            {rec.teamLabel}
                          </span>
                          {rec.vehicleCode && (
                            <span className="rounded-lg bg-slate-100 px-2 py-0.5 font-mono text-[11px] font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                              {rec.vehicleCode}
                            </span>
                          )}
                        </div>
                        <h3 className="mt-1.5 text-sm font-extrabold text-slate-900 dark:text-white">
                          วันที่ขอเบิก {rec.requestDateFormatted}
                        </h3>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                          ผู้ขอเบิก: {rec.requesterName} · บันทึกเมื่อ {rec.uploadTimestamp}
                        </p>
                      </div>
                      {getStatusBadge(rec.status)}
                    </div>

                    <div className="rounded-2xl bg-slate-50 p-3 text-xs dark:bg-slate-850 space-y-1.5">
                      <div className="flex items-center justify-between font-bold text-slate-700 dark:text-slate-200">
                        <span>รายการที่ขอเบิก ({rec.totalItemTypes} รายการ)</span>
                        <span className="text-sky-600 dark:text-sky-400">
                          รวม {rec.totalQuantity} หน่วย
                        </span>
                      </div>
                      <ul className="space-y-1 text-[11px] text-slate-600 dark:text-slate-300">
                        {rec.items.slice(0, 4).map((i) => (
                          <li key={i.id} className="flex items-center justify-between gap-2">
                            <span className="truncate">• {i.name}</span>
                            <span className="font-bold shrink-0">
                              {i.requestedQty} {i.unit}
                            </span>
                          </li>
                        ))}
                        {rec.items.length > 4 && (
                          <li className="text-[10px] font-bold text-sky-600 dark:text-sky-400">
                            + อีก {rec.items.length - 4} รายการ (กดดูรายละเอียด)
                          </li>
                        )}
                      </ul>
                    </div>

                    {rec.purposeNotes && (
                      <p className="rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-600 dark:bg-slate-850 dark:text-slate-300">
                        หมายเหตุ: {rec.purposeNotes}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                    {/* Admin Approval Actions */}
                    <div className="flex flex-wrap items-center gap-1.5">
                      {currentUser.role === 'admin' && rec.status === 'pending' && (
                        <button
                          type="button"
                          onClick={() => onUpdateStatus(rec.id, 'approved')}
                          className="inline-flex items-center gap-1 rounded-xl bg-sky-600 px-2.5 py-1.5 text-[11px] font-bold text-white hover:bg-sky-500"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          <span>อนุมัติ</span>
                        </button>
                      )}
                      {currentUser.role === 'admin' && rec.status !== 'dispensed' && (
                        <button
                          type="button"
                          onClick={() => onUpdateStatus(rec.id, 'dispensed')}
                          className="inline-flex items-center gap-1 rounded-xl bg-emerald-600 px-2.5 py-1.5 text-[11px] font-bold text-white hover:bg-emerald-500"
                        >
                          <PackageCheck className="h-3.5 w-3.5" />
                          <span>จ่ายของแล้ว</span>
                        </button>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setDetailRecord(rec)}
                        className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                      >
                        <Eye className="h-3.5 w-3.5 text-sky-600" />
                        <span>รายละเอียด</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setPrintRecord(rec)}
                        className="inline-flex items-center gap-1 rounded-xl bg-slate-900 px-2.5 py-1.5 text-xs font-bold text-white hover:bg-slate-800 dark:bg-sky-600 dark:hover:bg-sky-500"
                      >
                        <Printer className="h-3.5 w-3.5" />
                        <span>พิมพ์ใบเบิก</span>
                      </button>

                      {currentUser.role === 'admin' && (
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(rec)}
                          className="inline-flex items-center gap-1 rounded-xl border border-red-200 bg-red-50 px-2.5 py-1.5 text-xs font-bold text-red-700 hover:bg-red-100 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300"
                          title="ลบใบเบิก (Admin)"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Detail Modal */}
      {detailRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-3 sm:p-6 backdrop-blur-sm overflow-y-auto">
          <div className="my-auto w-full max-w-3xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 dark:border-slate-800">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  รายละเอียดใบเบิกอุปกรณ์ · {detailRecord.requisitionNo}
                </h3>
                <p className="text-xs text-slate-500">
                  {detailRecord.teamLabel} · วันที่ {detailRecord.requestDateFormatted} · ผู้ขอเบิก: {detailRecord.requesterName}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const target = detailRecord;
                    setDetailRecord(null);
                    setPrintRecord(target);
                  }}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-sky-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-sky-500"
                >
                  <Printer className="h-3.5 w-3.5" />
                  <span>พิมพ์ใบเบิก</span>
                </button>
                <button
                  type="button"
                  onClick={() => setDetailRecord(null)}
                  className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="max-h-[70vh] overflow-y-auto p-6">
              <table className="w-full border-collapse border border-slate-200 text-xs dark:border-slate-700">
                <thead>
                  <tr className="bg-slate-900 text-white">
                    <th className="border border-slate-700 p-2 text-center w-12">ลำดับ</th>
                    <th className="border border-slate-700 p-2 text-left">รายการอุปกรณ์ / เวชภัณฑ์</th>
                    <th className="border border-slate-700 p-2 text-center w-20">จำนวนเบิก</th>
                    <th className="border border-slate-700 p-2 text-center w-24">หน่วย</th>
                    <th className="border border-slate-700 p-2 text-left w-36">หมายเหตุ</th>
                  </tr>
                </thead>
                <tbody>
                  {detailRecord.items.map((item, idx) => (
                    <tr key={item.id}>
                      <td className="border border-slate-200 dark:border-slate-700 p-2 text-center">{idx + 1}</td>
                      <td className="border border-slate-200 dark:border-slate-700 p-2 font-semibold">
                        {item.name}
                      </td>
                      <td className="border border-slate-200 dark:border-slate-700 p-2 text-center font-extrabold text-sky-600 dark:text-sky-400">
                        {item.requestedQty}
                      </td>
                      <td className="border border-slate-200 dark:border-slate-700 p-2 text-center">{item.unit}</td>
                      <td className="border border-slate-200 dark:border-slate-700 p-2 text-slate-500">
                        {item.notes || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Printable A4 Modal */}
      {printRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-3 sm:p-6 backdrop-blur-sm overflow-y-auto">
          <div className="my-auto w-full max-w-4xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-6 py-4 bg-slate-50 dark:border-slate-800 dark:bg-slate-850">
              <div className="flex items-center gap-2.5">
                <div className="rounded-lg bg-sky-100 p-2 text-sky-700 dark:bg-sky-950 dark:text-sky-300">
                  <Printer className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    ใบเบิกอุปกรณ์และเวชภัณฑ์ ({printRecord.requisitionNo})
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    {printRecord.organizationName} · {printRecord.teamLabel} · {printRecord.requestDateFormatted}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {printStatus && (
                  <span className="text-xs font-medium text-sky-600 animate-pulse">{printStatus}</span>
                )}
                <button
                  type="button"
                  onClick={() => handlePrintViaIframe(printRecord)}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-sky-600 px-3.5 py-2 text-xs font-bold text-white shadow-sm hover:bg-sky-500"
                >
                  <Printer className="h-4 w-4" />
                  <span>สั่งพิมพ์ทันที</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleOpenStandaloneTab(printRecord)}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  <span>เปิดในแท็บใหม่</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPrintRecord(null)}
                  className="rounded-lg p-2 text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="max-h-[78vh] overflow-y-auto p-6 sm:p-8 bg-white text-slate-900">
              <div className="text-center border-b-2 border-slate-900 pb-3 mb-4">
                <div className="text-right text-xs mb-1">
                  เลขที่ใบเบิก{' '}
                  <span className="font-mono font-bold underline px-1">{printRecord.requisitionNo}</span>
                </div>
                <h2 className="text-base font-bold">ใบเบิกจ่าย วัสดุวิทยาศาสตร์หรือการแพทย์ (สำนักงานปลัด)</h2>
                <p className="text-sm font-bold mt-0.5">{printRecord.organizationName}</p>
                <p className="text-xs mt-1">
                  ประจำวันที่{' '}
                  <span className="font-bold underline px-1">{printRecord.inspectDay}</span> เดือน{' '}
                  <span className="font-bold underline px-1">{printRecord.inspectMonth}</span> พ.ศ.{' '}
                  <span className="font-bold underline px-1">{printRecord.inspectYear}</span>
                </p>
              </div>

              <div className="rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-xs leading-relaxed mb-4 space-y-1.5">
                <p>
                  <span className="font-bold">เรียน</span> นายกองค์การบริหารส่วนตำบลหงษ์เจริญ
                </p>
                <p>
                  <span className="font-bold">ข้าพเจ้า</span>{' '}
                  <span className="inline-block min-w-[140px] text-center border-b border-dotted border-slate-500 font-bold px-2">
                    {printRecord.requesterName}
                  </span>{' '}
                  <span className="font-bold ml-2">ตำแหน่ง</span>{' '}
                  <span className="inline-block min-w-[140px] text-center border-b border-dotted border-slate-500 font-bold px-2">
                    คนงานทั่วไป
                  </span>
                </p>
                <p>
                  สังกัด/ส่วน <span className="font-bold">สำนักงานปลัด</span> มีความประสงค์ขอเบิกวัสดุเพื่อใช้ในราชการ ตามรายการดังต่อไปนี้
                </p>
              </div>

              <table className="w-full border-collapse border border-slate-400 text-[11px]">
                <thead>
                  <tr className="bg-slate-900 text-white">
                    <th className="border border-slate-400 p-1.5 text-center w-12">ลำดับ</th>
                    <th className="border border-slate-400 p-1.5 text-left">รายการอุปกรณ์ / เวชภัณฑ์</th>
                    <th className="border border-slate-400 p-1.5 text-center w-20">จำนวนเบิก</th>
                    <th className="border border-slate-400 p-1.5 text-center w-20">หน่วย</th>
                    <th className="border border-slate-400 p-1.5 text-left w-32">หมายเหตุ</th>
                  </tr>
                </thead>
                <tbody>
                  {printRecord.items.map((item, idx) => (
                    <tr key={item.id}>
                      <td className="border border-slate-400 p-1.5 text-center">{idx + 1}</td>
                      <td className="border border-slate-400 p-1.5">{item.name}</td>
                      <td className="border border-slate-400 p-1.5 text-center font-bold">
                        {item.requestedQty}
                      </td>
                      <td className="border border-slate-400 p-1.5 text-center">{item.unit}</td>
                      <td className="border border-slate-400 p-1.5">{item.notes || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="grid grid-cols-2 gap-6 mt-6 text-xs text-center">
                <div className="rounded-lg border border-dashed border-slate-300 p-3 flex flex-col justify-end">
                  <div className="h-8" />
                  <p>ลงชื่อ.................................................. ผู้เบิก</p>
                  <p className="font-bold mt-1">( {currentUser.name || printRecord.requesterName} )</p>
                  <p className="mt-0.5 text-[11px]">คนงานทั่วไป</p>
                  <p className="mt-0.5 text-[11px]">
                    วันที่ {printRecord.inspectDay} เดือน {printRecord.inspectMonth} พ.ศ. {printRecord.inspectYear}
                  </p>
                </div>
                <div className="rounded-lg border border-dashed border-slate-300 p-3">
                  <div className="text-left space-y-1 mb-3 text-[11px]">
                    <p>(&nbsp;&nbsp;) อนุมัติ</p>
                    <p>(&nbsp;&nbsp;) ไม่อนุมัติ เพราะ....................................................</p>
                  </div>
                  <div className="h-5" />
                  <p>ลงชื่อ.......................................................... ผู้อนุมัติ</p>
                  <p className="font-bold mt-1 whitespace-pre">(     นางสาวอภิญญา  จินาห้อง     )</p>
                  <p className="mt-0.5 text-[11px]">หัวหน้าสำนักปลัด</p>
                  <p className="mt-0.5 text-[11px]">วันที่...........เดือน.............................. พ.ศ.............</p>
                </div>
              </div>

              <div className="mt-6 flex justify-center">
                <div className="w-full max-w-sm rounded-lg border border-dashed border-slate-300 p-4 text-xs text-center">
                  <p className="font-bold">จึงเรียนมาเพื่อโปรดทราบ</p>
                  <div className="h-8" />
                  <p>ลงชื่อ.....................................................................</p>
                  <p className="font-bold mt-1 whitespace-pre">(        นายนิยม   สังข์เอียด        )</p>
                  <p className="mt-0.5 text-[11px]">นายกองค์การบริหารส่วนตำบลหงษ์เจริญ</p>
                  <p className="mt-0.5 text-[11px]">วันที่............เดือน........................พ.ศ. .......................</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Delete Modal */}
      <ConfirmDeleteModal
        isOpen={Boolean(deleteTarget)}
        title="ยืนยันการลบใบเบิกอุปกรณ์"
        message="ต้องการลบประวัติใบเบิกอุปกรณ์รายการนี้ออกจากระบบใช่หรือไม่?"
        itemName={
          deleteTarget
            ? `${deleteTarget.requisitionNo} · ${deleteTarget.teamLabel} (${deleteTarget.requestDateFormatted})`
            : ''
        }
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget) {
            onDeleteRecord(deleteTarget.id);
            setDeleteTarget(null);
          }
        }}
      />
    </div>
  );
};
