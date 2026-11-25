import React, { useMemo, useState } from 'react';
import {
  AmbulanceVehicle,
  EquipmentCheckItem,
  EquipmentConditionStatus,
  EquipmentInspectionRecord,
  EquipmentTeamType,
  UserProfile,
} from '../types';
import {
  ORGANIZATION_NAME,
  THAI_MONTHS,
  createFreshEquipmentChecklist,
  getDefaultThaiDateParts,
} from '../data/equipmentChecklist';
import { ConfirmDeleteModal } from './ConfirmDeleteModal';
import {
  PackageCheck,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Printer,
  Eye,
  Trash2,
  Search,
  Calendar,
  Users,
  Truck,
  RotateCcw,
  CheckCheck,
  Plus,
  Minus,
  ExternalLink,
  X,
  ClipboardList,
  Save,
  FileDown,
  RefreshCw,
} from 'lucide-react';

interface EquipmentChecklistViewProps {
  currentUser: UserProfile;
  vehicles: AmbulanceVehicle[];
  records: EquipmentInspectionRecord[];
  onSaveRecord: (record: EquipmentInspectionRecord) => void | Promise<void>;
  onDeleteRecord: (id: string) => void | Promise<void>;
  isSubmitting?: boolean;
  onRefreshCloud?: () => void | Promise<void>;
  isSyncing?: boolean;
}

export const EquipmentChecklistView: React.FC<EquipmentChecklistViewProps> = ({
  currentUser,
  vehicles,
  records,
  onSaveRecord,
  onDeleteRecord,
  isSubmitting = false,
  onRefreshCloud,
  isSyncing = false,
}) => {
  const isExecutive = currentUser.role === 'executive';
  const defaultDate = useMemo(() => getDefaultThaiDateParts(), []);

  const [activeTab, setActiveTab] = useState<'form' | 'history'>(() =>
    currentUser.role === 'executive' ? 'history' : 'form'
  );

  React.useEffect(() => {
    if (isExecutive && activeTab !== 'history') {
      setActiveTab('history');
    }
  }, [isExecutive, activeTab]);
  const [team, setTeam] = useState<EquipmentTeamType>('team_1');
  const [inspectDay, setInspectDay] = useState(defaultDate.day);
  const [inspectMonth, setInspectMonth] = useState(defaultDate.month);
  const [inspectYear, setInspectYear] = useState(defaultDate.year);
  const [selectedVehicleId, setSelectedVehicleId] = useState('');
  const [inspectorName, setInspectorName] = useState(currentUser.name || '');
  const [summaryNotes, setSummaryNotes] = useState('');
  const [items, setItems] = useState<EquipmentCheckItem[]>(() => createFreshEquipmentChecklist(false));
  const [categoryFilter, setCategoryFilter] = useState<number | 'all'>('all');

  // History & Modals state
  const [historyTeamFilter, setHistoryTeamFilter] = useState<'all' | EquipmentTeamType>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [detailRecord, setDetailRecord] = useState<EquipmentInspectionRecord | null>(null);
  const [printRecord, setPrintRecord] = useState<EquipmentInspectionRecord | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<EquipmentInspectionRecord | null>(null);
  const [printStatus, setPrintStatus] = useState<string | null>(null);

  // Sync inspectorName when currentUser profile reconciles from cloud
  React.useEffect(() => {
    if (currentUser.name) {
      setInspectorName((prev) => (prev ? prev : currentUser.name));
    }
  }, [currentUser.name]);

  // Keep open detail/print modals synchronized whenever records refresh from cloud
  React.useEffect(() => {
    if (detailRecord) {
      const updated = records.find((r) => r.id === detailRecord.id);
      if (updated && updated !== detailRecord) {
        setDetailRecord(updated);
      }
    }
    if (printRecord) {
      const updated = records.find((r) => r.id === printRecord.id);
      if (updated && updated !== printRecord) {
        setPrintRecord(updated);
      }
    }
  }, [records, detailRecord, printRecord]);

  // Live metrics calculation
  const metrics = useMemo(() => {
    const requiredItems = items.filter((i) => i.minCount !== null);
    const recommendedItems = items.filter((i) => i.minCount === null);

    const requiredPassed = requiredItems.filter(
      (i) => i.conditionStatus !== 'damaged' && i.availableQty >= (i.minCount || 0)
    ).length;

    const recommendedPresent = recommendedItems.filter(
      (i) => i.availableQty > 0 && i.conditionStatus !== 'damaged'
    ).length;

    const damagedCount = items.filter((i) => i.conditionStatus === 'damaged').length;
    const incompleteRequiredCount = requiredItems.length - requiredPassed;

    let overallStatus: EquipmentInspectionRecord['overallStatus'] = 'ready';
    if (damagedCount > 0) {
      overallStatus = 'critical';
    } else if (incompleteRequiredCount > 0) {
      overallStatus = 'incomplete';
    }

    return {
      requiredTotal: requiredItems.length,
      requiredPassed,
      recommendedTotal: recommendedItems.length,
      recommendedPresent,
      damagedCount,
      incompleteRequiredCount,
      overallStatus,
    };
  }, [items]);

  // Group items by Category -> SubCategory for structured rendering
  const groupedCategories = useMemo(() => {
    const catIds = Array.from(new Set(items.map((i) => i.categoryId))).filter(
      (cid) => categoryFilter === 'all' || cid === categoryFilter
    );

    return catIds.map((catId) => {
      const catItems = items.filter((i) => i.categoryId === catId);
      const subGroups: Array<{ subTitle: string | null; items: EquipmentCheckItem[] }> = [];
      for (const item of catItems) {
        const subTitle = item.subCategoryTitle || null;
        const lastGroup = subGroups[subGroups.length - 1];
        if (lastGroup && lastGroup.subTitle === subTitle) {
          lastGroup.items.push(item);
        } else {
          subGroups.push({ subTitle, items: [item] });
        }
      }
      return {
        categoryId: catId,
        categoryTitle: catItems[0]?.categoryTitle || `หมวดที่ ${catId}`,
        subGroups,
      };
    });
  }, [items, categoryFilter]);

  const handleQtyChange = (itemId: string, nextQtyRaw: number) => {
    const nextQty = Math.max(0, Math.floor(Number.isFinite(nextQtyRaw) ? nextQtyRaw : 0));
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== itemId) return item;
        let nextStatus: EquipmentConditionStatus = item.conditionStatus;
        if (item.conditionStatus !== 'damaged') {
          if (item.minCount === null) {
            nextStatus = 'ready';
          } else {
            nextStatus = nextQty >= item.minCount ? 'ready' : 'incomplete';
          }
        }
        return {
          ...item,
          availableQty: nextQty,
          conditionStatus: nextStatus,
        };
      })
    );
  };

  const handleStatusChange = (itemId: string, status: EquipmentConditionStatus) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== itemId) return item;
        return { ...item, conditionStatus: status };
      })
    );
  };

  const handleItemNotesChange = (itemId: string, notes: string) => {
    setItems((prev) =>
      prev.map((item) => (item.id === itemId ? { ...item, notes } : item))
    );
  };

  const handlePrefillAllRequired = () => {
    setItems((prev) =>
      prev.map((item) => ({
        ...item,
        availableQty: item.minCount !== null ? item.minCount : Math.max(item.availableQty, 1),
        conditionStatus: 'ready',
      }))
    );
  };

  const handleResetAllZero = () => {
    setItems(createFreshEquipmentChecklist(false));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const matchedVehicle = vehicles.find((v) => v.id === selectedVehicleId);
    const teamLabel = team === 'team_1' ? 'ชุดปฏิบัติการที่ 1' : 'ชุดปฏิบัติการที่ 2';
    const dayStr = inspectDay.trim() || defaultDate.day;
    const monthStr = inspectMonth || defaultDate.month;
    const yearStr = inspectYear.trim() || defaultDate.year;

    const record: EquipmentInspectionRecord = {
      id: `eq-insp-${Date.now()}`,
      organizationName: ORGANIZATION_NAME,
      team,
      teamLabel,
      inspectDay: dayStr,
      inspectMonth: monthStr,
      inspectYear: yearStr,
      inspectDateFormatted: `${dayStr} ${monthStr} ${yearStr}`,
      vehicleId: matchedVehicle?.id,
      vehicleCode: matchedVehicle?.code,
      plateNumber: matchedVehicle?.plateNumber,
      inspectorName: inspectorName.trim() || currentUser.name || 'เจ้าหน้าที่',
      inspectorRole: currentUser.role,
      items: items.map((i) => ({ ...i })),
      requiredPassedCount: metrics.requiredPassed,
      requiredTotalCount: metrics.requiredTotal,
      overallStatus: metrics.overallStatus,
      summaryNotes: summaryNotes.trim(),
      createdAt: Date.now(),
      uploadTimestamp: new Date().toLocaleString('th-TH'),
      googleSheetsSyncStatus: 'pending',
    };

    await onSaveRecord(record);
    setSummaryNotes('');
    setActiveTab('history');
  };

  const filteredRecords = useMemo(() => {
    return records.filter((rec) => {
      if (historyTeamFilter !== 'all' && rec.team !== historyTeamFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const hay = `${rec.inspectDateFormatted} ${rec.teamLabel} ${rec.inspectorName} ${rec.vehicleCode || ''} ${rec.plateNumber || ''} ${rec.summaryNotes}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [records, historyTeamFilter, searchQuery]);

  const escapeEquipmentHtml = (str: string) =>
    (str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');

  const getSafePdfFilename = (rec: EquipmentInspectionRecord) =>
    `ตรวจความพร้อมอุปกรณ์_${rec.organizationName}_${rec.teamLabel}_${rec.inspectDateFormatted}`
      .replace(/[\\/:*?"<>|]/g, '_')
      .trim();

  // Official Printable A4 Government PDF HTML builder
  const buildOfficialFormHtml = (rec: EquipmentInspectionRecord, showTopToolbar = false) => {
    const catIds = [1, 2, 3, 4];
    const tableBodyHtml = catIds
      .map((catId) => {
        const catItems = rec.items.filter((i) => i.categoryId === catId);
        if (!catItems.length) return '';
        const catTitle = catItems[0].categoryTitle;

        const subGroups: Array<{ subTitle: string | null; items: EquipmentCheckItem[] }> = [];
        for (const item of catItems) {
          const sub = item.subCategoryTitle || null;
          const last = subGroups[subGroups.length - 1];
          if (last && last.subTitle === sub) {
            last.items.push(item);
          } else {
            subGroups.push({ subTitle: sub, items: [item] });
          }
        }

        const subHtml = subGroups
          .map((sg) => {
            const subHeader = sg.subTitle
              ? `<tr class="sub-cat-row">
                  <td colspan="4">${escapeEquipmentHtml(sg.subTitle)}</td>
                 </tr>`
              : '';

            const rows = sg.items
              .map((item) => {
                const indent = item.subCategoryTitle ? '26px' : '12px';
                const qtyText = `${item.availableQty} ${item.unit}`;
                const statusText =
                  item.conditionStatus === 'damaged'
                    ? '✗ ชำรุด'
                    : item.minCount !== null && item.availableQty < item.minCount
                    ? '⚠ ไม่ครบเกณฑ์'
                    : item.minCount === null && item.availableQty === 0
                    ? '-'
                    : '✓ ครบ/พร้อม';
                const statusColor =
                  item.conditionStatus === 'damaged'
                    ? '#b91c1c'
                    : item.minCount !== null && item.availableQty < item.minCount
                    ? '#b45309'
                    : '#15803d';
                const noteText = item.notes
                  ? `${statusText} (${escapeEquipmentHtml(item.notes)})`
                  : statusText;
                return `<tr class="item-row">
                  <td style="padding:3.5px 8px 3.5px ${indent}; border:1px solid #475569;">
                    <span style="font-weight:600;">${escapeEquipmentHtml(item.itemCode)}</span> ${escapeEquipmentHtml(item.name)}
                  </td>
                  <td style="padding:3.5px 6px; border:1px solid #475569; text-align:center; white-space:nowrap;">
                    ${escapeEquipmentHtml(item.minRequirementLabel)}
                  </td>
                  <td style="padding:3.5px 6px; border:1px solid #475569; text-align:center; font-weight:700; white-space:nowrap;">
                    ${escapeEquipmentHtml(qtyText)}
                  </td>
                  <td style="padding:3.5px 6px; border:1px solid #475569; font-weight:600; color:${statusColor};">
                    ${noteText}
                  </td>
                </tr>`;
              })
              .join('');

            return subHeader + rows;
          })
          .join('');

        return `
          <tr class="cat-row">
            <td colspan="4">${escapeEquipmentHtml(catTitle)}</td>
          </tr>
          ${subHtml}
        `;
      })
      .join('');

    const checkTeam1 = rec.team === 'team_1' ? '☑' : '☐';
    const checkTeam2 = rec.team === 'team_2' ? '☑' : '☐';
    const pdfTitle = getSafePdfFilename(rec);

    return `<!DOCTYPE html>
<html lang="th">
<head>
  <meta charset="utf-8" />
  <title>${escapeEquipmentHtml(pdfTitle)}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@400;500;600;700&display=swap" rel="stylesheet" />
  <style>
    @page {
      size: A4 portrait;
      margin: 12mm 14mm;
    }
    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    body {
      font-family: 'Sarabun', 'TH Sarabun New', 'TH SarabunPSK', sans-serif;
      color: #000000;
      background: ${showTopToolbar ? '#e2e8f0' : '#ffffff'};
      margin: 0;
      padding: ${showTopToolbar ? '0 0 32px 0' : '0'};
      font-size: 12.5px;
      line-height: 1.4;
    }
    .toolbar {
      position: sticky;
      top: 0;
      z-index: 20;
      background: #0f172a;
      color: #ffffff;
      padding: 10px 20px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.25);
    }
    .toolbar-btn {
      background: #0284c7;
      color: #ffffff;
      border: none;
      border-radius: 8px;
      padding: 8px 16px;
      font-family: inherit;
      font-size: 13px;
      font-weight: 700;
      cursor: pointer;
    }
    .toolbar-btn:hover {
      background: #0369a1;
    }
    .page-sheet {
      background: #ffffff;
      width: ${showTopToolbar ? '210mm' : '100%'};
      margin: ${showTopToolbar ? '18px auto' : '0'};
      padding: ${showTopToolbar ? '14mm 16mm' : '0'};
      box-shadow: ${showTopToolbar ? '0 8px 28px rgba(15, 23, 42, 0.16)' : 'none'};
    }
    .doc-ref {
      display: flex;
      justify-content: flex-end;
      font-size: 10.5px;
      color: #334155;
      margin-bottom: 4px;
    }
    .doc-header {
      text-align: center;
      border-bottom: 3px double #0f172a;
      padding-bottom: 8px;
      margin-bottom: 10px;
    }
    .doc-title {
      font-size: 15.5px;
      font-weight: 700;
      color: #000000;
      margin: 0;
    }
    .doc-org {
      font-size: 14px;
      font-weight: 700;
      color: #000000;
      margin: 2px 0;
    }
    .doc-meta {
      font-size: 12.5px;
      color: #0f172a;
      margin-top: 4px;
    }
    .team-row {
      margin-top: 4px;
      font-size: 12.5px;
      font-weight: 700;
      color: #0f172a;
    }
    .meta-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 10px;
      font-size: 12px;
    }
    .meta-table td {
      border: 1px solid #334155;
      padding: 5px 9px;
      vertical-align: top;
      background: #ffffff;
    }
    table.eq-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 4px;
      font-size: 11.5px;
    }
    table.eq-table thead {
      display: table-header-group;
    }
    table.eq-table th {
      background: #e2e8f0;
      color: #000000;
      padding: 5.5px 7px;
      border: 1px solid #334155;
      font-size: 12px;
      font-weight: 700;
    }
    tr.cat-row td {
      padding: 5px 8px;
      border: 1px solid #334155;
      background: #e2e8f0;
      font-weight: 700;
      font-size: 12px;
      color: #000000;
    }
    tr.sub-cat-row td {
      padding: 4px 8px 4px 16px;
      border: 1px solid #475569;
      background: #f8fafc;
      font-weight: 700;
      font-size: 11.5px;
      color: #0f172a;
    }
    tr.item-row {
      break-inside: avoid;
      page-break-inside: avoid;
    }
    .notes-box {
      margin-top: 8px;
      padding: 6px 10px;
      border: 1px solid #475569;
      background: #f8fafc;
      font-size: 11.5px;
      break-inside: avoid;
    }
    .signatures-wrapper {
      break-inside: avoid;
      page-break-inside: avoid;
      margin-top: 16px;
    }
    .sign-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 24px;
    }
    .sign-box {
      padding: 8px 6px;
      text-align: center;
      font-size: 12px;
      line-height: 1.55;
    }
    .sign-center {
      margin-top: 14px;
      display: flex;
      justify-content: center;
    }
    .sign-center .sign-box {
      width: 68%;
      max-width: 390px;
    }
    @media print {
      body {
        background: #ffffff;
        padding: 0;
      }
      .no-print {
        display: none !important;
      }
      .page-sheet {
        width: 100%;
        margin: 0;
        padding: 0;
        box-shadow: none;
      }
    }
  </style>
</head>
<body>
  ${
    showTopToolbar
      ? `<div class="toolbar no-print">
          <div>
            <strong>แบบฟอร์มตรวจความพร้อมอุปกรณ์ BLS (${escapeEquipmentHtml(rec.organizationName)})</strong>
            <span style="font-size:12px; color:#cbd5e1; margin-left:8px;">(${escapeEquipmentHtml(rec.teamLabel)} · ประจำวันที่ ${escapeEquipmentHtml(rec.inspectDateFormatted)})</span>
          </div>
          <button type="button" class="toolbar-btn" onclick="window.print()">พิมพ์ / บันทึกเป็น .PDF (A4)</button>
        </div>`
      : ''
  }
  <div class="page-sheet">
    <div class="doc-ref">
      <span>เลขที่อ้างอิง: ${escapeEquipmentHtml(rec.id)}</span>
    </div>

    <div class="doc-header">
      <div class="doc-title">ตรวจความพร้อมอุปกรณ์สำหรับหน่วยปฏิบัติการแพทย์ระดับพื้นฐาน</div>
      <div class="doc-org">${escapeEquipmentHtml(rec.organizationName)}</div>
      <div class="doc-meta">
        ประจำวันที่ <strong>${escapeEquipmentHtml(rec.inspectDay)}</strong> เดือน <strong>${escapeEquipmentHtml(rec.inspectMonth)}</strong> พ.ศ. <strong>${escapeEquipmentHtml(rec.inspectYear)}</strong>
      </div>
      <div class="team-row">
        ${checkTeam1} ชุดปฏิบัติการที่ 1 &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; ${checkTeam2} ชุดปฏิบัติการที่ 2
      </div>
    </div>

    <table class="meta-table">
      <tbody>
        <tr>
          <td style="width:50%;">
            <div><strong>ผู้ตรวจเช็คอุปกรณ์:</strong> ${escapeEquipmentHtml(rec.inspectorName)}</div>
            <div><strong>ชุดปฏิบัติการ:</strong> ${escapeEquipmentHtml(rec.teamLabel)}</div>
            <div><strong>วัน-เวลาบันทึก:</strong> ${escapeEquipmentHtml(rec.uploadTimestamp)}</div>
          </td>
          <td style="width:50%;">
            <div><strong>รถปฏิบัติการประจำชุด:</strong> ${rec.vehicleCode ? `${escapeEquipmentHtml(rec.vehicleCode)} (${escapeEquipmentHtml(rec.plateNumber || '-')})` : 'ตรวจประจำชุดปฏิบัติการ'}</div>
            <div><strong>รายการเกณฑ์บังคับครบ:</strong> <strong style="color:#15803d;">${rec.requiredPassedCount} / ${rec.requiredTotalCount} รายการ</strong></div>
            <div><strong>รายการชำรุด / ไม่ครบ:</strong> <strong style="color:${rec.items.filter((i) => i.conditionStatus === 'damaged' || (i.minCount !== null && i.availableQty < i.minCount)).length > 0 ? '#b91c1c' : '#15803d'};">${rec.items.filter((i) => i.conditionStatus === 'damaged' || (i.minCount !== null && i.availableQty < i.minCount)).length} รายการ</strong></div>
          </td>
        </tr>
      </tbody>
    </table>

    <table class="eq-table">
      <thead>
        <tr>
          <th style="width:53%; text-align:left;">รายการอุปกรณ์</th>
          <th style="width:14%; text-align:center;">จำนวนขั้นต่ำ</th>
          <th style="width:14%; text-align:center;">จำนวนที่มี</th>
          <th style="width:19%; text-align:left;">สภาพ / หมายเหตุ</th>
        </tr>
      </thead>
      <tbody>
        ${tableBodyHtml}
      </tbody>
    </table>

    ${
      rec.summaryNotes
        ? `<div class="notes-box">
            <strong>หมายเหตุเพิ่มเติม:</strong> ${escapeEquipmentHtml(rec.summaryNotes)}
           </div>`
        : ''
    }

    <div class="signatures-wrapper">
      <div class="sign-grid">
        <div class="sign-box">
          <div style="height:26px;"></div>
          <div>ลงชื่อ..............................................................ผู้ตรวจเช็ค</div>
          <div style="font-weight:700;">( ${escapeEquipmentHtml(rec.inspectorName)} )</div>
          <div>บันทึกเมื่อ: ${escapeEquipmentHtml(rec.uploadTimestamp)}</div>
          <div>วันที่............เดือน........................พ.ศ. ......................</div>
        </div>
        <div class="sign-box">
          <div style="height:26px;"></div>
          <div>ผู้ตรวจสอบ.....................................................................</div>
          <div style="font-weight:700;">( นายวสันต์ วรรณเผือก )</div>
          <div>ตำแหน่ง เจ้าพนักงานป้องกันและบรรเทาสาธารณภัยปฏิบัติงาน</div>
          <div>วันที่............เดือน........................พ.ศ. ......................</div>
        </div>
      </div>

      <div style="margin-top:16px;">
        <div style="text-align:left; font-size:12.5px; line-height:1.5;">
          <div style="font-weight:700;">จึงเรียนมาเพื่อโปรดทราบ</div>
          <div style="height:22px; border-bottom:1.5px dotted #334155; width:100%;"></div>
          <div style="height:24px; border-bottom:1.5px dotted #334155; width:100%;"></div>
        </div>
        <div class="sign-center" style="margin-top:12px; justify-content:flex-end;">
          <div class="sign-box" style="width:48%; max-width:none;">
            <div style="height:26px;"></div>
            <div>ลงชื่อ.....................................................................</div>
            <div style="font-weight:700; white-space:pre;">(        นายนิยม   สังข์เอียด        )</div>
            <div>นายกองค์การบริหารส่วนตำบลหงษ์เจริญ</div>
            <div>วันที่............เดือน........................พ.ศ. .......................</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</body>
</html>`;
  };

  const handlePrintViaIframe = (rec: EquipmentInspectionRecord) => {
    const previousTitle = document.title;
    try {
      setPrintStatus('กำลังจัดรูปแบบเอกสาร A4 และโหลดฟอนต์ราชการ...');
      const htmlContent = buildOfficialFormHtml(rec, false);
      const printFrame = document.createElement('iframe');
      printFrame.setAttribute(
        'style',
        'visibility:hidden; height:0; width:0; position:absolute; left:-9999px; bottom:0;'
      );
      document.body.appendChild(printFrame);

      const frameDoc = printFrame.contentDocument || printFrame.contentWindow?.document;
      if (frameDoc && printFrame.contentWindow) {
        frameDoc.open();
        frameDoc.write(htmlContent);
        frameDoc.close();
        setTimeout(async () => {
          try {
            document.title = getSafePdfFilename(rec);
            if ((frameDoc as any).fonts?.ready) {
              await Promise.race([
                (frameDoc as any).fonts.ready,
                new Promise((res) => setTimeout(res, 1500)),
              ]);
            }
            printFrame.contentWindow?.focus();
            printFrame.contentWindow?.print();
            setPrintStatus('เปิดหน้าต่างบันทึกเป็น .PDF / สั่งพิมพ์แล้ว');
          } catch {
            window.print();
          } finally {
            document.title = previousTitle;
            setTimeout(() => {
              if (document.body.contains(printFrame)) {
                document.body.removeChild(printFrame);
              }
              setPrintStatus(null);
            }, 2500);
          }
        }, 350);
      } else {
        setPrintStatus(null);
      }
    } catch {
      document.title = previousTitle;
      setPrintStatus(null);
      window.print();
    }
  };

  const handleOpenStandaloneTab = (rec: EquipmentInspectionRecord) => {
    try {
      const htmlContent = buildOfficialFormHtml(rec, true);
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

  return (
    <div className="space-y-5">
      {/* Header Banner */}
      <div className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-700 text-white shadow-sm">
              <PackageCheck className="h-6 w-6" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-lg bg-emerald-100 px-2 py-0.5 text-[11px] font-bold text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                  {ORGANIZATION_NAME}
                </span>
                <span className="rounded-lg bg-sky-100 px-2 py-0.5 text-[11px] font-bold text-sky-800 dark:bg-sky-950/60 dark:text-sky-300">
                  4 หมวด · {items.length} รายการ
                </span>
              </div>
              <h1 className="mt-1 text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white leading-snug">
                ตรวจความพร้อมอุปกรณ์สำหรับหน่วยปฏิบัติการแพทย์ระดับพื้นฐาน
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                บันทึกจำนวนอุปกรณ์ที่มีจริงเทียบกับเกณฑ์ขั้นต่ำ แยกชุดปฏิบัติการที่ 1 / ชุดปฏิบัติการที่ 2 พร้อมพิมพ์ใบตรวจมาตรฐาน
              </p>
            </div>
          </div>

          {/* Sub-Tabs & Cloud Sync Button */}
          <div className="flex flex-wrap items-center gap-2 self-start lg:self-auto">
            {onRefreshCloud && (
              <button
                type="button"
                onClick={() => onRefreshCloud()}
                disabled={isSyncing}
                title="ดึงข้อมูลตรวจความพร้อมอุปกรณ์ล่าสุดจาก Cloud"
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 shadow-2xs transition-all hover:bg-slate-50 hover:text-emerald-700 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${isSyncing ? 'animate-spin text-emerald-600' : ''}`} />
                <span>{isSyncing ? 'กำลังซิงค์...' : 'ซิงค์ข้อมูลล่าสุด'}</span>
              </button>
            )}
            <div className="flex items-center gap-1.5 rounded-2xl bg-slate-100 p-1.5 dark:bg-slate-800">
              {!isExecutive && (
                <button
                  type="button"
                  onClick={() => setActiveTab('form')}
                  className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold transition-all ${
                    activeTab === 'form'
                      ? 'bg-white text-emerald-700 shadow-xs dark:bg-slate-900 dark:text-emerald-400'
                      : 'text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white'
                  }`}
                >
                  <ClipboardList className="h-4 w-4" />
                  <span>แบบฟอร์มตรวจอุปกรณ์</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => setActiveTab('history')}
                className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold transition-all ${
                  activeTab === 'history'
                    ? 'bg-white text-sky-700 shadow-xs dark:bg-slate-900 dark:text-sky-400'
                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white'
                }`}
              >
                <Calendar className="h-4 w-4" />
                <span>{isExecutive ? `แดชบอร์ดประวัติการตรวจอุปกรณ์ (${records.length})` : `ประวัติการตรวจ (${records.length})`}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Executive / History Summary KPI Strip */}
      {activeTab === 'history' && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-3.5 shadow-2xs dark:border-slate-800 dark:bg-slate-900">
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">บันทึกตรวจอุปกรณ์ทั้งหมด</span>
            <p className="mt-1 font-mono text-xl font-extrabold text-slate-900 dark:text-white tabular-nums">
              {records.length} <span className="text-xs font-normal text-slate-400">ครั้ง</span>
            </p>
          </div>
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-3.5 shadow-2xs dark:border-emerald-950 dark:bg-emerald-950/20">
            <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">พร้อมปฏิบัติการ</span>
            <p className="mt-1 font-mono text-xl font-extrabold text-emerald-600 dark:text-emerald-400 tabular-nums">
              {records.filter((r) => r.overallStatus === 'ready').length}{' '}
              <span className="text-xs font-normal text-emerald-600/70">ครั้ง</span>
            </p>
          </div>
          <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-3.5 shadow-2xs dark:border-amber-950 dark:bg-amber-950/20">
            <span className="text-[11px] font-semibold text-amber-700 dark:text-amber-300">อุปกรณ์ไม่ครบเกณฑ์</span>
            <p className="mt-1 font-mono text-xl font-extrabold text-amber-600 dark:text-amber-400 tabular-nums">
              {records.filter((r) => r.overallStatus === 'incomplete').length}{' '}
              <span className="text-xs font-normal text-amber-600/70">ครั้ง</span>
            </p>
          </div>
          <div className="rounded-2xl border border-red-200 bg-red-50/50 p-3.5 shadow-2xs dark:border-red-950 dark:bg-red-950/20">
            <span className="text-[11px] font-semibold text-red-700 dark:text-red-300">พบชำรุดเร่งด่วน</span>
            <p className="mt-1 font-mono text-xl font-extrabold text-red-600 dark:text-red-400 tabular-nums">
              {records.filter((r) => r.overallStatus === 'critical').length}{' '}
              <span className="text-xs font-normal text-red-600/70">ครั้ง</span>
            </p>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 1: EQUIPMENT CHECKLIST FORM                           */}
      {/* ========================================================= */}
      {activeTab === 'form' && (
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Top Metadata & Team/Date Card */}
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
              {/* Team Selection */}
              <div className="lg:col-span-5">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
                  ชุดปฏิบัติการ ({ORGANIZATION_NAME})
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
                            ? 'border-emerald-500 bg-emerald-50 text-emerald-800 shadow-xs dark:border-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-300'
                            : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-white dark:border-slate-800 dark:bg-slate-850 dark:text-slate-300'
                        }`}
                      >
                        <span
                          className={`flex h-4 w-4 items-center justify-center rounded border text-[10px] ${
                            selected
                              ? 'border-emerald-600 bg-emerald-600 text-white'
                              : 'border-slate-400 bg-white dark:bg-slate-900'
                          }`}
                        >
                          {selected ? '✓' : ''}
                        </span>
                        <Users className="h-3.5 w-3.5 shrink-0" />
                        <span>{opt.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Thai Date Fields */}
              <div className="lg:col-span-7">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
                  ประจำวันที่ · เดือน · พ.ศ.
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
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-bold text-slate-900 focus:border-emerald-500 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    />
                  </div>
                  <div>
                    <span className="block text-[10px] text-slate-400 mb-1">เดือน</span>
                    <select
                      value={inspectMonth}
                      onChange={(e) => setInspectMonth(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-bold text-slate-900 focus:border-emerald-500 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
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
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-bold text-slate-900 focus:border-emerald-500 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Vehicle, Inspector, Notes */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 pt-2 border-t border-slate-100 dark:border-slate-800">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  รถปฏิบัติการประจำชุด (ไม่บังคับ)
                </label>
                <div className="relative">
                  <Truck className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <select
                    value={selectedVehicleId}
                    onChange={(e) => setSelectedVehicleId(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 py-2.5 text-xs font-semibold text-slate-900 focus:border-emerald-500 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  >
                    <option value="">-- ไม่ระบุรถ / ตรวจประจำชุด --</option>
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
                  ชื่อผู้ตรวจเช็คอุปกรณ์
                </label>
                <input
                  type="text"
                  value={inspectorName}
                  onChange={(e) => setInspectorName(e.target.value)}
                  placeholder="ระบุชื่อ-นามสกุลผู้ตรวจ"
                  required
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs font-semibold text-slate-900 focus:border-emerald-500 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  หมายเหตุภาพรวมประจำเวร
                </label>
                <input
                  type="text"
                  value={summaryNotes}
                  onChange={(e) => setSummaryNotes(e.target.value)}
                  placeholder="เช่น ขอเบิกอุปกรณ์เพิ่มเติม หรืออุปกรณ์พร้อมใช้งาน"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs font-semibold text-slate-900 focus:border-emerald-500 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>
            </div>
          </div>

          {/* Live Summary KPI Bar + Quick Helpers */}
          <div className="rounded-3xl border border-slate-200 bg-white p-4 sm:p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-4">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3 dark:border-slate-800 dark:bg-slate-850">
                <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                  รายการเกณฑ์บังคับครบ
                </p>
                <p className="mt-1 text-xl font-extrabold text-emerald-600 dark:text-emerald-400 tabular-nums">
                  {metrics.requiredPassed} / {metrics.requiredTotal}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3 dark:border-slate-800 dark:bg-slate-850">
                <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                  รายการ &ldquo;ควรมี&rdquo; ที่พร้อมใช้
                </p>
                <p className="mt-1 text-xl font-extrabold text-sky-600 dark:text-sky-400 tabular-nums">
                  {metrics.recommendedPresent} / {metrics.recommendedTotal}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3 dark:border-slate-800 dark:bg-slate-850">
                <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                  ไม่ครบเกณฑ์ / ชำรุด
                </p>
                <p className="mt-1 text-xl font-extrabold text-amber-600 dark:text-amber-400 tabular-nums">
                  {metrics.incompleteRequiredCount} / {metrics.damagedCount}
                </p>
              </div>

              <div
                className={`rounded-2xl border p-3 ${
                  metrics.overallStatus === 'ready'
                    ? 'border-emerald-200 bg-emerald-50/80 dark:border-emerald-900/60 dark:bg-emerald-950/40'
                    : metrics.overallStatus === 'incomplete'
                    ? 'border-amber-200 bg-amber-50/80 dark:border-amber-900/60 dark:bg-amber-950/40'
                    : 'border-red-200 bg-red-50/80 dark:border-red-900/60 dark:bg-red-950/40'
                }`}
              >
                <p className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                  สถานะความพร้อมรวม
                </p>
                <div className="mt-1 flex items-center gap-1.5">
                  {metrics.overallStatus === 'ready' && (
                    <>
                      <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
                      <span className="text-sm font-extrabold text-emerald-800 dark:text-emerald-300">
                        พร้อมปฏิบัติการ
                      </span>
                    </>
                  )}
                  {metrics.overallStatus === 'incomplete' && (
                    <>
                      <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />
                      <span className="text-sm font-extrabold text-amber-800 dark:text-amber-300">
                        อุปกรณ์ไม่ครบเกณฑ์
                      </span>
                    </>
                  )}
                  {metrics.overallStatus === 'critical' && (
                    <>
                      <XCircle className="h-5 w-5 text-red-600 shrink-0" />
                      <span className="text-sm font-extrabold text-red-800 dark:text-red-300">
                        พบอุปกรณ์ชำรุด
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Category Filters & Quick Prefill Buttons */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
              <div className="flex flex-wrap items-center gap-1.5">
                {[
                  { id: 'all' as const, label: 'ทั้งหมด (4 หมวด)' },
                  { id: 1 as const, label: '1. ป้องกัน/ปลอดภัย' },
                  { id: 2 as const, label: '2. ประเมินผู้ป่วย' },
                  { id: 3 as const, label: '3. แพทย์ขั้นพื้นฐาน' },
                  { id: 4 as const, label: '4. ยึดตรึง/เคลื่อนย้าย' },
                ].map((cat) => (
                  <button
                    key={String(cat.id)}
                    type="button"
                    onClick={() => setCategoryFilter(cat.id)}
                    className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-all ${
                      categoryFilter === cat.id
                        ? 'bg-slate-900 text-white dark:bg-sky-600'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handlePrefillAllRequired}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-800 hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300 transition-colors"
                >
                  <CheckCheck className="h-3.5 w-3.5" />
                  <span>ตั้งค่าครบตามเกณฑ์ขั้นต่ำทั้งหมด</span>
                </button>
                <button
                  type="button"
                  onClick={handleResetAllZero}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 transition-colors"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  <span>รีเซ็ตเป็น 0</span>
                </button>
              </div>
            </div>
          </div>

          {/* 4-Category Equipment Checklist Cards */}
          <div className="space-y-4">
            {groupedCategories.map((cat) => (
              <div
                key={cat.categoryId}
                className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900"
              >
                <div className="border-b border-slate-200 bg-slate-900 px-5 py-3.5 text-white dark:border-slate-800">
                  <h2 className="text-sm font-bold">{cat.categoryTitle}</h2>
                </div>

                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {cat.subGroups.map((sg, sgIdx) => (
                    <div key={`${cat.categoryId}-sg-${sgIdx}`}>
                      {sg.subTitle && (
                        <div className="bg-sky-50/80 px-5 py-2.5 text-xs font-bold text-sky-900 border-b border-sky-100 dark:bg-sky-950/30 dark:text-sky-300 dark:border-slate-800">
                          {sg.subTitle}
                        </div>
                      )}

                      <div className="divide-y divide-slate-100 dark:divide-slate-800">
                        {sg.items.map((item) => {
                          const isRequired = item.minCount !== null;
                          const isQtyMet = isRequired
                            ? item.availableQty >= (item.minCount || 0)
                            : item.availableQty > 0;

                          return (
                            <div
                              key={item.id}
                              className={`p-4 sm:px-5 transition-colors ${
                                item.conditionStatus === 'damaged'
                                  ? 'bg-red-50/40 dark:bg-red-950/15'
                                  : isRequired && item.availableQty < (item.minCount || 0)
                                  ? 'bg-amber-50/30 dark:bg-amber-950/10'
                                  : 'hover:bg-slate-50/70 dark:hover:bg-slate-800/30'
                              }`}
                            >
                              <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-center">
                                {/* Item Name + Min Requirement */}
                                <div className="lg:col-span-5">
                                  <div className="flex items-start gap-2">
                                    <span className="inline-flex shrink-0 items-center justify-center rounded-lg bg-slate-100 px-2 py-0.5 font-mono text-xs font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                                      {item.itemCode}
                                    </span>
                                    <div>
                                      <p className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-white leading-snug">
                                        {item.name}
                                      </p>
                                      <div className="mt-1 flex flex-wrap items-center gap-2">
                                        <span
                                          className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-bold ${
                                            isRequired
                                              ? 'bg-sky-100 text-sky-800 dark:bg-sky-950/60 dark:text-sky-300'
                                              : 'bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300'
                                          }`}
                                        >
                                          จำนวนขั้นต่ำ: {item.minRequirementLabel}
                                        </span>
                                        {!isRequired && (
                                          <span className="text-[10px] font-medium text-slate-400">
                                            (อุปกรณ์แนะนำเพิ่มเติม)
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                </div>

                                {/* Quantity Stepper */}
                                <div className="lg:col-span-3 flex items-center justify-between lg:justify-center gap-2">
                                  <span className="text-xs font-bold text-slate-500 lg:hidden">
                                    จำนวนที่มี:
                                  </span>
                                  <div className="flex items-center gap-1.5">
                                    <button
                                      type="button"
                                      onClick={() => handleQtyChange(item.id, item.availableQty - 1)}
                                      className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 active:scale-95 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                                      aria-label="ลดจำนวน"
                                    >
                                      <Minus className="h-3.5 w-3.5" />
                                    </button>
                                    <input
                                      type="number"
                                      min={0}
                                      value={item.availableQty}
                                      onChange={(e) => handleQtyChange(item.id, Number(e.target.value))}
                                      className={`w-16 rounded-xl border px-2 py-2 text-center font-mono text-sm font-extrabold focus:outline-none ${
                                        item.conditionStatus === 'damaged'
                                          ? 'border-red-300 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-300'
                                          : isQtyMet
                                          ? 'border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300'
                                          : 'border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300'
                                      }`}
                                    />
                                    <button
                                      type="button"
                                      onClick={() => handleQtyChange(item.id, item.availableQty + 1)}
                                      className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 active:scale-95 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                                      aria-label="เพิ่มจำนวน"
                                    >
                                      <Plus className="h-3.5 w-3.5" />
                                    </button>
                                    <span className="min-w-[44px] text-xs font-bold text-slate-600 dark:text-slate-300">
                                      {item.unit}
                                    </span>
                                  </div>
                                </div>

                                {/* Condition Status + Notes */}
                                <div className="lg:col-span-4 flex flex-col sm:flex-row gap-2">
                                  <div className="grid grid-cols-3 gap-1 shrink-0">
                                    <button
                                      type="button"
                                      onClick={() => handleStatusChange(item.id, 'ready')}
                                      className={`rounded-lg px-2 py-1.5 text-[11px] font-bold transition-all ${
                                        item.conditionStatus === 'ready'
                                          ? 'bg-emerald-600 text-white shadow-2xs'
                                          : 'bg-slate-100 text-slate-600 hover:bg-emerald-50 dark:bg-slate-800 dark:text-slate-300'
                                      }`}
                                    >
                                      พร้อม
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleStatusChange(item.id, 'incomplete')}
                                      className={`rounded-lg px-2 py-1.5 text-[11px] font-bold transition-all ${
                                        item.conditionStatus === 'incomplete'
                                          ? 'bg-amber-500 text-white shadow-2xs'
                                          : 'bg-slate-100 text-slate-600 hover:bg-amber-50 dark:bg-slate-800 dark:text-slate-300'
                                      }`}
                                    >
                                      ไม่ครบ
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleStatusChange(item.id, 'damaged')}
                                      className={`rounded-lg px-2 py-1.5 text-[11px] font-bold transition-all ${
                                        item.conditionStatus === 'damaged'
                                          ? 'bg-red-600 text-white shadow-2xs'
                                          : 'bg-slate-100 text-slate-600 hover:bg-red-50 dark:bg-slate-800 dark:text-slate-300'
                                      }`}
                                    >
                                      ชำรุด
                                    </button>
                                  </div>

                                  <input
                                    type="text"
                                    value={item.notes}
                                    onChange={(e) => handleItemNotesChange(item.id, e.target.value)}
                                    placeholder="หมายเหตุ (ถ้ามี)"
                                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs text-slate-800 focus:border-sky-500 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                                  />
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Sticky / Bottom Submit Footer */}
          <div className="rounded-3xl border border-emerald-200 bg-emerald-50/70 p-4 sm:p-5 dark:border-emerald-900/60 dark:bg-emerald-950/30 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="text-xs text-emerald-950 dark:text-emerald-200">
              <p className="font-bold">
                สรุปก่อนบันทึก: {ORGANIZATION_NAME} · {team === 'team_1' ? 'ชุดปฏิบัติการที่ 1' : 'ชุดปฏิบัติการที่ 2'} · วันที่ {inspectDay} {inspectMonth} {inspectYear}
              </p>
              <p className="mt-0.5 text-[11px] opacity-80">
                เกณฑ์บังคับครบ {metrics.requiredPassed}/{metrics.requiredTotal} รายการ · รายการควรมี {metrics.recommendedPresent}/{metrics.recommendedTotal} รายการ
              </p>
            </div>
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-6 py-3 text-sm font-extrabold text-white shadow-sm hover:bg-emerald-500 active:scale-95 transition-all disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              <span>{isSubmitting ? 'กำลังบันทึก...' : 'บันทึกผลการตรวจความพร้อมอุปกรณ์'}</span>
            </button>
          </div>
        </form>
      )}

      {/* ========================================================= */}
      {/* TAB 2: EQUIPMENT INSPECTION HISTORY                       */}
      {/* ========================================================= */}
      {activeTab === 'history' && (
        <div className="space-y-4">
          {/* Search & Team Filter Bar */}
          <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-1.5">
              {[
                { id: 'all' as const, label: 'ทุกชุดปฏิบัติการ' },
                { id: 'team_1' as const, label: 'ชุดปฏิบัติการที่ 1' },
                { id: 'team_2' as const, label: 'ชุดปฏิบัติการที่ 2' },
              ].map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setHistoryTeamFilter(opt.id)}
                  className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-all ${
                    historyTeamFilter === opt.id
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
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ค้นหาวันที่, ผู้ตรวจ, รหัสรถ..."
                className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 py-2 text-xs font-medium text-slate-900 focus:border-sky-500 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>
          </div>

          {filteredRecords.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center dark:border-slate-700 dark:bg-slate-900">
              <PackageCheck className="mx-auto h-10 w-10 text-slate-300 dark:text-slate-600" />
              <p className="mt-3 text-sm font-bold text-slate-700 dark:text-slate-300">
                ยังไม่มีประวัติการตรวจความพร้อมอุปกรณ์ BLS
              </p>
              <p className="mt-1 text-xs text-slate-400">
                เริ่มตรวจความพร้อมอุปกรณ์ได้ที่แท็บ &ldquo;แบบฟอร์มตรวจอุปกรณ์&rdquo;
              </p>
              <button
                type="button"
                onClick={() => setActiveTab('form')}
                className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-500"
              >
                <ClipboardList className="h-4 w-4" />
                <span>ไปที่แบบฟอร์มตรวจอุปกรณ์</span>
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
                          ประจำวันที่ {rec.inspectDateFormatted}
                        </h3>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                          {rec.organizationName} · ผู้ตรวจ: {rec.inspectorName}
                        </p>
                      </div>

                      <span
                        className={`inline-flex items-center gap-1 rounded-xl px-2.5 py-1 text-[11px] font-bold shrink-0 ${
                          rec.overallStatus === 'ready'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                            : rec.overallStatus === 'incomplete'
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                            : 'bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300'
                        }`}
                      >
                        {rec.overallStatus === 'ready' && <CheckCircle2 className="h-3.5 w-3.5" />}
                        {rec.overallStatus === 'incomplete' && <AlertTriangle className="h-3.5 w-3.5" />}
                        {rec.overallStatus === 'critical' && <XCircle className="h-3.5 w-3.5" />}
                        <span>
                          {rec.overallStatus === 'ready'
                            ? 'พร้อมปฏิบัติการ'
                            : rec.overallStatus === 'incomplete'
                            ? 'ไม่ครบเกณฑ์'
                            : 'พบชำรุด'}
                        </span>
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 rounded-2xl bg-slate-50 p-3 text-xs dark:bg-slate-850">
                      <div>
                        <span className="text-[10px] text-slate-400 block">รายการบังคับครบ</span>
                        <span className="font-extrabold text-slate-900 dark:text-white tabular-nums">
                          {rec.requiredPassedCount} / {rec.requiredTotalCount} รายการ
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block">เวลาบันทึก</span>
                        <span className="font-semibold text-slate-700 dark:text-slate-300">
                          {rec.uploadTimestamp}
                        </span>
                      </div>
                    </div>

                    {rec.summaryNotes && (
                      <p className="rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-600 dark:bg-slate-850 dark:text-slate-300">
                        หมายเหตุ: {rec.summaryNotes}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                    <button
                      type="button"
                      onClick={() => setDetailRecord(rec)}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                    >
                      <Eye className="h-3.5 w-3.5 text-sky-600" />
                      <span>ดูรายละเอียด</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setPrintRecord(rec)}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-sky-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-sky-500"
                    >
                      <Printer className="h-3.5 w-3.5" />
                      <span>พิมพ์แบบฟอร์ม A4</span>
                    </button>

                    {currentUser.role === 'admin' && (
                      <button
                        type="button"
                        onClick={() => setDeleteTarget(rec)}
                        className="inline-flex items-center gap-1 rounded-xl border border-red-200 bg-red-50 px-2.5 py-1.5 text-xs font-bold text-red-700 hover:bg-red-100 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300"
                        title="ลบประวัติ (Admin)"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* DETAIL VIEW MODAL                                         */}
      {/* ========================================================= */}
      {detailRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-3 sm:p-6 backdrop-blur-sm overflow-y-auto">
          <div className="my-auto w-full max-w-4xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 dark:border-slate-800">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  รายละเอียดการตรวจความพร้อมอุปกรณ์ · {detailRecord.teamLabel}
                </h3>
                <p className="text-xs text-slate-500">
                  {detailRecord.organizationName} · ประจำวันที่ {detailRecord.inspectDateFormatted} · ผู้ตรวจ: {detailRecord.inspectorName}
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
                  <span>พิมพ์แบบฟอร์ม</span>
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

            <div className="max-h-[75vh] overflow-y-auto p-6">
              <table className="w-full border-collapse border border-slate-200 text-xs dark:border-slate-700">
                <thead>
                  <tr className="bg-slate-900 text-white">
                    <th className="border border-slate-700 p-2 text-left">รายการอุปกรณ์</th>
                    <th className="border border-slate-700 p-2 text-center w-24">จำนวนขั้นต่ำ</th>
                    <th className="border border-slate-700 p-2 text-center w-24">จำนวนที่มี</th>
                    <th className="border border-slate-700 p-2 text-left w-36">สถานะ / หมายเหตุ</th>
                  </tr>
                </thead>
                <tbody>
                  {[1, 2, 3, 4].map((catId) => {
                    const catItems = detailRecord.items.filter((i) => i.categoryId === catId);
                    if (!catItems.length) return null;
                    return (
                      <React.Fragment key={catId}>
                        <tr className="bg-slate-100 dark:bg-slate-800 font-bold">
                          <td colSpan={4} className="border border-slate-200 dark:border-slate-700 px-3 py-2">
                            {catItems[0].categoryTitle}
                          </td>
                        </tr>
                        {catItems.map((item, idx) => {
                          const prevSub = idx > 0 ? catItems[idx - 1].subCategoryTitle : undefined;
                          const showSub = item.subCategoryTitle && item.subCategoryTitle !== prevSub;
                          return (
                            <React.Fragment key={item.id}>
                              {showSub && (
                                <tr className="bg-sky-50/70 dark:bg-sky-950/30 font-bold">
                                  <td colSpan={4} className="border border-slate-200 dark:border-slate-700 px-5 py-1.5 text-sky-900 dark:text-sky-300">
                                    {item.subCategoryTitle}
                                  </td>
                                </tr>
                              )}
                              <tr>
                                <td className={`border border-slate-200 dark:border-slate-700 p-2 ${item.subCategoryTitle ? 'pl-7' : 'pl-4'}`}>
                                  <span className="font-semibold">{item.itemCode}</span> {item.name}
                                </td>
                                <td className="border border-slate-200 dark:border-slate-700 p-2 text-center font-semibold">
                                  {item.minRequirementLabel}
                                </td>
                                <td className="border border-slate-200 dark:border-slate-700 p-2 text-center font-extrabold">
                                  {item.availableQty} {item.unit}
                                </td>
                                <td className="border border-slate-200 dark:border-slate-700 p-2">
                                  <span
                                    className={`font-bold ${
                                      item.conditionStatus === 'damaged'
                                        ? 'text-red-600'
                                        : item.conditionStatus === 'incomplete'
                                        ? 'text-amber-600'
                                        : 'text-emerald-600'
                                    }`}
                                  >
                                    {item.conditionStatus === 'damaged'
                                      ? 'ชำรุด'
                                      : item.conditionStatus === 'incomplete'
                                      ? 'ไม่ครบ'
                                      : 'พร้อม'}
                                  </span>
                                  {item.notes ? ` · ${item.notes}` : ''}
                                </td>
                              </tr>
                            </React.Fragment>
                          );
                        })}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* OFFICIAL PRINTABLE A4 REPORT MODAL                        */}
      {/* ========================================================= */}
      {printRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-3 sm:p-6 backdrop-blur-sm overflow-y-auto">
          <div className="my-auto w-full max-w-4xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-6 py-4 bg-slate-50 dark:border-slate-800 dark:bg-slate-850">
              <div className="flex items-center gap-2.5">
                <div className="rounded-lg bg-sky-100 p-2 text-sky-700 dark:bg-sky-950 dark:text-sky-300">
                  <FileDown className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    พิมพ์ / บันทึกเป็น .PDF แบบฟอร์มตรวจความพร้อมอุปกรณ์ BLS ({printRecord.organizationName})
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    ประจำวันที่ {printRecord.inspectDateFormatted} · {printRecord.teamLabel} · เลือกปลายทางเป็น &ldquo;บันทึกเป็น PDF (Save as PDF)&rdquo; ขนาด A4
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
                  className="inline-flex items-center gap-1.5 rounded-xl bg-sky-600 px-3.5 py-2 text-xs font-bold text-white shadow-sm hover:bg-sky-500 active:scale-95 transition-all"
                  title="พิมพ์หรือบันทึกเป็นไฟล์ .PDF ขนาด A4 รูปแบบราชการ"
                >
                  <Printer className="h-4 w-4" />
                  <span>พิมพ์ / บันทึกเป็น .PDF</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleOpenStandaloneTab(printRecord)}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                  title="เปิดหน้ากระดาษ A4 เต็มหน้าในแท็บใหม่เพื่อดูตัวอย่างก่อนบันทึก PDF"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  <span>เปิดหน้ากระดาษ A4</span>
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

            <div
              className="max-h-[78vh] overflow-y-auto p-6 sm:p-10 bg-white text-slate-950 space-y-4"
              style={{ fontFamily: "'Sarabun', 'Prompt', sans-serif" }}
            >
              <div className="flex justify-end text-[11px] text-slate-600">
                <span>เลขที่อ้างอิง: {printRecord.id}</span>
              </div>

              <div className="border-b-[3px] border-double border-slate-900 pb-3 text-center">
                <h2 className="text-base sm:text-lg font-bold text-slate-950">
                  ตรวจความพร้อมอุปกรณ์สำหรับหน่วยปฏิบัติการแพทย์ระดับพื้นฐาน
                </h2>
                <p className="text-sm sm:text-base font-bold mt-0.5 text-slate-950">
                  {printRecord.organizationName}
                </p>
                <p className="text-xs sm:text-sm mt-1 text-slate-900">
                  ประจำวันที่ <span className="font-bold underline px-1">{printRecord.inspectDay}</span>{' '}
                  เดือน <span className="font-bold underline px-1">{printRecord.inspectMonth}</span>{' '}
                  พ.ศ. <span className="font-bold underline px-1">{printRecord.inspectYear}</span>
                </p>
                <div className="mt-1.5 flex items-center justify-center gap-6 text-xs sm:text-sm font-bold text-slate-900">
                  <span className={printRecord.team === 'team_1' ? 'text-slate-950' : 'text-slate-600'}>
                    {printRecord.team === 'team_1' ? '☑' : '☐'} ชุดปฏิบัติการที่ 1
                  </span>
                  <span className={printRecord.team === 'team_2' ? 'text-slate-950' : 'text-slate-600'}>
                    {printRecord.team === 'team_2' ? '☑' : '☐'} ชุดปฏิบัติการที่ 2
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 border border-slate-700 text-xs bg-white">
                <div className="space-y-1 p-2.5 sm:border-r border-b sm:border-b-0 border-slate-700">
                  <p>
                    <span className="font-bold">ผู้ตรวจเช็คอุปกรณ์:</span> {printRecord.inspectorName}
                  </p>
                  <p>
                    <span className="font-bold">ชุดปฏิบัติการ:</span> {printRecord.teamLabel}
                  </p>
                  <p>
                    <span className="font-bold">วัน-เวลาบันทึก:</span> {printRecord.uploadTimestamp}
                  </p>
                </div>
                <div className="space-y-1 p-2.5">
                  <p>
                    <span className="font-bold">รถปฏิบัติการประจำชุด:</span>{' '}
                    {printRecord.vehicleCode
                      ? `${printRecord.vehicleCode} (${printRecord.plateNumber || '-'})`
                      : 'ตรวจประจำชุดปฏิบัติการ'}
                  </p>
                  <p>
                    <span className="font-bold">รายการเกณฑ์บังคับครบ:</span>{' '}
                    <span className="font-bold text-emerald-700">
                      {printRecord.requiredPassedCount} / {printRecord.requiredTotalCount} รายการ
                    </span>
                  </p>
                  <p>
                    <span className="font-bold">รายการชำรุด / ไม่ครบ:</span>{' '}
                    {(() => {
                      const issueCount = printRecord.items.filter(
                        (i) =>
                          i.conditionStatus === 'damaged' ||
                          (i.minCount !== null && i.availableQty < i.minCount)
                      ).length;
                      return (
                        <span
                          className={`font-bold ${
                            issueCount > 0 ? 'text-red-700' : 'text-emerald-700'
                          }`}
                        >
                          {issueCount} รายการ
                        </span>
                      );
                    })()}
                  </p>
                </div>
              </div>

              <table className="w-full border-collapse border border-slate-700 text-xs">
                <thead>
                  <tr className="bg-slate-200 text-slate-950">
                    <th className="border border-slate-700 p-1.5 text-left font-bold">รายการอุปกรณ์</th>
                    <th className="border border-slate-700 p-1.5 text-center w-24 font-bold">จำนวนขั้นต่ำ</th>
                    <th className="border border-slate-700 p-1.5 text-center w-24 font-bold">จำนวนที่มี</th>
                    <th className="border border-slate-700 p-1.5 text-left w-36 font-bold">สภาพ / หมายเหตุ</th>
                  </tr>
                </thead>
                <tbody>
                  {[1, 2, 3, 4].map((catId) => {
                    const catItems = printRecord.items.filter((i) => i.categoryId === catId);
                    if (!catItems.length) return null;
                    return (
                      <React.Fragment key={catId}>
                        <tr className="bg-slate-200 font-bold text-slate-950">
                          <td colSpan={4} className="border border-slate-700 px-2.5 py-1.5">
                            {catItems[0].categoryTitle}
                          </td>
                        </tr>
                        {catItems.map((item, idx) => {
                          const prevSub = idx > 0 ? catItems[idx - 1].subCategoryTitle : undefined;
                          const showSub = item.subCategoryTitle && item.subCategoryTitle !== prevSub;
                          return (
                            <React.Fragment key={item.id}>
                              {showSub && (
                                <tr className="bg-slate-50 font-bold text-slate-900">
                                  <td colSpan={4} className="border border-slate-600 px-4 py-1">
                                    {item.subCategoryTitle}
                                  </td>
                                </tr>
                              )}
                              <tr>
                                <td className={`border border-slate-600 py-1 pr-2 ${item.subCategoryTitle ? 'pl-6' : 'pl-3'}`}>
                                  <span className="font-semibold">{item.itemCode}</span> {item.name}
                                </td>
                                <td className="border border-slate-600 p-1 text-center whitespace-nowrap">
                                  {item.minRequirementLabel}
                                </td>
                                <td className="border border-slate-600 p-1 text-center font-bold whitespace-nowrap">
                                  {item.availableQty} {item.unit}
                                </td>
                                <td className="border border-slate-600 p-1 font-semibold">
                                  {item.conditionStatus === 'damaged' ? (
                                    <span className="text-red-700">✗ ชำรุด</span>
                                  ) : item.minCount !== null && item.availableQty < item.minCount ? (
                                    <span className="text-amber-700">⚠ ไม่ครบเกณฑ์</span>
                                  ) : item.minCount === null && item.availableQty === 0 ? (
                                    <span className="text-slate-500">-</span>
                                  ) : (
                                    <span className="text-emerald-700">✓ ครบ/พร้อม</span>
                                  )}
                                  {item.notes ? ` (${item.notes})` : ''}
                                </td>
                              </tr>
                            </React.Fragment>
                          );
                        })}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>

              {printRecord.summaryNotes && (
                <div className="border border-slate-700 bg-slate-50 px-3 py-2 text-xs text-slate-900">
                  <span className="font-bold">หมายเหตุเพิ่มเติม:</span> {printRecord.summaryNotes}
                </div>
              )}

              <div className="grid grid-cols-2 gap-6 pt-6 text-xs sm:text-[13px] text-center text-slate-950">
                <div className="p-3 leading-relaxed">
                  <div className="h-9" />
                  <p>ลงชื่อ..........................................................ผู้ตรวจเช็ค</p>
                  <p className="font-bold mt-1">( {printRecord.inspectorName} )</p>
                  <p className="text-[11px] text-slate-700">บันทึกเมื่อ: {printRecord.uploadTimestamp}</p>
                  <p className="text-[11px] text-slate-700">วันที่............เดือน........................พ.ศ. ......................</p>
                </div>
                <div className="p-3 leading-relaxed">
                  <div className="h-9" />
                  <p>ผู้ตรวจสอบ.....................................................................</p>
                  <p className="font-bold mt-1">( นายวสันต์ วรรณเผือก )</p>
                  <p className="mt-0.5 text-[11px]">ตำแหน่ง เจ้าพนักงานป้องกันและบรรเทาสาธารณภัยปฏิบัติงาน</p>
                  <p className="mt-0.5 text-[11px]">วันที่............เดือน........................พ.ศ. ......................</p>
                </div>
              </div>

              <div className="mt-4 text-slate-950">
                <div className="px-3 text-xs sm:text-[13px] leading-relaxed">
                  <p className="font-bold text-left">จึงเรียนมาเพื่อโปรดทราบ</p>
                  <div className="mt-1 space-y-2">
                    <div className="h-5 w-full border-b-2 border-dotted border-slate-700" />
                    <div className="h-5 w-full border-b-2 border-dotted border-slate-700" />
                  </div>
                </div>
                <div className="mt-3 flex justify-end">
                  <div className="w-full sm:w-1/2 p-3 text-xs sm:text-[13px] text-center leading-relaxed">
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
        </div>
      )}

      {/* Confirm Delete Modal */}
      <ConfirmDeleteModal
        isOpen={Boolean(deleteTarget)}
        title="ยืนยันการลบประวัติตรวจอุปกรณ์"
        message="ต้องการลบประวัติการตรวจความพร้อมอุปกรณ์รายการนี้ออกจากระบบใช่หรือไม่?"
        itemName={
          deleteTarget
            ? `${deleteTarget.teamLabel} · ประจำวันที่ ${deleteTarget.inspectDateFormatted}`
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
