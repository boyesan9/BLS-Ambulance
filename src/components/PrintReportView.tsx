import React, { useState } from 'react';
import { InspectionRecord, UserProfile } from '../types';
import { Printer, X, ExternalLink, FileDown } from 'lucide-react';
import {
  getDriveImageFallbackUrls,
  getStoredStaff,
  toDisplayableDriveImageUrl,
} from '../services/storage';
import { THAI_MONTHS } from '../data/equipmentChecklist';

interface PrintReportViewProps {
  record: InspectionRecord;
  staffList?: UserProfile[];
  onClose: () => void;
}

function getThaiInspectionDateParts(
  uploadTimestamp?: string,
  createdAt?: number,
  recordId?: string
): {
  day: string;
  month: string;
  year: string;
} {
  const raw = (uploadTimestamp || '').trim();

  // 1) Match numeric DD/MM/YYYY or D/M/YYYY or DD-MM-YYYY
  const numericMatch = raw.match(/(\d{1,2})[/-](\d{1,2})[/-](\d{4})/);
  if (numericMatch) {
    const dayNum = parseInt(numericMatch[1], 10);
    const monthNum = parseInt(numericMatch[2], 10);
    const yearNum = parseInt(numericMatch[3], 10);
    if (dayNum >= 1 && dayNum <= 31 && monthNum >= 1 && monthNum <= 12 && yearNum > 0) {
      return {
        day: String(dayNum),
        month: THAI_MONTHS[monthNum - 1],
        year: String(yearNum < 2400 ? yearNum + 543 : yearNum),
      };
    }
  }

  // 2) Match Thai month name directly in uploadTimestamp
  const foundMonthIdx = THAI_MONTHS.findIndex((m) => raw.includes(m));
  if (foundMonthIdx !== -1) {
    const dayMatch = raw.match(/(\d{1,2})\s/);
    const yearMatch = raw.match(/(25\d{2}|20\d{2})/);
    if (dayMatch && yearMatch) {
      const yNum = parseInt(yearMatch[1], 10);
      return {
        day: String(parseInt(dayMatch[1], 10)),
        month: THAI_MONTHS[foundMonthIdx],
        year: String(yNum < 2400 ? yNum + 543 : yNum),
      };
    }
  }

  // 3) Fallback to createdAt or timestamp embedded in record.id
  let ts = createdAt;
  if (!ts && recordId) {
    const idTsMatch = recordId.match(/(\d{13})/);
    if (idTsMatch) ts = Number(idTsMatch[1]);
  }
  if (ts && !Number.isNaN(ts)) {
    const dt = new Date(ts);
    if (!Number.isNaN(dt.getTime())) {
      return {
        day: String(dt.getDate()),
        month: THAI_MONTHS[dt.getMonth()] || THAI_MONTHS[0],
        year: String(dt.getFullYear() + 543),
      };
    }
  }

  return {
    day: '............',
    month: '..................................',
    year: '..................',
  };
}

function escapeHtml(str: string): string {
  return (str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

const ReportPhotoImg: React.FC<{
  primary?: string;
  driveUrl?: string;
  alt: string;
  className: string;
}> = ({ primary, driveUrl, alt, className }) => {
  const candidates = React.useMemo(() => {
    const first = toDisplayableDriveImageUrl(primary, driveUrl) || primary || '';
    const fallbacks = getDriveImageFallbackUrls(primary, driveUrl);
    return Array.from(new Set([first, ...fallbacks].filter(Boolean)));
  }, [primary, driveUrl]);

  const [idx, setIdx] = useState(0);
  const src = candidates[idx] || '';

  if (!src) {
    return (
      <div className="flex h-52 sm:h-60 w-full items-center justify-center bg-slate-100 text-xs text-slate-400">
        ไม่มีภาพ
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      referrerPolicy="no-referrer"
      onError={() => {
        if (idx + 1 < candidates.length) {
          setIdx(idx + 1);
        }
      }}
    />
  );
};

export const PrintReportView: React.FC<PrintReportViewProps> = ({
  record,
  staffList,
  onClose,
}) => {
  const [printStatus, setPrintStatus] = useState<string | null>(null);
  const inspectionDateParts = getThaiInspectionDateParts(
    record.uploadTimestamp,
    record.createdAt,
    record.id
  );
  const availableStaff = staffList && staffList.length > 0 ? staffList : getStoredStaff();
  const matchedInspector = availableStaff.find(
    (s) => s.name.trim().toLowerCase() === (record.inspectorName || '').trim().toLowerCase()
  );
  const resolvedTeam = (record.inspectorDepartment || matchedInspector?.department || '').trim();
  const isTeam1 = /ชุดปฏิบัติการที่\s*1/.test(resolvedTeam);
  const isTeam2 = /ชุดปฏิบัติการที่\s*2/.test(resolvedTeam);

  const categories = Array.from(new Set(record.vehicleChecklist.map((i) => i.categoryId))).map(
    (catId) => {
      const items = record.vehicleChecklist.filter((i) => i.categoryId === catId);
      return {
        id: catId,
        title: items[0]?.categoryTitle || `หมวดที่ ${catId}`,
        items,
      };
    }
  );

  const safePdfFilename = `ใบรายงานผลการตรวจสภาพรถ_${record.vehicleCode}_${record.plateNumber}`
    .replace(/[\\/:*?"<>|]/g, '_')
    .trim();

  const generateReportHtml = (showTopToolbar = false) => {
    const statusText =
      record.overallStatus === 'normal'
        ? 'พร้อมปฏิบัติการ (ปกติ)'
        : record.overallStatus === 'issue_found'
        ? 'พบข้อบกพร่อง (เฝ้าระวัง)'
        : 'งดใช้งาน (ส่งซ่อมบำรุง)';

    const statusColor =
      record.overallStatus === 'normal'
        ? '#15803d'
        : record.overallStatus === 'issue_found'
        ? '#b45309'
        : '#b91c1c';

    const photoSides = [
      {
        label: 'ด้านหน้า (Front)',
        primary: record.photos.front,
        driveUrl: record.driveLinks?.frontPhotoUrl,
      },
      {
        label: 'ด้านหลัง (Rear)',
        primary: record.photos.rear,
        driveUrl: record.driveLinks?.rearPhotoUrl,
      },
      {
        label: 'ด้านซ้าย (Left Side)',
        primary: record.photos.left,
        driveUrl: record.driveLinks?.leftPhotoUrl,
      },
      {
        label: 'ด้านขวา (Right Side)',
        primary: record.photos.right,
        driveUrl: record.driveLinks?.rightPhotoUrl,
      },
    ];

    const photosHtml = photoSides
      .map((side) => {
        const first = toDisplayableDriveImageUrl(side.primary, side.driveUrl) || side.primary || '';
        const fallbacks = getDriveImageFallbackUrls(side.primary, side.driveUrl);
        const candidates = Array.from(new Set([first, ...fallbacks].filter(Boolean)));
        const src = candidates[0] || '';
        const fallbackJson = escapeHtml(JSON.stringify(candidates));
        return `
      <div class="photo-box">
        ${
          src
            ? `<img src="${escapeHtml(src)}" alt="${escapeHtml(side.label)}" referrerpolicy="no-referrer" data-candidates="${fallbackJson}" data-idx="0" onerror="var list=JSON.parse(this.dataset.candidates||'[]');var i=parseInt(this.dataset.idx||'0',10)+1;if(i<list.length){this.dataset.idx=i;this.src=list[i];}" />`
            : `<div class="photo-empty">ไม่มีภาพ</div>`
        }
        <div class="photo-label">${escapeHtml(side.label)}</div>
      </div>`;
      })
      .join('');

    const rowsHtml = categories
      .map(
        (cat) => `
        <tr class="cat-row">
          <td colspan="4">${escapeHtml(cat.title)}</td>
        </tr>
        ${cat.items
          .map(
            (item, idx) => `
          <tr class="item-row">
            <td style="text-align:center;">${cat.id}.${idx + 1}</td>
            <td>
              <strong>${escapeHtml(item.subTitle)}</strong>
              <span class="std-text">(เกณฑ์: ${escapeHtml(item.standard)})</span>
            </td>
            <td style="text-align:center; font-weight:700; color:${
              item.status === 'pass' ? '#15803d' : item.status === 'warning' ? '#b45309' : '#b91c1c'
            };">
              ${
                item.status === 'pass'
                  ? '✓ พร้อมใช้งาน'
                  : item.status === 'warning'
                  ? '⚠ เฝ้าระวัง'
                  : '✗ ชำรุด/ไม่ผ่าน'
              }
            </td>
            <td style="color:#334155;">${escapeHtml(item.issueNotes || '-')}</td>
          </tr>
        `
          )
          .join('')}
      `
      )
      .join('');

    return `<!DOCTYPE html>
<html lang="th">
<head>
  <title>${escapeHtml(safePdfFilename)}</title>
  <meta charset="utf-8" />
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
      font-size: 13px;
      line-height: 1.45;
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
      font-size: 11px;
      color: #334155;
      margin-bottom: 4px;
    }
    .header {
      text-align: center;
      border-bottom: 3px double #0f172a;
      padding-bottom: 8px;
      margin-bottom: 10px;
    }
    .title {
      font-size: 16px;
      font-weight: 700;
      color: #000000;
      margin: 0;
    }
    .org-title {
      font-size: 14.5px;
      font-weight: 700;
      color: #000000;
      margin-top: 2px;
    }
    .date-line {
      font-size: 13px;
      color: #0f172a;
      margin-top: 4px;
    }
    .team-line {
      font-size: 13px;
      font-weight: 700;
      color: #0f172a;
      margin-top: 4px;
    }
    .meta-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 10px;
      font-size: 12.5px;
    }
    .meta-table td {
      border: 1px solid #334155;
      padding: 5px 10px;
      vertical-align: top;
      background: #ffffff;
    }
    .section-heading {
      font-size: 13px;
      font-weight: 700;
      color: #000000;
      margin: 8px 0 5px 0;
      border-left: 3px solid #0f172a;
      padding-left: 7px;
    }
    .photos {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 10px;
      margin-bottom: 12px;
    }
    .photo-box {
      border: 1px solid #334155;
      background: #ffffff;
      padding: 5px;
      text-align: center;
      break-inside: avoid;
      page-break-inside: avoid;
    }
    .photo-box img {
      width: 100%;
      height: 185px;
      object-fit: cover;
      display: block;
    }
    .photo-empty {
      width: 100%;
      height: 185px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #f1f5f9;
      color: #64748b;
      font-size: 12px;
    }
    .photo-label {
      font-size: 12px;
      font-weight: 700;
      margin-top: 4px;
      color: #0f172a;
    }
    table.checklist {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 10px;
      font-size: 12px;
    }
    table.checklist thead {
      display: table-header-group;
    }
    table.checklist th {
      background: #e2e8f0;
      color: #000000;
      border: 1px solid #334155;
      padding: 6px 8px;
      font-weight: 700;
    }
    table.checklist td {
      border: 1px solid #475569;
      padding: 4px 8px;
      vertical-align: top;
    }
    tr.cat-row td {
      background: #f1f5f9;
      font-weight: 700;
      color: #000000;
      padding: 5px 8px;
    }
    tr.item-row {
      break-inside: avoid;
      page-break-inside: avoid;
    }
    .std-text {
      color: #475569;
      font-size: 11px;
    }
    .notes-box {
      border: 1px solid #475569;
      background: #f8fafc;
      padding: 6px 10px;
      margin-bottom: 10px;
      font-size: 12px;
      break-inside: avoid;
    }
    .signatures-wrapper {
      break-inside: avoid;
      page-break-inside: avoid;
      margin-top: 14px;
    }
    .sign-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 24px;
    }
    .sign-box {
      padding: 8px 6px;
      text-align: center;
      font-size: 12.5px;
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
            <strong>ใบรายงานผลการตรวจสภาพรถกู้ชีพ BLS</strong>
            <span style="font-size:12px; color:#cbd5e1; margin-left:8px;">(${escapeHtml(record.vehicleCode)} · ${escapeHtml(record.plateNumber)})</span>
          </div>
          <button type="button" class="toolbar-btn" onclick="window.print()">พิมพ์ / บันทึกเป็น .PDF (A4)</button>
        </div>`
      : ''
  }
  <div class="page-sheet">
    <div class="doc-ref">
      <span>เลขที่อ้างอิง: ${escapeHtml(record.id)}</span>
    </div>

    <div class="header">
      <div class="title">ตรวจความพร้อมการใช้งานรถยนต์ส่วนกลาง (รถกู้ชีพ) ทะเบียน กค 8816 ชุมพร</div>
      <div class="org-title">กู้ชีพ อบต.หงษ์เจริญ</div>
      <div class="date-line">ประจำวันที่ <strong>${escapeHtml(inspectionDateParts.day)}</strong> เดือน <strong>${escapeHtml(inspectionDateParts.month)}</strong> พ.ศ. <strong>${escapeHtml(inspectionDateParts.year)}</strong></div>
      <div class="team-line">${isTeam1 ? '☑' : '☐'} ชุดปฏิบัติการที่ 1 &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; ${isTeam2 ? '☑' : '☐'} ชุดปฏิบัติการที่ 2</div>
    </div>

    <table class="meta-table">
      <tbody>
        <tr>
          <td style="width:50%;">
            <div><strong>รหัสรถปฏิบัติการ:</strong> ${escapeHtml(record.vehicleCode)} &nbsp;|&nbsp; <strong>ทะเบียน:</strong> ${escapeHtml(record.plateNumber)}</div>
            <div><strong>เลขไมล์ขณะตรวจ:</strong> ${record.odometerReading ? record.odometerReading.toLocaleString() : '-'} กิโลเมตร</div>
            <div><strong>ผลการประเมินภาพรวม:</strong> <strong style="color:${statusColor};">${statusText}</strong></div>
          </td>
          <td style="width:50%;">
            <div><strong>ผู้ตรวจเช็ค:</strong> ${escapeHtml(record.inspectorName)}${resolvedTeam ? ` (${escapeHtml(resolvedTeam)})` : ''}</div>
            <div><strong>รอบเวรปฏิบัติการ:</strong> ${escapeHtml(record.shiftLabel)}</div>
            <div><strong>วัน-เวลาบันทึกผล:</strong> ${escapeHtml(record.uploadTimestamp)}</div>
          </td>
        </tr>
      </tbody>
    </table>

    <div class="section-heading">ส่วนที่ 1 ภาพถ่ายสภาพตัวรถกู้ชีพ 4 ด้าน (บันทึกวัน-เวลาตรวจจริง)</div>
    <div class="photos">
      ${photosHtml}
    </div>

    <div class="section-heading">ส่วนที่ 2 รายการตรวจเช็คสภาพความพร้อมรถยนต์ (7 หมวด 22 รายการ)</div>
    <table class="checklist">
      <thead>
        <tr>
          <th style="width:8%; text-align:center;">ลำดับ</th>
          <th style="width:52%; text-align:left;">รายการตรวจเช็ค / เกณฑ์มาตรฐาน</th>
          <th style="width:18%; text-align:center;">ผลการตรวจ</th>
          <th style="width:22%; text-align:left;">ปัญหาที่พบ / หมายเหตุ</th>
        </tr>
      </thead>
      <tbody>
        ${rowsHtml}
      </tbody>
    </table>

    ${
      record.summaryNotes
        ? `<div class="notes-box"><strong>หมายเหตุเพิ่มเติมจากผู้ตรวจ:</strong> ${escapeHtml(record.summaryNotes)}</div>`
        : ''
    }

    ${
      record.documentAttachment
        ? `<div class="notes-box"><strong>เอกสารแนบประกอบการตรวจ:</strong> ${escapeHtml(record.documentAttachment.name)} (${escapeHtml(record.documentAttachment.type.toUpperCase())})</div>`
        : ''
    }

    <div class="signatures-wrapper">
      <div class="sign-grid">
        <div class="sign-box">
          <div style="height:28px;"></div>
          <div>ลงชื่อ.....................................................................</div>
          <div style="font-weight:700;">( ${escapeHtml(record.inspectorName)} )</div>
          <div>เจ้าหน้าที่ผู้ตรวจเช็คสภาพรถ</div>
          <div>วันที่............เดือน........................พ.ศ. ......................</div>
        </div>
        <div class="sign-box">
          <div style="height:28px;"></div>
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

  // Wait for fonts and images in a document before triggering browser Save-as-PDF / Print dialog
  const waitAndTriggerPrint = async (
    targetWindow: Window,
    targetDoc: Document,
    onDone?: () => void
  ) => {
    const previousTitle = document.title;
    try {
      document.title = safePdfFilename;
      if ((targetDoc as any).fonts?.ready) {
        await Promise.race([
          (targetDoc as any).fonts.ready,
          new Promise((res) => setTimeout(res, 1500)),
        ]);
      }

      const imgs = Array.from(targetDoc.querySelectorAll('img'));
      if (imgs.length > 0) {
        await Promise.race([
          Promise.all(
            imgs.map(
              (img) =>
                new Promise<void>((resolve) => {
                  if (img.complete) return resolve();
                  img.addEventListener('load', () => resolve(), { once: true });
                  img.addEventListener('error', () => resolve(), { once: true });
                })
            )
          ),
          new Promise((res) => setTimeout(res, 2500)),
        ]);
      }

      targetWindow.focus();
      targetWindow.print();
      setPrintStatus('เปิดหน้าต่างบันทึกเป็น .PDF / สั่งพิมพ์แล้ว');
    } catch (err) {
      console.warn('Print trigger fallback:', err);
      window.print();
    } finally {
      document.title = previousTitle;
      if (onDone) onDone();
    }
  };

  // Primary: Hidden iframe print-to-PDF (works reliably inside iframes & sets clean PDF filename)
  const handlePrintToPdf = () => {
    try {
      setPrintStatus('กำลังจัดรูปแบบเอกสาร A4 และโหลดฟอนต์ราชการ...');
      const htmlContent = generateReportHtml(false);

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

        setTimeout(() => {
          waitAndTriggerPrint(printFrame.contentWindow!, frameDoc, () => {
            setTimeout(() => {
              if (document.body.contains(printFrame)) {
                document.body.removeChild(printFrame);
              }
              setPrintStatus(null);
            }, 2500);
          });
        }, 350);
      } else {
        setPrintStatus(null);
      }
    } catch (e) {
      console.error('PDF Print failure:', e);
      setPrintStatus(null);
      window.print();
    }
  };

  // Secondary: Open formatted A4 official sheet in new tab with dedicated PDF print button
  const handleOpenStandaloneTab = () => {
    try {
      const htmlContent = generateReportHtml(true);
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.open();
        printWindow.document.write(htmlContent);
        printWindow.document.close();
      } else {
        handlePrintToPdf();
      }
    } catch {
      handlePrintToPdf();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-3 sm:p-6 backdrop-blur-sm overflow-y-auto">
      <div className="relative my-auto w-full max-w-4xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900">
        {/* Modal Action Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-6 py-4 bg-slate-50 dark:border-slate-800 dark:bg-slate-850">
          <div className="flex items-center gap-2.5">
            <div className="rounded-lg bg-sky-100 p-2 text-sky-700 dark:bg-sky-950 dark:text-sky-300">
              <FileDown className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                พิมพ์ / บันทึกเป็น .PDF ใบรายงานผลการตรวจสภาพรถกู้ชีพ BLS (รูปแบบราชการ)
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                รถ {record.vehicleCode} ({record.plateNumber}) · เลือกปลายทางเป็น &ldquo;บันทึกเป็น PDF (Save as PDF)&rdquo; ขนาด A4
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {printStatus && (
              <span className="text-xs font-medium text-sky-600 dark:text-sky-400 animate-pulse">
                {printStatus}
              </span>
            )}

            <button
              type="button"
              onClick={handlePrintToPdf}
              className="inline-flex items-center gap-1.5 rounded-xl bg-sky-600 px-3.5 py-2 text-xs font-bold text-white shadow-sm hover:bg-sky-500 active:scale-95 transition-all"
              title="พิมพ์หรือบันทึกเป็นไฟล์ .PDF ขนาด A4 รูปแบบราชการ"
            >
              <Printer className="h-4 w-4" />
              <span>พิมพ์ / บันทึกเป็น .PDF</span>
            </button>

            <button
              type="button"
              onClick={handleOpenStandaloneTab}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              title="เปิดหน้ากระดาษ A4 เต็มหน้าในแท็บใหม่เพื่อดูตัวอย่างก่อนบันทึก PDF"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              <span>เปิดหน้ากระดาษ A4</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-2 text-slate-400 hover:bg-slate-200 hover:text-slate-700 dark:hover:bg-slate-700"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Printable Official A4 Preview Sheet (Sarabun Government Style) */}
        <div
          className="max-h-[80vh] overflow-y-auto p-6 sm:p-10 space-y-5 bg-white text-slate-950"
          style={{ fontFamily: "'Sarabun', 'Prompt', sans-serif" }}
        >
          {/* Formal Government Header (keeps div:nth-of-type(1) and children structure intact) */}
          <div className="border-b-[3px] border-double border-slate-900 pb-4 text-center">
            <h2 className="text-base sm:text-lg font-bold text-slate-950">
              ตรวจความพร้อมการใช้งานรถยนต์ส่วนกลาง (รถกู้ชีพ) ทะเบียน กค 8816 ชุมพร
            </h2>
            <p className="mt-0.5 text-sm sm:text-base font-bold text-slate-950">
              กู้ชีพ อบต.หงษ์เจริญ
            </p>
            <p className="mt-1 text-xs sm:text-sm text-slate-900">
              ประจำวันที่ <span className="font-bold underline px-1">{inspectionDateParts.day}</span>{' '}
              เดือน <span className="font-bold underline px-1">{inspectionDateParts.month}</span>{' '}
              พ.ศ. <span className="font-bold underline px-1">{inspectionDateParts.year}</span>
            </p>
            <div className="mt-1.5 flex items-center justify-center gap-6 text-xs sm:text-sm font-bold text-slate-900">
              <span className={isTeam1 ? 'font-bold text-slate-950' : 'text-slate-600'}>
                {isTeam1 ? '☑' : '☐'} ชุดปฏิบัติการที่ 1
              </span>
              <span className={isTeam2 ? 'font-bold text-slate-950' : 'text-slate-600'}>
                {isTeam2 ? '☑' : '☐'} ชุดปฏิบัติการที่ 2
              </span>
            </div>
          </div>

          {/* Formal Metadata Table (2 Columns, crisp black border) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 border border-slate-700 text-xs sm:text-[13px] bg-white">
            <div className="space-y-1 p-3 sm:border-r border-b sm:border-b-0 border-slate-700">
              <p>
                <span className="font-bold text-slate-900">รหัสรถปฏิบัติการ:</span>{' '}
                <span className="font-bold">{record.vehicleCode}</span> ·{' '}
                <span className="font-bold text-slate-900">ทะเบียน:</span> {record.plateNumber}
              </p>
              <p>
                <span className="font-bold text-slate-900">เลขไมล์ขณะตรวจ:</span>{' '}
                <span className="tabular-nums">{record.odometerReading?.toLocaleString() || '-'}</span> กิโลเมตร
              </p>
              <p>
                <span className="font-bold text-slate-900">ผลการประเมินภาพรวม:</span>{' '}
                <span
                  className={`font-bold ${
                    record.overallStatus === 'normal'
                      ? 'text-emerald-700'
                      : record.overallStatus === 'issue_found'
                      ? 'text-amber-700'
                      : 'text-red-700'
                  }`}
                >
                  {record.overallStatus === 'normal'
                    ? 'พร้อมปฏิบัติการ (ปกติ)'
                    : record.overallStatus === 'issue_found'
                    ? 'พบข้อบกพร่อง (เฝ้าระวัง)'
                    : 'งดใช้งาน (ส่งซ่อมบำรุง)'}
                </span>
              </p>
            </div>

            <div className="space-y-1 p-3">
              <p>
                <span className="font-bold text-slate-900">ผู้ตรวจเช็ค:</span> {record.inspectorName}
                {resolvedTeam ? ` (${resolvedTeam})` : ''}
              </p>
              <p>
                <span className="font-bold text-slate-900">รอบเวรปฏิบัติการ:</span> {record.shiftLabel}
              </p>
              <p>
                <span className="font-bold text-slate-900">วัน-เวลาตรวจ:</span>{' '}
                <span className="tabular-nums">{record.uploadTimestamp}</span>
              </p>
            </div>
          </div>

          {/* 4-Side Photos Grid (2 rows x 2 columns) */}
          <div>
            <h4 className="border-l-4 border-slate-900 pl-2 text-xs sm:text-sm font-bold text-slate-950 mb-2">
              ส่วนที่ 1 ภาพถ่ายสภาพตัวรถกู้ชีพ 4 ด้าน (บันทึกวัน-เวลาตรวจจริง)
            </h4>
            <div className="grid grid-cols-2 gap-3">
              {[
                {
                  label: 'ด้านหน้า (Front)',
                  primary: record.photos.front,
                  driveUrl: record.driveLinks?.frontPhotoUrl,
                },
                {
                  label: 'ด้านหลัง (Rear)',
                  primary: record.photos.rear,
                  driveUrl: record.driveLinks?.rearPhotoUrl,
                },
                {
                  label: 'ด้านซ้าย (Left Side)',
                  primary: record.photos.left,
                  driveUrl: record.driveLinks?.leftPhotoUrl,
                },
                {
                  label: 'ด้านขวา (Right Side)',
                  primary: record.photos.right,
                  driveUrl: record.driveLinks?.rightPhotoUrl,
                },
              ].map((p, idx) => (
                <div key={idx} className="border border-slate-700 p-2 text-center bg-white">
                  <ReportPhotoImg
                    primary={p.primary}
                    driveUrl={p.driveUrl}
                    alt={p.label}
                    className="h-52 sm:h-60 w-full object-cover"
                  />
                  <span className="mt-1.5 block text-xs font-bold text-slate-900">{p.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* 7-Category Checklist Table (Formal Official Styling) */}
          <div>
            <h4 className="border-l-4 border-slate-900 pl-2 text-xs sm:text-sm font-bold text-slate-950 mb-2">
              ส่วนที่ 2 รายการตรวจเช็คสภาพความพร้อมรถยนต์ (7 หมวด 22 รายการ)
            </h4>
            <table className="w-full border-collapse border border-slate-700 text-xs">
              <thead>
                <tr className="bg-slate-200 text-slate-950">
                  <th className="border border-slate-700 p-2 text-center w-12 font-bold">ลำดับ</th>
                  <th className="border border-slate-700 p-2 text-left font-bold">
                    รายการตรวจเช็ค / เกณฑ์มาตรฐาน
                  </th>
                  <th className="border border-slate-700 p-2 text-center w-28 font-bold">ผลการตรวจ</th>
                  <th className="border border-slate-700 p-2 text-left w-48 font-bold">
                    ปัญหาที่พบ / หมายเหตุ
                  </th>
                </tr>
              </thead>
              <tbody>
                {categories.map((cat, cIdx) => (
                  <React.Fragment key={cat.id}>
                    <tr className="bg-slate-100 font-bold">
                      <td colSpan={4} className="border border-slate-700 px-3 py-1.5 text-slate-950">
                        {cat.title}
                      </td>
                    </tr>
                    {cat.items.map((item, iIdx) => (
                      <tr key={item.id}>
                        <td className="border border-slate-600 p-2 text-center tabular-nums text-[11px]">
                          {cIdx + 1}.{iIdx + 1}
                        </td>
                        <td className="border border-slate-600 p-2">
                          <span className="font-semibold text-slate-950">{item.subTitle}</span>{' '}
                          <span className="text-[11px] text-slate-600">
                            (เกณฑ์: {item.standard})
                          </span>
                        </td>
                        <td className="border border-slate-600 p-2 text-center">
                          {item.status === 'pass' && (
                            <span className="font-bold text-emerald-700">✓ พร้อมใช้งาน</span>
                          )}
                          {item.status === 'warning' && (
                            <span className="font-bold text-amber-700">⚠ เฝ้าระวัง</span>
                          )}
                          {item.status === 'fail' && (
                            <span className="font-bold text-red-700">✗ ชำรุด</span>
                          )}
                        </td>
                        <td className="border border-slate-600 p-2 text-[11px] text-slate-800">
                          {item.issueNotes || '-'}
                        </td>
                      </tr>
                    ))}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>

          {record.summaryNotes && (
            <div className="border border-slate-700 bg-slate-50 px-3 py-2 text-xs text-slate-900">
              <span className="font-bold">หมายเหตุเพิ่มเติมจากผู้ตรวจ:</span> {record.summaryNotes}
            </div>
          )}

          {record.documentAttachment && (
            <div className="border border-slate-700 bg-slate-50 px-3 py-2 text-xs text-slate-900">
              <span className="font-bold">เอกสารแนบประกอบการตรวจ:</span>{' '}
              {record.documentAttachment.name} ({record.documentAttachment.type.toUpperCase()})
            </div>
          )}

          {/* Formal Thai Government Signatures (Clean, no dashed borders) */}
          <div className="grid grid-cols-2 gap-8 pt-6 text-slate-950">
            <div className="p-3 text-center text-xs sm:text-[13px] leading-relaxed">
              <div className="h-10" />
              <p>ลงชื่อ.....................................................................</p>
              <p className="mt-1 font-bold">( {record.inspectorName} )</p>
              <p>เจ้าหน้าที่ผู้ตรวจเช็คสภาพรถ</p>
              <p>วันที่............เดือน........................พ.ศ. ......................</p>
            </div>

            <div className="p-3 text-center text-xs sm:text-[13px] leading-relaxed">
              <div className="h-10" />
              <p>ผู้ตรวจสอบ.....................................................................</p>
              <p className="mt-1 font-bold">( นายวสันต์ วรรณเผือก )</p>
              <p>ตำแหน่ง เจ้าพนักงานป้องกันและบรรเทาสาธารณภัยปฏิบัติงาน</p>
              <p>วันที่............เดือน........................พ.ศ. ......................</p>
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
              <div className="w-full sm:w-1/2 p-3 text-center text-xs sm:text-[13px] leading-relaxed">
                <div className="h-8" />
                <p>ลงชื่อ.....................................................................</p>
                <p className="mt-1 font-bold whitespace-pre">(        นายนิยม   สังข์เอียด        )</p>
                <p>นายกองค์การบริหารส่วนตำบลหงษ์เจริญ</p>
                <p>วันที่............เดือน........................พ.ศ. .......................</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
