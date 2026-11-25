import {
  AmbulanceVehicle,
  InspectionRecord,
  SystemAuditLogEntry,
  UserProfile,
  VehicleDamageItem,
  DamageSeverity,
  FuelLogRecord,
  EquipmentInspectionRecord,
  EquipmentCheckItem,
  EquipmentConditionStatus,
  EquipmentRequisitionRecord,
} from '../types';
import { createFreshChecklist } from '../data/defaultChecklist';
import {
  ORGANIZATION_NAME,
  EQUIPMENT_TEMPLATE_ITEMS,
  createFreshEquipmentChecklist,
  getDefaultThaiDateParts,
} from '../data/equipmentChecklist';
import { generateSvgDamagePlaceholder, toDisplayableDriveImageUrl } from './storage';
import {
  callAppsScriptBridge,
  getActiveAppsScriptUrl,
  readSheetValuesWithoutLogin,
} from './googleBridge';

export interface SheetCreationResult {
  spreadsheetId: string;
  spreadsheetUrl: string;
}

export const INSPECTION_SHEET_TITLE = 'บันทึกการตรวจรถกู้ชีพ_BLS';
export const FOUR_SIDE_PHOTOS_SHEET_TITLE = 'ถ่ายสภาพรถ4ด้าน_BLS';
export const VEHICLES_SHEET_TITLE = 'รายการรถกู้ชีพ_BLS';
export const STAFF_SHEET_TITLE = 'รายชื่อเจ้าหน้าที่_BLS';
export const AUDIT_LOG_SHEET_TITLE = 'บันทึกกิจกรรมระบบ_AuditLog';
export const DAMAGE_SHEET_TITLE = 'รอยรอบตัวรถ_BLS';
export const FUEL_SHEET_TITLE = 'ประวัติการเติมน้ำมัน_BLS';
export const EQUIPMENT_SHEET_TITLE = 'ตรวจความพร้อมอุปกรณ์_BLS';
export const REQUISITION_SHEET_TITLE = 'เบิกอุปกรณ์_BLS';

export const INSPECTION_HEADERS = [
  'วัน-เวลาที่ตรวจ',
  'รอบเวร',
  'รหัสรถ',
  'เลขทะเบียน',
  'ผู้ตรวจเช็ค',
  'สถานะรวม',
  'เลขไมล์ (กม.)',
  'ไฟตัวรถ (8 รายการ)',
  'ไฟฉุกเฉิน (7 รายการ)',
  'กระจกมองหลัง/ข้าง',
  'ระบบของเหลว (3 รายการ)',
  'สภาพแบตเตอรี่',
  'สัญญาณเสียง',
  'สภาพยางรถ',
  'ปัญหาที่พบ / หมายเหตุ',
  'เอกสารแนบ',
  'รูป 4 ด้าน',
  'รหัสบันทึก (ID)',
  'รูปด้านหน้า (Front)',
  'รูปด้านหลัง (Rear)',
  'รูปด้านซ้าย (Left)',
  'รูปด้านขวา (Right)',
];

export const FOUR_SIDE_PHOTO_HEADERS = [
  'วันที่ตรวจ',
  'วัน-เวลาที่ตรวจ',
  'รอบเวร',
  'รหัสรถ',
  'เลขทะเบียน',
  'ผู้ตรวจเช็ค',
  'ลิงก์รูปด้านหน้า (Front)',
  'ลิงก์รูปด้านหลัง (Rear)',
  'ลิงก์รูปด้านซ้าย (Left)',
  'ลิงก์รูปด้านขวา (Right)',
  'ภาพด้านหน้า',
  'ภาพด้านหลัง',
  'ภาพด้านซ้าย',
  'ภาพด้านขวา',
  'โฟลเดอร์ Google Drive',
  'รหัสบันทึก (ID)',
];

export const VEHICLE_HEADERS = [
  'รหัสรถ',
  'เลขทะเบียน',
  'ยี่ห้อ/รุ่น',
  'ปี',
  'สถานะความพร้อม',
  'เลขไมล์ล่าสุด (กม.)',
  'วันที่ตรวจล่าสุด',
  'ผู้ตรวจล่าสุด',
  'หมายเหตุ',
  'รหัสอ้างอิง (ID)',
  'อัปเดตล่าสุด',
  'ลิงก์รูปรถ (Google Drive)',
  'โฟลเดอร์ Drive',
];

export const STAFF_HEADERS = [
  'รหัสพนักงาน',
  'ชื่อ-นามสกุล',
  'ระดับสิทธิ์',
  'ตำแหน่ง',
  'ฝ่าย/สังกัด',
  'เบอร์โทรศัพท์',
  'สถานะเข้าเวร',
  'อีเมล',
  'รหัสอ้างอิง (ID)',
  'อัปเดตล่าสุด',
  'รหัสผ่าน (PIN)',
];

export const AUDIT_LOG_HEADERS = [
  'วัน-เวลาที่เกิดกิจกรรม',
  'ประเภทกิจกรรม',
  'หมวดหมู่ข้อมูล',
  'รายการที่เปลี่ยนแปลง',
  'ผู้ดำเนินการ (ชื่อ/บทบาท)',
  'รายละเอียด',
  'รหัสกิจกรรม (Log ID)',
];

export const DAMAGE_HEADERS = [
  'วัน-เวลาที่ตรวจพบ',
  'รหัสรถ',
  'เลขทะเบียน',
  'ตำแหน่งที่เกิดรอย',
  'ระดับความเสียหาย',
  'รายละเอียดลักษณะรอย',
  'เลขไมล์ขณะพบรอย (กม.)',
  'ผู้ตรวจพบ',
  'สิทธิ์ผู้ตรวจ',
  'ลิงก์รูปถ่าย Google Drive',
  'รูปมุมอื่นๆ (Google Drive)',
  'โฟลเดอร์ Drive',
  'สถานะซ่อมสี/แก้ไข',
  'รหัสรายการ (ID)',
];

export const FUEL_HEADERS = [
  'วันที่-เวลาเติม',
  'รหัสรถ',
  'เลขทะเบียน',
  'เลขไมล์ขณะเติม (กม.)',
  'เลขไมล์ครั้งก่อน (กม.)',
  'ระยะทางที่วิ่งได้ (กม.)',
  'จำนวนลิตร',
  'ยอดเงินรวม (บาท)',
  'ราคาต่อลิตร (บาท/ลิตร)',
  'อัตราสิ้นเปลือง (กม./ลิตร)',
  'ค่าใช้จ่ายต่อกิโลเมตร (บาท/กม.)',
  'ชนิดน้ำมัน',
  'ปั๊มน้ำมัน / สถานี',
  'ผู้เติม / พนักงานขับรถ',
  'ลิงก์สลิป/ใบเสร็จ Google Drive',
  'โฟลเดอร์ Drive',
  'หมายเหตุ',
  'รหัสบันทึก (ID)',
];

export const EQUIPMENT_HEADERS = [
  'วันที่ตรวจ (พ.ศ.)',
  'หน่วยงาน',
  'ชุดปฏิบัติการ',
  'รหัสรถ/ทะเบียน',
  'ผู้ตรวจเช็ค',
  'สถานะความพร้อมรวม',
  'รายการบังคับผ่าน (จาก 31)',
  'รายการไม่ครบ/ชำรุด',
  'รายละเอียดที่ขาด/ชำรุด/หมายเหตุ',
  'บันทึกเวลาในระบบ',
  'รหัสอ้างอิง (ID)',
  'ข้อมูลรายการอุปกรณ์ (JSON)',
];

export const REQUISITION_HEADERS = [
  'เลขที่ใบเบิก',
  'วันที่ขอเบิก (พ.ศ.)',
  'หน่วยงาน',
  'ชุดปฏิบัติการ',
  'รหัสรถ/ทะเบียน',
  'ผู้ขอเบิก',
  'จำนวนรายการ',
  'จำนวนชิ้นรวม',
  'รายการที่ขอเบิกทั้งหมด',
  'สถานะใบเบิก',
  'ผู้อนุมัติ/จ่ายของ',
  'หมายเหตุ',
  'เวลาบันทึกในระบบ',
  'รหัสอ้างอิง (ID)',
];

/**
 * Ensure all 8 required sheets exist in the spreadsheet and have proper headers.
 */
export async function ensureAllSpreadsheetTabs(
  spreadsheetId: string,
  accessToken: string
): Promise<void> {
  const neededSheets = [
    { title: INSPECTION_SHEET_TITLE, headers: INSPECTION_HEADERS },
    { title: FOUR_SIDE_PHOTOS_SHEET_TITLE, headers: FOUR_SIDE_PHOTO_HEADERS },
    { title: VEHICLES_SHEET_TITLE, headers: VEHICLE_HEADERS },
    { title: STAFF_SHEET_TITLE, headers: STAFF_HEADERS },
    { title: AUDIT_LOG_SHEET_TITLE, headers: AUDIT_LOG_HEADERS },
    { title: DAMAGE_SHEET_TITLE, headers: DAMAGE_HEADERS },
    { title: FUEL_SHEET_TITLE, headers: FUEL_HEADERS },
    { title: EQUIPMENT_SHEET_TITLE, headers: EQUIPMENT_HEADERS },
    { title: REQUISITION_SHEET_TITLE, headers: REQUISITION_HEADERS },
  ];

  if (!accessToken) {
    if (getActiveAppsScriptUrl()) {
      await callAppsScriptBridge('ensureTabs', { spreadsheetId, tabs: neededSheets });
    }
    return;
  }

  const getUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets.properties`;
  const res = await fetch(getUrl, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) return;

  const data = await res.json();
  const existingTitles = new Set(
    (data.sheets || []).map((s: any) => s.properties?.title)
  );
  const requestsToAdd: any[] = [];
  for (const item of neededSheets) {
    if (!existingTitles.has(item.title)) {
      requestsToAdd.push({
        addSheet: {
          properties: {
            title: item.title,
            gridProperties: { frozenRowCount: 1 },
          },
        },
      });
    }
  }

  if (requestsToAdd.length > 0) {
    await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ requests: requestsToAdd }),
    });
  }

  // Populate headers for any newly added sheets
  for (const item of neededSheets) {
    if (!existingTitles.has(item.title)) {
      const putUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(
        item.title
      )}!A1:Z1?valueInputOption=USER_ENTERED`;
      await fetch(putUrl, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ values: [item.headers] }),
      });
    }
  }
}

/**
 * Create a new spreadsheet with all 8 BLS management sheets pre-configured.
 */
export async function createInspectionSpreadsheet(
  accessToken: string,
  title = 'ระบบตรวจสภาพรถกู้ชีพ BLS - บันทึกส่วนกลาง'
): Promise<SheetCreationResult> {
  const neededSheets = [
    { title: INSPECTION_SHEET_TITLE, headers: INSPECTION_HEADERS },
    { title: FOUR_SIDE_PHOTOS_SHEET_TITLE, headers: FOUR_SIDE_PHOTO_HEADERS },
    { title: VEHICLES_SHEET_TITLE, headers: VEHICLE_HEADERS },
    { title: STAFF_SHEET_TITLE, headers: STAFF_HEADERS },
    { title: AUDIT_LOG_SHEET_TITLE, headers: AUDIT_LOG_HEADERS },
    { title: DAMAGE_SHEET_TITLE, headers: DAMAGE_HEADERS },
    { title: FUEL_SHEET_TITLE, headers: FUEL_HEADERS },
    { title: EQUIPMENT_SHEET_TITLE, headers: EQUIPMENT_HEADERS },
    { title: REQUISITION_SHEET_TITLE, headers: REQUISITION_HEADERS },
  ];

  const response = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      properties: { title },
      sheets: neededSheets.map((item) => ({
        properties: {
          title: item.title,
          gridProperties: { frozenRowCount: 1 },
        },
      })),
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error?.message || 'ไม่สามารถสร้าง Google Spreadsheet ได้');
  }

  const data = await response.json();
  const spreadsheetId = data.spreadsheetId;
  const spreadsheetUrl =
    data.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;

  // Write header rows to all 6 tabs in parallel
  for (const item of neededSheets) {
    await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(
        item.title
      )}!A1:Z1?valueInputOption=USER_ENTERED`,
      {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ values: [item.headers] }),
      }
    );
  }

  return { spreadsheetId, spreadsheetUrl };
}

/**
 * Format an inspection record into a single row for Tab 1
 */
export function formatRecordForSheet(record: InspectionRecord): (string | number)[] {
  const getCatSummary = (catId: number) => {
    const items = record.vehicleChecklist.filter((c) => c.categoryId === catId);
    if (!items.length) return '-';
    const fails = items.filter((i) => i.status === 'fail');
    const warns = items.filter((i) => i.status === 'warning');
    if (fails.length > 0) {
      return `❌ ไม่ผ่าน (${fails.map((f) => f.subTitle).join(', ')})`;
    }
    if (warns.length > 0) {
      return `⚠️ เฝ้าระวัง (${warns.map((w) => w.subTitle).join(', ')})`;
    }
    return `✅ ปกติ (${items.length}/${items.length})`;
  };

  const lights = getCatSummary(1);
  const emergency = getCatSummary(2);
  const mirrors = getCatSummary(3);
  const fluids = getCatSummary(4);
  const battery = getCatSummary(5);
  const sound = getCatSummary(6);
  const tires = getCatSummary(7);

  const statusLabel =
    record.overallStatus === 'normal'
      ? 'ปกติ (พร้อมปฏิบัติการ)'
      : record.overallStatus === 'issue_found'
      ? 'พบข้อบกพร่อง (เฝ้าระวัง)'
      : 'งดใช้งาน (ส่งซ่อมบำรุง)';

  const issuesList = record.vehicleChecklist
    .filter((i) => i.status !== 'pass' || (i.issueNotes && i.issueNotes.trim() !== ''))
    .map((i) => `[${i.subTitle}: ${i.status.toUpperCase()}] ${i.issueNotes || 'ไม่ได้ระบุหมายเหตุ'}`)
    .join(' | ');

  const fullNotes = [issuesList, record.summaryNotes].filter(Boolean).join(' --- ');

  let docInfo = record.documentAttachment
    ? `แนบเอกสาร: ${record.documentAttachment.name} (${record.documentAttachment.type.toUpperCase()})`
    : 'ไม่มีเอกสารแนบ';
  if (record.driveLinks?.documentUrl) {
    docInfo += ` | ลิงก์ Drive: ${record.driveLinks.documentUrl}`;
  }

  const frontResolved = record.photos.front || record.driveLinks?.frontPhotoUrl;
  const rearResolved = record.photos.rear || record.driveLinks?.rearPhotoUrl;
  const leftResolved = record.photos.left || record.driveLinks?.leftPhotoUrl;
  const rightResolved = record.photos.right || record.driveLinks?.rightPhotoUrl;

  const photosCount = [frontResolved, rearResolved, leftResolved, rightResolved].filter(Boolean).length;

  let photosSummary = photosCount ? `ถ่ายครบ 4 ด้าน (${photosCount}/4)` : 'ไม่ครบ';
  if (record.driveLinks?.folderUrl) {
    photosSummary += ` | ลิงก์ Drive: ${record.driveLinks.folderUrl}`;
  }
  const frontLink =
    record.driveLinks?.frontPhotoUrl ||
    (record.photos.front && record.photos.front.startsWith('http') ? record.photos.front : '');
  const rearLink =
    record.driveLinks?.rearPhotoUrl ||
    (record.photos.rear && record.photos.rear.startsWith('http') ? record.photos.rear : '');
  const leftLink =
    record.driveLinks?.leftPhotoUrl ||
    (record.photos.left && record.photos.left.startsWith('http') ? record.photos.left : '');
  const rightLink =
    record.driveLinks?.rightPhotoUrl ||
    (record.photos.right && record.photos.right.startsWith('http') ? record.photos.right : '');

  if (frontLink) photosSummary += ` | หน้า: ${frontLink}`;
  if (rearLink) photosSummary += ` | หลัง: ${rearLink}`;
  if (leftLink) photosSummary += ` | ซ้าย: ${leftLink}`;
  if (rightLink) photosSummary += ` | ขวา: ${rightLink}`;

  return [
    record.uploadTimestamp,
    record.shiftLabel,
    record.vehicleCode,
    record.plateNumber,
    record.inspectorName,
    statusLabel,
    record.odometerReading || 0,
    lights,
    emergency,
    mirrors,
    fluids,
    battery,
    sound,
    tires,
    fullNotes || 'ไม่มีปัญหาที่พบ',
    docInfo,
    photosSummary,
    record.id,
    frontLink || '-',
    rearLink || '-',
    leftLink || '-',
    rightLink || '-',
  ];
}

function resolveSideHttpUrl(rawPhoto?: string, driveUrl?: string): string {
  if (driveUrl && driveUrl.startsWith('http')) return driveUrl;
  if (rawPhoto && rawPhoto.startsWith('http')) return rawPhoto;
  return '';
}

function buildSheetImageFormula(url?: string): string {
  if (!url || !url.startsWith('http')) return '-';
  const displayUrl = (toDisplayableDriveImageUrl(undefined, url) || url).replace(/"/g, '');
  return `=IMAGE("${displayUrl}")`;
}

export function extractInspectionDateOnly(uploadTimestamp: string, createdAt?: number): string {
  const raw = (uploadTimestamp || '').trim();
  if (raw) {
    const match = raw.match(/(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})/);
    if (match) return match[1];
    const firstToken = raw.split(/[\s,]+/)[0];
    if (firstToken) return firstToken;
  }
  if (createdAt) {
    return new Date(createdAt).toLocaleDateString('th-TH', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  }
  return '-';
}

/**
 * Format an inspection record for the dedicated daily 4-side photo sheet (ถ่ายสภาพรถ4ด้าน_BLS)
 */
export function formatFourSidePhotosForSheet(record: InspectionRecord): (string | number)[] {
  const frontUrl = resolveSideHttpUrl(record.photos?.front, record.driveLinks?.frontPhotoUrl);
  const rearUrl = resolveSideHttpUrl(record.photos?.rear, record.driveLinks?.rearPhotoUrl);
  const leftUrl = resolveSideHttpUrl(record.photos?.left, record.driveLinks?.leftPhotoUrl);
  const rightUrl = resolveSideHttpUrl(record.photos?.right, record.driveLinks?.rightPhotoUrl);

  const dateOnly = extractInspectionDateOnly(record.uploadTimestamp, record.createdAt);
  const hasInlineOnly = (raw?: string, httpUrl?: string) =>
    !httpUrl && Boolean(raw && raw.startsWith('data:image/') && !raw.startsWith('data:image/svg+xml'));

  return [
    dateOnly,
    record.uploadTimestamp,
    record.shiftLabel,
    record.vehicleCode,
    record.plateNumber,
    record.inspectorName,
    frontUrl || (hasInlineOnly(record.photos?.front, frontUrl) ? 'บันทึกภาพในเครื่องแล้ว (รอซิงค์ Drive)' : '-'),
    rearUrl || (hasInlineOnly(record.photos?.rear, rearUrl) ? 'บันทึกภาพในเครื่องแล้ว (รอซิงค์ Drive)' : '-'),
    leftUrl || (hasInlineOnly(record.photos?.left, leftUrl) ? 'บันทึกภาพในเครื่องแล้ว (รอซิงค์ Drive)' : '-'),
    rightUrl || (hasInlineOnly(record.photos?.right, rightUrl) ? 'บันทึกภาพในเครื่องแล้ว (รอซิงค์ Drive)' : '-'),
    buildSheetImageFormula(frontUrl),
    buildSheetImageFormula(rearUrl),
    buildSheetImageFormula(leftUrl),
    buildSheetImageFormula(rightUrl),
    record.driveLinks?.folderUrl || '-',
    record.id,
  ];
}

/**
 * Append inspection record to Tab 1 and dedicated 4-side photo Tab (ถ่ายสภาพรถ4ด้าน_BLS)
 */
export async function appendInspectionToSheet(
  spreadsheetId: string,
  record: InspectionRecord,
  accessToken: string
): Promise<{ success: boolean; updatedRange?: string }> {
  const rowValues = formatRecordForSheet(record);
  const photoRowValues = formatFourSidePhotosForSheet(record);

  if (!accessToken && getActiveAppsScriptUrl()) {
    await callAppsScriptBridge('appendRow', {
      spreadsheetId,
      sheetTitle: INSPECTION_SHEET_TITLE,
      headers: INSPECTION_HEADERS,
      row: rowValues,
    });
    await callAppsScriptBridge('appendRow', {
      spreadsheetId,
      sheetTitle: FOUR_SIDE_PHOTOS_SHEET_TITLE,
      headers: FOUR_SIDE_PHOTO_HEADERS,
      row: photoRowValues,
    });
    return { success: true };
  }

  await ensureAllSpreadsheetTabs(spreadsheetId, accessToken);

  const appendUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(
    INSPECTION_SHEET_TITLE
  )}!A:V:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`;

  const response = await fetch(appendUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ values: [rowValues] }),
  });

  if (!response.ok) {
    const errorJson = await response.json().catch(() => ({}));
    throw new Error(errorJson.error?.message || `เกิดข้อผิดพลาดในการบันทึกตรวจสภาพลงชีต (${response.status})`);
  }

  const photoAppendUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(
    FOUR_SIDE_PHOTOS_SHEET_TITLE
  )}!A:P:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`;

  await fetch(photoAppendUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ values: [photoRowValues] }),
  }).catch((e) => console.warn('4-side photo tab append warning:', e));

  const result = await response.json();
  return {
    success: true,
    updatedRange: result.updates?.updatedRange,
  };
}

/**
 * Mirror / Sync entire Inspections list to Tab 1 (บันทึกการตรวจรถกู้ชีพ_BLS) & Tab 9 (ถ่ายสภาพรถ4ด้าน_BLS)
 * Clears stale/deleted rows and writes exact 1:1 records matching Google Drive & App
 */
export async function syncInspectionsToSheet(
  spreadsheetId: string,
  records: InspectionRecord[],
  accessToken: string
): Promise<void> {
  const appsScriptUrl = getActiveAppsScriptUrl();
  if (!accessToken && appsScriptUrl) {
    await callAppsScriptBridge('syncTab', {
      spreadsheetId,
      sheetTitle: INSPECTION_SHEET_TITLE,
      headers: INSPECTION_HEADERS,
      rows: records.map(formatRecordForSheet),
    });
    await callAppsScriptBridge('syncTab', {
      spreadsheetId,
      sheetTitle: FOUR_SIDE_PHOTOS_SHEET_TITLE,
      headers: FOUR_SIDE_PHOTO_HEADERS,
      rows: records.map(formatFourSidePhotosForSheet),
    });
    return;
  }

  try {
    await ensureAllSpreadsheetTabs(spreadsheetId, accessToken);

    // Ensure Tab 1 header row has all 22 columns (A1:V1)
    await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(
        INSPECTION_SHEET_TITLE
      )}!A1:V1?valueInputOption=USER_ENTERED`,
      {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ values: [INSPECTION_HEADERS] }),
      }
    );

    const clearUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(
      INSPECTION_SHEET_TITLE
    )}!A2:V2000:clear`;

    const clearRes = await fetch(clearUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!clearRes.ok) {
      const errorJson = await clearRes.json().catch(() => ({}));
      throw new Error(errorJson.error?.message || `เกิดข้อผิดพลาดในการล้างข้อมูลเดิมในชีตตรวจสภาพรถ (${clearRes.status})`);
    }

    // Ensure dedicated 4-side photo tab headers (A1:P1) and clear rows
    await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(
        FOUR_SIDE_PHOTOS_SHEET_TITLE
      )}!A1:P1?valueInputOption=USER_ENTERED`,
      {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ values: [FOUR_SIDE_PHOTO_HEADERS] }),
      }
    );

    await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(
        FOUR_SIDE_PHOTOS_SHEET_TITLE
      )}!A2:P2000:clear`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (records.length === 0) return;

    const rows = records.map(formatRecordForSheet);
    const putUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(
      INSPECTION_SHEET_TITLE
    )}!A2:V${rows.length + 1}?valueInputOption=USER_ENTERED`;

    const response = await fetch(putUrl, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ values: rows }),
    });

    if (!response.ok) {
      const errorJson = await response.json().catch(() => ({}));
      throw new Error(errorJson.error?.message || `เกิดข้อผิดพลาดในการซิงค์ตารางตรวจสภาพรถลง Google Sheets (${response.status})`);
    }

    const photoRows = records.map(formatFourSidePhotosForSheet);
    const photoPutUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(
      FOUR_SIDE_PHOTOS_SHEET_TITLE
    )}!A2:P${photoRows.length + 1}?valueInputOption=USER_ENTERED`;

    const photoRes = await fetch(photoPutUrl, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ values: photoRows }),
    });

    if (!photoRes.ok) {
      const errorJson = await photoRes.json().catch(() => ({}));
      throw new Error(errorJson.error?.message || `เกิดข้อผิดพลาดในการซิงค์ชีตถ่ายสภาพรถ 4 ด้าน (${photoRes.status})`);
    }
  } catch (directErr) {
    if (appsScriptUrl) {
      await callAppsScriptBridge('syncTab', {
        spreadsheetId,
        sheetTitle: INSPECTION_SHEET_TITLE,
        headers: INSPECTION_HEADERS,
        rows: records.map(formatRecordForSheet),
      });
      await callAppsScriptBridge('syncTab', {
        spreadsheetId,
        sheetTitle: FOUR_SIDE_PHOTOS_SHEET_TITLE,
        headers: FOUR_SIDE_PHOTO_HEADERS,
        rows: records.map(formatFourSidePhotosForSheet),
      });
      return;
    }
    throw directErr;
  }
}

/**
 * Sync entire Fleet list to Tab 2 (รายการรถกู้ชีพ_BLS)
 */
export async function syncVehiclesToSheet(
  spreadsheetId: string,
  vehicles: AmbulanceVehicle[],
  accessToken: string
): Promise<void> {
  const nowStr = new Date().toLocaleString('th-TH');
  const buildBridgeRows = () =>
    vehicles.map((v) => {
      const photoLink =
        v.drivePhotoUrl ||
        (v.imageUrl && !v.imageUrl.startsWith('data:') ? v.imageUrl : '') ||
        '';
      return [
        v.code,
        v.plateNumber,
        v.brandModel || 'Toyota Commuter BLS',
        v.year || '2024',
        v.status === 'available'
          ? 'พร้อมปฏิบัติการ'
          : v.status === 'issue_found'
          ? 'พบข้อบกพร่อง'
          : 'งดใช้-ส่งซ่อมบำรุง',
        v.currentOdometer || 0,
        v.lastInspectionDate || '-',
        v.lastInspector || '-',
        v.notes || '',
        v.id,
        nowStr,
        photoLink,
        v.driveFolderUrl || '',
      ];
    });

  const appsScriptUrl = getActiveAppsScriptUrl();
  if (!accessToken && appsScriptUrl) {
    await callAppsScriptBridge('syncTab', {
      spreadsheetId,
      sheetTitle: VEHICLES_SHEET_TITLE,
      headers: VEHICLE_HEADERS,
      rows: buildBridgeRows(),
    });
    return;
  }

  try {
    await ensureAllSpreadsheetTabs(spreadsheetId, accessToken);

    // Ensure header row includes Drive photo columns (A1:M1)
    const headerRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(
        VEHICLES_SHEET_TITLE
      )}!A1:M1?valueInputOption=USER_ENTERED`,
      {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ values: [VEHICLE_HEADERS] }),
      }
    );

    if (!headerRes.ok) {
      const errJson = await headerRes.json().catch(() => ({}));
      throw new Error(
        errJson.error?.message || `เกิดข้อผิดพลาดในการอัปเดตหัวตารางรถใน Google Sheets (${headerRes.status})`
      );
    }

    const rows = buildBridgeRows();

    // Pad empty rows to overwrite if fleet count decreased
    const paddedRows = [...rows];
    while (paddedRows.length < 50) {
      paddedRows.push(new Array(13).fill(''));
    }

    const putUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(
      VEHICLES_SHEET_TITLE
    )}!A2:M52?valueInputOption=USER_ENTERED`;

    const response = await fetch(putUrl, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ values: paddedRows }),
    });

    if (!response.ok) {
      const errJson = await response.json().catch(() => ({}));
      throw new Error(
        errJson.error?.message || `เกิดข้อผิดพลาดในการบันทึกรายการรถลง Google Sheets (${response.status})`
      );
    }
  } catch (directErr) {
    if (appsScriptUrl) {
      await callAppsScriptBridge('syncTab', {
        spreadsheetId,
        sheetTitle: VEHICLES_SHEET_TITLE,
        headers: VEHICLE_HEADERS,
        rows: buildBridgeRows(),
      });
      return;
    }
    throw directErr;
  }
}

/**
 * Sync entire Staff roster to Tab 3 (รายชื่อเจ้าหน้าที่_BLS)
 */
export async function syncStaffToSheet(
  spreadsheetId: string,
  staffList: UserProfile[],
  accessToken: string
): Promise<void> {
  const formatStaffRoleLabel = (role: UserProfile['role']) =>
    role === 'admin'
      ? 'ผู้ดูแลระบบ (Admin)'
      : role === 'executive'
      ? 'ผู้บริหาร (Executive)'
      : 'พนักงานทั่วไป (Staff)';

  const nowStr = new Date().toLocaleString('th-TH');
  if (!accessToken && getActiveAppsScriptUrl()) {
    const bridgeRows = staffList.map((s) => [
      s.employeeId,
      s.name,
      formatStaffRoleLabel(s.role),
      s.position || (s.role === 'executive' ? 'ผู้บริหาร' : 'เจ้าหน้าที่กู้ชีพ'),
      s.department || 'ฝ่ายปฏิบัติการกู้ชีพ BLS',
      s.phone || '-',
      s.status === 'on_leave' ? 'พักเวร' : s.status === 'inactive' ? 'ไม่ได้ปฏิบัติงาน' : 'พร้อมปฏิบัติงาน',
      s.email || '-',
      s.id,
      nowStr,
      s.pin_code ? `'${s.pin_code}` : '',
    ]);
    await callAppsScriptBridge('syncTab', {
      spreadsheetId,
      sheetTitle: STAFF_SHEET_TITLE,
      headers: STAFF_HEADERS,
      rows: bridgeRows,
    });
    return;
  }

  await ensureAllSpreadsheetTabs(spreadsheetId, accessToken);

  const rows = staffList.map((s) => [
    s.employeeId,
    s.name,
    formatStaffRoleLabel(s.role),
    s.position || (s.role === 'executive' ? 'ผู้บริหาร' : 'เจ้าหน้าที่กู้ชีพ'),
    s.department || 'ฝ่ายปฏิบัติการกู้ชีพ BLS',
    s.phone || '-',
    s.status === 'on_leave' ? 'พักเวร' : s.status === 'inactive' ? 'ไม่ได้ปฏิบัติงาน' : 'พร้อมปฏิบัติงาน',
    s.email || '-',
    s.id,
    nowStr,
    s.pin_code || '',
  ]);

  // Pad empty rows to overwrite if staff count decreased
  const paddedRows = [STAFF_HEADERS, ...rows];
  while (paddedRows.length < 51) {
    paddedRows.push(new Array(11).fill(''));
  }

  const putUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(
    STAFF_SHEET_TITLE
  )}!A1:K52?valueInputOption=RAW`;

  const response = await fetch(putUrl, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ values: paddedRows }),
  });

  if (!response.ok) {
    const errJson = await response.json().catch(() => ({}));
    throw new Error(errJson.error?.message || `เกิดข้อผิดพลาดในการบันทึกรายชื่อเจ้าหน้าที่ลง Google Sheets (${response.status})`);
  }
}

/**
 * Append audit log entry to Tab 4 (บันทึกกิจกรรมระบบ_AuditLog)
 */
export async function appendAuditLogToSheet(
  spreadsheetId: string,
  entry: SystemAuditLogEntry,
  accessToken: string
): Promise<void> {
  try {
    const row = [
      entry.timestamp,
      entry.action,
      entry.module,
      entry.targetItem,
      entry.operator,
      entry.details,
      entry.id,
    ];

    if (!accessToken && getActiveAppsScriptUrl()) {
      await callAppsScriptBridge('appendRow', {
        spreadsheetId,
        sheetTitle: AUDIT_LOG_SHEET_TITLE,
        headers: AUDIT_LOG_HEADERS,
        row,
      });
      return;
    }

    await ensureAllSpreadsheetTabs(spreadsheetId, accessToken);

    const appendUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(
      AUDIT_LOG_SHEET_TITLE
    )}!A:G:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`;

    await fetch(appendUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ values: [row] }),
    });
  } catch (e) {
    console.warn('Audit log write warning:', e);
  }
}

/**
 * Pull all system data from Google Sheets back into the application (Sync Back / Restore)
 */
export async function pullAllDataFromGoogleSheets(
  spreadsheetId: string,
  accessToken = ''
): Promise<{
  vehicles: AmbulanceVehicle[];
  staffList: UserProfile[];
  inspections: InspectionRecord[];
  inspectionsCount: number;
  damageRecords: VehicleDamageItem[];
  fuelLogs: FuelLogRecord[];
  equipmentInspections: EquipmentInspectionRecord[];
  exactEquipmentItemIds: string[];
  equipmentRequisitions: EquipmentRequisitionRecord[];
  pulledAt: string;
}> {
  const pulledAt = new Date().toLocaleString('th-TH');

  // Helper to fetch rows using OAuth token (when signed in) OR login-free bridge / public sheet read
  let bridgeTabsCache: Record<string, string[][]> | null = null;
  const fetchTabRows = async (sheetTitle: string, rangeSuffix: string): Promise<string[][]> => {
    if (accessToken) {
      const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(
        sheetTitle
      )}!${rangeSuffix}`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (res.ok) {
        const data = await res.json();
        return Array.isArray(data.values) ? data.values : [];
      }
      return [];
    }

    if (!bridgeTabsCache && getActiveAppsScriptUrl()) {
      try {
        const batchRes = await callAppsScriptBridge<{ ok: boolean; tabs: Record<string, string[][]> }>('readAllTabs', {
          spreadsheetId,
          sheetTitles: [
            VEHICLES_SHEET_TITLE,
            STAFF_SHEET_TITLE,
            INSPECTION_SHEET_TITLE,
            DAMAGE_SHEET_TITLE,
            FUEL_SHEET_TITLE,
            EQUIPMENT_SHEET_TITLE,
            REQUISITION_SHEET_TITLE,
          ],
        });
        bridgeTabsCache = batchRes?.tabs || {};
      } catch (err) {
        console.warn('Apps Script readAllTabs warning:', err);
        bridgeTabsCache = {};
      }
    }

    if (bridgeTabsCache && Array.isArray(bridgeTabsCache[sheetTitle])) {
      return bridgeTabsCache[sheetTitle];
    }

    return await readSheetValuesWithoutLogin(spreadsheetId, sheetTitle, rangeSuffix);
  };

  // 1. Pull Vehicles
  const vehRows = await fetchTabRows(VEHICLES_SHEET_TITLE, 'A2:M100');
  const vehicles: AmbulanceVehicle[] = [];
  if (vehRows.length > 0) {
    const rows: string[][] = vehRows;
    for (const r of rows) {
      if (r[0] && r[1]) {
        // Has code and plateNumber
        const statusStr = r[4] || '';
        const status =
          statusStr.includes('ซ่อม') || statusStr.includes('งดใช้')
            ? 'maintenance'
            : statusStr.includes('ปัญหา') || statusStr.includes('บกพร่อง')
            ? 'issue_found'
            : 'available';

        const drivePhotoUrl = r[11]?.startsWith('http') ? r[11] : undefined;
        const driveFolderUrl = r[12]?.startsWith('http') ? r[12] : undefined;

        vehicles.push({
          id: r[9] || `veh-${r[0]}`,
          code: r[0],
          plateNumber: r[1],
          brandModel: r[2] || 'Toyota Commuter BLS',
          year: r[3] || '2024',
          status,
          currentOdometer: Number(r[5]) || 0,
          lastInspectionDate: r[6] || '-',
          lastInspector: r[7] || '-',
          notes: r[8] || '',
          imageUrl: toDisplayableDriveImageUrl(undefined, drivePhotoUrl),
          drivePhotoUrl,
          driveFolderUrl,
        });
      }
    }
  }

  // 2. Pull Staff
  const staffRows = await fetchTabRows(STAFF_SHEET_TITLE, 'A2:K100');
  const staffList: UserProfile[] = [];
  if (staffRows.length > 0) {
    const rows: string[][] = staffRows;
    for (const r of rows) {
      if (r[0] && r[1]) {
        // Has employeeId and name
        const roleStr = (r[2] || '').toLowerCase();
        const role: UserProfile['role'] =
          roleStr.includes('admin') || roleStr.includes('ผู้ดูแล') || (r[8] || '').includes('admin')
            ? 'admin'
            : roleStr.includes('executive') || roleStr.includes('ผู้บริหาร') || (r[8] || '').includes('executive')
            ? 'executive'
            : 'staff';
        const status = (r[6] || '').includes('พักเวร')
          ? 'on_leave'
          : (r[6] || '').includes('ไม่ได้ปฏิบัติงาน')
          ? 'inactive'
          : 'active';

        const rawPin = (r[10] || '').trim().replace(/^'/, '');

        staffList.push({
          id: (r[8] || '').trim() || `user-${r[0].trim()}`,
          employeeId: r[0].trim(),
          name: r[1].trim(),
          role,
          position: (r[3] || '').trim() || 'เจ้าหน้าที่กู้ชีพ',
          department: (r[4] || '').trim() || 'ฝ่ายปฏิบัติการกู้ชีพ BLS',
          phone: (r[5] || '').trim() || '-',
          status,
          email: (r[7] || '').trim() === '-' ? '' : (r[7] || '').trim(),
          pin_code: rawPin,
        });
      }
    }
  }

  // 3. Pull Inspections (Tab 1: บันทึกการตรวจรถกู้ชีพ_BLS)
  const inspRows = await fetchTabRows(INSPECTION_SHEET_TITLE, 'A2:V1000');
  const inspections: InspectionRecord[] = [];
  if (inspRows.length > 0) {
    const rows: string[][] = inspRows;
    for (let idx = 0; idx < rows.length; idx++) {
      const r = rows[idx];
      if (r && r[0] && r[2]) {
        const vehCode = r[2].trim();
        const plateNum = (r[3] || '').trim();
        const matchedVeh = vehicles.find(
          (v) => v.code === vehCode || (plateNum && v.plateNumber === plateNum)
        );

        const inspectorName = (r[4] || '').trim() || 'เจ้าหน้าที่';
        const matchedStaff = staffList.find((s) => s.name === inspectorName);

        const shiftLabel = (r[1] || '').trim() || 'เวร 24 ชั่วโมง (08:00 น. - 08:00 น. ของอีกวัน)';
        const shift: InspectionRecord['shift'] = shiftLabel.includes('เช้า')
          ? 'morning'
          : shiftLabel.includes('บ่าย')
          ? 'afternoon'
          : shiftLabel.includes('ดึก')
          ? 'night'
          : '24hr';

        const statusCell = (r[5] || '').trim();
        const overallStatus: InspectionRecord['overallStatus'] =
          statusCell.includes('งดใช้งาน') || statusCell.includes('ส่งซ่อม')
            ? 'needs_repair'
            : statusCell.includes('พบข้อบกพร่อง') || statusCell.includes('เฝ้าระวัง')
            ? 'issue_found'
            : 'normal';

        const checklist = createFreshChecklist();
        for (let catId = 1; catId <= 7; catId++) {
          const catCell = (r[6 + catId] || '').trim();
          const isFail = catCell.includes('❌') || catCell.includes('ไม่ผ่าน');
          const isWarn = !isFail && (catCell.includes('⚠️') || catCell.includes('เฝ้าระวัง'));
          if (isFail || isWarn) {
            const catItems = checklist.filter((c) => c.categoryId === catId);
            const matchedAnySub = catItems.some((item) => catCell.includes(item.subTitle));
            for (const item of catItems) {
              if (!matchedAnySub || catCell.includes(item.subTitle)) {
                item.status = isFail ? 'fail' : 'warning';
              }
            }
          }
        }

        const rawNotes = (r[14] || '').trim();
        const summaryNotes = rawNotes && rawNotes !== 'ไม่มีปัญหาที่พบ' ? rawNotes : '';

        const docUrlMatch = (r[15] || '').match(/https:\/\/[^\s|]+/);
        const photoCell = r[16] || '';
        const folderUrlMatch =
          photoCell.match(/ลิงก์ Drive:\s*(https:\/\/[^\s|]+)/) ||
          photoCell.match(/(https:\/\/drive\.google\.com\/drive\/folders\/[^\s|]+)/) ||
          photoCell.match(/https:\/\/[^\s|]+/);
        const frontUrlMatch = photoCell.match(/หน้า:\s*(https:\/\/[^\s|]+)/);
        const rearUrlMatch = photoCell.match(/หลัง:\s*(https:\/\/[^\s|]+)/);
        const leftUrlMatch = photoCell.match(/ซ้าย:\s*(https:\/\/[^\s|]+)/);
        const rightUrlMatch = photoCell.match(/ขวา:\s*(https:\/\/[^\s|]+)/);

        const colFront = (r[18] || '').trim().startsWith('http') ? r[18].trim() : undefined;
        const colRear = (r[19] || '').trim().startsWith('http') ? r[19].trim() : undefined;
        const colLeft = (r[20] || '').trim().startsWith('http') ? r[20].trim() : undefined;
        const colRight = (r[21] || '').trim().startsWith('http') ? r[21].trim() : undefined;

        const frontDriveUrl = colFront || frontUrlMatch?.[1];
        const rearDriveUrl = colRear || rearUrlMatch?.[1];
        const leftDriveUrl = colLeft || leftUrlMatch?.[1];
        const rightDriveUrl = colRight || rightUrlMatch?.[1];
        const folderUrl = folderUrlMatch?.[1] || folderUrlMatch?.[0];

        const recordId = (r[17] || '').trim() || `insp-sheet-${vehCode}-${idx + 1}`;

        const hasAnyDriveLinks = Boolean(
          docUrlMatch?.[0] ||
            folderUrl ||
            frontDriveUrl ||
            rearDriveUrl ||
            leftDriveUrl ||
            rightDriveUrl
        );

        inspections.push({
          id: recordId,
          vehicleId: matchedVeh?.id || `veh-${vehCode}`,
          vehicleCode: vehCode,
          plateNumber: plateNum || matchedVeh?.plateNumber || '',
          shift,
          shiftLabel,
          inspectorName,
          inspectorRole: matchedStaff?.role || 'staff',
          odometerReading: Number(String(r[6] || '').replace(/[^0-9.]/g, '')) || 0,
          vehicleChecklist: checklist,
          photos: {
            front: toDisplayableDriveImageUrl(undefined, frontDriveUrl) || '',
            rear: toDisplayableDriveImageUrl(undefined, rearDriveUrl) || '',
            left: toDisplayableDriveImageUrl(undefined, leftDriveUrl) || '',
            right: toDisplayableDriveImageUrl(undefined, rightDriveUrl) || '',
          },
          summaryNotes,
          overallStatus,
          uploadTimestamp: r[0].trim(),
          createdAt: Date.now() - idx * 1000,
          googleSheetsSyncStatus: 'synced',
          driveLinks: hasAnyDriveLinks
            ? {
                documentUrl: docUrlMatch?.[0],
                folderUrl,
                frontPhotoUrl: frontDriveUrl,
                rearPhotoUrl: rearDriveUrl,
                leftPhotoUrl: leftDriveUrl,
                rightPhotoUrl: rightDriveUrl,
              }
            : undefined,
        });
      }
    }
  }

  // 3b. Merge dedicated 4-side photos tab (ถ่ายสภาพรถ4ด้าน_BLS) so per-day separated links always restore cleanly
  const fourSideRows = await fetchTabRows(FOUR_SIDE_PHOTOS_SHEET_TITLE, 'A2:P1000');
  if (fourSideRows.length > 0 && inspections.length > 0) {
    const byId = new Map(inspections.map((rec) => [rec.id, rec]));
    const byTimestampVeh = new Map(
      inspections.map((rec) => [`${rec.uploadTimestamp}|${rec.vehicleCode}`, rec])
    );
    for (const pr of fourSideRows) {
      const recId = (pr[15] || '').trim();
      const tsVehKey = `${(pr[1] || '').trim()}|${(pr[3] || '').trim()}`;
      const target = (recId && byId.get(recId)) || byTimestampVeh.get(tsVehKey);
      if (!target) continue;

      const fUrl = (pr[6] || '').trim().startsWith('http') ? pr[6].trim() : undefined;
      const rUrl = (pr[7] || '').trim().startsWith('http') ? pr[7].trim() : undefined;
      const lUrl = (pr[8] || '').trim().startsWith('http') ? pr[8].trim() : undefined;
      const riUrl = (pr[9] || '').trim().startsWith('http') ? pr[9].trim() : undefined;
      const folUrl = (pr[14] || '').trim().startsWith('http') ? pr[14].trim() : undefined;

      target.driveLinks = {
        ...(target.driveLinks || {}),
        frontPhotoUrl: target.driveLinks?.frontPhotoUrl || fUrl,
        rearPhotoUrl: target.driveLinks?.rearPhotoUrl || rUrl,
        leftPhotoUrl: target.driveLinks?.leftPhotoUrl || lUrl,
        rightPhotoUrl: target.driveLinks?.rightPhotoUrl || riUrl,
        folderUrl: target.driveLinks?.folderUrl || folUrl,
      };
      if (!target.photos.front && target.driveLinks.frontPhotoUrl) {
        target.photos.front = toDisplayableDriveImageUrl(undefined, target.driveLinks.frontPhotoUrl) || '';
      }
      if (!target.photos.rear && target.driveLinks.rearPhotoUrl) {
        target.photos.rear = toDisplayableDriveImageUrl(undefined, target.driveLinks.rearPhotoUrl) || '';
      }
      if (!target.photos.left && target.driveLinks.leftPhotoUrl) {
        target.photos.left = toDisplayableDriveImageUrl(undefined, target.driveLinks.leftPhotoUrl) || '';
      }
      if (!target.photos.right && target.driveLinks.rightPhotoUrl) {
        target.photos.right = toDisplayableDriveImageUrl(undefined, target.driveLinks.rightPhotoUrl) || '';
      }
    }
  }
  const inspectionsCount = inspections.length;

  // 4. Pull Damage Records
  const damageRows = await fetchTabRows(DAMAGE_SHEET_TITLE, 'A2:N200');
  const damageRecords: VehicleDamageItem[] = [];
  if (damageRows.length > 0) {
    const rows: string[][] = damageRows;
    for (const r of rows) {
      if (r[1] && r[3]) {
        // Has vehicleCode and positionArea
        const rawSev = r[4] || '';
        let severity: DamageSeverity = 'minor_scratch';
        if (rawSev.includes('ลึก')) severity = 'deep_scratch';
        else if (rawSev.includes('บุบ')) severity = 'dent';
        else if (rawSev.includes('แตก') || rawSev.includes('หัก')) severity = 'crack';
        else if (rawSev.includes('สะเก็ด') || rawSev.includes('หลุด')) severity = 'paint_chip';
        else if (rawSev.includes('สนิม')) severity = 'rust';

        const driveUrl = r[9]?.startsWith('http') ? r[9] : undefined;
        const fallbackSvg = generateSvgDamagePlaceholder(r[3], r[5] || r[1]);

        const matchedVeh = vehicles.find(
          (v) => v.code === r[1].trim() || (r[2] && v.plateNumber === r[2].trim())
        );

        damageRecords.push({
          id: r[13] || `dmg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          vehicleId: matchedVeh?.id || `veh-${r[1].trim()}`,
          vehicleCode: r[1].trim(),
          plateNumber: (r[2] || '').trim(),
          positionArea: r[3],
          severity,
          description: r[5] || '',
          odometerAtReport: Number(r[6]) || undefined,
          inspectorName: r[7] || 'เจ้าหน้าที่',
          inspectorRole: (r[8] || '').includes('Admin')
            ? 'admin'
            : (r[8] || '').includes('Executive') || (r[8] || '').includes('ผู้บริหาร')
            ? 'executive'
            : 'staff',
          photoUrl: driveUrl || fallbackSvg,
          drivePhotoUrl: driveUrl,
          driveFolderUrl: r[11]?.startsWith('http') ? r[11] : undefined,
          resolved: (r[12] || '').includes('ซ่อมสีแล้ว'),
          createdAt: r[0] || '',
          googleSheetsSyncStatus: 'synced',
        });
      }
    }
  }

  // 5. Pull Fuel Logs
  const fuelRows = await fetchTabRows(FUEL_SHEET_TITLE, 'A2:R200');
  const fuelLogs: FuelLogRecord[] = [];
  if (fuelRows.length > 0) {
    const rows: string[][] = fuelRows;
    for (const r of rows) {
      if (r[0] && r[1]) {
        const matchedVeh = vehicles.find(
          (v) => v.code === r[1].trim() || (r[2] && v.plateNumber === r[2].trim())
        );
        fuelLogs.push({
          id: r[17] || `fuel-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          vehicleId: matchedVeh?.id || `veh-${r[1].trim()}`,
          vehicleCode: r[1].trim(),
          plateNumber: (r[2] || '').trim(),
          fuelDate: r[0],
          odometer: Number(r[3]) || 0,
          previousOdometer: Number(r[4]) || undefined,
          distanceDriven: Number(String(r[5] || '').replace(/[^0-9.]/g, '')) || undefined,
          liters: Number(r[6]) || 0,
          totalCost: Number(r[7]) || 0,
          pricePerLiter: Number(String(r[8] || '').replace(/[^0-9.]/g, '')) || undefined,
          kmPerLiter: Number(String(r[9] || '').replace(/[^0-9.]/g, '')) || undefined,
          costPerKm: Number(String(r[10] || '').replace(/[^0-9.]/g, '')) || undefined,
          fuelType: r[11] || 'ดีเซล B7',
          gasStation: r[12] || '',
          driverName: r[13] || 'เจ้าหน้าที่',
          receiptDriveUrl: r[14]?.startsWith('http') ? r[14] : undefined,
          driveFolderUrl: r[15]?.startsWith('http') ? r[15] : undefined,
          notes: r[16] || '',
          createdAt: Date.now(),
          googleSheetsSyncStatus: 'synced',
        });
      }
    }
  }

  // 6. Pull Equipment Inspections (Columns A:L including serialized item-level JSON in Col L)
  const eqRows = await fetchTabRows(EQUIPMENT_SHEET_TITLE, 'A2:L500');
  const { records: equipmentInspections, exactIds: exactEquipmentItemIds } =
    parseEquipmentSheetRows(eqRows, vehicles, pulledAt);

  // 7. Pull Equipment Requisitions
  const reqRows = await fetchTabRows(REQUISITION_SHEET_TITLE, 'A2:N500');
  const equipmentRequisitions: EquipmentRequisitionRecord[] = [];
  if (reqRows.length > 0) {
    const rows: string[][] = reqRows;
    const defaultDate = getDefaultThaiDateParts();
    for (let idx = 0; idx < rows.length; idx++) {
      const r = rows[idx];
      if (r && r[0] && r[1]) {
        const teamLabel = (r[3] || '').trim() || 'ชุดปฏิบัติการที่ 1';
        const team = teamLabel.includes('2') ? 'team_2' : 'team_1';
        const statusStr = (r[9] || '').trim();
        const status: EquipmentRequisitionRecord['status'] = statusStr.includes('จ่าย')
          ? 'dispensed'
          : statusStr.includes('อนุมัติ') && !statusStr.includes('รอ')
          ? 'approved'
          : 'pending';
        const vehParts = (r[4] || '').split('/').map((s) => s.trim());
        const vehicleCode = vehParts[0] && vehParts[0] !== '-' ? vehParts[0] : undefined;
        const plateNumber = vehParts[1] || undefined;
        const matchedVeh = vehicleCode
          ? vehicles.find((v) => v.code === vehicleCode || (plateNumber && v.plateNumber === plateNumber))
          : undefined;
        const dateFormatted = r[1].trim();
        const dateMatch = dateFormatted.match(/(\d+)\s+([^\s]+)\s+(\d+)/);

        const parsedItems = String(r[8] || '')
          .split('|')
          .map((part, pIdx) => {
            const trimmed = part.trim();
            if (!trimmed) return null;
            const m = trimmed.match(/^(.*?)\s+x(\d+)\s*(.*)$/);
            return {
              id: `req-sheet-item-${idx}-${pIdx}`,
              category: 'รายการเบิกอุปกรณ์',
              name: m ? m[1].trim() : trimmed,
              unit: m && m[3] ? m[3].trim() : 'ชิ้น',
              requestedQty: m ? Number(m[2]) || 1 : 1,
            };
          })
          .filter(Boolean) as EquipmentRequisitionRecord['items'];

        equipmentRequisitions.push({
          id: (r[13] || '').trim() || `req-sheet-${idx + 1}`,
          requisitionNo: r[0].trim(),
          organizationName: (r[2] || '').trim() || ORGANIZATION_NAME,
          team,
          teamLabel,
          inspectDay: dateMatch ? dateMatch[1] : defaultDate.day,
          inspectMonth: dateMatch ? dateMatch[2] : defaultDate.month,
          inspectYear: dateMatch ? dateMatch[3] : defaultDate.year,
          requestDateFormatted: dateFormatted,
          vehicleId: matchedVeh?.id,
          vehicleCode,
          plateNumber,
          requesterName: (r[5] || '').trim() || 'เจ้าหน้าที่',
          requesterRole: 'staff',
          items: parsedItems,
          totalItemTypes: Number(r[6]) || parsedItems.length,
          totalQuantity: Number(r[7]) || parsedItems.reduce((s, i) => s + i.requestedQty, 0),
          status,
          approvedBy: (r[10] || '').trim() === '-' ? undefined : (r[10] || '').trim(),
          purposeNotes: (r[11] || '').trim() === '-' ? '' : (r[11] || '').trim(),
          uploadTimestamp: (r[12] || '').trim() || pulledAt,
          createdAt: Date.now() - idx * 1000,
          googleSheetsSyncStatus: 'synced',
        });
      }
    }
  }

  return {
    vehicles,
    staffList,
    inspections,
    inspectionsCount,
    damageRecords,
    fuelLogs,
    equipmentInspections,
    exactEquipmentItemIds,
    equipmentRequisitions,
    pulledAt,
  };
}

/**
 * Format damage record for sheet
 */
export function formatDamageForSheet(item: VehicleDamageItem): any[] {
  const severityMap: Record<string, string> = {
    minor_scratch: 'รอยขูดขีดตื้น (ขนแมว/ผิวสี)',
    deep_scratch: 'รอยขูดขีดลึก (ถึงชั้นสีรองพื้น)',
    dent: 'รอยบุบ / ยุบตัว',
    crack: 'รอยแตกร้าว / แตกหัก',
    rust: 'สนิม / ผุกร่อน',
    paint_chip: 'สีหลุดร่อน / สะเก็ดหินกระเทาะ',
  };

  const addDrivePhotos = (item.driveAdditionalPhotoUrls || []).join(' | ');

  return [
    item.createdAt,
    item.vehicleCode,
    item.plateNumber,
    item.positionArea,
    severityMap[item.severity] || item.severity,
    item.description || '-',
    item.odometerAtReport || 0,
    item.inspectorName,
    item.inspectorRole === 'admin'
      ? 'ผู้ดูแลระบบ (Admin)'
      : item.inspectorRole === 'executive'
      ? 'ผู้บริหาร (Executive)'
      : 'พนักงานทั่วไป (Staff)',
    item.drivePhotoUrl || (item.photoUrl ? 'มีภาพบันทึกในระบบ' : '-'),
    addDrivePhotos || '-',
    item.driveFolderUrl || '-',
    item.resolved ? `ซ่อมสีแล้ว (${item.resolvedAt || '-'})` : 'ยังไม่ซ่อมสี/มีรอยอยู่',
    item.id,
  ];
}

/**
 * Append single damage record to Sheet
 */
export async function appendDamageToSheet(
  spreadsheetId: string,
  item: VehicleDamageItem,
  accessToken: string
): Promise<{ success: boolean }> {
  const rowValues = formatDamageForSheet(item);
  if (!accessToken && getActiveAppsScriptUrl()) {
    await callAppsScriptBridge('appendRow', {
      spreadsheetId,
      sheetTitle: DAMAGE_SHEET_TITLE,
      headers: DAMAGE_HEADERS,
      row: rowValues,
    });
    return { success: true };
  }

  await ensureAllSpreadsheetTabs(spreadsheetId, accessToken);

  const appendUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(
    DAMAGE_SHEET_TITLE
  )}!A:N:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`;

  const response = await fetch(appendUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ values: [rowValues] }),
  });

  if (!response.ok) {
    const errorJson = await response.json().catch(() => ({}));
    throw new Error(errorJson.error?.message || `เกิดข้อผิดพลาดในการบันทึกรอยตัวรถลง Google Sheets (${response.status})`);
  }

  return { success: true };
}

/**
 * Mirror / Sync entire Damage Records list to Sheet Tab
 */
export async function syncDamageToSheet(
  spreadsheetId: string,
  items: VehicleDamageItem[],
  accessToken: string
): Promise<void> {
  if (!accessToken && getActiveAppsScriptUrl()) {
    await callAppsScriptBridge('syncTab', {
      spreadsheetId,
      sheetTitle: DAMAGE_SHEET_TITLE,
      headers: DAMAGE_HEADERS,
      rows: items.map(formatDamageForSheet),
    });
    return;
  }

  await ensureAllSpreadsheetTabs(spreadsheetId, accessToken);
  const rows = items.map(formatDamageForSheet);

  const padded = [...rows];
  while (padded.length < 50) {
    padded.push(new Array(DAMAGE_HEADERS.length).fill(''));
  }

  const putUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(
    DAMAGE_SHEET_TITLE
  )}!A2:N52?valueInputOption=USER_ENTERED`;

  const response = await fetch(putUrl, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ values: padded }),
  });

  if (!response.ok) {
    const errorJson = await response.json().catch(() => ({}));
    throw new Error(errorJson.error?.message || `เกิดข้อผิดพลาดในการอัปเดตตารางรอยตัวรถลง Google Sheets (${response.status})`);
  }
}

/**
 * Format fuel log record for sheet
 */
export function formatFuelLogForSheet(log: FuelLogRecord): any[] {
  return [
    log.fuelDate,
    log.vehicleCode,
    log.plateNumber,
    log.odometer,
    log.previousOdometer || '-',
    log.distanceDriven ? `${log.distanceDriven} กม.` : '-',
    log.liters,
    log.totalCost,
    log.pricePerLiter ? `${log.pricePerLiter} บ./ล.` : '-',
    log.kmPerLiter ? `${log.kmPerLiter} กม./ลิตร` : '-',
    log.costPerKm ? `${log.costPerKm} บ./กม.` : '-',
    log.fuelType,
    log.gasStation || '-',
    log.driverName,
    log.receiptDriveUrl || (log.receiptPhotoUrl ? 'มีภาพสลิปในระบบ' : '-'),
    log.driveFolderUrl || '-',
    log.notes || '-',
    log.id,
  ];
}

/**
 * Append single fuel log to Sheet
 */
export async function appendFuelLogToSheet(
  spreadsheetId: string,
  log: FuelLogRecord,
  accessToken: string
): Promise<{ success: boolean }> {
  const rowValues = formatFuelLogForSheet(log);
  if (!accessToken && getActiveAppsScriptUrl()) {
    await callAppsScriptBridge('appendRow', {
      spreadsheetId,
      sheetTitle: FUEL_SHEET_TITLE,
      headers: FUEL_HEADERS,
      row: rowValues,
    });
    return { success: true };
  }

  await ensureAllSpreadsheetTabs(spreadsheetId, accessToken);

  const appendUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(
    FUEL_SHEET_TITLE
  )}!A:R:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`;

  const response = await fetch(appendUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ values: [rowValues] }),
  });

  if (!response.ok) {
    const errorJson = await response.json().catch(() => ({}));
    throw new Error(errorJson.error?.message || `เกิดข้อผิดพลาดในการบันทึกประวัติน้ำมันลง Google Sheets (${response.status})`);
  }

  return { success: true };
}

/**
 * Mirror / Sync entire Fuel Logs list to Sheet Tab
 */
export async function syncFuelLogsToSheet(
  spreadsheetId: string,
  logs: FuelLogRecord[],
  accessToken: string
): Promise<void> {
  if (!accessToken && getActiveAppsScriptUrl()) {
    await callAppsScriptBridge('syncTab', {
      spreadsheetId,
      sheetTitle: FUEL_SHEET_TITLE,
      headers: FUEL_HEADERS,
      rows: logs.map(formatFuelLogForSheet),
    });
    return;
  }

  await ensureAllSpreadsheetTabs(spreadsheetId, accessToken);
  const rows = logs.map(formatFuelLogForSheet);

  const padded = [...rows];
  while (padded.length < 50) {
    padded.push(new Array(FUEL_HEADERS.length).fill(''));
  }

  const putUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(
    FUEL_SHEET_TITLE
  )}!A2:R52?valueInputOption=USER_ENTERED`;

  const response = await fetch(putUrl, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ values: padded }),
  });

  if (!response.ok) {
    const errorJson = await response.json().catch(() => ({}));
    throw new Error(errorJson.error?.message || `เกิดข้อผิดพลาดในการอัปเดตตารางประวัติน้ำมันลง Google Sheets (${response.status})`);
  }
}

type CompactEquipmentTuple = [string, number, 'r' | 'i' | 'd', string];

interface SerializedEquipmentSheetPayload {
  v: 1;
  sn: string;
  items: CompactEquipmentTuple[];
}

function serializeEquipmentItemsForSheet(record: EquipmentInspectionRecord): string {
  const payload: SerializedEquipmentSheetPayload = {
    v: 1,
    sn: record.summaryNotes || '',
    items: (record.items || []).map((item) => [
      item.id,
      Number.isFinite(item.availableQty) ? Math.max(0, Math.floor(item.availableQty)) : 0,
      item.conditionStatus === 'damaged'
        ? 'd'
        : item.conditionStatus === 'incomplete'
        ? 'i'
        : 'r',
      item.notes || '',
    ]),
  };
  return JSON.stringify(payload);
}

function computeEquipmentMetricsFromItems(items: EquipmentCheckItem[]): {
  requiredPassedCount: number;
  requiredTotalCount: number;
  overallStatus: EquipmentInspectionRecord['overallStatus'];
} {
  const requiredItems = items.filter((i) => i.minCount !== null);
  const requiredPassedCount = requiredItems.filter(
    (i) => i.conditionStatus !== 'damaged' && i.availableQty >= (i.minCount || 0)
  ).length;
  const damagedCount = items.filter((i) => i.conditionStatus === 'damaged').length;
  const incompleteRequiredCount = requiredItems.length - requiredPassedCount;
  const overallStatus: EquipmentInspectionRecord['overallStatus'] =
    damagedCount > 0 ? 'critical' : incompleteRequiredCount > 0 ? 'incomplete' : 'ready';
  return {
    requiredPassedCount,
    requiredTotalCount: requiredItems.length,
    overallStatus,
  };
}

function parseSerializedEquipmentItems(
  rawJson: string
): { items: EquipmentCheckItem[]; summaryNotes: string } | null {
  const trimmed = (rawJson || '').trim().replace(/^'/, '');
  if (!trimmed || !trimmed.startsWith('{')) return null;
  try {
    const parsed = JSON.parse(trimmed) as SerializedEquipmentSheetPayload;
    if (!parsed || !Array.isArray(parsed.items) || parsed.items.length === 0) return null;
    const tupleMap = new Map<string, CompactEquipmentTuple>();
    for (const t of parsed.items) {
      if (Array.isArray(t) && typeof t[0] === 'string') {
        tupleMap.set(t[0], t);
      }
    }
    const hydrated: EquipmentCheckItem[] = EQUIPMENT_TEMPLATE_ITEMS.map((tpl) => {
      const tuple = tupleMap.get(tpl.id);
      if (!tuple) {
        const qty = tpl.minCount !== null ? 0 : 0;
        return {
          ...tpl,
          availableQty: qty,
          conditionStatus: tpl.minCount === null ? 'ready' : 'incomplete',
          notes: '',
        };
      }
      const qty = Math.max(0, Math.floor(Number(tuple[1]) || 0));
      const statusCode = tuple[2];
      const conditionStatus: EquipmentConditionStatus =
        statusCode === 'd' ? 'damaged' : statusCode === 'i' ? 'incomplete' : 'ready';
      return {
        ...tpl,
        availableQty: qty,
        conditionStatus,
        notes: typeof tuple[3] === 'string' ? tuple[3] : '',
      };
    });
    return {
      items: hydrated,
      summaryNotes: typeof parsed.sn === 'string' ? parsed.sn : '',
    };
  } catch {
    return null;
  }
}

function reconstructLegacyEquipmentItems(
  rawNotesCol: string,
  passedCount: number,
  overallStatus: EquipmentInspectionRecord['overallStatus']
): { items: EquipmentCheckItem[]; summaryNotes: string } {
  const cleanedRaw = (rawNotesCol || '').trim();
  const baseItems = createFreshEquipmentChecklist(overallStatus === 'ready' || passedCount > 0);
  if (!cleanedRaw || cleanedRaw === '-' || cleanedRaw === 'ครบถ้วนสมบูรณ์ทุกรายการ') {
    return { items: baseItems, summaryNotes: '' };
  }

  const parts = cleanedRaw.split(' --- ');
  const firstPart = parts[0] || '';
  const trailingSummary = parts.slice(1).join(' --- ').trim();

  const segments = firstPart
    .split(' | ')
    .map((s) => s.trim())
    .filter(Boolean);

  let matchedAnyIssue = false;
  for (const seg of segments) {
    const matchedItem = baseItems.find((item) => {
      const prefix = `${item.itemCode} ${item.name}`;
      return seg.startsWith(prefix);
    });
    if (!matchedItem) continue;
    matchedAnyIssue = true;

    const prefix = `${matchedItem.itemCode} ${matchedItem.name}`;
    const rest = seg.slice(prefix.length).trim();
    const parenMatch = rest.match(/^\((.*)\)$/);
    const inner = parenMatch ? parenMatch[1].trim() : rest;

    if (inner.startsWith('ชำรุด')) {
      matchedItem.conditionStatus = 'damaged';
      const noteIdx = inner.indexOf(':');
      if (noteIdx >= 0) {
        matchedItem.notes = inner.slice(noteIdx + 1).trim();
      }
    } else {
      const qtyMatch = inner.match(/^มี\s*(\d+)/);
      if (qtyMatch) {
        matchedItem.availableQty = Math.max(0, Number(qtyMatch[1]));
      }
      matchedItem.conditionStatus =
        matchedItem.minCount !== null && matchedItem.availableQty < matchedItem.minCount
          ? 'incomplete'
          : 'ready';
      const noteIdx = inner.indexOf(':');
      if (noteIdx >= 0) {
        matchedItem.notes = inner.slice(noteIdx + 1).trim();
      }
    }
  }

  const summaryNotes = matchedAnyIssue ? trailingSummary : cleanedRaw;
  return { items: baseItems, summaryNotes };
}

function parseEquipmentCreatedAt(id: string, fallbackIdx: number): number {
  const idMatch = id.match(/eq-insp-(\d{10,})/);
  if (idMatch) {
    const parsedTs = Number(idMatch[1]);
    if (Number.isFinite(parsedTs) && parsedTs > 1577836800000) {
      return parsedTs;
    }
  }
  return Date.now() - fallbackIdx * 1000;
}

export function parseEquipmentSheetRows(
  eqRows: string[][],
  vehicles: AmbulanceVehicle[],
  pulledAt = new Date().toLocaleString('th-TH')
): { records: EquipmentInspectionRecord[]; exactIds: string[] } {
  const equipmentInspections: EquipmentInspectionRecord[] = [];
  const exactIds: string[] = [];
  if (!Array.isArray(eqRows) || eqRows.length === 0) {
    return { records: equipmentInspections, exactIds };
  }

  const defaultDate = getDefaultThaiDateParts();
  const defaultRequiredTotal = EQUIPMENT_TEMPLATE_ITEMS.filter((i) => i.minCount !== null).length;

  for (let idx = 0; idx < eqRows.length; idx++) {
    const r = eqRows[idx];
    if (r && r[0] && r[2]) {
      const id = (r[10] || '').trim() || `eq-insp-sheet-${idx + 1}`;
      const teamLabel = r[2].trim();
      const team = teamLabel.includes('2') ? 'team_2' : 'team_1';
      const statusText = (r[5] || '').trim();
      const fallbackStatus: EquipmentInspectionRecord['overallStatus'] =
        statusText.includes('ชำรุด') || statusText.includes('เร่งด่วน')
          ? 'critical'
          : statusText.includes('ไม่ครบ')
          ? 'incomplete'
          : 'ready';

      const passCol = String(r[6] || '').trim().replace(/^'/, '');
      const passMatch = passCol.match(/^(\d+)\s*\/\s*(\d+)$/);
      const fallbackPassed = passMatch ? Number(passMatch[1]) : defaultRequiredTotal;
      const fallbackTotal = passMatch ? Number(passMatch[2]) : defaultRequiredTotal;

      const vehParts = (r[3] || '').split('/').map((s) => s.trim());
      const vehicleCode = vehParts[0] && vehParts[0] !== '-' ? vehParts[0] : undefined;
      const plateNumber = vehParts[1] || undefined;
      const matchedVeh = vehicleCode
        ? vehicles.find((v) => v.code === vehicleCode || (plateNumber && v.plateNumber === plateNumber))
        : undefined;
      const dateFormatted = r[0].trim();
      const dateMatch = dateFormatted.match(/(\d+)\s+([^\s]+)\s+(\d+)/);

      const exactParsed = parseSerializedEquipmentItems(r[11] || '');
      let items: EquipmentCheckItem[];
      let summaryNotes: string;
      let requiredPassedCount = fallbackPassed;
      let requiredTotalCount = fallbackTotal;
      let overallStatus = fallbackStatus;

      if (exactParsed) {
        items = exactParsed.items;
        summaryNotes = exactParsed.summaryNotes;
        const computed = computeEquipmentMetricsFromItems(items);
        requiredPassedCount = computed.requiredPassedCount;
        requiredTotalCount = computed.requiredTotalCount;
        overallStatus = computed.overallStatus;
        exactIds.push(id);
      } else {
        const legacyParsed = reconstructLegacyEquipmentItems(r[8] || '', fallbackPassed, fallbackStatus);
        items = legacyParsed.items;
        summaryNotes = legacyParsed.summaryNotes;
      }

      equipmentInspections.push({
        id,
        organizationName: (r[1] || '').trim() || ORGANIZATION_NAME,
        team,
        teamLabel,
        inspectDay: dateMatch ? dateMatch[1] : defaultDate.day,
        inspectMonth: dateMatch ? dateMatch[2] : defaultDate.month,
        inspectYear: dateMatch ? dateMatch[3] : defaultDate.year,
        inspectDateFormatted: dateFormatted,
        vehicleId: matchedVeh?.id,
        vehicleCode,
        plateNumber,
        inspectorName: (r[4] || '').trim() || 'เจ้าหน้าที่',
        inspectorRole: 'staff',
        items,
        requiredPassedCount,
        requiredTotalCount,
        overallStatus,
        summaryNotes,
        uploadTimestamp: (r[9] || '').trim() || pulledAt,
        createdAt: parseEquipmentCreatedAt(id, idx),
        googleSheetsSyncStatus: 'synced',
      });
    }
  }

  equipmentInspections.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  return { records: equipmentInspections, exactIds };
}

/**
 * Lightweight pull of ONLY Tab 7 (ตรวจความพร้อมอุปกรณ์_BLS) so multi-device saves
 * can safely merge with latest cloud records before syncing without overwriting other devices.
 */
export async function pullEquipmentInspectionsFromSheet(
  spreadsheetId: string,
  accessToken = '',
  vehicles: AmbulanceVehicle[] = []
): Promise<{ records: EquipmentInspectionRecord[]; exactIds: string[] }> {
  let eqRows: string[][] = [];
  if (accessToken) {
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(
      EQUIPMENT_SHEET_TITLE
    )}!A2:L500`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) {
      throw new Error(`ไม่สามารถดึงข้อมูลอุปกรณ์จาก Google Sheets ได้ (${res.status})`);
    }
    const data = await res.json();
    eqRows = Array.isArray(data.values) ? data.values : [];
  } else if (getActiveAppsScriptUrl()) {
    const batchRes = await callAppsScriptBridge<{ ok: boolean; tabs: Record<string, string[][]> }>(
      'readAllTabs',
      {
        spreadsheetId,
        sheetTitles: [EQUIPMENT_SHEET_TITLE],
      }
    );
    eqRows = Array.isArray(batchRes?.tabs?.[EQUIPMENT_SHEET_TITLE])
      ? batchRes.tabs[EQUIPMENT_SHEET_TITLE]
      : [];
  } else {
    eqRows = await readSheetValuesWithoutLogin(spreadsheetId, EQUIPMENT_SHEET_TITLE, 'A2:L500');
  }

  return parseEquipmentSheetRows(eqRows, vehicles);
}

/**
 * Format equipment readiness inspection record for sheet (Tab 7: ตรวจความพร้อมอุปกรณ์_BLS)
 */
export function formatEquipmentRecordForSheet(
  record: EquipmentInspectionRecord,
  escapeTextForBridge = false
): (string | number)[] {
  const statusLabel =
    record.overallStatus === 'ready'
      ? 'พร้อมปฏิบัติการ (ครบเกณฑ์)'
      : record.overallStatus === 'incomplete'
      ? 'อุปกรณ์ไม่ครบตามเกณฑ์'
      : 'พบอุปกรณ์ชำรุด/เร่งด่วน';

  const issues = record.items.filter(
    (item) =>
      item.conditionStatus === 'damaged' ||
      item.conditionStatus === 'incomplete' ||
      (item.minCount !== null && item.availableQty < item.minCount)
  );

  const issueDetails = issues
    .map((i) => {
      const stateText =
        i.conditionStatus === 'damaged'
          ? 'ชำรุด'
          : `มี ${i.availableQty}/${i.minRequirementLabel}`;
      return `${i.itemCode} ${i.name} (${stateText}${i.notes ? `: ${i.notes}` : ''})`;
    })
    .join(' | ');

  const notesCombined = [issueDetails, record.summaryNotes].filter(Boolean).join(' --- ');
  const vehLabel = record.vehicleCode
    ? `${record.vehicleCode}${record.plateNumber ? ` / ${record.plateNumber}` : ''}`
    : '-';

  const passRatioText = `${record.requiredPassedCount}/${record.requiredTotalCount}`;

  return [
    record.inspectDateFormatted,
    record.organizationName,
    record.teamLabel,
    vehLabel,
    record.inspectorName,
    statusLabel,
    escapeTextForBridge ? `'${passRatioText}` : passRatioText,
    issues.length,
    notesCombined || 'ครบถ้วนสมบูรณ์ทุกรายการ',
    record.uploadTimestamp,
    record.id,
    serializeEquipmentItemsForSheet(record),
  ];
}

export async function appendEquipmentInspectionToSheet(
  spreadsheetId: string,
  record: EquipmentInspectionRecord,
  accessToken: string
): Promise<{ success: boolean }> {
  if (!accessToken && getActiveAppsScriptUrl()) {
    await callAppsScriptBridge('appendRow', {
      spreadsheetId,
      sheetTitle: EQUIPMENT_SHEET_TITLE,
      headers: EQUIPMENT_HEADERS,
      row: formatEquipmentRecordForSheet(record, true),
    });
    return { success: true };
  }

  await ensureAllSpreadsheetTabs(spreadsheetId, accessToken);

  const rowValues = formatEquipmentRecordForSheet(record, false);
  const appendUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(
    EQUIPMENT_SHEET_TITLE
  )}!A:L:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`;

  const response = await fetch(appendUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ values: [rowValues] }),
  });

  if (!response.ok) {
    const errorJson = await response.json().catch(() => ({}));
    throw new Error(errorJson.error?.message || `เกิดข้อผิดพลาดในการบันทึกตรวจอุปกรณ์ลง Google Sheets (${response.status})`);
  }

  return { success: true };
}

export async function syncEquipmentInspectionsToSheet(
  spreadsheetId: string,
  records: EquipmentInspectionRecord[],
  accessToken: string
): Promise<void> {
  if (!accessToken && getActiveAppsScriptUrl()) {
    await callAppsScriptBridge('syncTab', {
      spreadsheetId,
      sheetTitle: EQUIPMENT_SHEET_TITLE,
      headers: EQUIPMENT_HEADERS,
      rows: records.map((r) => formatEquipmentRecordForSheet(r, true)),
    });
    return;
  }

  await ensureAllSpreadsheetTabs(spreadsheetId, accessToken);

  const clearUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(
    EQUIPMENT_SHEET_TITLE
  )}!A2:L500:clear`;

  await fetch(clearUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  const rows = [EQUIPMENT_HEADERS, ...records.map((r) => formatEquipmentRecordForSheet(r, false))];
  const putUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(
    EQUIPMENT_SHEET_TITLE
  )}!A1:L${rows.length}?valueInputOption=RAW`;

  const response = await fetch(putUrl, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ values: rows }),
  });

  if (!response.ok) {
    const errorJson = await response.json().catch(() => ({}));
    throw new Error(errorJson.error?.message || `เกิดข้อผิดพลาดในการอัปเดตตารางตรวจอุปกรณ์ลง Google Sheets (${response.status})`);
  }
}

/**
 * Format equipment requisition record for sheet (Tab 8: เบิกอุปกรณ์_BLS)
 */
export function formatRequisitionForSheet(record: EquipmentRequisitionRecord): (string | number)[] {
  const statusLabel =
    record.status === 'dispensed'
      ? 'จ่ายอุปกรณ์แล้ว'
      : record.status === 'approved'
      ? 'อนุมัติแล้ว (รอจ่าย)'
      : 'รออนุมัติ';

  const itemsText = record.items
    .map((i) => `${i.name} x${i.requestedQty} ${i.unit}`)
    .join(' | ');

  const vehLabel = record.vehicleCode
    ? `${record.vehicleCode}${record.plateNumber ? ` / ${record.plateNumber}` : ''}`
    : '-';

  return [
    record.requisitionNo,
    record.requestDateFormatted,
    record.organizationName,
    record.teamLabel,
    vehLabel,
    record.requesterName,
    record.totalItemTypes,
    record.totalQuantity,
    itemsText || '-',
    statusLabel,
    record.approvedBy || '-',
    record.purposeNotes || '-',
    record.uploadTimestamp,
    record.id,
  ];
}

export async function appendRequisitionToSheet(
  spreadsheetId: string,
  record: EquipmentRequisitionRecord,
  accessToken: string
): Promise<{ success: boolean }> {
  const rowValues = formatRequisitionForSheet(record);
  if (!accessToken && getActiveAppsScriptUrl()) {
    await callAppsScriptBridge('appendRow', {
      spreadsheetId,
      sheetTitle: REQUISITION_SHEET_TITLE,
      headers: REQUISITION_HEADERS,
      row: rowValues,
    });
    return { success: true };
  }

  await ensureAllSpreadsheetTabs(spreadsheetId, accessToken);

  const appendUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(
    REQUISITION_SHEET_TITLE
  )}!A:N:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`;

  const response = await fetch(appendUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ values: [rowValues] }),
  });

  if (!response.ok) {
    const errorJson = await response.json().catch(() => ({}));
    throw new Error(errorJson.error?.message || `เกิดข้อผิดพลาดในการบันทึกใบเบิกอุปกรณ์ลง Google Sheets (${response.status})`);
  }

  return { success: true };
}

export async function syncRequisitionsToSheet(
  spreadsheetId: string,
  records: EquipmentRequisitionRecord[],
  accessToken: string
): Promise<void> {
  if (!accessToken && getActiveAppsScriptUrl()) {
    await callAppsScriptBridge('syncTab', {
      spreadsheetId,
      sheetTitle: REQUISITION_SHEET_TITLE,
      headers: REQUISITION_HEADERS,
      rows: records.map(formatRequisitionForSheet),
    });
    return;
  }

  await ensureAllSpreadsheetTabs(spreadsheetId, accessToken);

  const clearUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(
    REQUISITION_SHEET_TITLE
  )}!A2:N500:clear`;

  await fetch(clearUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  if (records.length === 0) return;

  const rows = records.map(formatRequisitionForSheet);
  const putUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(
    REQUISITION_SHEET_TITLE
  )}!A2:N${rows.length + 1}?valueInputOption=USER_ENTERED`;

  const response = await fetch(putUrl, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ values: rows }),
  });

  if (!response.ok) {
    const errorJson = await response.json().catch(() => ({}));
    throw new Error(errorJson.error?.message || `เกิดข้อผิดพลาดในการอัปเดตตารางเบิกอุปกรณ์ลง Google Sheets (${response.status})`);
  }
}


