import {
  AmbulanceVehicle,
  GoogleSheetsConfig,
  InspectionRecord,
  UserProfile,
  VehicleDamageItem,
  FuelLogRecord,
  EquipmentInspectionRecord,
  EquipmentRequisitionRecord,
} from '../types';
import { createFreshChecklist } from '../data/defaultChecklist';

const VEHICLES_STORAGE_KEY = 'bls_vehicles_fleet_v1';
const INSPECTIONS_STORAGE_KEY = 'bls_inspections_history_v1';
const CURRENT_USER_KEY = 'bls_current_user_v1';
const GSHEETS_CONFIG_KEY = 'bls_gsheets_config_v1';

export const DEFAULT_SPREADSHEET_ID = '10EdMnTOWwjj29DWxo5m0YZ_8MtfnekkMQApTaqosRiQ';
export const DEFAULT_SPREADSHEET_URL = `https://docs.google.com/spreadsheets/d/${DEFAULT_SPREADSHEET_ID}/edit`;
export const DEFAULT_DRIVE_FOLDER_ID = '1WjucI6gr3D-bgeZBXI6oqBgpJ01VHwS9';
export const DEFAULT_DRIVE_FOLDER_URL = `https://drive.google.com/drive/folders/${DEFAULT_DRIVE_FOLDER_ID}`;
export const DEFAULT_IMAGE_DRIVE_FOLDER_ID = '1SyOz2lK-1XxLoZRV9ZbloLUilgYizIc-';
export const DEFAULT_IMAGE_DRIVE_FOLDER_URL = `https://drive.google.com/drive/folders/${DEFAULT_IMAGE_DRIVE_FOLDER_ID}`;
export const DEFAULT_APPS_SCRIPT_URL = (
  import.meta.env.VITE_GOOGLE_APPS_SCRIPT_URL ||
  'https://script.google.com/macros/s/AKfycbwwGwchVxpUSAouAzvDwB8aPd0LAQKYQMZeUrV2UrgwoIB03KNkdVn243-x4a4Y5XtWgw/exec'
).trim();

// Clean SVG ambulance illustration placeholder
export function generateSvgCarPlaceholder(label: string, angle: string, color = '#2563eb'): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400" viewBox="0 0 600 400">
    <rect width="600" height="400" fill="#0f172a" />
    <pattern id="grid" width="30" height="30" patternUnits="userSpaceOnUse">
      <path d="M 30 0 L 0 0 0 30" fill="none" stroke="#1e293b" stroke-width="1"/>
    </pattern>
    <rect width="600" height="400" fill="url(#grid)" />
    
    <!-- Vehicle Body -->
    <rect x="90" y="140" width="420" height="150" rx="20" fill="#f8fafc" stroke="#cbd5e1" stroke-width="4"/>
    <rect x="130" y="160" width="100" height="50" rx="8" fill="#38bdf8" opacity="0.3"/>
    <rect x="250" y="160" width="110" height="50" rx="8" fill="#38bdf8" opacity="0.3"/>
    <rect x="380" y="160" width="100" height="50" rx="8" fill="#38bdf8" opacity="0.3"/>
    
    <!-- Emergency Light Bar -->
    <rect x="230" y="120" width="140" height="20" rx="6" fill="#ef4444"/>
    <rect x="290" y="120" width="80" height="20" rx="6" fill="#3b82f6"/>
    <circle cx="260" cy="130" r="4" fill="#ffffff" opacity="0.8"/>
    <circle cx="330" cy="130" r="4" fill="#ffffff" opacity="0.8"/>
    
    <!-- Star of Life / Cross -->
    <circle cx="300" cy="225" r="28" fill="${color}" opacity="0.9"/>
    <rect x="293" y="205" width="14" height="40" fill="#ffffff" rx="2"/>
    <rect x="280" y="218" width="40" height="14" fill="#ffffff" rx="2"/>
    
    <!-- Wheels -->
    <circle cx="170" cy="290" r="34" fill="#1e293b" stroke="#475569" stroke-width="6"/>
    <circle cx="170" cy="290" r="14" fill="#94a3b8"/>
    <circle cx="430" cy="290" r="34" fill="#1e293b" stroke="#475569" stroke-width="6"/>
    <circle cx="430" cy="290" r="14" fill="#94a3b8"/>
    
    <!-- Label Banner -->
    <rect x="150" y="335" width="300" height="36" rx="8" fill="#1e293b" stroke="#334155" stroke-width="1"/>
    <text x="300" y="358" font-family="sans-serif" font-size="15" font-weight="bold" fill="#38bdf8" text-anchor="middle">
      ${label} · ${angle}
    </text>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

// Single Source of Truth: All vehicles and inspections originate strictly from Google Drive & Sheets (No Mock Demo Data)
export const INITIAL_VEHICLES: AmbulanceVehicle[] = [];

export const INITIAL_INSPECTIONS: InspectionRecord[] = [];

const STAFF_STORAGE_KEY = 'bls_staff_members_v1';

export const INITIAL_STAFF: UserProfile[] = [];

export const DEFAULT_USER: UserProfile = {
  id: 'current-operator',
  name: 'เจ้าหน้าที่กู้ชีพ',
  role: 'staff',
  employeeId: 'EMT-001',
  status: 'active',
  email: '',
};

export const DEMO_USERS: Record<string, UserProfile> = {
  staff: DEFAULT_USER,
  executive: {
    ...DEFAULT_USER,
    id: 'current-executive',
    name: 'ผู้บริหาร (Executive)',
    role: 'executive',
    employeeId: 'EXE-001',
    position: 'ผู้บริหาร / ผู้บังคับบัญชา',
    department: 'ฝ่ายบริหาร',
  },
  admin: {
    ...DEFAULT_USER,
    id: 'current-admin',
    name: 'ผู้ดูแลระบบ (Admin)',
    role: 'admin',
    employeeId: 'ADM-001',
  },
};

export function deduplicateStaff(list: UserProfile[]): UserProfile[] {
  const map = new Map<string, UserProfile>();
  for (const item of list) {
    if (item && item.id) {
      map.set(item.id, item);
    }
  }
  return Array.from(map.values());
}

export function getStoredStaff(): UserProfile[] {
  try {
    const data = localStorage.getItem(STAFF_STORAGE_KEY);
    if (!data) {
      return [];
    }
    const parsed: UserProfile[] = JSON.parse(data);
    if (!Array.isArray(parsed)) return [];
    const clean = deduplicateStaff(parsed);
    if (clean.length !== parsed.length) {
      localStorage.setItem(STAFF_STORAGE_KEY, JSON.stringify(clean));
    }
    return clean;
  } catch (e) {
    console.error('Error loading staff from localStorage', e);
    return [];
  }
}

export function saveStaff(staffList: UserProfile[]) {
  try {
    const clean = deduplicateStaff(staffList);
    localStorage.setItem(STAFF_STORAGE_KEY, JSON.stringify(clean));
  } catch (e) {
    console.error('Error saving staff to localStorage', e);
  }
}

// Storage Access Functions
export function getStoredVehicles(): AmbulanceVehicle[] {
  try {
    const data = localStorage.getItem(VEHICLES_STORAGE_KEY);
    if (!data) {
      return [];
    }
    const parsed: AmbulanceVehicle[] = JSON.parse(data);
    if (!Array.isArray(parsed)) return [];
    // Single Source of Truth: Purge mock demo vehicles
    const realVehicles = parsed.filter(
      (v) => v.id !== 'veh-01' && v.id !== 'veh-02' && v.id !== 'veh-03' && v.id !== 'veh-04'
    );
    if (realVehicles.length !== parsed.length) {
      localStorage.setItem(VEHICLES_STORAGE_KEY, JSON.stringify(realVehicles));
    }
    return realVehicles;
  } catch (e) {
    console.error('Error loading vehicles from localStorage', e);
    return [];
  }
}

export function saveVehicles(vehicles: AmbulanceVehicle[]) {
  try {
    localStorage.setItem(VEHICLES_STORAGE_KEY, JSON.stringify(vehicles));
  } catch (e) {
    console.error('Error saving vehicles to localStorage', e);
  }
}

import {
  idbSaveInspection,
  idbGetAllInspections,
  idbDeleteInspection,
  idbClearAllInspections,
} from './indexedDb';

export function safelyPersistInspections(records: InspectionRecord[]) {
  try {
    localStorage.setItem(INSPECTIONS_STORAGE_KEY, JSON.stringify(records));
  } catch (quotaErr) {
    console.warn('LocalStorage quota warning, compressing storage payload...', quotaErr);
    try {
      // Keep full base64 data in IndexedDB, and in localStorage substitute Drive URLs for large inline images beyond the first record
      const compacted = records.slice(0, 20).map((r, idx) => {
        if (idx === 0) return r; // keep the newest one
        const resolveCompactSide = (photoVal?: string, driveUrl?: string) => {
          if (!photoVal || photoVal.length <= 4000) return photoVal || driveUrl || '';
          return toDisplayableDriveImageUrl(undefined, driveUrl) || driveUrl || '';
        };
        return {
          ...r,
          photos: {
            front: resolveCompactSide(r.photos?.front, r.driveLinks?.frontPhotoUrl),
            rear: resolveCompactSide(r.photos?.rear, r.driveLinks?.rearPhotoUrl),
            left: resolveCompactSide(r.photos?.left, r.driveLinks?.leftPhotoUrl),
            right: resolveCompactSide(r.photos?.right, r.driveLinks?.rightPhotoUrl),
          },
          documentAttachment: r.documentAttachment
            ? {
                ...r.documentAttachment,
                dataUrl:
                  r.documentAttachment.dataUrl && r.documentAttachment.dataUrl.length <= 4000
                    ? r.documentAttachment.dataUrl
                    : r.driveLinks?.documentUrl || '',
              }
            : undefined,
        };
      });
      localStorage.setItem(INSPECTIONS_STORAGE_KEY, JSON.stringify(compacted));
    } catch (err2) {
      console.warn('LocalStorage still full, storing metadata + Drive URLs only', err2);
      try {
        const lightweight = records.slice(0, 12).map((r) => ({
          ...r,
          photos: {
            front:
              r.photos?.front && !r.photos.front.startsWith('data:')
                ? r.photos.front
                : toDisplayableDriveImageUrl(undefined, r.driveLinks?.frontPhotoUrl) ||
                  r.driveLinks?.frontPhotoUrl ||
                  '',
            rear:
              r.photos?.rear && !r.photos.rear.startsWith('data:')
                ? r.photos.rear
                : toDisplayableDriveImageUrl(undefined, r.driveLinks?.rearPhotoUrl) ||
                  r.driveLinks?.rearPhotoUrl ||
                  '',
            left:
              r.photos?.left && !r.photos.left.startsWith('data:')
                ? r.photos.left
                : toDisplayableDriveImageUrl(undefined, r.driveLinks?.leftPhotoUrl) ||
                  r.driveLinks?.leftPhotoUrl ||
                  '',
            right:
              r.photos?.right && !r.photos.right.startsWith('data:')
                ? r.photos.right
                : toDisplayableDriveImageUrl(undefined, r.driveLinks?.rightPhotoUrl) ||
                  r.driveLinks?.rightPhotoUrl ||
                  '',
          },
          documentAttachment: r.documentAttachment
            ? {
                name: r.documentAttachment.name,
                type: r.documentAttachment.type,
                dataUrl: r.driveLinks?.documentUrl || '',
              }
            : undefined,
        }));
        localStorage.setItem(INSPECTIONS_STORAGE_KEY, JSON.stringify(lightweight));
      } catch (err3) {
        console.error('LocalStorage quota fully exceeded, records remain safely saved in IndexedDB', err3);
      }
    }
  }
}

export function getStoredInspections(): InspectionRecord[] {
  try {
    const data = localStorage.getItem(INSPECTIONS_STORAGE_KEY);
    if (!data) {
      return [];
    }
    const parsed: InspectionRecord[] = JSON.parse(data);
    if (!Array.isArray(parsed)) return [];
    // Single Source of Truth: Purge mock demo inspections
    const realInspections = parsed.filter(
      (i) => i.id !== 'insp-20261107-001' && i.id !== 'insp-20261106-002'
    );
    if (realInspections.length !== parsed.length) {
      safelyPersistInspections(realInspections);
    }
    return realInspections;
  } catch (e) {
    console.error('Error loading inspections from localStorage', e);
    return [];
  }
}

export function saveInspectionRecord(record: InspectionRecord): InspectionRecord[] {
  const current = getStoredInspections();
  const updated = [record, ...current.filter((r) => r.id !== record.id)];

  // Always save to IndexedDB (safe from quota limitations)
  idbSaveInspection(record).catch((err) => console.warn('IDB save warning:', err));

  // Safely persist to localStorage with quota protection
  safelyPersistInspections(updated);

  // Update vehicle's last inspection date and status
  const vehicles = getStoredVehicles();
  const targetVeh = vehicles.find((v) => v.id === record.vehicleId);
  if (targetVeh) {
    targetVeh.lastInspectionDate = record.uploadTimestamp;
    const roleLabel =
      record.inspectorRole === 'admin'
        ? 'Admin'
        : record.inspectorRole === 'executive'
        ? 'Executive'
        : 'Staff';
    targetVeh.lastInspector = `${record.inspectorName} (${roleLabel})`;
    targetVeh.currentOdometer = record.odometerReading;
    if (record.overallStatus === 'needs_repair') {
      targetVeh.status = 'maintenance';
    } else if (record.overallStatus === 'issue_found') {
      targetVeh.status = 'issue_found';
    } else {
      targetVeh.status = 'available';
    }
    saveVehicles(vehicles);
  }

  return updated;
}

export function updateInspectionRecord(updatedRecord: InspectionRecord) {
  const list = getStoredInspections();
  const idx = list.findIndex((r) => r.id === updatedRecord.id);
  if (idx >= 0) {
    list[idx] = updatedRecord;
    safelyPersistInspections(list);
    idbSaveInspection(updatedRecord).catch((err) => console.warn('IDB update warning:', err));
  }
}

export function deleteInspectionRecord(recordId: string): InspectionRecord[] {
  const list = getStoredInspections().filter((r) => r.id !== recordId);
  safelyPersistInspections(list);
  idbDeleteInspection(recordId).catch((err) => console.warn('IDB delete warning:', err));
  return list;
}

export function clearAllInspectionRecords(): InspectionRecord[] {
  safelyPersistInspections([]);
  idbClearAllInspections().catch((err) => console.warn('IDB clear warning:', err));
  return [];
}

export function replaceAllInspections(records: InspectionRecord[]): InspectionRecord[] {
  safelyPersistInspections(records);
  idbClearAllInspections()
    .then(() => Promise.all(records.map((rec) => idbSaveInspection(rec))))
    .catch((err) => console.warn('IDB replaceAll warning:', err));
  return records;
}

function pickBestSidePhoto(a?: string, b?: string, driveUrl?: string): string {
  const isInlinePhoto = (val?: string) =>
    Boolean(val && val.startsWith('data:image/') && !val.startsWith('data:image/svg+xml'));
  if (isInlinePhoto(a)) return a as string;
  if (isInlinePhoto(b)) return b as string;
  return (
    (a && a.trim()) ||
    (b && b.trim()) ||
    toDisplayableDriveImageUrl(undefined, driveUrl) ||
    ''
  );
}

export function mergeInspectionRecordMedia(
  primary: InspectionRecord,
  secondary?: InspectionRecord
): InspectionRecord {
  if (!secondary) return primary;
  const mergedDriveLinks = {
    ...(secondary.driveLinks || {}),
    ...(primary.driveLinks || {}),
  };
  return {
    ...primary,
    photos: {
      front: pickBestSidePhoto(
        primary.photos?.front,
        secondary.photos?.front,
        mergedDriveLinks.frontPhotoUrl
      ),
      rear: pickBestSidePhoto(
        primary.photos?.rear,
        secondary.photos?.rear,
        mergedDriveLinks.rearPhotoUrl
      ),
      left: pickBestSidePhoto(
        primary.photos?.left,
        secondary.photos?.left,
        mergedDriveLinks.leftPhotoUrl
      ),
      right: pickBestSidePhoto(
        primary.photos?.right,
        secondary.photos?.right,
        mergedDriveLinks.rightPhotoUrl
      ),
    },
    documentAttachment:
      primary.documentAttachment?.dataUrl
        ? primary.documentAttachment
        : secondary.documentAttachment || primary.documentAttachment,
    driveLinks: Object.keys(mergedDriveLinks).length > 0 ? mergedDriveLinks : undefined,
  };
}

export async function syncInspectionsFromIndexedDb(): Promise<InspectionRecord[]> {
  const localRecords = getStoredInspections();
  try {
    const idbRecords = await idbGetAllInspections();
    if (idbRecords && idbRecords.length > 0) {
      const localMap = new Map(localRecords.map((r) => [r.id, r]));
      const idbMap = new Map(idbRecords.map((r) => [r.id, r]));
      const merged: InspectionRecord[] = idbRecords.map((idbRec) =>
        mergeInspectionRecordMedia(idbRec, localMap.get(idbRec.id))
      );
      for (const loc of localRecords) {
        if (!idbMap.has(loc.id)) {
          merged.push(loc);
        }
      }
      merged.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      return merged;
    }
  } catch (e) {
    console.warn('Sync from IDB error:', e);
  }
  return localRecords;
}

export function clearAllSystemData(clearVehiclesAndStaff = false) {
  try {
    localStorage.setItem(INSPECTIONS_STORAGE_KEY, JSON.stringify([]));
    idbClearAllInspections().catch(() => {});
    if (clearVehiclesAndStaff) {
      localStorage.setItem(VEHICLES_STORAGE_KEY, JSON.stringify([]));
    }
  } catch (e) {
    console.error(e);
  }
}

export function resetToInitialDemoData() {
  try {
    localStorage.removeItem(VEHICLES_STORAGE_KEY);
    localStorage.removeItem(INSPECTIONS_STORAGE_KEY);
    localStorage.removeItem(STAFF_STORAGE_KEY);
    localStorage.removeItem(DAMAGE_RECORDS_KEY);
    localStorage.removeItem(FUEL_LOGS_KEY);
    localStorage.removeItem(EQUIPMENT_INSPECTIONS_KEY);
    localStorage.removeItem(EQUIPMENT_REQUISITIONS_KEY);
    idbClearAllInspections().catch(() => {});
  } catch (e) {
    console.error(e);
  }
}

export function getCurrentUser(): UserProfile {
  try {
    const data = localStorage.getItem(CURRENT_USER_KEY);
    if (!data) {
      return DEMO_USERS.staff;
    }
    return JSON.parse(data);
  } catch (e) {
    return DEMO_USERS.staff;
  }
}

export function setCurrentUser(user: UserProfile) {
  try {
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
  } catch (e) {
    console.error(e);
  }
}

export function getGoogleSheetsConfig(): GoogleSheetsConfig {
  const defaults: GoogleSheetsConfig = {
    spreadsheetId: DEFAULT_SPREADSHEET_ID,
    spreadsheetUrl: DEFAULT_SPREADSHEET_URL,
    driveFolderId: DEFAULT_DRIVE_FOLDER_ID,
    driveFolderUrl: DEFAULT_DRIVE_FOLDER_URL,
    imageDriveFolderId: DEFAULT_IMAGE_DRIVE_FOLDER_ID,
    imageDriveFolderUrl: DEFAULT_IMAGE_DRIVE_FOLDER_URL,
    appsScriptUrl: DEFAULT_APPS_SCRIPT_URL,
    autoSync: true,
  };
  try {
    const data = localStorage.getItem(GSHEETS_CONFIG_KEY);
    if (!data) {
      return defaults;
    }
    const parsed: GoogleSheetsConfig = JSON.parse(data);
    const resolvedSheetId = parsed.spreadsheetId || DEFAULT_SPREADSHEET_ID;
    const resolvedFolderId = parsed.driveFolderId || DEFAULT_DRIVE_FOLDER_ID;
    const resolvedImageFolderId = parsed.imageDriveFolderId || DEFAULT_IMAGE_DRIVE_FOLDER_ID;
    return {
      ...defaults,
      ...parsed,
      spreadsheetId: resolvedSheetId,
      spreadsheetUrl:
        parsed.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${resolvedSheetId}/edit`,
      driveFolderId: resolvedFolderId,
      driveFolderUrl:
        parsed.driveFolderUrl || `https://drive.google.com/drive/folders/${resolvedFolderId}`,
      imageDriveFolderId: resolvedImageFolderId,
      imageDriveFolderUrl:
        parsed.imageDriveFolderUrl ||
        `https://drive.google.com/drive/folders/${resolvedImageFolderId}`,
      appsScriptUrl: (parsed.appsScriptUrl || DEFAULT_APPS_SCRIPT_URL).trim(),
    };
  } catch (e) {
    return defaults;
  }
}

export function saveGoogleSheetsConfig(config: GoogleSheetsConfig) {
  try {
    const resolvedSheetId = config.spreadsheetId || DEFAULT_SPREADSHEET_ID;
    const resolvedFolderId = config.driveFolderId || DEFAULT_DRIVE_FOLDER_ID;
    const resolvedImageFolderId = config.imageDriveFolderId || DEFAULT_IMAGE_DRIVE_FOLDER_ID;
    const normalized: GoogleSheetsConfig = {
      ...config,
      spreadsheetId: resolvedSheetId,
      spreadsheetUrl:
        config.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${resolvedSheetId}/edit`,
      driveFolderId: resolvedFolderId,
      driveFolderUrl:
        config.driveFolderUrl || `https://drive.google.com/drive/folders/${resolvedFolderId}`,
      imageDriveFolderId: resolvedImageFolderId,
      imageDriveFolderUrl:
        config.imageDriveFolderUrl ||
        `https://drive.google.com/drive/folders/${resolvedImageFolderId}`,
      appsScriptUrl: (config.appsScriptUrl || DEFAULT_APPS_SCRIPT_URL).trim(),
    };
    localStorage.setItem(GSHEETS_CONFIG_KEY, JSON.stringify(normalized));
  } catch (e) {
    console.error(e);
  }
}

// ============================================
// รอยรอบตัวรถ (Damage Records) Persistence
// ============================================
const DAMAGE_RECORDS_KEY = 'bls_vehicle_damages_v1';

export function generateSvgDamagePlaceholder(area: string, description: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="450" viewBox="0 0 600 450">
    <rect width="600" height="450" fill="#1e293b" />
    <circle cx="300" cy="190" r="100" fill="#334155" stroke="#f59e0b" stroke-width="4" stroke-dasharray="8 6"/>
    <path d="M 240 170 Q 290 220 360 180 M 270 150 L 330 230" stroke="#ef4444" stroke-width="7" stroke-linecap="round"/>
    <text x="300" y="330" fill="#f8fafc" font-size="20" font-family="sans-serif" font-weight="bold" text-anchor="middle">
      ตำแหน่ง: ${area}
    </text>
    <text x="300" y="365" fill="#94a3b8" font-size="14" font-family="sans-serif" text-anchor="middle">
      ${description}
    </text>
    <rect x="20" y="20" width="130" height="32" rx="6" fill="#ef4444" opacity="0.9"/>
    <text x="85" y="41" fill="#ffffff" font-size="12" font-weight="bold" font-family="sans-serif" text-anchor="middle">
      รอยแผลตัวรถ
    </text>
  </svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

// Single Source of Truth: All damage records originate strictly from Google Drive & Sheets
export const INITIAL_DAMAGE_ITEMS: VehicleDamageItem[] = [];

export function getStoredDamageRecords(): VehicleDamageItem[] {
  try {
    const data = localStorage.getItem(DAMAGE_RECORDS_KEY);
    if (!data) {
      return [];
    }
    const parsed: VehicleDamageItem[] = JSON.parse(data);
    if (!Array.isArray(parsed)) return [];

    // Purge mock demo items ('dmg-01', 'dmg-02', 'dmg-03') so data matches Google Drive & Sheets exactly
    const realItems = parsed.filter(
      (d) => d.id !== 'dmg-01' && d.id !== 'dmg-02' && d.id !== 'dmg-03'
    );
    if (realItems.length !== parsed.length) {
      localStorage.setItem(DAMAGE_RECORDS_KEY, JSON.stringify(realItems));
    }
    return realItems;
  } catch (e) {
    console.error('Error loading damage records', e);
    return [];
  }
}

export function saveDamageRecord(item: VehicleDamageItem): VehicleDamageItem[] {
  try {
    const list = getStoredDamageRecords();
    const idx = list.findIndex((d) => d.id === item.id);
    if (idx >= 0) {
      list[idx] = item;
    } else {
      list.unshift(item);
    }
    localStorage.setItem(DAMAGE_RECORDS_KEY, JSON.stringify(list));
    return list;
  } catch (e) {
    console.error('Error saving damage record', e);
    return getStoredDamageRecords();
  }
}

export function saveAllDamageRecords(records: VehicleDamageItem[]) {
  try {
    localStorage.setItem(DAMAGE_RECORDS_KEY, JSON.stringify(records));
  } catch (e) {
    console.error('Error saving all damage records', e);
  }
}

export function deleteDamageRecord(id: string): VehicleDamageItem[] {
  try {
    const list = getStoredDamageRecords().filter((d) => d.id !== id);
    localStorage.setItem(DAMAGE_RECORDS_KEY, JSON.stringify(list));
    return list;
  } catch (e) {
    console.error('Error deleting damage record', e);
    return getStoredDamageRecords();
  }
}

// ============================================
// ประวัติการเติมน้ำมัน (Fuel Log) Persistence
// ============================================
const FUEL_LOGS_KEY = 'bls_fuel_logs_v1';

// Single Source of Truth: All fuel logs originate strictly from Google Drive & Sheets
export const INITIAL_FUEL_LOGS: FuelLogRecord[] = [];

export function getStoredFuelLogs(): FuelLogRecord[] {
  try {
    const data = localStorage.getItem(FUEL_LOGS_KEY);
    if (!data) {
      return [];
    }
    const parsed: FuelLogRecord[] = JSON.parse(data);
    if (!Array.isArray(parsed)) return [];
    // Single Source of Truth: Purge mock demo fuel logs
    const realLogs = parsed.filter(
      (f) =>
        f.id !== 'fuel-01' &&
        f.id !== 'fuel-02' &&
        f.id !== 'fuel-03' &&
        f.id !== 'fuel-04' &&
        f.id !== 'fuel-05'
    );
    if (realLogs.length !== parsed.length) {
      localStorage.setItem(FUEL_LOGS_KEY, JSON.stringify(realLogs));
    }
    return realLogs;
  } catch (e) {
    console.error('Error loading fuel logs', e);
    return [];
  }
}

/**
 * Get the latest recorded fuel odometer for a given vehicle
 */
export function getLatestFuelOdometer(vehicleId: string): number | null {
  const logs = getStoredFuelLogs().filter((l) => l.vehicleId === vehicleId);
  if (logs.length === 0) return null;
  // Sort descending by odometer
  logs.sort((a, b) => b.odometer - a.odometer);
  return logs[0].odometer;
}

export function saveFuelLog(record: FuelLogRecord): FuelLogRecord[] {
  try {
    const list = getStoredFuelLogs();
    const idx = list.findIndex((f) => f.id === record.id);
    if (idx >= 0) {
      list[idx] = record;
    } else {
      list.unshift(record);
    }
    localStorage.setItem(FUEL_LOGS_KEY, JSON.stringify(list));
    return list;
  } catch (e) {
    console.error('Error saving fuel log', e);
    return getStoredFuelLogs();
  }
}

export function deleteFuelLog(id: string): FuelLogRecord[] {
  try {
    const list = getStoredFuelLogs().filter((f) => f.id !== id);
    localStorage.setItem(FUEL_LOGS_KEY, JSON.stringify(list));
    return list;
  } catch (e) {
    console.error('Error deleting fuel log', e);
    return getStoredFuelLogs();
  }
}

export function saveAllFuelLogs(logs: FuelLogRecord[]) {
  try {
    localStorage.setItem(FUEL_LOGS_KEY, JSON.stringify(logs));
  } catch (e) {
    console.error('Error saving all fuel logs', e);
  }
}

export function extractGoogleDriveFileId(url?: string): string | undefined {
  if (!url) return undefined;
  const trimmed = url.trim();
  const fileMatch =
    trimmed.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) ||
    trimmed.match(/[?&]id=([a-zA-Z0-9_-]+)/) ||
    trimmed.match(/lh3\.googleusercontent\.com\/d\/([a-zA-Z0-9_-]+)/);
  return fileMatch?.[1];
}

/**
 * Converts a Google Drive webViewLink or raw image URL into a displayable <img> src
 */
export function toDisplayableDriveImageUrl(rawUrl?: string, driveUrl?: string): string | undefined {
  const isSvg = (u?: string) => Boolean(u && u.startsWith('data:image/svg+xml'));
  if (rawUrl && !isSvg(rawUrl)) {
    if (
      rawUrl.startsWith('data:image/') ||
      rawUrl.startsWith('blob:') ||
      (rawUrl.startsWith('http') &&
        !rawUrl.includes('drive.google.com/file/d/') &&
        !rawUrl.includes('drive.google.com/open') &&
        !rawUrl.includes('drive.google.com/uc'))
    ) {
      return rawUrl;
    }
  }
  const target = (rawUrl && !isSvg(rawUrl) ? rawUrl : undefined) || driveUrl;
  if (target) {
    const fileId = extractGoogleDriveFileId(target);
    if (fileId) {
      return `https://lh3.googleusercontent.com/d/${fileId}=w1200`;
    }
    if (target.startsWith('http') || target.startsWith('data:')) {
      return target;
    }
  }
  return rawUrl || undefined;
}

/**
 * Returns an ordered list of image URLs to attempt when loading historical inspection/damage photos
 */
export function getDriveImageFallbackUrls(rawUrl?: string, driveUrl?: string): string[] {
  const candidates: string[] = [];
  const pushUnique = (u?: string) => {
    if (u && u.trim() && !candidates.includes(u.trim())) {
      candidates.push(u.trim());
    }
  };

  if (rawUrl && (rawUrl.startsWith('data:image/') || rawUrl.startsWith('blob:'))) {
    pushUnique(rawUrl);
  }

  const primary = toDisplayableDriveImageUrl(rawUrl, driveUrl);
  pushUnique(primary);

  const fileId = extractGoogleDriveFileId(rawUrl) || extractGoogleDriveFileId(driveUrl);
  if (fileId) {
    pushUnique(`https://lh3.googleusercontent.com/d/${fileId}=w1200`);
    pushUnique(`https://drive.google.com/thumbnail?id=${fileId}&sz=w1200`);
    pushUnique(`https://drive.google.com/uc?export=view&id=${fileId}`);
  }

  return candidates;
}

// ============================================
// ตรวจความพร้อมอุปกรณ์หน่วยปฏิบัติการแพทย์ระดับพื้นฐาน (กู้ชีพ อบต.หงษ์เจริญ)
// ============================================
const EQUIPMENT_INSPECTIONS_KEY = 'bls_equipment_inspections_v1';

export function getStoredEquipmentInspections(): EquipmentInspectionRecord[] {
  try {
    const data = localStorage.getItem(EQUIPMENT_INSPECTIONS_KEY);
    if (!data) return [];
    const parsed: EquipmentInspectionRecord[] = JSON.parse(data);
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch (e) {
    console.error('Error loading equipment inspections from localStorage', e);
    return [];
  }
}

export function saveEquipmentInspection(record: EquipmentInspectionRecord): EquipmentInspectionRecord[] {
  try {
    const list = getStoredEquipmentInspections();
    const idx = list.findIndex((r) => r.id === record.id);
    if (idx >= 0) {
      list[idx] = record;
    } else {
      list.unshift(record);
    }
    localStorage.setItem(EQUIPMENT_INSPECTIONS_KEY, JSON.stringify(list));
    return list;
  } catch (e) {
    console.error('Error saving equipment inspection', e);
    return getStoredEquipmentInspections();
  }
}

export function saveAllEquipmentInspections(records: EquipmentInspectionRecord[]) {
  try {
    localStorage.setItem(EQUIPMENT_INSPECTIONS_KEY, JSON.stringify(records));
  } catch (e) {
    console.error('Error saving all equipment inspections', e);
  }
}

export function deleteEquipmentInspection(id: string): EquipmentInspectionRecord[] {
  try {
    const list = getStoredEquipmentInspections().filter((r) => r.id !== id);
    localStorage.setItem(EQUIPMENT_INSPECTIONS_KEY, JSON.stringify(list));
    return list;
  } catch (e) {
    console.error('Error deleting equipment inspection', e);
    return getStoredEquipmentInspections();
  }
}

// ============================================
// ระบบเบิกอุปกรณ์และเวชภัณฑ์ (กู้ชีพ อบต.หงษ์เจริญ)
// ============================================
const EQUIPMENT_REQUISITIONS_KEY = 'bls_equipment_requisitions_v1';

export function getStoredEquipmentRequisitions(): EquipmentRequisitionRecord[] {
  try {
    const data = localStorage.getItem(EQUIPMENT_REQUISITIONS_KEY);
    if (!data) return [];
    const parsed: EquipmentRequisitionRecord[] = JSON.parse(data);
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch (e) {
    console.error('Error loading equipment requisitions from localStorage', e);
    return [];
  }
}

export function saveEquipmentRequisition(record: EquipmentRequisitionRecord): EquipmentRequisitionRecord[] {
  try {
    const list = getStoredEquipmentRequisitions();
    const idx = list.findIndex((r) => r.id === record.id);
    if (idx >= 0) {
      list[idx] = record;
    } else {
      list.unshift(record);
    }
    localStorage.setItem(EQUIPMENT_REQUISITIONS_KEY, JSON.stringify(list));
    return list;
  } catch (e) {
    console.error('Error saving equipment requisition', e);
    return getStoredEquipmentRequisitions();
  }
}

export function saveAllEquipmentRequisitions(records: EquipmentRequisitionRecord[]) {
  try {
    localStorage.setItem(EQUIPMENT_REQUISITIONS_KEY, JSON.stringify(records));
  } catch (e) {
    console.error('Error saving all equipment requisitions', e);
  }
}

export function deleteEquipmentRequisition(id: string): EquipmentRequisitionRecord[] {
  try {
    const list = getStoredEquipmentRequisitions().filter((r) => r.id !== id);
    localStorage.setItem(EQUIPMENT_REQUISITIONS_KEY, JSON.stringify(list));
    return list;
  } catch (e) {
    console.error('Error deleting equipment requisition', e);
    return getStoredEquipmentRequisitions();
  }
}


