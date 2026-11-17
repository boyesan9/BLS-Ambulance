import React, { useState } from 'react';
import { AmbulanceVehicle, DamageSeverity, UserProfile, VehicleDamageItem } from '../types';
import { compressImage } from '../utils/imageCompressor';
import {
  generateSvgDamagePlaceholder,
  getDriveImageFallbackUrls,
  toDisplayableDriveImageUrl,
} from '../services/storage';
import {
  ORGANIZATION_NAME,
  THAI_MONTHS,
  getDefaultThaiDateParts,
} from '../data/equipmentChecklist';
import {
  Car,
  Plus,
  Search,
  Camera,
  Upload,
  AlertTriangle,
  CheckCircle2,
  Trash2,
  Calendar,
  Gauge,
  User,
  X,
  Eye,
  Tag,
  Filter,
  ExternalLink,
  Pencil,
  Printer,
  FileDown,
} from 'lucide-react';

interface VehicleDamageViewProps {
  currentUser: UserProfile;
  vehicles: AmbulanceVehicle[];
  damageRecords: VehicleDamageItem[];
  onSaveDamage: (item: VehicleDamageItem) => void;
  onDeleteDamage: (id: string) => void;
  onUpdateDamageStatus?: (id: string, resolved: boolean) => void;
}

const POSITION_PRESETS = [
  'กันชนหน้า',
  'กันชนหน้าขวา',
  'กันชนหน้าซ้าย',
  'ฝากระโปรงหน้า',
  'กระจังหน้า / โลโก้',
  'ประตูด้านหน้าขวา',
  'ประตูด้านหน้าซ้าย',
  'ประตูด้านหลังขวา',
  'ประตูด้านหลังซ้าย',
  'ซุ้มล้อหน้าขวา',
  'ซุ้มล้อหน้าซ้าย',
  'ซุ้มล้อหลังขวา',
  'ซุ้มล้อหลังซ้าย',
  'สเกิร์ตข้างขวา',
  'สเกิร์ตข้างซ้าย',
  'กันชนหลัง',
  'ประตูท้ายรถ / ประตูพยาบาล',
  'กระจกมองข้างขวา',
  'กระจกมองข้างซ้าย',
  'หลังคารถ / ไซเรน',
];

const SEVERITY_LABELS: Record<DamageSeverity, { label: string; color: string; badgeClass: string }> = {
  minor_scratch: {
    label: 'รอยขูดขีดตื้น (ขนแมว/ผิวสี)',
    color: '#3b82f6',
    badgeClass: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800',
  },
  deep_scratch: {
    label: 'รอยขูดขีดลึก (กินเนื้อสี/เห็นแผ่นเหล็ก)',
    color: '#f59e0b',
    badgeClass: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800',
  },
  dent: {
    label: 'รอยบุบ / ยุบตัว',
    color: '#ea580c',
    badgeClass: 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/40 dark:text-orange-300 dark:border-orange-800',
  },
  crack: {
    label: 'รอยแตกหัก / แตกปริ',
    color: '#dc2626',
    badgeClass: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800',
  },
  paint_chip: {
    label: 'สะเก็ดหินดีด / สีหลุดร่อน',
    color: '#8b5cf6',
    badgeClass: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800',
  },
  rust: {
    label: 'คราบสนิมกัดกร่อน',
    color: '#78716c',
    badgeClass: 'bg-stone-50 text-stone-700 border-stone-200 dark:bg-stone-900/40 dark:text-stone-300 dark:border-stone-800',
  },
};

function escapeDamageHtml(value?: string | number | null): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function getDamageReportDateParts(singleItem?: VehicleDamageItem): {
  day: string;
  month: string;
  year: string;
} {
  if (singleItem?.createdAt) {
    const raw = singleItem.createdAt.trim();
    const numericMatch = raw.match(/(\d{1,2})[/-](\d{1,2})[/-](\d{4})/);
    if (numericMatch) {
      const d = parseInt(numericMatch[1], 10);
      const m = parseInt(numericMatch[2], 10);
      const y = parseInt(numericMatch[3], 10);
      if (d >= 1 && d <= 31 && m >= 1 && m <= 12 && y > 0) {
        return {
          day: String(d),
          month: THAI_MONTHS[m - 1],
          year: String(y < 2400 ? y + 543 : y),
        };
      }
    }
    const idTsMatch = singleItem.id.match(/(\d{13})/);
    if (idTsMatch) {
      const dt = new Date(Number(idTsMatch[1]));
      if (!Number.isNaN(dt.getTime())) {
        return {
          day: String(dt.getDate()),
          month: THAI_MONTHS[dt.getMonth()] || THAI_MONTHS[0],
          year: String(dt.getFullYear() + 543),
        };
      }
    }
  }
  return getDefaultThaiDateParts();
}

const DamageReportPhotoImg: React.FC<{
  primary?: string;
  driveUrl?: string;
  positionArea: string;
  description: string;
  alt: string;
  className: string;
}> = ({ primary, driveUrl, positionArea, description, alt, className }) => {
  const candidates = React.useMemo(() => {
    const first = toDisplayableDriveImageUrl(primary, driveUrl) || primary || '';
    const fallbacks = getDriveImageFallbackUrls(primary, driveUrl);
    const svg = generateSvgDamagePlaceholder(positionArea, description);
    return Array.from(new Set([first, ...fallbacks, svg].filter(Boolean)));
  }, [primary, driveUrl, positionArea, description]);

  const [idx, setIdx] = useState(0);
  const src = candidates[idx] || generateSvgDamagePlaceholder(positionArea, description);

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

export const VehicleDamageView: React.FC<VehicleDamageViewProps> = ({
  currentUser,
  vehicles,
  damageRecords,
  onSaveDamage,
  onDeleteDamage,
  onUpdateDamageStatus,
}) => {
  const [selectedVehicleFilter, setSelectedVehicleFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSeverityFilter, setSelectedSeverityFilter] = useState<string>('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingDamageId, setEditingDamageId] = useState<string | null>(null);
  const [viewPhotoModalUrl, setViewPhotoModalUrl] = useState<string | null>(null);
  const [reportModalItems, setReportModalItems] = useState<VehicleDamageItem[] | null>(null);
  const [reportModalTitle, setReportModalTitle] = useState<string>('');
  const [printStatus, setPrintStatus] = useState<string | null>(null);

  // Form states for new damage record
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>(vehicles[0]?.id || '');
  const [positionArea, setPositionArea] = useState<string>(POSITION_PRESETS[0]);
  const [customPosition, setCustomPosition] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [severity, setSeverity] = useState<DamageSeverity>('minor_scratch');
  const [mainPhoto, setMainPhoto] = useState<string>('');
  const [additionalPhotos, setAdditionalPhotos] = useState<string[]>([]);
  const [odometer, setOdometer] = useState<number>(vehicles[0]?.currentOdometer || 0);
  const [isProcessingPhoto, setIsProcessingPhoto] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [manualCode, setManualCode] = useState<string>('BLS-01');
  const [manualPlate, setManualPlate] = useState<string>('1กข 4589 กทม.');

  // Filtered records
  const selectedFilterVehicle = vehicles.find((v) => v.id === selectedVehicleFilter);
  const filteredRecords = damageRecords.filter((item) => {
    const matchVehicle =
      selectedVehicleFilter === 'all' ||
      item.vehicleId === selectedVehicleFilter ||
      (selectedFilterVehicle && item.vehicleCode === selectedFilterVehicle.code);
    const matchSeverity = selectedSeverityFilter === 'all' || item.severity === selectedSeverityFilter;
    const term = searchTerm.toLowerCase();
    const matchSearch =
      !term ||
      item.positionArea.toLowerCase().includes(term) ||
      item.description.toLowerCase().includes(term) ||
      item.vehicleCode.toLowerCase().includes(term) ||
      item.plateNumber.toLowerCase().includes(term);
    return matchVehicle && matchSeverity && matchSearch;
  });

  const handleOpenAddModal = (defaultVehId?: string) => {
    setFormError(null);
    setEditingDamageId(null);
    const targetVehId = defaultVehId || (selectedVehicleFilter !== 'all' ? selectedVehicleFilter : vehicles[0]?.id || '');
    const currentVeh = vehicles.find((v) => v.id === targetVehId) || vehicles[0];
    setSelectedVehicleId(targetVehId);
    setOdometer(currentVeh?.currentOdometer || 0);
    setPositionArea(POSITION_PRESETS[0]);
    setCustomPosition('');
    setDescription('');
    setSeverity('minor_scratch');
    setMainPhoto('');
    setAdditionalPhotos([]);
    setManualCode('BLS-01');
    setManualPlate('1กข 4589 กทม.');
    setModalOpen(true);
  };

  const handleOpenEditModal = (item: VehicleDamageItem) => {
    setFormError(null);
    setEditingDamageId(item.id);
    setSelectedVehicleId(item.vehicleId);
    setOdometer(item.odometerAtReport || 0);
    if (POSITION_PRESETS.includes(item.positionArea)) {
      setPositionArea(item.positionArea);
      setCustomPosition('');
    } else {
      setPositionArea(POSITION_PRESETS[0]);
      setCustomPosition(item.positionArea);
    }
    setDescription(item.description || '');
    setSeverity(item.severity);
    setMainPhoto(item.photoUrl || item.drivePhotoUrl || '');
    setAdditionalPhotos(item.additionalPhotos ? [...item.additionalPhotos] : []);
    setManualCode(item.vehicleCode || 'BLS-01');
    setManualPlate(item.plateNumber || '1กข 4589 กทม.');
    setModalOpen(true);
  };

  const handleVehicleChange = (vehId: string) => {
    setSelectedVehicleId(vehId);
    const veh = vehicles.find((v) => v.id === vehId);
    if (veh) {
      setOdometer(veh.currentOdometer || 0);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>, isMain: boolean) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsProcessingPhoto(true);
    setFormError(null);
    try {
      if (isMain) {
        const file = files[0];
        const compressed = await compressImage(file, 1200, 1200, 0.75);
        if (compressed) {
          setMainPhoto(compressed);
        }
      } else {
        const newUrls: string[] = [];
        for (let i = 0; i < files.length; i++) {
          const compressed = await compressImage(files[i], 1200, 1200, 0.75);
          if (compressed) {
            newUrls.push(compressed);
          }
        }
        setAdditionalPhotos((prev) => [...prev, ...newUrls]);
      }
    } catch (err: any) {
      setFormError('เกิดข้อผิดพลาดในการประมวลผลรูปภาพ: ' + (err.message || ''));
    } finally {
      setIsProcessingPhoto(false);
      e.target.value = '';
    }
  };

  const handleRemoveAdditionalPhoto = (index: number) => {
    setAdditionalPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmitDamage = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const effectivePosition = customPosition.trim() ? customPosition.trim() : positionArea;
    if (!effectivePosition) {
      setFormError('กรุณาระบุตำแหน่งที่เกิดรอยบนตัวรถ');
      return;
    }

    if (!description.trim()) {
      setFormError('กรุณากรอกรายละเอียดว่ารอยเกิดขึ้นตรงไหนและมีลักษณะอย่างไร');
      return;
    }

    if (!mainPhoto) {
      setFormError('กรุณาถ่ายรูปหรืออัปโหลดรูปถ่ายรอยแผลอย่างน้อย 1 รูป');
      return;
    }

    const veh = vehicles.find((v) => v.id === selectedVehicleId) || (vehicles.length > 0 ? vehicles[0] : null);

    let targetVehicleId = selectedVehicleId;
    let targetVehicleCode = '';
    let targetPlateNumber = '';
    let targetOdometer = odometer;

    if (veh) {
      targetVehicleId = veh.id;
      targetVehicleCode = veh.code;
      targetPlateNumber = veh.plateNumber;
      if (!targetOdometer && veh.currentOdometer) {
        targetOdometer = veh.currentOdometer;
      }
    } else if (manualCode.trim() && manualPlate.trim()) {
      targetVehicleId = `veh-custom-${Date.now()}`;
      targetVehicleCode = manualCode.trim();
      targetPlateNumber = manualPlate.trim();
    } else if (vehicles.length === 0) {
      setFormError('ขณะนี้ไม่มีรถกู้ชีพในระบบ กรุณากรอกรหัสรถและเลขทะเบียน หรือเพิ่มรถในระบบก่อนทำการบันทึก');
      return;
    } else {
      setFormError('กรุณาเลือกรถกู้ชีพ BLS ที่ต้องการบันทึก');
      return;
    }

    const existing = editingDamageId ? damageRecords.find((d) => d.id === editingDamageId) : null;

    const itemToSave: VehicleDamageItem = {
      id: editingDamageId || `dmg-${Date.now()}`,
      vehicleId: targetVehicleId,
      vehicleCode: targetVehicleCode,
      plateNumber: targetPlateNumber,
      positionArea: effectivePosition,
      description: description.trim(),
      severity,
      photoUrl: mainPhoto,
      additionalPhotos: additionalPhotos.length > 0 ? additionalPhotos : undefined,
      drivePhotoUrl: existing?.drivePhotoUrl,
      driveFolderUrl: existing?.driveFolderUrl,
      createdAt:
        existing?.createdAt ||
        new Date().toLocaleString('th-TH', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        }),
      inspectorName: existing?.inspectorName || currentUser?.name || 'เจ้าหน้าที่',
      inspectorRole: existing?.inspectorRole || currentUser?.role || 'staff',
      odometerAtReport: targetOdometer || existing?.odometerAtReport || undefined,
      resolved: existing?.resolved ?? false,
    };

    onSaveDamage(itemToSave);
    setModalOpen(false);
    setEditingDamageId(null);
  };

  // Helper to ensure any photo URL (base64, Google Drive link, or SVG schematic) displays reliably
  const getDisplayablePhotoUrl = (rawUrl?: string, driveUrl?: string, position?: string, desc?: string): string => {
    if (rawUrl && (rawUrl.startsWith('data:image/') || rawUrl.startsWith('blob:') || (rawUrl.startsWith('http') && !rawUrl.includes('drive.google.com/file/d/')))) {
      return rawUrl;
    }
    const target = rawUrl || driveUrl;
    if (target) {
      const match = target.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) || target.match(/[?&]id=([a-zA-Z0-9_-]+)/);
      if (match && match[1]) {
        return `https://lh3.googleusercontent.com/d/${match[1]}=w1000`;
      }
    }
    return generateSvgDamagePlaceholder(position || 'จุดความเสียหาย', desc || 'รอยแผลตัวรถ');
  };

  const getReportScopeLabel = (items: VehicleDamageItem[]): string => {
    const uniqueVehicles = Array.from(
      new Set(items.map((i) => `${i.vehicleCode}${i.plateNumber ? ` (${i.plateNumber})` : ''}`))
    );
    if (uniqueVehicles.length === 1) return uniqueVehicles[0];
    if (selectedFilterVehicle) {
      return `${selectedFilterVehicle.code} (${selectedFilterVehicle.plateNumber})`;
    }
    return `รถกู้ชีพ BLS (${uniqueVehicles.length || vehicles.length} คัน)`;
  };

  const getSafeDamagePdfFilename = (items: VehicleDamageItem[]): string => {
    const scope =
      items.length === 1
        ? `${items[0].vehicleCode}_${items[0].positionArea}`
        : selectedFilterVehicle
        ? `${selectedFilterVehicle.code}_${selectedFilterVehicle.plateNumber}`
        : 'รวมทุกคัน';
    const dParts = getDamageReportDateParts(items.length === 1 ? items[0] : undefined);
    return `รายงานบันทึกรอยรอบตัวรถ_${scope}_${dParts.day}-${dParts.month}-${dParts.year}`
      .replace(/[\\/:*?"<>|]+/g, '_')
      .replace(/\s+/g, ' ')
      .trim();
  };

  const handleOpenReportModal = (items: VehicleDamageItem[], customLabel?: string) => {
    if (!items || items.length === 0) return;
    setReportModalItems(items);
    setReportModalTitle(customLabel || getReportScopeLabel(items));
  };

  const buildDamageReportHtml = (items: VehicleDamageItem[], showTopToolbar = false): string => {
    const singleItem = items.length === 1 ? items[0] : undefined;
    const dateParts = getDamageReportDateParts(singleItem);
    const scopeLabel = getReportScopeLabel(items);
    const pdfTitle = getSafeDamagePdfFilename(items);
    const pendingCount = items.filter((d) => !d.resolved).length;
    const resolvedCount = items.filter((d) => d.resolved).length;
    const printTimestamp = new Date().toLocaleString('th-TH', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    const uniqueInspectors = Array.from(new Set(items.map((d) => d.inspectorName).filter(Boolean)));
    const signerName =
      singleItem?.inspectorName ||
      (uniqueInspectors.length === 1 ? uniqueInspectors[0] : currentUser?.name) ||
      'เจ้าหน้าที่ผู้ตรวจเช็ค';

    const tableRowsHtml = items
      .map((item, idx) => {
        const sev = SEVERITY_LABELS[item.severity] || SEVERITY_LABELS.minor_scratch;
        const statusLabel = item.resolved ? '✓ ซ่อมบำรุงแล้ว' : '⚠ รอซ่อมสี/ซ่อมบำรุง';
        const statusColor = item.resolved ? '#15803d' : '#b45309';
        return `
      <tr class="item-row">
        <td style="text-align:center;">${idx + 1}</td>
        <td style="white-space:nowrap;">
          <strong>${escapeDamageHtml(item.vehicleCode)}</strong><br />
          <span style="font-size:11px; color:#334155;">${escapeDamageHtml(item.plateNumber)}</span>
        </td>
        <td><strong>${escapeDamageHtml(item.positionArea)}</strong></td>
        <td>${escapeDamageHtml(sev.label)}</td>
        <td>${escapeDamageHtml(item.description)}</td>
        <td style="font-size:11px;">
          ${escapeDamageHtml(item.createdAt)}<br />
          <span style="color:#334155;">โดย: ${escapeDamageHtml(item.inspectorName)}</span>
        </td>
        <td style="text-align:center; font-weight:700; color:${statusColor}; white-space:nowrap;">
          ${statusLabel}
        </td>
      </tr>`;
      })
      .join('');

    const evidenceBlocksHtml = items
      .map((item, idx) => {
        const sev = SEVERITY_LABELS[item.severity] || SEVERITY_LABELS.minor_scratch;
        const statusLabel = item.resolved ? '✓ ซ่อมบำรุงแล้ว' : '⚠ รอซ่อมสี/ซ่อมบำรุง';
        const svgFallback = generateSvgDamagePlaceholder(
          item.positionArea,
          item.description || item.vehicleCode
        );

        const allPhotos: Array<{ label: string; primary?: string; driveUrl?: string }> = [
          {
            label: `ภาพหลัก: ${item.positionArea}`,
            primary: item.photoUrl,
            driveUrl: item.drivePhotoUrl,
          },
          ...(item.additionalPhotos || []).map((photo, pIdx) => ({
            label: `มุมเพิ่มเติม #${pIdx + 1}: ${item.positionArea}`,
            primary: photo,
            driveUrl: item.driveAdditionalPhotoUrls?.[pIdx],
          })),
        ];

        const photosGridHtml = allPhotos
          .map((p) => {
            const first = toDisplayableDriveImageUrl(p.primary, p.driveUrl) || p.primary || '';
            const fallbacks = getDriveImageFallbackUrls(p.primary, p.driveUrl);
            const candidates = Array.from(new Set([first, ...fallbacks, svgFallback].filter(Boolean)));
            const src = candidates[0] || svgFallback;
            const fallbackJson = escapeDamageHtml(JSON.stringify(candidates));
            return `
              <div class="evidence-photo-box">
                <img src="${escapeDamageHtml(src)}" alt="${escapeDamageHtml(p.label)}" referrerpolicy="no-referrer" data-candidates="${fallbackJson}" data-idx="0" onerror="var list=JSON.parse(this.dataset.candidates||'[]');var i=parseInt(this.dataset.idx||'0',10)+1;if(i<list.length){this.dataset.idx=i;this.src=list[i];}" />
                <div class="evidence-photo-label">${escapeDamageHtml(p.label)}</div>
              </div>`;
          })
          .join('');

        return `
      <div class="evidence-card">
        <div class="evidence-card-header">
          <span>
            <strong>จุดที่ ${idx + 1}:</strong> ${escapeDamageHtml(item.vehicleCode)} (${escapeDamageHtml(item.plateNumber)}) — <strong>${escapeDamageHtml(item.positionArea)}</strong>
          </span>
          <span>
            ${escapeDamageHtml(sev.label)} &nbsp;|&nbsp; <strong style="color:${item.resolved ? '#15803d' : '#b45309'};">${statusLabel}</strong>
          </span>
        </div>
        <div class="evidence-card-desc">
          <strong>รายละเอียด:</strong> ${escapeDamageHtml(item.description)}
          ${item.odometerAtReport ? ` &nbsp;|&nbsp; <strong>เลขไมล์:</strong> ${item.odometerAtReport.toLocaleString()} กม.` : ''}
          &nbsp;|&nbsp; <strong>บันทึกเมื่อ:</strong> ${escapeDamageHtml(item.createdAt)} (${escapeDamageHtml(item.inspectorName)})
        </div>
        <div class="evidence-photos-grid ${allPhotos.length === 1 ? 'single-photo' : ''}">
          ${photosGridHtml}
        </div>
      </div>`;
      })
      .join('');

    return `<!DOCTYPE html>
<html lang="th">
<head>
  <meta charset="utf-8" />
  <title>${escapeDamageHtml(pdfTitle)}</title>
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
      min-height: ${showTopToolbar ? '297mm' : 'auto'};
      margin: ${showTopToolbar ? '18px auto' : '0'};
      padding: ${showTopToolbar ? '14mm 16mm' : '0'};
      box-shadow: ${showTopToolbar ? '0 8px 28px rgba(15, 23, 42, 0.16)' : 'none'};
    }
    .doc-ref {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 11px;
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
      font-size: 16px;
      font-weight: 700;
      color: #000000;
      margin: 0;
    }
    .doc-org {
      font-size: 14.5px;
      font-weight: 700;
      color: #000000;
      margin: 2px 0;
    }
    .doc-date {
      font-size: 12.5px;
      color: #0f172a;
      margin-top: 3px;
    }
    .meta-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 10px;
      font-size: 12px;
    }
    .meta-table td {
      border: 1px solid #334155;
      padding: 6px 10px;
      vertical-align: top;
      background: #ffffff;
    }
    .section-heading {
      font-size: 13px;
      font-weight: 700;
      color: #000000;
      border-left: 3px solid #0f172a;
      padding-left: 8px;
      margin: 12px 0 6px 0;
    }
    table.dmg-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 11.5px;
    }
    table.dmg-table thead {
      display: table-header-group;
    }
    table.dmg-table th {
      background: #e2e8f0;
      color: #000000;
      padding: 6px;
      border: 1px solid #334155;
      font-size: 12px;
      font-weight: 700;
    }
    table.dmg-table td {
      padding: 5px 6px;
      border: 1px solid #475569;
      vertical-align: top;
    }
    tr.item-row {
      break-inside: avoid;
      page-break-inside: avoid;
    }
    .evidence-card {
      border: 1px solid #334155;
      margin-bottom: 10px;
      break-inside: avoid;
      page-break-inside: avoid;
    }
    .evidence-card-header {
      background: #e2e8f0;
      border-bottom: 1px solid #334155;
      padding: 5px 10px;
      font-size: 12px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
    }
    .evidence-card-desc {
      background: #f8fafc;
      border-bottom: 1px solid #cbd5e1;
      padding: 5px 10px;
      font-size: 11.5px;
      color: #0f172a;
    }
    .evidence-photos-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 8px;
      padding: 8px;
      background: #ffffff;
    }
    .evidence-photos-grid.single-photo {
      grid-template-columns: 1fr;
      max-width: 440px;
      margin: 0 auto;
    }
    .evidence-photo-box {
      border: 1px solid #94a3b8;
      background: #ffffff;
      text-align: center;
    }
    .evidence-photo-box img {
      width: 100%;
      height: 175px;
      object-fit: cover;
      display: block;
      background: #f1f5f9;
    }
    .evidence-photos-grid.single-photo .evidence-photo-box img {
      height: 220px;
    }
    .evidence-photo-label {
      padding: 3px 6px;
      font-size: 11px;
      font-weight: 700;
      border-top: 1px solid #cbd5e1;
      background: #f8fafc;
    }
    .signatures-wrapper {
      break-inside: avoid;
      page-break-inside: avoid;
      margin-top: 18px;
    }
    .sign-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 24px;
    }
    .sign-box {
      padding: 6px;
      text-align: center;
      font-size: 12.5px;
      line-height: 1.6;
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
        min-height: auto;
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
            <strong>รายงานบันทึกรอยรอบตัวรถ (${escapeDamageHtml(scopeLabel)})</strong>
            <span style="font-size:12px; color:#cbd5e1; margin-left:8px;">จำนวน ${items.length} จุด · ประจำวันที่ ${escapeDamageHtml(dateParts.day)} ${escapeDamageHtml(dateParts.month)} ${escapeDamageHtml(dateParts.year)}</span>
          </div>
          <button type="button" class="toolbar-btn" onclick="window.print()">พิมพ์ / บันทึกเป็น .PDF (A4)</button>
        </div>`
      : ''
  }
  <div class="page-sheet">
    <div class="doc-ref">
      <span>${singleItem ? `เลขที่อ้างอิง: ${escapeDamageHtml(singleItem.id)}` : `ขอบเขตรายงาน: ${escapeDamageHtml(scopeLabel)}`}</span>
      <span>พิมพ์รายงานเมื่อ: ${escapeDamageHtml(printTimestamp)}</span>
    </div>

    <div class="doc-header">
      <div class="doc-title">รายงานบันทึกรอยรอบตัวรถและจุดความเสียหาย</div>
      <div class="doc-org">${escapeDamageHtml(ORGANIZATION_NAME)}</div>
      <div class="doc-date">
        ประจำวันที่ <strong>${escapeDamageHtml(dateParts.day)}</strong> เดือน <strong>${escapeDamageHtml(dateParts.month)}</strong> พ.ศ. <strong>${escapeDamageHtml(dateParts.year)}</strong>
      </div>
    </div>

    <table class="meta-table">
      <tbody>
        <tr>
          <td style="width:52%;">
            <div><strong>รถปฏิบัติการกู้ชีพ:</strong> ${escapeDamageHtml(scopeLabel)}</div>
            <div><strong>จำนวนจุดความเสียหายที่รายงาน:</strong> <strong>${items.length} จุด</strong></div>
            <div><strong>สรุปสถานะการซ่อมบำรุง:</strong> <strong style="color:#b45309;">รอซ่อม ${pendingCount} จุด</strong> · <strong style="color:#15803d;">ซ่อมแล้ว ${resolvedCount} จุด</strong></div>
          </td>
          <td style="width:48%;">
            <div><strong>ผู้ตรวจ / ผู้บันทึกข้อมูล:</strong> ${escapeDamageHtml(uniqueInspectors.length > 0 ? uniqueInspectors.join(', ') : signerName)}</div>
            <div><strong>เลขไมล์ขณะรายงาน:</strong> ${singleItem?.odometerAtReport ? `${singleItem.odometerAtReport.toLocaleString()} กิโลเมตร` : 'ตามรายการที่บันทึก'}</div>
            <div><strong>วัน-เวลาออกรายงาน:</strong> ${escapeDamageHtml(printTimestamp)}</div>
          </td>
        </tr>
      </tbody>
    </table>

    <div class="section-heading">ส่วนที่ 1 ตารางสรุปรายการรอยรอบตัวรถและจุดความเสียหาย</div>
    <table class="dmg-table">
      <thead>
        <tr>
          <th style="width:6%; text-align:center;">ลำดับ</th>
          <th style="width:14%; text-align:left;">รหัสรถ / ทะเบียน</th>
          <th style="width:16%; text-align:left;">ตำแหน่งบนตัวรถ</th>
          <th style="width:18%; text-align:left;">ประเภทความเสียหาย</th>
          <th style="width:22%; text-align:left;">รายละเอียดรอย</th>
          <th style="width:13%; text-align:left;">บันทึกเมื่อ</th>
          <th style="width:11%; text-align:center;">สถานะ</th>
        </tr>
      </thead>
      <tbody>
        ${tableRowsHtml}
      </tbody>
    </table>

    <div class="section-heading">ส่วนที่ 2 ภาพถ่ายหลักฐานประกอบจุดความเสียหาย</div>
    ${evidenceBlocksHtml}

    <div class="signatures-wrapper">
      <div class="sign-grid">
        <div class="sign-box">
          <div style="height:28px;"></div>
          <div>ลงชื่อ.....................................................................</div>
          <div style="font-weight:700;">( ${escapeDamageHtml(signerName)} )</div>
          <div>เจ้าหน้าที่ผู้ตรวจบันทึกรอยตัวรถ</div>
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

      <div class="sign-center">
        <div class="sign-box">
          <div style="font-weight:700;">จึงเรียนมาเพื่อโปรดทราบ</div>
          <div style="height:28px;"></div>
          <div>ลงชื่อ.....................................................................</div>
          <div style="font-weight:700; white-space:pre;">(        นายนิยม   สังข์เอียด        )</div>
          <div>นายกองค์การบริหารส่วนตำบลหงษ์เจริญ</div>
          <div>วันที่............เดือน........................พ.ศ. .......................</div>
        </div>
      </div>
    </div>
  </div>
</body>
</html>`;
  };

  const waitAndTriggerPrint = async (
    targetWindow: Window,
    targetDoc: Document,
    items: VehicleDamageItem[],
    onDone?: () => void
  ) => {
    const previousTitle = document.title;
    try {
      document.title = getSafeDamagePdfFilename(items);
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
          new Promise((res) => setTimeout(res, 3000)),
        ]);
      }
      targetWindow.focus();
      targetWindow.print();
      setPrintStatus('เปิดหน้าต่างบันทึกเป็น .PDF / สั่งพิมพ์แล้ว');
    } catch {
      window.print();
    } finally {
      document.title = previousTitle;
      onDone?.();
    }
  };

  const handlePrintDamagePdf = (items: VehicleDamageItem[]) => {
    if (!items || items.length === 0) return;
    try {
      setPrintStatus('กำลังจัดรูปแบบเอกสาร A4 และเตรียมภาพหลักฐาน...');
      const htmlContent = buildDamageReportHtml(items, false);
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
          void waitAndTriggerPrint(printFrame.contentWindow!, frameDoc, items, () => {
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
    } catch {
      setPrintStatus(null);
      window.print();
    }
  };

  const handleOpenDamageStandaloneTab = (items: VehicleDamageItem[]) => {
    if (!items || items.length === 0) return;
    try {
      const htmlContent = buildDamageReportHtml(items, true);
      const win = window.open('', '_blank');
      if (win) {
        win.document.open();
        win.document.write(htmlContent);
        win.document.close();
      } else {
        handlePrintDamagePdf(items);
      }
    } catch {
      handlePrintDamagePdf(items);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Car className="h-6 w-6 text-sky-600" />
            <span>เมนูบันทึกรอยรอบตัวรถ (Vehicle Scratch & Damage Tracker)</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            ตรวจเช็ค ถ่ายรูปบันทึกรอยขูดขีด รอยบุบ รอยแตกหักรอบตัวถังรถกู้ชีพ BLS และระบุตำแหน่งอย่างละเอียด
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => handleOpenReportModal(filteredRecords)}
            disabled={filteredRecords.length === 0}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-xs font-bold text-slate-800 shadow-sm hover:bg-slate-50 disabled:opacity-45 disabled:cursor-not-allowed transition-all dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
            title="ดูตัวอย่างรายงานและบันทึกเป็นไฟล์ .PDF ขนาด A4 รูปแบบราชการ"
          >
            <FileDown className="h-4 w-4 text-sky-600 dark:text-sky-400" />
            <span>พิมพ์รายงาน .PDF ({filteredRecords.length})</span>
          </button>

          {currentUser.role !== 'executive' && (
            <button
              type="button"
              onClick={() => handleOpenAddModal()}
              className="inline-flex items-center gap-2 rounded-xl bg-sky-600 px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-sky-500 transition-all"
            >
              <Plus className="h-4 w-4" />
              <span>บันทึกรอยรอบตัวรถใหม่</span>
            </button>
          )}
        </div>
      </div>

      {/* KPI Cards Strip */}
      <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            รอยแผลที่บันทึกทั้งหมด
          </span>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="font-mono text-2xl font-bold tabular-nums text-slate-900 dark:text-white">
              {damageRecords.length}
            </span>
            <span className="text-xs text-slate-400">จุด</span>
          </div>
          <p className="mt-1 text-[11px] text-slate-400">บันทึกสะสมในระบบ</p>
        </div>

        <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-4 shadow-sm dark:border-amber-950 dark:bg-amber-950/20">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-amber-800 dark:text-amber-300">
            รอยขูดขีด / สีถลอก
          </span>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="font-mono text-2xl font-bold tabular-nums text-amber-600 dark:text-amber-400">
              {damageRecords.filter((d) => d.severity === 'minor_scratch' || d.severity === 'deep_scratch').length}
            </span>
            <AlertTriangle className="h-4 w-4 text-amber-500" />
          </div>
          <p className="mt-1 text-[11px] text-amber-700 dark:text-amber-400">รอยขูดเฉี่ยวชน</p>
        </div>

        <div className="rounded-2xl border border-orange-200 bg-orange-50/50 p-4 shadow-sm dark:border-orange-950 dark:bg-orange-950/20">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-orange-800 dark:text-orange-300">
            รอยบุบ / ยุบตัว
          </span>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="font-mono text-2xl font-bold tabular-nums text-orange-600 dark:text-orange-400">
              {damageRecords.filter((d) => d.severity === 'dent').length}
            </span>
            <span className="text-xs text-orange-500 font-semibold">แผลบุบ</span>
          </div>
          <p className="mt-1 text-[11px] text-orange-700 dark:text-orange-400">ตัวถัง/กันชนบุบ</p>
        </div>

        <div className="rounded-2xl border border-red-200 bg-red-50/50 p-4 shadow-sm dark:border-red-950 dark:bg-red-950/20">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-red-800 dark:text-red-300">
            รอยแตกหัก / ต้องซ่อม
          </span>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="font-mono text-2xl font-bold tabular-nums text-red-600 dark:text-red-400">
              {damageRecords.filter((d) => d.severity === 'crack' || d.severity === 'rust').length}
            </span>
            <span className="text-xs text-red-500 font-semibold">ชำรุด</span>
          </div>
          <p className="mt-1 text-[11px] text-red-700 dark:text-red-400">ต้องส่งซ่อมสี/ตัวถัง</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-3.5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-1 items-center gap-2 min-w-[240px]">
          <Search className="h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="ค้นหาตามตำแหน่ง เช่น กันชนหน้า, ฝากระโปรง หรือรายละเอียดรอย..."
            className="w-full bg-transparent text-xs text-slate-800 placeholder-slate-400 focus:outline-none dark:text-slate-200"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Vehicle Filter */}
          <select
            value={selectedVehicleFilter}
            onChange={(e) => setSelectedVehicleFilter(e.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
          >
            <option value="all">รถกู้ชีพ BLS ทั้งหมด ({vehicles.length} คัน)</option>
            {vehicles.map((v) => (
              <option key={v.id} value={v.id}>
                {v.code} - {v.plateNumber}
              </option>
            ))}
          </select>

          {/* Severity Filter */}
          <select
            value={selectedSeverityFilter}
            onChange={(e) => setSelectedSeverityFilter(e.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
          >
            <option value="all">ประเภทความเสียหายทั้งหมด</option>
            <option value="minor_scratch">รอยขูดขีดตื้น</option>
            <option value="deep_scratch">รอยขูดขีดลึก</option>
            <option value="dent">รอยบุบ / ยุบตัว</option>
            <option value="crack">รอยแตกหัก</option>
            <option value="paint_chip">สะเก็ดหิน / สีหลุด</option>
            <option value="rust">คราบสนิม</option>
          </select>
        </div>
      </div>

      {/* Grid of Damage Records */}
      {filteredRecords.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredRecords.map((item) => {
            const sev = SEVERITY_LABELS[item.severity] || SEVERITY_LABELS.minor_scratch;
            const mainPhotoUrl = getDisplayablePhotoUrl(
              item.photoUrl,
              item.drivePhotoUrl,
              item.positionArea,
              item.description || item.vehicleCode
            );

            return (
              <div
                key={item.id}
                className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm hover:shadow-md transition-all dark:border-slate-800 dark:bg-slate-900 flex flex-col"
              >
                {/* Photo Preview Container */}
                <div
                  className="relative aspect-[16/10] w-full overflow-hidden bg-slate-900 group cursor-pointer"
                  onClick={() => setViewPhotoModalUrl(mainPhotoUrl)}
                >
                  <img
                    src={mainPhotoUrl}
                    alt={item.positionArea}
                    className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      const fallback = generateSvgDamagePlaceholder(
                        item.positionArea,
                        item.description || item.vehicleCode
                      );
                      if (e.currentTarget.src !== fallback) {
                        e.currentTarget.src = fallback;
                      }
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-black/30 pointer-events-none" />

                  {/* Vehicle Tag Badge */}
                  <div className="absolute left-2.5 top-2.5">
                    <span className="rounded-md bg-slate-950/80 px-2 py-0.5 font-mono text-xs font-bold text-sky-400 backdrop-blur-sm">
                      {item.vehicleCode}
                    </span>
                  </div>

                  {/* Severity Badge */}
                  <div className="absolute right-2.5 top-2.5">
                    <span
                      className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-bold border backdrop-blur-sm ${sev.badgeClass}`}
                    >
                      {sev.label}
                    </span>
                  </div>

                  {/* Location Banner at bottom of photo */}
                  <div className="absolute bottom-2 left-2.5 right-2.5 flex items-center justify-between text-white pointer-events-none">
                    <div className="flex items-center gap-1.5 font-bold text-xs truncate drop-shadow-md">
                      <Tag className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                      <span className="truncate">{item.positionArea}</span>
                    </div>
                    {item.additionalPhotos && item.additionalPhotos.length > 0 && (
                      <span className="rounded bg-black/60 px-1.5 py-0.5 text-[10px] text-sky-300 font-mono">
                        +{item.additionalPhotos.length} รูป
                      </span>
                    )}
                  </div>
                </div>

                {/* Card Body */}
                <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100">
                        {item.plateNumber}
                      </h4>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {item.createdAt}
                      </span>
                    </div>

                    <p className="text-xs text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
                      {item.description}
                    </p>
                  </div>

                  {/* Additional mini photos preview if any */}
                  {item.additionalPhotos && item.additionalPhotos.length > 0 && (
                    <div>
                      <span className="text-[10px] font-semibold text-slate-400 block mb-1">
                        รูปภาพมุมเพิ่มเติม:
                      </span>
                      <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                        {item.additionalPhotos.map((photo, pIdx) => {
                          const subPhotoUrl = getDisplayablePhotoUrl(
                            photo,
                            undefined,
                            `${item.positionArea} (มุม ${pIdx + 1})`,
                            'มุมเสริม'
                          );
                          return (
                            <img
                              key={pIdx}
                              src={subPhotoUrl}
                              alt={`มุมเพิ่มเติม ${pIdx + 1}`}
                              onClick={() => setViewPhotoModalUrl(subPhotoUrl)}
                              className="h-10 w-10 object-cover rounded-lg border border-slate-200 cursor-pointer hover:opacity-80 shrink-0"
                              onError={(e) => {
                                const fallback = generateSvgDamagePlaceholder(
                                  `${item.positionArea} (มุม ${pIdx + 1})`,
                                  'มุมเสริม'
                                );
                                if (e.currentTarget.src !== fallback) {
                                  e.currentTarget.src = fallback;
                                }
                              }}
                            />
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Metadata & Actions */}
                  <div className="border-t border-slate-100 pt-3 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500">
                    <div className="flex items-center gap-1">
                      <User className="h-3.5 w-3.5 text-slate-400" />
                      <span className="truncate max-w-[130px]">{item.inspectorName}</span>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5">
                      {(currentUser.role === 'admin' || currentUser.role === 'executive') &&
                        (item.driveFolderUrl || item.drivePhotoUrl) && (
                          <a
                            href={item.driveFolderUrl || item.drivePhotoUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 rounded-lg border border-sky-200 bg-sky-50 px-2 py-1 text-xs font-semibold text-sky-700 hover:bg-sky-100 dark:border-sky-800 dark:bg-sky-950/40 dark:text-sky-300"
                            title="เปิดดูรูปภาพใน Google Drive"
                          >
                            <ExternalLink className="h-3 w-3" />
                            <span>Drive</span>
                          </a>
                        )}

                      <button
                        type="button"
                        onClick={() => setViewPhotoModalUrl(mainPhotoUrl)}
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300"
                        title="ดูรูปภาพขนาดใหญ่"
                      >
                        <Eye className="h-3 w-3" />
                        <span>ดูรูป</span>
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          handleOpenReportModal([item], `${item.vehicleCode} · ${item.positionArea}`)
                        }
                        className="inline-flex items-center gap-1 rounded-lg bg-slate-900 px-2 py-1 text-xs font-semibold text-white hover:bg-slate-800 dark:bg-sky-600 dark:hover:bg-sky-500"
                        title="ดูแบบฟอร์มราชการและบันทึกจุดนี้เป็น .PDF ขนาด A4"
                      >
                        <FileDown className="h-3 w-3" />
                        <span>.PDF</span>
                      </button>

                      {currentUser.role !== 'executive' && (
                        <button
                          type="button"
                          onClick={() => handleOpenEditModal(item)}
                          className="inline-flex items-center gap-1 rounded-lg border border-sky-200 bg-sky-50 px-2 py-1 text-xs font-medium text-sky-700 hover:bg-sky-100 dark:border-sky-800 dark:bg-sky-950/40 dark:text-sky-300"
                          title="แก้ไขข้อมูลและรูปภาพรอยนี้"
                        >
                          <Pencil className="h-3 w-3" />
                          <span>แก้ไข</span>
                        </button>
                      )}

                      {onUpdateDamageStatus && currentUser.role !== 'executive' ? (
                        <button
                          type="button"
                          onClick={() => onUpdateDamageStatus(item.id, !item.resolved)}
                          className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold border transition-colors ${
                            item.resolved
                              ? 'border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300'
                              : 'border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300'
                          }`}
                          title={item.resolved ? 'คลิกเพื่อเปลี่ยนเป็น: รอซ่อมสี' : 'คลิกเพื่อเปลี่ยนเป็น: ซ่อมสีแล้ว'}
                        >
                          <CheckCircle2 className="h-3 w-3" />
                          <span>{item.resolved ? 'ซ่อมแล้ว' : 'รอซ่อม'}</span>
                        </button>
                      ) : (
                        <span
                          className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold border ${
                            item.resolved
                              ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300'
                              : 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-300'
                          }`}
                        >
                          <CheckCircle2 className="h-3 w-3" />
                          <span>{item.resolved ? 'ซ่อมแล้ว' : 'รอซ่อม'}</span>
                        </span>
                      )}

                      {currentUser.role === 'admin' && (
                        <button
                          type="button"
                          onClick={() => onDeleteDamage(item.id)}
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40 dark:hover:text-red-400"
                          title="ลบรายการรอยนี้"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center dark:border-slate-800 dark:bg-slate-900">
          <Car className="mx-auto h-12 w-12 text-slate-300 dark:text-slate-700" />
          <h3 className="mt-3 text-sm font-bold text-slate-700 dark:text-slate-300">
            ยังไม่พบรายการบันทึกรอยรอบตัวรถ
          </h3>
          <p className="mt-1 text-xs text-slate-400 max-w-md mx-auto">
            {selectedVehicleFilter !== 'all'
              ? 'รถกู้ชีพคันนี้ยังไม่มีการบันทึกรอยขูดขีดหรือความเสียหาย'
              : 'สามารถเริ่มบันทึกรอยขูดขีด รอยบุบ หรือรอยแตกหักรอบตัวรถได้ทันที'}
          </p>
          <button
            type="button"
            onClick={() => handleOpenAddModal()}
            className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-sky-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-sky-500"
          >
            <Plus className="h-4 w-4" />
            <span>บันทึกรอยรอบตัวรถคันนี้</span>
          </button>
        </div>
      )}

      {/* Modal: Add New Vehicle Damage */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-3 sm:p-4 backdrop-blur-sm animate-in fade-in">
          <div className="relative flex flex-col w-full max-w-2xl max-h-[90vh] rounded-3xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900 overflow-hidden">
            {/* Modal Header (Pinned) */}
            <div className="shrink-0 flex items-center justify-between border-b border-slate-200 bg-slate-50 px-6 py-4 dark:border-slate-800 dark:bg-slate-850">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-sky-100 dark:bg-sky-950/50 text-sky-600">
                  <Car className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    {editingDamageId ? 'แก้ไขข้อมูลรอยรอบตัวรถและจุดความเสียหาย' : 'บันทึกรอยรอบตัวรถและจุดความเสียหาย'}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    {editingDamageId
                      ? 'แก้ไขรายละเอียด ตำแหน่ง ลักษณะรอย และรูปถ่ายจุดความเสียหาย'
                      : 'ถ่ายภาพหรืออัปโหลดรูปจุดที่มีรอยขูดขีด/บุบ/เสียหาย พร้อมระบุตำแหน่งและรายละเอียด'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="rounded-full p-1.5 text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
                title="ปิด"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Scrollable Form Body */}
            <form id="vehicle-damage-form" onSubmit={handleSubmitDamage} className="flex-1 overflow-y-auto p-6 space-y-4">
              {formError && (
                <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700 dark:border-red-900 dark:bg-red-950/50 dark:text-red-300">
                  {formError}
                </div>
              )}

              {/* Vehicle Selection & Odometer */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {vehicles.length > 0 ? (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      เลือกรถกู้ชีพ BLS:
                    </label>
                    <select
                      value={selectedVehicleId || vehicles[0].id}
                      onChange={(e) => handleVehicleChange(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-800 focus:border-sky-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                    >
                      {vehicles.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.code} - {v.plateNumber} ({v.brandModel})
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div className="sm:col-span-2 space-y-2 rounded-2xl border border-amber-200 bg-amber-50/70 p-3.5 dark:border-amber-900/40 dark:bg-amber-950/20">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-amber-800 dark:text-amber-300">
                      <AlertTriangle className="h-4 w-4 text-amber-600" />
                      <span>ขณะนี้ยังไม่มีรถกู้ชีพในระบบ (ระบุข้อมูลรถเพื่อบันทึกทดสอบได้):</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                          รหัสรถ:
                        </label>
                        <input
                          type="text"
                          value={manualCode}
                          onChange={(e) => setManualCode(e.target.value)}
                          placeholder="เช่น BLS-01"
                          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                          เลขทะเบียน:
                        </label>
                        <input
                          type="text"
                          value={manualPlate}
                          onChange={(e) => setManualPlate(e.target.value)}
                          placeholder="เช่น 1กข 4589 กทม."
                          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                        />
                      </div>
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    เลขไมล์ขณะพบรอย (กม.):
                  </label>
                  <input
                    type="number"
                    value={odometer || ''}
                    onChange={(e) => setOdometer(Number(e.target.value))}
                    placeholder="เช่น 142500"
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-mono font-semibold text-slate-800 focus:border-sky-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                  />
                </div>
              </div>

              {/* Position Area Selector */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  ตำแหน่งที่เกิดรอยรอบตัวรถ:
                </label>
                <div className="space-y-2">
                  <select
                    value={positionArea}
                    onChange={(e) => setPositionArea(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-800 focus:border-sky-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                  >
                    {POSITION_PRESETS.map((pos) => (
                      <option key={pos} value={pos}>
                        📍 {pos}
                      </option>
                    ))}
                  </select>

                  <input
                    type="text"
                    value={customPosition}
                    onChange={(e) => setCustomPosition(e.target.value)}
                    placeholder="หรือระบุตำแหน่งอย่างละเอียดเอง (เช่น 'ชายล่างประตูหน้าขวาใต้คิ้วโครเมียม')"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-800 focus:border-sky-500 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                  />
                </div>
              </div>

              {/* Severity / Damage Type */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  ลักษณะของรอยและความรุนแรง:
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {(Object.keys(SEVERITY_LABELS) as DamageSeverity[]).map((key) => {
                    const item = SEVERITY_LABELS[key];
                    const isSelected = severity === key;
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setSeverity(key)}
                        className={`p-2.5 rounded-xl border text-left text-xs transition-all ${
                          isSelected
                            ? 'border-sky-500 bg-sky-50/80 ring-2 ring-sky-500/20 font-bold dark:bg-sky-950/40'
                            : 'border-slate-200 bg-white hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800'
                        }`}
                      >
                        <span className="block font-semibold text-slate-800 dark:text-slate-200">
                          {item.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  รายละเอียดของรอย (ว่าเกิดขึ้นตรงไหน อย่างไร):
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  placeholder="เช่น รอยขูดขีดเป็นเส้นตรงยาวประมาณ 15 ซม. บริเวณชายล่างกันชนหน้า เกิดจากการเบียดขอบหินขณะจอดรับผู้ป่วย"
                  className="w-full rounded-xl border border-slate-200 bg-white p-3 text-xs text-slate-800 focus:border-sky-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                />
              </div>

              {/* Photos Section */}
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    รูปถ่ายรอยแผลหลัก (จำเป็น):
                  </label>
                  {mainPhoto ? (
                    <div className="relative group aspect-[16/9] w-full max-w-sm rounded-xl overflow-hidden border border-slate-200 bg-slate-900 shadow-inner">
                      <img
                        src={getDisplayablePhotoUrl(mainPhoto, undefined, customPosition || positionArea, description || 'รอยแผลหลัก')}
                        alt="รอยหลัก"
                        className="h-full w-full object-cover cursor-pointer transition-transform group-hover:scale-102"
                        onClick={() => setViewPhotoModalUrl(mainPhoto)}
                        onError={(e) => {
                          const fallback = generateSvgDamagePlaceholder(customPosition || positionArea, description || 'รอยแผลหลัก');
                          if (e.currentTarget.src !== fallback) {
                            e.currentTarget.src = fallback;
                          }
                        }}
                      />
                      <div className="absolute inset-0 bg-slate-950/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-900/80 px-3 py-1 text-xs text-white backdrop-blur-sm">
                          <Eye className="h-3.5 w-3.5" /> คลิกดูรูปเต็ม
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setMainPhoto('')}
                        className="absolute top-2 right-2 rounded-full bg-slate-900/85 p-1.5 text-white hover:bg-red-600 transition-colors shadow-md"
                        title="ลบหรือเปลี่ยนรูป"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center aspect-[16/9] w-full max-w-sm rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 p-4 hover:border-sky-500 hover:bg-sky-50/50 cursor-pointer transition-all dark:border-slate-700 dark:bg-slate-800">
                      <Camera className="h-8 w-8 text-sky-500 mb-2" />
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
                        {isProcessingPhoto ? 'กำลังประมวลผล...' : 'ถ่ายภาพ / อัปโหลดรูปรอยแผล'}
                      </span>
                      <span className="text-[10px] text-slate-400 mt-0.5">
                        ระบบจะบีบอัดขนาดไฟล์ภาพให้อัตโนมัติ คมชัด และไม่เปลืองพื้นที่
                      </span>
                      <input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        onChange={(e) => handlePhotoUpload(e, true)}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>

                {/* Additional Photos (รูปถ่ายมุมอื่นๆ หลายรูป) */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                      รูปถ่ายมุมอื่นๆ เพิ่มเติม (สามารถอัปโหลดได้หลายรูป):
                    </label>
                    {additionalPhotos.length > 0 && (
                      <span className="text-[11px] font-medium text-sky-600 dark:text-sky-400">
                        ({additionalPhotos.length} รูป)
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2.5 items-center">
                    {additionalPhotos.map((photo, index) => {
                      const displaySub = getDisplayablePhotoUrl(
                        photo,
                        undefined,
                        `${customPosition || positionArea} (มุม ${index + 1})`,
                        'รูปมุมเสริม'
                      );
                      return (
                        <div
                          key={index}
                          className="group relative h-20 w-20 rounded-xl overflow-hidden border border-slate-200 bg-slate-100 shadow-sm dark:border-slate-700 dark:bg-slate-800 shrink-0"
                        >
                          <img
                            src={displaySub}
                            alt={`รูปมุม ${index + 1}`}
                            className="h-full w-full object-cover cursor-pointer transition-transform group-hover:scale-105"
                            onClick={() => setViewPhotoModalUrl(displaySub)}
                            onError={(e) => {
                              const fallback = generateSvgDamagePlaceholder(
                                `${customPosition || positionArea} (มุม ${index + 1})`,
                                'รูปมุมเสริม'
                              );
                              if (e.currentTarget.src !== fallback) {
                                e.currentTarget.src = fallback;
                              }
                            }}
                          />
                          <span className="absolute bottom-1 left-1 rounded bg-slate-900/80 px-1 py-0.5 text-[9px] font-mono font-bold text-white pointer-events-none">
                            #{index + 1}
                          </span>
                          <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                            <Eye className="h-4 w-4 text-white drop-shadow" />
                          </div>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemoveAdditionalPhoto(index);
                            }}
                            className="absolute top-1 right-1 z-10 rounded-full bg-slate-900/85 p-1 text-white hover:bg-red-600 transition-colors shadow"
                            title="ลบรูปนี้"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      );
                    })}

                    <label
                      className={`flex flex-col items-center justify-center h-20 w-20 rounded-xl border-2 border-dashed transition-all ${
                        isProcessingPhoto
                          ? 'opacity-60 pointer-events-none border-slate-300 bg-slate-100 dark:bg-slate-800'
                          : 'border-slate-300 bg-slate-50 hover:border-sky-500 hover:bg-sky-50/50 cursor-pointer dark:border-slate-700 dark:bg-slate-800'
                      }`}
                    >
                      {isProcessingPhoto ? (
                        <div className="h-5 w-5 animate-spin rounded-full border-2 border-sky-500 border-t-transparent" />
                      ) : (
                        <>
                          <Plus className="h-5 w-5 text-sky-500" />
                          <span className="text-[10px] font-semibold text-slate-600 dark:text-slate-300 mt-0.5">
                            เพิ่มรูป
                          </span>
                        </>
                      )}
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        disabled={isProcessingPhoto}
                        onChange={(e) => handlePhotoUpload(e, false)}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>
              </div>
            </form>

            {/* Modal Footer (Pinned at bottom, never cut off) */}
            <div className="shrink-0 flex items-center justify-end gap-3 border-t border-slate-200 bg-slate-50/90 px-6 py-3.5 dark:border-slate-800 dark:bg-slate-850">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
              >
                ยกเลิก
              </button>
              <button
                form="vehicle-damage-form"
                type="submit"
                disabled={isProcessingPhoto}
                className="rounded-xl bg-sky-600 px-6 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-sky-500 disabled:opacity-50 transition-colors"
              >
                {isProcessingPhoto
                  ? 'กำลังประมวลผลรูป...'
                  : editingDamageId
                  ? 'บันทึกการแก้ไข'
                  : 'บันทึกรอยรอบตัวรถ'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Printable Official Government A4 Report Modal */}
      {reportModalItems && reportModalItems.length > 0 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-3 sm:p-6 backdrop-blur-sm overflow-y-auto">
          <div className="my-auto w-full max-w-5xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-6 py-4 bg-slate-50 dark:border-slate-800 dark:bg-slate-850">
              <div className="flex items-center gap-2.5">
                <div className="rounded-lg bg-sky-100 p-2 text-sky-700 dark:bg-sky-950 dark:text-sky-300">
                  <FileDown className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    พิมพ์ / บันทึกเป็น .PDF รายงานบันทึกรอยรอบตัวรถ ({reportModalTitle})
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    จำนวน {reportModalItems.length} จุด · เลือกปลายทางเป็น &ldquo;บันทึกเป็น PDF (Save as PDF)&rdquo; ขนาด A4
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {printStatus && (
                  <span className="text-xs font-medium text-sky-600 animate-pulse">{printStatus}</span>
                )}
                <button
                  type="button"
                  onClick={() => handlePrintDamagePdf(reportModalItems)}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-sky-600 px-3.5 py-2 text-xs font-bold text-white shadow-sm hover:bg-sky-500 active:scale-95 transition-all"
                  title="พิมพ์หรือบันทึกเป็นไฟล์ .PDF ขนาด A4 รูปแบบราชการ"
                >
                  <Printer className="h-4 w-4" />
                  <span>พิมพ์ / บันทึกเป็น .PDF</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleOpenDamageStandaloneTab(reportModalItems)}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                  title="เปิดหน้ากระดาษ A4 เต็มหน้าในแท็บใหม่เพื่อดูตัวอย่างก่อนบันทึก PDF"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  <span>เปิดหน้ากระดาษ A4</span>
                </button>
                <button
                  type="button"
                  onClick={() => setReportModalItems(null)}
                  className="rounded-lg p-2 text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {(() => {
              const singleItem = reportModalItems.length === 1 ? reportModalItems[0] : undefined;
              const dateParts = getDamageReportDateParts(singleItem);
              const scopeLabel = getReportScopeLabel(reportModalItems);
              const pendingCount = reportModalItems.filter((d) => !d.resolved).length;
              const resolvedCount = reportModalItems.filter((d) => d.resolved).length;
              const uniqueInspectors = Array.from(
                new Set(reportModalItems.map((d) => d.inspectorName).filter(Boolean))
              );
              const signerName =
                singleItem?.inspectorName ||
                (uniqueInspectors.length === 1 ? uniqueInspectors[0] : currentUser?.name) ||
                'เจ้าหน้าที่ผู้ตรวจเช็ค';

              return (
                <div
                  className="max-h-[78vh] overflow-y-auto p-6 sm:p-10 bg-white text-slate-950 space-y-4"
                  style={{ fontFamily: "'Sarabun', 'Prompt', sans-serif" }}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-700">
                    <span>
                      {singleItem
                        ? `เลขที่อ้างอิง: ${singleItem.id}`
                        : `ขอบเขตรายงาน: ${scopeLabel}`}
                    </span>
                    <span>จำนวนจุดที่รายงาน: {reportModalItems.length} จุด</span>
                  </div>

                  <div className="border-b-[3px] border-double border-slate-900 pb-3 text-center">
                    <h2 className="text-base sm:text-lg font-bold text-slate-950">
                      รายงานบันทึกรอยรอบตัวรถและจุดความเสียหาย
                    </h2>
                    <p className="text-sm sm:text-base font-bold mt-0.5 text-slate-950">
                      {ORGANIZATION_NAME}
                    </p>
                    <p className="text-xs sm:text-sm mt-1 text-slate-900">
                      ประจำวันที่ <span className="font-bold underline px-1">{dateParts.day}</span>{' '}
                      เดือน <span className="font-bold underline px-1">{dateParts.month}</span>{' '}
                      พ.ศ. <span className="font-bold underline px-1">{dateParts.year}</span>
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 border border-slate-700 text-xs bg-white">
                    <div className="space-y-1 p-2.5 sm:border-r border-b sm:border-b-0 border-slate-700">
                      <p>
                        <span className="font-bold">รถปฏิบัติการกู้ชีพ:</span> {scopeLabel}
                      </p>
                      <p>
                        <span className="font-bold">จำนวนจุดความเสียหายที่รายงาน:</span>{' '}
                        <span className="font-bold">{reportModalItems.length} จุด</span>
                      </p>
                      <p>
                        <span className="font-bold">สรุปสถานะการซ่อมบำรุง:</span>{' '}
                        <span className="font-bold text-amber-700">รอซ่อม {pendingCount} จุด</span>
                        {' · '}
                        <span className="font-bold text-emerald-700">ซ่อมแล้ว {resolvedCount} จุด</span>
                      </p>
                    </div>
                    <div className="space-y-1 p-2.5">
                      <p>
                        <span className="font-bold">ผู้ตรวจ / ผู้บันทึกข้อมูล:</span>{' '}
                        {uniqueInspectors.length > 0 ? uniqueInspectors.join(', ') : signerName}
                      </p>
                      <p>
                        <span className="font-bold">เลขไมล์ขณะรายงาน:</span>{' '}
                        {singleItem?.odometerAtReport
                          ? `${singleItem.odometerAtReport.toLocaleString()} กิโลเมตร`
                          : 'ตามรายการที่บันทึก'}
                      </p>
                      <p>
                        <span className="font-bold">หน่วยงานจัดทำเอกสาร:</span> {ORGANIZATION_NAME}
                      </p>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-xs sm:text-sm font-bold text-slate-950 border-l-[3px] border-slate-900 pl-2 mb-2">
                      ส่วนที่ 1 ตารางสรุปรายการรอยรอบตัวรถและจุดความเสียหาย
                    </h4>
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse border border-slate-700 text-xs">
                        <thead>
                          <tr className="bg-slate-200 text-slate-950">
                            <th className="border border-slate-700 p-1.5 text-center w-10 font-bold">ลำดับ</th>
                            <th className="border border-slate-700 p-1.5 text-left w-28 font-bold">รหัสรถ / ทะเบียน</th>
                            <th className="border border-slate-700 p-1.5 text-left w-32 font-bold">ตำแหน่งบนตัวรถ</th>
                            <th className="border border-slate-700 p-1.5 text-left w-36 font-bold">ประเภทความเสียหาย</th>
                            <th className="border border-slate-700 p-1.5 text-left font-bold">รายละเอียดรอย</th>
                            <th className="border border-slate-700 p-1.5 text-left w-28 font-bold">บันทึกเมื่อ</th>
                            <th className="border border-slate-700 p-1.5 text-center w-24 font-bold">สถานะ</th>
                          </tr>
                        </thead>
                        <tbody>
                          {reportModalItems.map((item, idx) => {
                            const sev = SEVERITY_LABELS[item.severity] || SEVERITY_LABELS.minor_scratch;
                            return (
                              <tr key={item.id}>
                                <td className="border border-slate-600 p-1.5 text-center">{idx + 1}</td>
                                <td className="border border-slate-600 p-1.5">
                                  <div className="font-bold">{item.vehicleCode}</div>
                                  <div className="text-[11px] text-slate-600">{item.plateNumber}</div>
                                </td>
                                <td className="border border-slate-600 p-1.5 font-bold">{item.positionArea}</td>
                                <td className="border border-slate-600 p-1.5">{sev.label}</td>
                                <td className="border border-slate-600 p-1.5">{item.description}</td>
                                <td className="border border-slate-600 p-1.5 text-[11px]">
                                  <div>{item.createdAt}</div>
                                  <div className="text-slate-600">โดย: {item.inspectorName}</div>
                                </td>
                                <td className="border border-slate-600 p-1.5 text-center font-bold whitespace-nowrap">
                                  {item.resolved ? (
                                    <span className="text-emerald-700">✓ ซ่อมบำรุงแล้ว</span>
                                  ) : (
                                    <span className="text-amber-700">⚠ รอซ่อมสี</span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-xs sm:text-sm font-bold text-slate-950 border-l-[3px] border-slate-900 pl-2 mb-2">
                      ส่วนที่ 2 ภาพถ่ายหลักฐานประกอบจุดความเสียหาย
                    </h4>
                    <div className="space-y-3">
                      {reportModalItems.map((item, idx) => {
                        const sev = SEVERITY_LABELS[item.severity] || SEVERITY_LABELS.minor_scratch;
                        const allPhotos: Array<{ label: string; primary?: string; driveUrl?: string }> = [
                          {
                            label: `ภาพหลัก: ${item.positionArea}`,
                            primary: item.photoUrl,
                            driveUrl: item.drivePhotoUrl,
                          },
                          ...(item.additionalPhotos || []).map((photo, pIdx) => ({
                            label: `มุมเพิ่มเติม #${pIdx + 1}: ${item.positionArea}`,
                            primary: photo,
                            driveUrl: item.driveAdditionalPhotoUrls?.[pIdx],
                          })),
                        ];

                        return (
                          <div key={item.id} className="border border-slate-700">
                            <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-200 border-b border-slate-700 px-3 py-1.5 text-xs">
                              <span>
                                <strong>จุดที่ {idx + 1}:</strong> {item.vehicleCode} ({item.plateNumber}) —{' '}
                                <strong>{item.positionArea}</strong>
                              </span>
                              <span>
                                {sev.label} |{' '}
                                <strong className={item.resolved ? 'text-emerald-700' : 'text-amber-700'}>
                                  {item.resolved ? '✓ ซ่อมบำรุงแล้ว' : '⚠ รอซ่อมสี/ซ่อมบำรุง'}
                                </strong>
                              </span>
                            </div>
                            <div className="bg-slate-50 border-b border-slate-300 px-3 py-1.5 text-[11.5px] text-slate-900">
                              <strong>รายละเอียด:</strong> {item.description}
                              {item.odometerAtReport ? ` | เลขไมล์: ${item.odometerAtReport.toLocaleString()} กม.` : ''}
                              {` | บันทึกเมื่อ: ${item.createdAt} (${item.inspectorName})`}
                            </div>
                            <div
                              className={`grid gap-3 p-3 bg-white ${
                                allPhotos.length === 1 ? 'grid-cols-1 max-w-md mx-auto' : 'grid-cols-1 sm:grid-cols-2'
                              }`}
                            >
                              {allPhotos.map((p, pIdx) => (
                                <div key={pIdx} className="border border-slate-400 bg-white text-center">
                                  <DamageReportPhotoImg
                                    primary={p.primary}
                                    driveUrl={p.driveUrl}
                                    positionArea={item.positionArea}
                                    description={item.description || item.vehicleCode}
                                    alt={p.label}
                                    className="w-full h-48 sm:h-52 object-cover bg-slate-100"
                                  />
                                  <div className="border-t border-slate-300 bg-slate-50 py-1 px-2 text-[11px] font-bold">
                                    {p.label}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-6 pt-6 text-xs sm:text-[13px] text-center text-slate-950">
                    <div className="p-2 leading-relaxed">
                      <div className="h-9" />
                      <p>ลงชื่อ.....................................................................</p>
                      <p className="font-bold mt-1">( {signerName} )</p>
                      <p className="text-[11.5px]">เจ้าหน้าที่ผู้ตรวจบันทึกรอยตัวรถ</p>
                      <p className="text-[11.5px]">วันที่............เดือน........................พ.ศ. ......................</p>
                    </div>
                    <div className="p-2 leading-relaxed">
                      <div className="h-9" />
                      <p>ผู้ตรวจสอบ.....................................................................</p>
                      <p className="font-bold mt-1">( นายวสันต์ วรรณเผือก )</p>
                      <p className="text-[11.5px]">ตำแหน่ง เจ้าพนักงานป้องกันและบรรเทาสาธารณภัยปฏิบัติงาน</p>
                      <p className="text-[11.5px]">วันที่............เดือน........................พ.ศ. ......................</p>
                    </div>
                  </div>

                  <div className="mt-4 flex justify-center text-slate-950">
                    <div className="w-full max-w-md p-2 text-xs sm:text-[13px] text-center leading-relaxed">
                      <p className="font-bold">จึงเรียนมาเพื่อโปรดทราบ</p>
                      <div className="h-9" />
                      <p>ลงชื่อ.....................................................................</p>
                      <p className="font-bold mt-1 whitespace-pre">(        นายนิยม   สังข์เอียด        )</p>
                      <p className="text-xs">นายกองค์การบริหารส่วนตำบลหงษ์เจริญ</p>
                      <p className="text-[11.5px]">วันที่............เดือน........................พ.ศ. .......................</p>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* Full Photo Preview Zoom Modal */}
      {viewPhotoModalUrl && (
        <div
          className="fixed inset-0 z-60 flex items-center justify-center bg-slate-950/90 p-4 backdrop-blur-md"
          onClick={() => setViewPhotoModalUrl(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh] overflow-hidden rounded-2xl bg-black" onClick={(e) => e.stopPropagation()}>
            <img
              src={viewPhotoModalUrl}
              alt="ภาพขยายรอยรอบตัวรถ"
              referrerPolicy="no-referrer"
              className="w-full h-auto max-h-[85vh] object-contain"
            />
            <button
              type="button"
              onClick={() => setViewPhotoModalUrl(null)}
              className="absolute top-3 right-3 rounded-full bg-slate-900/80 p-2 text-white hover:bg-red-600 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
