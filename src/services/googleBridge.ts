import firebaseConfig from '../../firebase-applet-config.json';
import {
  DEFAULT_DRIVE_FOLDER_ID,
  DEFAULT_IMAGE_DRIVE_FOLDER_ID,
  DEFAULT_SPREADSHEET_ID,
  getGoogleSheetsConfig,
} from './storage';

const GOOGLE_API_KEY =
  import.meta.env.VITE_GOOGLE_API_KEY ||
  import.meta.env.VITE_FIREBASE_API_KEY ||
  firebaseConfig.apiKey ||
  '';

export function getActiveAppsScriptUrl(): string {
  const cfg = getGoogleSheetsConfig();
  return (cfg.appsScriptUrl || import.meta.env.VITE_GOOGLE_APPS_SCRIPT_URL || '').trim();
}

export function getActiveDriveFolderId(): string {
  const cfg = getGoogleSheetsConfig();
  return (cfg.driveFolderId || DEFAULT_DRIVE_FOLDER_ID).trim();
}

export function getActiveImageDriveFolderId(): string {
  const cfg = getGoogleSheetsConfig();
  return (cfg.imageDriveFolderId || DEFAULT_IMAGE_DRIVE_FOLDER_ID).trim();
}

export function getActiveSpreadsheetId(): string {
  const cfg = getGoogleSheetsConfig();
  return (cfg.spreadsheetId || DEFAULT_SPREADSHEET_ID).trim();
}

export function hasNoLoginBridge(): boolean {
  return Boolean(getActiveAppsScriptUrl());
}

export function validateAndNormalizeAppsScriptUrl(rawUrl: string): {
  validUrl?: string;
  error?: string;
} {
  const trimmed = (rawUrl || '').trim();
  if (!trimmed) {
    return { error: 'ยังไม่ได้ระบุ Google Apps Script Web App URL' };
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return {
      error:
        'รูปแบบลิงก์ Apps Script ไม่ถูกต้อง — กรุณาวางลิงก์ที่ขึ้นต้นด้วย https://script.google.com/macros/s/.../exec',
    };
  }

  if (parsed.hostname.includes('docs.google.com') || parsed.hostname.includes('drive.google.com')) {
    return {
      error:
        'ลิงก์ที่วางคือลิงก์ Google Sheets หรือ Drive ไม่ใช่ลิงก์ Apps Script Web App (/exec)',
    };
  }

  if (parsed.protocol !== 'https:' || parsed.hostname !== 'script.google.com') {
    return {
      error:
        'ลิงก์ Apps Script ต้องเป็น https://script.google.com/macros/s/.../exec เท่านั้น',
    };
  }

  const normalizedPath = parsed.pathname.replace(/^\/macros\/u\/\d+\//, '/macros/');
  if (normalizedPath.endsWith('/dev')) {
    return {
      error:
        'ลิงก์นี้เป็นลิงก์ทดสอบ (/dev) ซึ่งต้องล็อกอิน Google — กรุณาคัดลอกลิงก์ Web App ที่ลงท้าย /exec จากเมนู Deploy > Manage deployments',
    };
  }

  if (normalizedPath.includes('/edit') || normalizedPath.startsWith('/home/')) {
    return {
      error:
        'ลิงก์นี้เป็นหน้าแก้ไขโค้ด Apps Script — กรุณากด Deploy > รายการใหม่ > เว็บแอป เพื่อรับลิงก์ที่ลงท้าย /exec',
    };
  }

  if (!/^\/macros\/s\/[a-zA-Z0-9_-]+\/exec$/.test(normalizedPath)) {
    return {
      error:
        'URL ต้องเป็นลิงก์ Web App ที่ลงท้ายด้วย /exec (เช่น https://script.google.com/macros/s/.../exec)',
    };
  }

  return { validUrl: `https://script.google.com${normalizedPath}` };
}

function parseAppsScriptResponseText(rawText: string, status: number, action: string): any {
  const trimmed = (rawText || '').trim();
  if (
    trimmed.startsWith('<!DOCTYPE') ||
    trimmed.startsWith('<html') ||
    trimmed.includes('accounts.google.com') ||
    trimmed.includes('ServiceLogin')
  ) {
    throw new Error(
      'Apps Script ตอบกลับเป็นหน้าล็อกอิน Google — กรุณาไปที่ Deploy > Manage deployments แล้วตั้งค่า Who has access เป็น "ทุกคน (Anyone)"'
    );
  }

  let data: any;
  try {
    data = trimmed ? JSON.parse(trimmed) : {};
  } catch {
    throw new Error(
      `Apps Script ตอบกลับไม่ใช่ JSON (HTTP ${status}) — กรุณาตรวจสอบว่าได้กด Deploy เป็น Web App เวอร์ชันล่าสุดแล้ว`
    );
  }

  if (data && data.ok === false) {
    throw new Error(data.error || `Apps Script ทำงานไม่สำเร็จ (${action})`);
  }

  return data;
}

function isNetworkFetchError(err: unknown): boolean {
  const msg = String((err as any)?.message || err || '').toLowerCase();
  return (
    err instanceof TypeError ||
    msg.includes('failed to fetch') ||
    msg.includes('networkerror') ||
    msg.includes('load failed') ||
    msg.includes('network request failed')
  );
}

/**
 * Call the deployed Google Apps Script Web App (exec URL) without requiring browser Google OAuth.
 * Uses text/plain + credentials: omit to avoid CORS preflight failures, with automatic /api/apps-script proxy fallback.
 */
export async function callAppsScriptBridge<T = any>(
  action: string,
  payload: Record<string, any> = {},
  overrideUrl?: string
): Promise<T> {
  const rawUrl = (overrideUrl || getActiveAppsScriptUrl()).trim();
  const { validUrl, error } = validateAndNormalizeAppsScriptUrl(rawUrl);
  if (!validUrl) {
    throw new Error(error || 'ยังไม่ได้ระบุ Google Apps Script Web App URL');
  }

  const bodyPayload = {
    action,
    spreadsheetId: payload.spreadsheetId || getActiveSpreadsheetId(),
    driveFolderId: payload.driveFolderId || getActiveDriveFolderId(),
    imageDriveFolderId: payload.imageDriveFolderId || getActiveImageDriveFolderId(),
    ...payload,
  };

  try {
    const res = await fetch(validUrl, {
      method: 'POST',
      mode: 'cors',
      credentials: 'omit',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify(bodyPayload),
      redirect: 'follow',
    });

    const rawText = await res.text();
    if (!res.ok) {
      // Check if Google sent an HTML login page or JSON error
      parseAppsScriptResponseText(rawText, res.status, action);
      throw new Error(`Apps Script ตอบกลับสถานะผิดพลาด (${res.status})`);
    }

    return parseAppsScriptResponseText(rawText, res.status, action) as T;
  } catch (directErr: any) {
    if (!isNetworkFetchError(directErr)) {
      throw directErr;
    }

    // Fallback through same-origin server proxy to bypass browser CORS/302 redirect blocks
    try {
      const proxyRes = await fetch('/api/apps-script', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: validUrl,
          payload: bodyPayload,
        }),
      });

      const contentType = (proxyRes.headers.get('content-type') || '').toLowerCase();
      if (contentType.includes('application/json')) {
        const proxyData = await proxyRes.json();
        if (!proxyRes.ok || proxyData?.ok === false) {
          throw new Error(
            proxyData?.error || `Apps Script ตอบกลับสถานะผิดพลาด (${proxyRes.status})`
          );
        }
        return proxyData as T;
      }
    } catch (proxyErr: any) {
      if (!isNetworkFetchError(proxyErr) && proxyErr?.message) {
        throw proxyErr;
      }
    }

    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      throw new Error('ไม่สามารถเชื่อมต่ออินเทอร์เน็ตได้ (อุปกรณ์อยู่ในสถานะออฟไลน์)');
    }

    throw new Error(
      'เชื่อมต่อ Google Apps Script ไม่สำเร็จ (CORS / ถูกเบราว์เซอร์บล็อก) — กรุณาตรวจสอบในเมนู Google Sheets ว่าได้ Deploy เป็น Web App (/exec) และตั้งค่า Who has access: "ทุกคน (Anyone)" แล้วกดปุ่ม "ทดสอบ"'
    );
  }
}

/**
 * Read a sheet tab without Google OAuth login.
 * 1) Uses Apps Script Bridge if configured
 * 2) Falls back to Google Sheets API v4 with API key (requires "Anyone with the link" viewer access)
 * 3) Falls back to Google Visualization (gviz/tq) JSON endpoint (works without API key for public sheets)
 */
export async function readSheetValuesWithoutLogin(
  spreadsheetId: string,
  sheetTitle: string,
  rangeSuffix = 'A2:Z1000'
): Promise<string[][]> {
  // 1. Apps Script Bridge
  const appsScriptUrl = getActiveAppsScriptUrl();
  if (appsScriptUrl) {
    try {
      const res = await callAppsScriptBridge<{ ok: boolean; values: string[][] }>('readTab', {
        spreadsheetId,
        sheetTitle,
      });
      if (Array.isArray(res?.values)) {
        return res.values;
      }
    } catch (err) {
      console.warn(`Apps Script readTab (${sheetTitle}) warning:`, err);
    }
  }

  // 2. Public Google Sheets API v4 via API key
  if (GOOGLE_API_KEY) {
    try {
      const url = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(
        spreadsheetId
      )}/values/${encodeURIComponent(sheetTitle)}!${encodeURIComponent(
        rangeSuffix
      )}?key=${encodeURIComponent(GOOGLE_API_KEY)}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        return Array.isArray(data.values) ? data.values : [];
      }
    } catch (err) {
      console.warn(`Public Sheets API read (${sheetTitle}) warning:`, err);
    }
  }

  // 3. Google Visualization gviz/tq endpoint (zero key, zero login when "Anyone with the link")
  try {
    const gvizUrl = `https://docs.google.com/spreadsheets/d/${encodeURIComponent(
      spreadsheetId
    )}/gviz/tq?tqx=out:json&headers=1&sheet=${encodeURIComponent(sheetTitle)}`;
    const res = await fetch(gvizUrl);
    if (res.ok) {
      const text = await res.text();
      const start = text.indexOf('{');
      const end = text.lastIndexOf('}');
      if (start !== -1 && end > start) {
        const json = JSON.parse(text.slice(start, end + 1));
        const gvizRows = json?.table?.rows || [];
        return gvizRows.map((row: any) =>
          (row?.c || []).map((cell: any) => {
            if (!cell) return '';
            if (cell.f !== undefined && cell.f !== null) return String(cell.f);
            if (cell.v !== undefined && cell.v !== null) return String(cell.v);
            return '';
          })
        );
      }
    }
  } catch (err) {
    console.warn(`gviz read (${sheetTitle}) warning:`, err);
  }

  return [];
}

/**
 * Extract Spreadsheet ID or Drive Folder ID from full Google URL or raw ID
 */
export function extractGoogleResourceId(input: string): string {
  const trimmed = (input || '').trim();
  if (!trimmed) return '';
  const sheetMatch = trimmed.match(/\/d\/([a-zA-Z0-9_-]+)/);
  if (sheetMatch) return sheetMatch[1];
  const folderMatch = trimmed.match(/\/folders\/([a-zA-Z0-9_-]+)/);
  if (folderMatch) return folderMatch[1];
  return trimmed.replace(/\s+/g, '');
}

/**
 * Ready-to-deploy Google Apps Script (Code.gs) pre-bound to the user's Spreadsheet and Drive Folders.
 * Deploy as Web App (Execute as: Me, Who has access: Anyone) for 100% login-free read/write & ImageBLS Drive uploads.
 */
export const GENERATED_APPS_SCRIPT_CODE = `// วางโค้ดนี้ใน Google Apps Script (ส่วนขยาย > Apps Script ใน Google Sheet)
// จากนั้นกด ทำให้ใช้งานได้ (Deploy) > รายการใหม่ > เว็บแอป
// - ดำเนินการในฐานะ (Execute as): ฉัน (Me)
// - ผู้ที่มีสิทธิ์เข้าถึง (Who has access): ทุกคน (Anyone)

const DEFAULT_SPREADSHEET_ID = '${DEFAULT_SPREADSHEET_ID}';
const DEFAULT_DRIVE_FOLDER_ID = '${DEFAULT_DRIVE_FOLDER_ID}';
const DEFAULT_IMAGE_DRIVE_FOLDER_ID = '${DEFAULT_IMAGE_DRIVE_FOLDER_ID}';
const MASTER_DB_FILENAME = 'BLS_SYSTEM_MASTER_DATABASE.json';

function jsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function getOrCreateSubfolder(parentFolderId, folderName) {
  var root = DriveApp.getFolderById(parentFolderId || DEFAULT_IMAGE_DRIVE_FOLDER_ID);
  if (!folderName) return root;
  var folders = root.getFoldersByName(folderName);
  if (folders.hasNext()) {
    return folders.next();
  }
  return root.createFolder(folderName);
}

function ensureSheetWithHeaders(ss, title, headers) {
  var sheet = ss.getSheetByName(title);
  if (!sheet) {
    sheet = ss.insertSheet(title);
  }
  if (headers && headers.length > 0 && sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function doGet(e) {
  try {
    var action = (e && e.parameter && e.parameter.action) || 'ping';
    if (action === 'ping') {
      var ss = SpreadsheetApp.openById(DEFAULT_SPREADSHEET_ID);
      var folder = DriveApp.getFolderById(DEFAULT_DRIVE_FOLDER_ID);
      var imgFolder = DriveApp.getFolderById(DEFAULT_IMAGE_DRIVE_FOLDER_ID);
      return jsonResponse({
        ok: true,
        spreadsheetName: ss.getName(),
        folderName: folder.getName(),
        imageFolderName: imgFolder.getName(),
      });
    }
    return jsonResponse({ ok: true });
  } catch (err) {
    return jsonResponse({ ok: false, error: String(err) });
  }
}

function doPost(e) {
  try {
    var body = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    var action = body.action || '';
    var ssId = body.spreadsheetId || DEFAULT_SPREADSHEET_ID;
    var folderId = body.driveFolderId || DEFAULT_DRIVE_FOLDER_ID;
    var imageFolderId = body.imageDriveFolderId || DEFAULT_IMAGE_DRIVE_FOLDER_ID;
    var ss = SpreadsheetApp.openById(ssId);

    if (action === 'ping') {
      var folder = DriveApp.getFolderById(folderId);
      var imgFolder = DriveApp.getFolderById(imageFolderId);
      return jsonResponse({
        ok: true,
        spreadsheetName: ss.getName(),
        folderName: folder.getName(),
        imageFolderName: imgFolder.getName(),
      });
    }

    if (action === 'ensureTabs') {
      var tabs = body.tabs || [];
      for (var i = 0; i < tabs.length; i++) {
        ensureSheetWithHeaders(ss, tabs[i].title, tabs[i].headers);
      }
      return jsonResponse({ ok: true });
    }

    if (action === 'readTab') {
      var sheet = ss.getSheetByName(body.sheetTitle);
      if (!sheet || sheet.getLastRow() <= 1) {
        return jsonResponse({ ok: true, values: [] });
      }
      var lastCol = Math.max(sheet.getLastColumn(), 1);
      var values = sheet.getRange(2, 1, sheet.getLastRow() - 1, lastCol).getDisplayValues();
      return jsonResponse({ ok: true, values: values });
    }

    if (action === 'readAllTabs') {
      var titles = body.sheetTitles || [];
      var result = {};
      for (var t = 0; t < titles.length; t++) {
        var title = titles[t];
        var sh = ss.getSheetByName(title);
        if (!sh || sh.getLastRow() <= 1) {
          result[title] = [];
        } else {
          result[title] = sh.getRange(2, 1, sh.getLastRow() - 1, Math.max(sh.getLastColumn(), 1)).getDisplayValues();
        }
      }
      return jsonResponse({ ok: true, tabs: result });
    }

    if (action === 'appendRow') {
      var shAppend = ensureSheetWithHeaders(ss, body.sheetTitle, body.headers || []);
      if (body.row && body.row.length > 0) {
        shAppend.appendRow(body.row);
      }
      return jsonResponse({ ok: true });
    }

    if (action === 'syncTab') {
      var shSync = ensureSheetWithHeaders(ss, body.sheetTitle, body.headers || []);
      var headers = body.headers || [];
      if (headers.length > 0) {
        shSync.getRange(1, 1, 1, headers.length).setValues([headers]);
        shSync.setFrozenRows(1);
      }
      var maxRows = Math.max(shSync.getLastRow(), 2);
      var cols = Math.max(headers.length, shSync.getLastColumn(), 1);
      if (maxRows >= 2) {
        shSync.getRange(2, 1, maxRows - 1, cols).clearContent();
      }
      var rows = body.rows || [];
      if (rows.length > 0) {
        var normalized = rows.map(function (r) {
          var copy = r.slice(0, cols);
          while (copy.length < cols) copy.push('');
          return copy;
        });
        shSync.getRange(2, 1, normalized.length, cols).setValues(normalized);
      }
      return jsonResponse({ ok: true, count: rows.length });
    }

    if (action === 'uploadFile') {
      var targetFolder = getOrCreateSubfolder(imageFolderId, body.folderName || '');
      var bytes = Utilities.base64Decode(body.base64Data || '');
      var blob = Utilities.newBlob(bytes, body.mimeType || 'image/jpeg', body.fileName || ('file_' + Date.now() + '.jpg'));
      var file = targetFolder.createFile(blob);
      try {
        file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      } catch (shareErr) {}
      return jsonResponse({
        ok: true,
        fileId: file.getId(),
        webViewLink: file.getUrl(),
        folderId: targetFolder.getId(),
        folderUrl: targetFolder.getUrl(),
      });
    }

    if (action === 'saveMasterDb') {
      var rootFolder = DriveApp.getFolderById(folderId);
      var existing = rootFolder.getFilesByName(MASTER_DB_FILENAME);
      var jsonStr = JSON.stringify(body.payload || {}, null, 2);
      var fileObj;
      if (existing.hasNext()) {
        fileObj = existing.next();
        fileObj.setContent(jsonStr);
      } else {
        fileObj = rootFolder.createFile(MASTER_DB_FILENAME, jsonStr, MimeType.PLAIN_TEXT);
      }
      return jsonResponse({
        ok: true,
        fileId: fileObj.getId(),
        modifiedTime: new Date().toISOString(),
      });
    }

    if (action === 'loadMasterDb') {
      var dbFolder = DriveApp.getFolderById(folderId);
      var files = dbFolder.getFilesByName(MASTER_DB_FILENAME);
      if (!files.hasNext()) {
        return jsonResponse({ ok: true, payload: null });
      }
      var dbFile = files.next();
      var parsed = JSON.parse(dbFile.getBlob().getDataAsString('UTF-8'));
      return jsonResponse({ ok: true, payload: parsed });
    }

    return jsonResponse({ ok: false, error: 'Unknown action: ' + action });
  } catch (err) {
    return jsonResponse({ ok: false, error: String(err) });
  }
}
`;
