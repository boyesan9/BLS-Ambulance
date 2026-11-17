import React, { useEffect, useState } from 'react';
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
import {
  X,
  FileSpreadsheet,
  ExternalLink,
  RefreshCw,
  Plus,
  CheckCircle2,
  AlertCircle,
  LogIn,
  DownloadCloud,
  Activity,
  Truck,
  Users,
  Car,
  Fuel,
  PackageCheck,
  PackagePlus,
  Copy,
  Check,
  FolderOpen,
  Code2,
  Zap,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import {
  createInspectionSpreadsheet,
  syncInspectionsToSheet,
  syncVehiclesToSheet,
  syncStaffToSheet,
  appendAuditLogToSheet,
  pullAllDataFromGoogleSheets,
  ensureAllSpreadsheetTabs,
  syncDamageToSheet,
  syncFuelLogsToSheet,
  syncEquipmentInspectionsToSheet,
  syncRequisitionsToSheet,
  INSPECTION_SHEET_TITLE,
  VEHICLES_SHEET_TITLE,
  STAFF_SHEET_TITLE,
  AUDIT_LOG_SHEET_TITLE,
  DAMAGE_SHEET_TITLE,
  FUEL_SHEET_TITLE,
  EQUIPMENT_SHEET_TITLE,
  REQUISITION_SHEET_TITLE,
} from '../services/googleSheets';
import { uploadInspectionMediaToDrive, saveMasterDatabaseToDrive } from '../services/googleDrive';
import { googleSignIn, getAccessToken } from '../services/firebaseAuth';
import {
  DEFAULT_DRIVE_FOLDER_ID,
  DEFAULT_IMAGE_DRIVE_FOLDER_ID,
  DEFAULT_SPREADSHEET_ID,
  getStoredDamageRecords,
  getStoredFuelLogs,
  getStoredEquipmentInspections,
  getStoredEquipmentRequisitions,
} from '../services/storage';
import {
  callAppsScriptBridge,
  extractGoogleResourceId,
  GENERATED_APPS_SCRIPT_CODE,
  getActiveAppsScriptUrl,
  hasNoLoginBridge,
} from '../services/googleBridge';
import { User } from 'firebase/auth';

interface GoogleSheetsModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: GoogleSheetsConfig;
  onSaveConfig: (config: GoogleSheetsConfig) => void;
  inspections: InspectionRecord[];
  onUpdateInspection: (record: InspectionRecord) => void;
  googleUser: User | null;
  onGoogleLoginSuccess: (user: User) => void;
  vehicles: AmbulanceVehicle[];
  staffList: UserProfile[];
  currentUser: UserProfile;
  damageRecords?: VehicleDamageItem[];
  fuelLogs?: FuelLogRecord[];
  equipmentInspections?: EquipmentInspectionRecord[];
  equipmentRequisitions?: EquipmentRequisitionRecord[];
  onSyncBackData?: (data: {
    vehicles: AmbulanceVehicle[];
    staffList: UserProfile[];
    inspections?: InspectionRecord[];
    inspectionsCount: number;
    damageRecords?: VehicleDamageItem[];
    fuelLogs?: FuelLogRecord[];
    equipmentInspections?: EquipmentInspectionRecord[];
    equipmentRequisitions?: EquipmentRequisitionRecord[];
  }) => void;
}

export const GoogleSheetsModal: React.FC<GoogleSheetsModalProps> = ({
  isOpen,
  onClose,
  config,
  onSaveConfig,
  inspections,
  onUpdateInspection,
  googleUser,
  onGoogleLoginSuccess,
  vehicles,
  staffList,
  currentUser,
  damageRecords,
  fuelLogs,
  equipmentInspections,
  equipmentRequisitions,
  onSyncBackData,
}) => {
  const [spreadsheetId, setSpreadsheetId] = useState(config.spreadsheetId || DEFAULT_SPREADSHEET_ID);
  const [driveFolderId, setDriveFolderId] = useState(config.driveFolderId || DEFAULT_DRIVE_FOLDER_ID);
  const [imageDriveFolderId, setImageDriveFolderId] = useState(
    config.imageDriveFolderId || DEFAULT_IMAGE_DRIVE_FOLDER_ID
  );
  const [appsScriptUrl, setAppsScriptUrl] = useState(config.appsScriptUrl || getActiveAppsScriptUrl());
  const [isCreating, setIsCreating] = useState(false);
  const [isSyncingAll, setIsSyncingAll] = useState(false);
  const [isPullingData, setIsPullingData] = useState(false);
  const [isTestingBridge, setIsTestingBridge] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [showScriptCode, setShowScriptCode] = useState(false);
  const [copiedScript, setCopiedScript] = useState(false);
  const [copiedDomain, setCopiedDomain] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (isOpen) {
      setSpreadsheetId(config.spreadsheetId || DEFAULT_SPREADSHEET_ID);
      setDriveFolderId(config.driveFolderId || DEFAULT_DRIVE_FOLDER_ID);
      setImageDriveFolderId(config.imageDriveFolderId || DEFAULT_IMAGE_DRIVE_FOLDER_ID);
      setAppsScriptUrl(config.appsScriptUrl || getActiveAppsScriptUrl());
      setStatusMessage(null);
    }
  }, [
    isOpen,
    config.spreadsheetId,
    config.driveFolderId,
    config.imageDriveFolderId,
    config.appsScriptUrl,
  ]);

  if (!isOpen || currentUser.role !== 'admin') return null;

  const cleanCurrentSheetId = extractGoogleResourceId(spreadsheetId) || DEFAULT_SPREADSHEET_ID;
  const cleanCurrentDriveId = extractGoogleResourceId(driveFolderId) || DEFAULT_DRIVE_FOLDER_ID;
  const cleanCurrentImageDriveId =
    extractGoogleResourceId(imageDriveFolderId) || DEFAULT_IMAGE_DRIVE_FOLDER_ID;
  const activeBridgeUrl = appsScriptUrl.trim();
  const isBridgeReady = Boolean(activeBridgeUrl || hasNoLoginBridge());

  const handleGoogleSignIn = async (forcePopup = false) => {
    setIsLoggingIn(true);
    setStatusMessage(null);
    let wasRedirected = false;
    try {
      const res = await googleSignIn({ intent: { type: 'sheets_modal' }, forcePopup });
      if (res?.redirected) {
        wasRedirected = true;
        return;
      }
      if (res?.user) {
        onGoogleLoginSuccess(res.user);
        setStatusMessage({
          type: 'success',
          text: `เชื่อมต่อกับบัญชี Google: ${res.user.email} สำเร็จ!`,
        });
      }
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: err.message || 'ไม่สามารถเข้าสู่ระบบ Google ได้',
      });
    } finally {
      if (!wasRedirected) {
        setIsLoggingIn(false);
      }
    }
  };

  const handleSaveBridgeUrl = () => {
    const cleanUrl = appsScriptUrl.trim();
    onSaveConfig({
      ...config,
      spreadsheetId: cleanCurrentSheetId,
      spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${cleanCurrentSheetId}/edit`,
      driveFolderId: cleanCurrentDriveId,
      driveFolderUrl: `https://drive.google.com/drive/folders/${cleanCurrentDriveId}`,
      imageDriveFolderId: cleanCurrentImageDriveId,
      imageDriveFolderUrl: `https://drive.google.com/drive/folders/${cleanCurrentImageDriveId}`,
      appsScriptUrl: cleanUrl,
    });
    setStatusMessage({
      type: 'success',
      text: cleanUrl
        ? 'บันทึก Apps Script Web App URL เรียบร้อยแล้ว ระบบพร้อมซิงค์ 2 ทางโดยไม่ต้องเข้า Google!'
        : 'ล้างค่า Apps Script URL แล้ว (ระบบยังอ่านชีตสาธารณะและเชื่อมต่อ ID ปลายทางตามปกติ)',
    });
  };

  const handleTestBridge = async () => {
    const cleanUrl = appsScriptUrl.trim();
    if (!cleanUrl) {
      setStatusMessage({
        type: 'error',
        text: 'กรุณาวางลิงก์ Apps Script Web App (/exec) ก่อนทดสอบเชื่อมต่อ',
      });
      return;
    }

    setIsTestingBridge(true);
    setStatusMessage(null);
    try {
      onSaveConfig({
        ...config,
        spreadsheetId: cleanCurrentSheetId,
        spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${cleanCurrentSheetId}/edit`,
        driveFolderId: cleanCurrentDriveId,
        driveFolderUrl: `https://drive.google.com/drive/folders/${cleanCurrentDriveId}`,
        imageDriveFolderId: cleanCurrentImageDriveId,
        imageDriveFolderUrl: `https://drive.google.com/drive/folders/${cleanCurrentImageDriveId}`,
        appsScriptUrl: cleanUrl,
      });

      const res = await callAppsScriptBridge<{
        ok: boolean;
        spreadsheetName?: string;
        folderName?: string;
        imageFolderName?: string;
      }>(
        'ping',
        {
          spreadsheetId: cleanCurrentSheetId,
          driveFolderId: cleanCurrentDriveId,
          imageDriveFolderId: cleanCurrentImageDriveId,
        },
        cleanUrl
      );

      setStatusMessage({
        type: 'success',
        text: `เชื่อมต่อสำเร็จโดยไม่ต้องล็อกอิน Google! ชีต: "${res.spreadsheetName || cleanCurrentSheetId}" · Drive หลัก: "${res.folderName || cleanCurrentDriveId}" · โฟลเดอร์รูป ImageBLS: "${res.imageFolderName || cleanCurrentImageDriveId}"`,
      });
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: `ทดสอบไม่ผ่าน: ${err.message || 'กรุณาตรวจสอบว่า Deploy Web App ตั้งค่า "Who has access: ทุกคน (Anyone)" และคัดลอก URL ที่ลงท้าย /exec'}`,
      });
    } finally {
      setIsTestingBridge(false);
    }
  };

  const handleCopyAppsScript = async () => {
    try {
      await navigator.clipboard?.writeText(GENERATED_APPS_SCRIPT_CODE);
      setCopiedScript(true);
      setTimeout(() => setCopiedScript(false), 3000);
    } catch {
      setShowScriptCode(true);
    }
  };

  const handleCreateNewSheet = async () => {
    setIsCreating(true);
    setStatusMessage(null);
    try {
      let token = await getAccessToken();
      if (!token) {
        const res = await googleSignIn({ intent: { type: 'sheets_modal' } });
        if (res?.redirected) return;
        if (res?.accessToken && res.user) {
          token = res.accessToken;
          onGoogleLoginSuccess(res.user);
        }
      }

      if (!token) {
        throw new Error('การสร้างไฟล์ Spreadsheet ใหม่จำเป็นต้องลงชื่อเข้าใช้ Google (หรือใช้ ID ชีตที่มีอยู่แล้วได้ทันทีโดยไม่ต้องล็อกอิน)');
      }

      const res = await createInspectionSpreadsheet(
        token,
        'ระบบตรวจสภาพรถกู้ชีพ BLS - บันทึกส่วนกลาง'
      );

      const newConfig: GoogleSheetsConfig = {
        ...config,
        spreadsheetId: res.spreadsheetId,
        spreadsheetUrl: res.spreadsheetUrl,
        driveFolderId: cleanCurrentDriveId,
        driveFolderUrl: `https://drive.google.com/drive/folders/${cleanCurrentDriveId}`,
        imageDriveFolderId: cleanCurrentImageDriveId,
        imageDriveFolderUrl: `https://drive.google.com/drive/folders/${cleanCurrentImageDriveId}`,
        appsScriptUrl: activeBridgeUrl || config.appsScriptUrl,
        sheetName: INSPECTION_SHEET_TITLE,
        lastSyncedAt: new Date().toLocaleTimeString('th-TH'),
      };

      setSpreadsheetId(res.spreadsheetId);
      onSaveConfig(newConfig);

      await syncInspectionsToSheet(res.spreadsheetId, inspections, token);
      await syncVehiclesToSheet(res.spreadsheetId, vehicles, token);
      await syncStaffToSheet(res.spreadsheetId, staffList, token);

      const currentDamage = damageRecords || getStoredDamageRecords();
      await syncDamageToSheet(res.spreadsheetId, currentDamage, token);

      const currentFuel = fuelLogs || getStoredFuelLogs();
      await syncFuelLogsToSheet(res.spreadsheetId, currentFuel, token);

      const currentEquipment = equipmentInspections || getStoredEquipmentInspections();
      await syncEquipmentInspectionsToSheet(res.spreadsheetId, currentEquipment, token);

      const currentRequisitions = equipmentRequisitions || getStoredEquipmentRequisitions();
      await syncRequisitionsToSheet(res.spreadsheetId, currentRequisitions, token);

      await appendAuditLogToSheet(
        res.spreadsheetId,
        {
          id: `log-${Date.now()}`,
          timestamp: new Date().toLocaleString('th-TH'),
          action: 'สร้างสเปรดชีตใหม่',
          module: 'ระบบภาพรวม',
          targetItem: res.spreadsheetId,
          operator: `${currentUser.name} (${currentUser.role === 'admin' ? 'Admin' : 'Staff'})`,
          details: `สร้างชีตครบทั้ง 8 หมวด: ตรวจสภาพรถ, กองรถ (${vehicles.length} คัน), เจ้าหน้าที่ (${staffList.length} คน), รอยรอบคัน (${currentDamage.length} จุด), น้ำมัน (${currentFuel.length} รายการ), ตรวจอุปกรณ์ BLS (${currentEquipment.length} รายการ), เบิกอุปกรณ์ (${currentRequisitions.length} ใบเบิก) และ Audit Log`,
        },
        token
      );

      setStatusMessage({
        type: 'success',
        text: 'สร้าง Google Spreadsheet ครบถ้วนทั้ง 8 แท็บ และซิงค์ข้อมูลเริ่มต้นเรียบร้อยแล้ว!',
      });
    } catch (err: any) {
      console.error(err);
      setStatusMessage({
        type: 'error',
        text: err.message || 'เกิดข้อผิดพลาดในการสร้างสเปรดชีต',
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleSyncAllPending = async () => {
    if (!cleanCurrentSheetId) {
      setStatusMessage({
        type: 'error',
        text: 'กรุณาระบุ Google Spreadsheet ID ก่อน',
      });
      return;
    }

    setIsSyncingAll(true);
    setStatusMessage(null);
    try {
      const token = await getAccessToken();
      const activeToken = token || '';
      const bridgeReady = Boolean(activeBridgeUrl || hasNoLoginBridge());

      if (!activeToken && !bridgeReady) {
        throw new Error(
          'หากต้องการเขียนข้อมูลขึ้นชีตและ Drive โดยไม่ต้องเข้า Google กรุณาคัดลอกโค้ด Apps Script ไปวางและบันทึก Web App URL ด้านบน (หรือกดลงชื่อเข้าใช้ Google ด้านล่าง)'
        );
      }

      // Ensure latest config is saved before bridge calls
      onSaveConfig({
        ...config,
        spreadsheetId: cleanCurrentSheetId,
        spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${cleanCurrentSheetId}/edit`,
        driveFolderId: cleanCurrentDriveId,
        driveFolderUrl: `https://drive.google.com/drive/folders/${cleanCurrentDriveId}`,
        imageDriveFolderId: cleanCurrentImageDriveId,
        imageDriveFolderUrl: `https://drive.google.com/drive/folders/${cleanCurrentImageDriveId}`,
        appsScriptUrl: activeBridgeUrl || config.appsScriptUrl,
      });

      await ensureAllSpreadsheetTabs(cleanCurrentSheetId, activeToken);

      const syncedInspectionsList: InspectionRecord[] = [];
      for (const rec of inspections) {
        const updatedRec = { ...rec };

        if (!updatedRec.driveLinks?.folderUrl) {
          try {
            const driveLinks = await uploadInspectionMediaToDrive(activeToken, updatedRec);
            updatedRec.driveLinks = driveLinks;
          } catch (dErr) {
            console.warn('Google Drive upload error for record:', updatedRec.id, dErr);
          }
        }

        updatedRec.googleSheetsSyncStatus = 'synced';
        onUpdateInspection(updatedRec);
        syncedInspectionsList.push(updatedRec);
      }

      await syncInspectionsToSheet(cleanCurrentSheetId, syncedInspectionsList, activeToken);
      await syncVehiclesToSheet(cleanCurrentSheetId, vehicles, activeToken);
      await syncStaffToSheet(cleanCurrentSheetId, staffList, activeToken);

      const currentDamage = damageRecords || getStoredDamageRecords();
      await syncDamageToSheet(cleanCurrentSheetId, currentDamage, activeToken);

      const currentFuel = fuelLogs || getStoredFuelLogs();
      await syncFuelLogsToSheet(cleanCurrentSheetId, currentFuel, activeToken);

      const currentEquipment = equipmentInspections || getStoredEquipmentInspections();
      await syncEquipmentInspectionsToSheet(cleanCurrentSheetId, currentEquipment, activeToken);

      const currentRequisitions = equipmentRequisitions || getStoredEquipmentRequisitions();
      await syncRequisitionsToSheet(cleanCurrentSheetId, currentRequisitions, activeToken);

      await saveMasterDatabaseToDrive(activeToken, {
        inspections: syncedInspectionsList,
        vehicles,
        staffList,
        damageRecords: currentDamage,
        fuelLogs: currentFuel,
        equipmentInspections: currentEquipment,
        equipmentRequisitions: currentRequisitions,
        spreadsheetId: cleanCurrentSheetId,
        spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${cleanCurrentSheetId}/edit`,
        lastSyncedAt: new Date().toLocaleString('th-TH'),
        version: 1,
      }).catch((err) => console.warn('Drive master snapshot warning:', err));

      const count = syncedInspectionsList.length;
      await appendAuditLogToSheet(
        cleanCurrentSheetId,
        {
          id: `log-${Date.now()}`,
          timestamp: new Date().toLocaleString('th-TH'),
          action: 'ซิงค์ข้อมูลทั้งหมด',
          module: 'ระบบภาพรวม',
          targetItem: `สเปรดชีต ${cleanCurrentSheetId.slice(0, 10)}...`,
          operator: `${currentUser.name} (${currentUser.role === 'admin' ? 'Admin' : 'Staff'})`,
          details: `ซิงค์ตรวจสภาพ ${count} รายการ, กองรถ ${vehicles.length} คัน, เจ้าหน้าที่ ${staffList.length} คน, รอยรอบคัน ${currentDamage.length} จุด, เติมน้ำมัน ${currentFuel.length} ครั้ง, อุปกรณ์ BLS ${currentEquipment.length} รายการ, เบิกอุปกรณ์ ${currentRequisitions.length} ใบเบิก`,
        },
        activeToken
      );

      onSaveConfig({
        ...config,
        spreadsheetId: cleanCurrentSheetId,
        spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${cleanCurrentSheetId}/edit`,
        driveFolderId: cleanCurrentDriveId,
        driveFolderUrl: `https://drive.google.com/drive/folders/${cleanCurrentDriveId}`,
        imageDriveFolderId: cleanCurrentImageDriveId,
        imageDriveFolderUrl: `https://drive.google.com/drive/folders/${cleanCurrentImageDriveId}`,
        appsScriptUrl: activeBridgeUrl || config.appsScriptUrl,
        lastSyncedAt: new Date().toLocaleTimeString('th-TH'),
      });

      setStatusMessage({
        type: 'success',
        text: `ซิงค์ข้อมูลลง Google Sheets & โฟลเดอร์ Drive ครบถ้วนทั้ง 8 หมวด (ตรวจสภาพ ${count}, กองรถ ${vehicles.length}, เจ้าหน้าที่ ${staffList.length}, รอยรอบคัน ${currentDamage.length}, น้ำมัน ${currentFuel.length}, อุปกรณ์ BLS ${currentEquipment.length}, เบิกอุปกรณ์ ${currentRequisitions.length})!`,
      });
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: err.message || 'เกิดข้อผิดพลาดในการซิงค์ข้อมูล',
      });
    } finally {
      setIsSyncingAll(false);
    }
  };

  const handlePullDataFromSheets = async () => {
    if (!cleanCurrentSheetId) {
      setStatusMessage({
        type: 'error',
        text: 'กรุณาระบุ Google Spreadsheet ID ก่อนดึงข้อมูลคืน',
      });
      return;
    }

    setIsPullingData(true);
    setStatusMessage(null);
    try {
      const token = await getAccessToken();
      const activeToken = token || '';
      const bridgeReady = Boolean(activeBridgeUrl || hasNoLoginBridge());

      const pulled = await pullAllDataFromGoogleSheets(cleanCurrentSheetId, activeToken);
      const totalPulled =
        pulled.vehicles.length +
        pulled.staffList.length +
        pulled.inspections.length +
        pulled.damageRecords.length +
        pulled.fuelLogs.length +
        pulled.equipmentInspections.length +
        pulled.equipmentRequisitions.length;

      if (totalPulled === 0 && !activeToken && !bridgeReady) {
        throw new Error(
          'ยังอ่านข้อมูลจากชีตไม่สำเร็จโดยไม่ต้องล็อกอิน: กรุณาแชร์ Google Sheet นี้เป็น "ทุกคนที่มีลิงก์ดูได้" (Anyone with the link) หรือวาง Apps Script Web App URL ด้านบน'
        );
      }

      if (totalPulled > 0 && onSyncBackData) {
        onSyncBackData(pulled);
      }

      if (activeToken || bridgeReady) {
        await appendAuditLogToSheet(
          cleanCurrentSheetId,
          {
            id: `log-${Date.now()}`,
            timestamp: new Date().toLocaleString('th-TH'),
            action: 'ดึงข้อมูลคืน (Sync Back)',
            module: 'ระบบภาพรวม',
            targetItem: 'ฐานข้อมูลระบบส่วนกลาง',
            operator: `${currentUser.name} (${currentUser.role === 'admin' ? 'Admin' : 'Staff'})`,
            details: `ดึงข้อมูลคืนจากชีต: ตรวจสภาพ ${pulled.inspections.length}, รถ ${pulled.vehicles.length} คัน, เจ้าหน้าที่ ${pulled.staffList.length} คน`,
          },
          activeToken
        );
      }

      setStatusMessage({
        type: 'success',
        text:
          totalPulled > 0
            ? `ดึงข้อมูลคืนสำเร็จโดยไม่ต้องเข้า Google! อัปเดตผลตรวจ ${pulled.inspections.length} รายการ, รถ ${pulled.vehicles.length} คัน, เจ้าหน้าที่ ${pulled.staffList.length} คน`
            : 'เชื่อมต่อชีตสำเร็จ (ชีตนี้ยังไม่มีแถวข้อมูล — สามารถกด "ซิงค์ข้อมูลขึ้นชีต" เพื่อส่งข้อมูลจากเครื่องขึ้นไปได้ทันที)',
      });
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: err.message || 'เกิดข้อผิดพลาดในการดึงข้อมูลจาก Google Sheets',
      });
    } finally {
      setIsPullingData(false);
    }
  };

  const handleSaveCustomIds = () => {
    const cleanSheet = extractGoogleResourceId(spreadsheetId) || DEFAULT_SPREADSHEET_ID;
    const cleanDrive = extractGoogleResourceId(driveFolderId) || DEFAULT_DRIVE_FOLDER_ID;
    const cleanImageDrive =
      extractGoogleResourceId(imageDriveFolderId) || DEFAULT_IMAGE_DRIVE_FOLDER_ID;
    setSpreadsheetId(cleanSheet);
    setDriveFolderId(cleanDrive);
    setImageDriveFolderId(cleanImageDrive);

    onSaveConfig({
      ...config,
      spreadsheetId: cleanSheet,
      spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${cleanSheet}/edit`,
      driveFolderId: cleanDrive,
      driveFolderUrl: `https://drive.google.com/drive/folders/${cleanDrive}`,
      imageDriveFolderId: cleanImageDrive,
      imageDriveFolderUrl: `https://drive.google.com/drive/folders/${cleanImageDrive}`,
      appsScriptUrl: activeBridgeUrl || config.appsScriptUrl,
    });

    setStatusMessage({
      type: 'success',
      text: 'บันทึก Spreadsheet ID, Drive Folder ID และ ImageBLS Folder ID เรียบร้อยแล้ว',
    });
  };

  const currentSheetUrl = `https://docs.google.com/spreadsheets/d/${cleanCurrentSheetId}/edit`;
  const currentDriveUrl = `https://drive.google.com/drive/folders/${cleanCurrentDriveId}`;
  const currentImageDriveUrl = `https://drive.google.com/drive/folders/${cleanCurrentImageDriveId}`;
  const pendingCount = inspections.filter((i) => i.googleSheetsSyncStatus !== 'synced').length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-2xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900 max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 dark:border-slate-800 shrink-0">
          <div className="flex items-center gap-2.5">
            <FileSpreadsheet className="h-5 w-5 text-emerald-600" />
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                เชื่อมต่อ Google Sheets & Google Drive (ไม่ต้องเข้า Google)
              </h3>
              <p className="text-[11px] text-slate-400">
                ผูกสเปรดชีต, Drive หลัก และโฟลเดอร์ ImageBLS (สำหรับอัปโหลดรูปภาพทั้งหมดพร้อมสร้างโฟลเดอร์ย่อยอัตโนมัติ)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-6 space-y-4 overflow-y-auto">
          {/* Active Spreadsheet & Drive Folder Card */}
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-4 dark:border-emerald-900/40 dark:bg-emerald-950/20 space-y-3">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-800 dark:text-emerald-300">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  ผูกสเปรดชีต, โฟลเดอร์ Drive และ ImageBLS แล้ว
                </span>
                <p className="mt-1 truncate font-mono text-[11px] text-emerald-700 dark:text-emerald-400">
                  Spreadsheet ID: {cleanCurrentSheetId}
                </p>
                <p className="mt-0.5 truncate font-mono text-[11px] text-sky-700 dark:text-sky-400">
                  Drive หลัก (Master DB): {cleanCurrentDriveId}
                </p>
                <p className="mt-0.5 truncate font-mono text-[11px] text-indigo-700 dark:text-indigo-400">
                  โฟลเดอร์รูปภาพ ImageBLS: {cleanCurrentImageDriveId}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                <a
                  href={currentSheetUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-emerald-500"
                >
                  <ExternalLink className="h-3.5 w-3.5" /> เปิด Sheets
                </a>
                <a
                  href={currentDriveUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 rounded-lg bg-sky-600 px-2.5 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-sky-500"
                >
                  <FolderOpen className="h-3.5 w-3.5" /> Drive หลัก
                </a>
                <a
                  href={currentImageDriveUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 rounded-lg bg-indigo-600 px-2.5 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-indigo-500"
                >
                  <FolderOpen className="h-3.5 w-3.5" /> ImageBLS
                </a>
              </div>
            </div>

            {/* 8 Tabs Indicator Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-[11px]">
              <div className="flex items-center gap-1.5 rounded-lg bg-white/80 p-1.5 dark:bg-slate-900/60 text-slate-700 dark:text-slate-300">
                <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                <span className="truncate">{INSPECTION_SHEET_TITLE}</span>
              </div>
              <div className="flex items-center gap-1.5 rounded-lg bg-white/80 p-1.5 dark:bg-slate-900/60 text-slate-700 dark:text-slate-300">
                <PackageCheck className="h-3.5 w-3.5 text-teal-600 shrink-0" />
                <span className="truncate">{EQUIPMENT_SHEET_TITLE}</span>
              </div>
              <div className="flex items-center gap-1.5 rounded-lg bg-white/80 p-1.5 dark:bg-slate-900/60 text-slate-700 dark:text-slate-300">
                <PackagePlus className="h-3.5 w-3.5 text-indigo-600 shrink-0" />
                <span className="truncate">{REQUISITION_SHEET_TITLE}</span>
              </div>
              <div className="flex items-center gap-1.5 rounded-lg bg-white/80 p-1.5 dark:bg-slate-900/60 text-slate-700 dark:text-slate-300">
                <Truck className="h-3.5 w-3.5 text-sky-600 shrink-0" />
                <span className="truncate">{VEHICLES_SHEET_TITLE}</span>
              </div>
              <div className="flex items-center gap-1.5 rounded-lg bg-white/80 p-1.5 dark:bg-slate-900/60 text-slate-700 dark:text-slate-300">
                <Users className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                <span className="truncate">{STAFF_SHEET_TITLE}</span>
              </div>
              <div className="flex items-center gap-1.5 rounded-lg bg-white/80 p-1.5 dark:bg-slate-900/60 text-slate-700 dark:text-slate-300">
                <Car className="h-3.5 w-3.5 text-blue-600 shrink-0" />
                <span className="truncate">{DAMAGE_SHEET_TITLE}</span>
              </div>
              <div className="flex items-center gap-1.5 rounded-lg bg-white/80 p-1.5 dark:bg-slate-900/60 text-slate-700 dark:text-slate-300">
                <Fuel className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                <span className="truncate">{FUEL_SHEET_TITLE}</span>
              </div>
              <div className="flex items-center gap-1.5 rounded-lg bg-white/80 p-1.5 dark:bg-slate-900/60 text-slate-700 dark:text-slate-300">
                <Activity className="h-3.5 w-3.5 text-purple-600 shrink-0" />
                <span className="truncate">{AUDIT_LOG_SHEET_TITLE}</span>
              </div>
            </div>
          </div>

          {/* No-Login Bridge (Apps Script Web App) */}
          <div className="rounded-xl border border-sky-200 bg-sky-50/70 p-4 dark:border-sky-900/50 dark:bg-sky-950/20 space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-start gap-2">
                <Zap className="h-4 w-4 text-sky-600 dark:text-sky-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                    ซิงค์ 2 ทางและอัปโหลดเข้า Drive อัตโนมัติ โดยไม่ต้องเข้า Google (Apps Script Web App)
                  </h4>
                  <p className="mt-0.5 text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                    นำโค้ดสำเร็จรูปด้านล่างไปวางใน Google Sheet ครั้งเดียว จากนั้นวาง Web App URL (/exec) ระบบจะอ่าน-เขียน Sheets และอัปโหลดรูปเข้าโฟลเดอร์ Drive ได้ทันทีทุกเครื่องโดยไม่ต้องล็อกอิน Google
                  </p>
                </div>
              </div>
              {isBridgeReady && (
                <span className="shrink-0 rounded-md bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300">
                  พร้อมใช้งาน
                </span>
              )}
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="url"
                value={appsScriptUrl}
                onChange={(e) => setAppsScriptUrl(e.target.value)}
                placeholder="https://script.google.com/macros/s/.../exec"
                className="flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 font-mono text-xs text-slate-800 shadow-sm focus:border-sky-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              />
              <div className="flex gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handleSaveBridgeUrl}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                >
                  บันทึก URL
                </button>
                <button
                  type="button"
                  onClick={handleTestBridge}
                  disabled={isTestingBridge || !appsScriptUrl.trim()}
                  className="inline-flex items-center gap-1 rounded-lg bg-sky-600 px-3 py-2 text-xs font-bold text-white shadow-sm hover:bg-sky-500 disabled:opacity-50"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${isTestingBridge ? 'animate-spin' : ''}`} />
                  <span>ทดสอบ</span>
                </button>
              </div>
            </div>

            <div className="rounded-lg border border-sky-200/80 bg-white/80 p-3 dark:border-slate-800 dark:bg-slate-900/60 space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => setShowScriptCode((prev) => !prev)}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-sky-700 hover:underline dark:text-sky-400"
                >
                  <Code2 className="h-3.5 w-3.5" />
                  <span>ขั้นตอนติดตั้ง & โค้ด Apps Script (ผูก Sheet & Drive ID แล้ว)</span>
                  {showScriptCode ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                </button>
                <button
                  type="button"
                  onClick={handleCopyAppsScript}
                  className="inline-flex items-center gap-1 rounded-lg border border-sky-300 bg-sky-50 px-2.5 py-1 text-[11px] font-bold text-sky-700 hover:bg-sky-100 dark:border-sky-800 dark:bg-sky-900/40 dark:text-sky-300"
                >
                  {copiedScript ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                  <span>{copiedScript ? 'คัดลอกโค้ดแล้ว!' : 'คัดลอกโค้ด Apps Script'}</span>
                </button>
              </div>

              <ol className="list-decimal list-inside space-y-0.5 text-[11px] text-slate-600 dark:text-slate-400">
                <li>เปิดสเปรดชีต &gt; เมนู <strong>ส่วนขยาย (Extensions) &gt; Apps Script</strong> แล้ววางโค้ดที่คัดลอกแทนของเดิม</li>
                <li>กด <strong>ทำให้ใช้งานได้ (Deploy) &gt; รายการใหม่ &gt; เว็บแอป</strong></li>
                <li>ตั้งค่า Execute as: <strong>ฉัน (Me)</strong> · Who has access: <strong>ทุกคน (Anyone)</strong> แล้วนำลิงก์ <code>/exec</code> มาวางด้านบน</li>
              </ol>

              {showScriptCode && (
                <pre className="mt-2 max-h-48 overflow-auto rounded-lg bg-slate-950 p-3 text-[10px] font-mono text-emerald-300">
                  {GENERATED_APPS_SCRIPT_CODE}
                </pre>
              )}
            </div>
          </div>

          {/* Manual Spreadsheet & Drive Folder ID Inputs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Google Spreadsheet ID (หรือวางลิงก์):
              </label>
              <input
                type="text"
                value={spreadsheetId}
                onChange={(e) => setSpreadsheetId(e.target.value)}
                placeholder={DEFAULT_SPREADSHEET_ID}
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 font-mono text-xs text-slate-800 shadow-sm focus:border-sky-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Drive Folder ID หลัก (สำรองฐานข้อมูล):
              </label>
              <input
                type="text"
                value={driveFolderId}
                onChange={(e) => setDriveFolderId(e.target.value)}
                placeholder={DEFAULT_DRIVE_FOLDER_ID}
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 font-mono text-xs text-slate-800 shadow-sm focus:border-sky-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                โฟลเดอร์ ImageBLS Folder ID (เก็บรูปภาพที่อัปโหลดทั้งหมด + โฟลเดอร์ย่อย):
              </label>
              <input
                type="text"
                value={imageDriveFolderId}
                onChange={(e) => setImageDriveFolderId(e.target.value)}
                placeholder={DEFAULT_IMAGE_DRIVE_FOLDER_ID}
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 font-mono text-xs text-slate-800 shadow-sm focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              />
            </div>
            <div className="sm:col-span-2 flex justify-end">
              <button
                type="button"
                onClick={handleSaveCustomIds}
                className="rounded-lg border border-slate-200 bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              >
                บันทึกการตั้งค่า ID
              </button>
            </div>
          </div>

          {/* Sync Actions Grid */}
          <div className="border-t border-slate-200 pt-3 dark:border-slate-800 space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-xs font-semibold text-slate-900 dark:text-white">
                  ผลตรวจรอซิงค์: {pendingCount} รายการ · กองรถ: {vehicles.length} คัน · เจ้าหน้าที่: {staffList.length} ท่าน
                </p>
                <p className="text-[11px] text-slate-400">
                  ดึงข้อมูลจากชีต (อ่านได้ทันทีเมื่อแชร์สาธารณะ/Apps Script) หรือซิงค์ข้อมูลทั้งหมดขึ้นชีต & Drive
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={isPullingData || !cleanCurrentSheetId}
                  onClick={handlePullDataFromSheets}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-sky-300 bg-sky-50 px-3 py-1.5 text-xs font-bold text-sky-700 hover:bg-sky-100 disabled:opacity-50 dark:border-sky-800 dark:bg-sky-950/40 dark:text-sky-300"
                  title="ดึงข้อมูลกองรถและเจ้าหน้าที่จาก Google Sheets คืนสู่ระบบ"
                >
                  <DownloadCloud className={`h-3.5 w-3.5 ${isPullingData ? 'animate-bounce' : ''}`} />
                  <span>{isPullingData ? 'กำลังดึงข้อมูล...' : 'ดึงข้อมูลคืน (Sync Back)'}</span>
                </button>

                <button
                  type="button"
                  disabled={isSyncingAll || !cleanCurrentSheetId}
                  onClick={handleSyncAllPending}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-emerald-500 disabled:opacity-50"
                  title="อัปโหลดผลตรวจ กองรถ และเจ้าหน้าที่ขึ้น Sheets ทั้งหมด"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${isSyncingAll ? 'animate-spin' : ''}`} />
                  <span>{isSyncingAll ? 'กำลังซิงค์...' : 'ซิงค์ข้อมูลขึ้นชีต'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Optional Direct Google Sign-In Section */}
          <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3.5 dark:border-slate-800 dark:bg-slate-850">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-xs font-semibold text-slate-900 dark:text-white">
                  ทางเลือกเสริม: บัญชี Google โดยตรง (ไม่จำเป็นต้องใช้หากตั้งค่า Apps Script แล้ว)
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  {googleUser ? `เชื่อมต่อแล้ว: ${googleUser.email}` : 'ไม่ได้ลงชื่อเข้าใช้ Google (กำลังใช้งานโหมดไม่ต้องเข้า Google)'}
                </p>
              </div>

              {!googleUser ? (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleGoogleSignIn(true)}
                    disabled={isLoggingIn}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                  >
                    <LogIn className="h-3.5 w-3.5 text-sky-600" />
                    {isLoggingIn ? 'กำลังเชื่อมต่อ...' : 'ลงชื่อเข้าใช้ Google'}
                  </button>
                  <button
                    type="button"
                    onClick={handleCreateNewSheet}
                    disabled={isCreating}
                    className="inline-flex items-center gap-1 rounded-lg border border-emerald-300 bg-emerald-50 px-2.5 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 disabled:opacity-50 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
                  >
                    {isCreating ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                    <span>สร้างชีตใหม่</span>
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 className="h-4 w-4" /> เชื่อมต่อแล้ว
                  </span>
                  <button
                    type="button"
                    onClick={handleCreateNewSheet}
                    disabled={isCreating}
                    className="inline-flex items-center gap-1 rounded-lg border border-emerald-300 bg-emerald-50 px-2.5 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 disabled:opacity-50 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
                  >
                    {isCreating ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                    <span>สร้างชีตใหม่</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Status Message */}
          {statusMessage && (
            <div
              className={`flex items-start gap-2 rounded-xl p-3 text-xs font-medium ${
                statusMessage.type === 'success'
                  ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300'
                  : 'bg-red-50 text-red-800 dark:bg-red-950/40 dark:text-red-300'
              }`}
            >
              {statusMessage.type === 'success' ? (
                <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              )}
              <div className="flex-1 space-y-1.5">
                <span className="block leading-relaxed">{statusMessage.text}</span>
                {statusMessage.type === 'error' &&
                  statusMessage.text.includes('Authorized domains') &&
                  typeof window !== 'undefined' && (
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard?.writeText(window.location.hostname);
                        setCopiedDomain(true);
                        setTimeout(() => setCopiedDomain(false), 2500);
                      }}
                      className="inline-flex items-center gap-1 rounded-lg border border-red-300 bg-white px-2.5 py-1 text-[11px] font-bold text-red-700 hover:bg-red-100 dark:border-red-800 dark:bg-red-900/40 dark:text-red-200"
                    >
                      {copiedDomain ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                      <span>
                        {copiedDomain
                          ? `คัดลอก ${window.location.hostname} แล้ว`
                          : `คัดลอกโดเมน (${window.location.hostname})`}
                      </span>
                    </button>
                  )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
