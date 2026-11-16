import { EquipmentRequisitionCatalogItem } from '../types';

export const REQUISITION_CATEGORIES = [
  '1. วัสดุทำแผล ผ้าก๊อซ และผ้าพันแผล',
  '2. น้ำยาฆ่าเชื้อ ยาสามัญ และเวชภัณฑ์',
  '3. อุปกรณ์ป้องกันและตรวจวัดสัญญาณชีพ/น้ำตาล',
  '4. อุปกรณ์ทางเดินหายใจ ออกซิเจน ดาม และช่วยคลอด',
] as const;

export const EQUIPMENT_REQUISITION_CATALOG: EquipmentRequisitionCatalogItem[] = [
  // หมวด 1: วัสดุทำแผล ผ้าก๊อซ และผ้าพันแผล
  {
    id: 'req-top-gauze-3x6',
    category: REQUISITION_CATEGORIES[0],
    name: 'ท๊อปก็อซขนาด 3x6 นิ้ว 10 ชิ้น/แพ็ค',
    unit: 'แพ็ค',
  },
  {
    id: 'req-top-gauze-6x8',
    category: REQUISITION_CATEGORIES[0],
    name: 'ท๊อปก็อซขนาด 6x8 นิ้ว 10 ชิ้น/แพ็ค',
    unit: 'แพ็ค',
  },
  {
    id: 'req-top-gauze-6x12',
    category: REQUISITION_CATEGORIES[0],
    name: 'ท๊อปก๊อซขนาด 6x12 นิ้ว 10 ชิ้น/แพ็ค',
    unit: 'แพ็ค',
  },
  {
    id: 'req-top-gauze-8x12',
    category: REQUISITION_CATEGORIES[0],
    name: 'ท๊อปก๊อซขนาด 8x12 นิ้ว 10 ชิ้น/แพ็ค',
    unit: 'แพ็ค',
  },
  {
    id: 'req-gauze-2x2',
    category: REQUISITION_CATEGORIES[0],
    name: 'ผ้าก๊อซปิดแผล ขนาด 2x2 นิ้ว 10 ชิ้น/กล่อง',
    unit: 'กล่อง',
  },
  {
    id: 'req-gauze-3x3',
    category: REQUISITION_CATEGORIES[0],
    name: 'ผ้าก๊อซปิดแผล ขนาด 3x3 นิ้ว 10 ชิ้น/กล่อง',
    unit: 'กล่อง',
  },
  {
    id: 'req-gauze-4x4',
    category: REQUISITION_CATEGORIES[0],
    name: 'ผ้าก๊อซปิดแผล ขนาด 4x4 นิ้ว 10 ชิ้น/กล่อง',
    unit: 'กล่อง',
  },
  {
    id: 'req-elastic-gauze-2',
    category: REQUISITION_CATEGORIES[0],
    name: 'ผ้าก๊อซยืดพันแผล ขนาด 2 นิ้ว 12 ชิ้น/กล่อง',
    unit: 'กล่อง',
  },
  {
    id: 'req-elastic-gauze-3',
    category: REQUISITION_CATEGORIES[0],
    name: 'ผ้าก๊อซยืดพันแผล ขนาด 3 นิ้ว 12 ชิ้น/กล่อง',
    unit: 'กล่อง',
  },
  {
    id: 'req-elastic-gauze-4',
    category: REQUISITION_CATEGORIES[0],
    name: 'ผ้าก๊อซยืดพันแผล ขนาด 4 นิ้ว 12 ชิ้น/กล่อง',
    unit: 'กล่อง',
  },
  {
    id: 'req-eb-3',
    category: REQUISITION_CATEGORIES[0],
    name: 'ผ้าพันเคล็ด EB ขนาด 3 นิ้ว 12 ชิ้น/กล่อง',
    unit: 'กล่อง',
  },
  {
    id: 'req-eb-4',
    category: REQUISITION_CATEGORIES[0],
    name: 'ผ้าพันเคล็ด EB ขนาด 4 นิ้ว 12 ชิ้น/กล่อง',
    unit: 'กล่อง',
  },
  {
    id: 'req-eb-6',
    category: REQUISITION_CATEGORIES[0],
    name: 'ผ้าพันเคล็ด EB ขนาด 6 นิ้ว 12 ชิ้น/กล่อง',
    unit: 'กล่อง',
  },
  {
    id: 'req-transpore-2',
    category: REQUISITION_CATEGORIES[0],
    name: 'เทปแต่งแผล Transpore 2 นิ้ว',
    unit: 'ม้วน',
  },
  {
    id: 'req-cotton-40g',
    category: REQUISITION_CATEGORIES[0],
    name: 'สำลีก้อน ขนาด 40 กรัม',
    unit: 'ห่อ',
  },
  {
    id: 'req-cotton-swab-s',
    category: REQUISITION_CATEGORIES[0],
    name: 'ไม้พันสาลี เล็ก',
    unit: 'ห่อ',
  },
  {
    id: 'req-plaster',
    category: REQUISITION_CATEGORIES[0],
    name: 'พลาสเตอร์ยา',
    unit: 'กล่อง',
  },

  // หมวด 2: น้ำยาฆ่าเชื้อ ยาสามัญ และเวชภัณฑ์
  {
    id: 'req-alcohol-70-450',
    category: REQUISITION_CATEGORIES[1],
    name: 'แอลกฮอล์ 70 % 450 ML.',
    unit: 'ขวด',
  },
  {
    id: 'req-alcohol-5l',
    category: REQUISITION_CATEGORIES[1],
    name: 'แอลกอฮอล์ 5 ลิตร',
    unit: 'แกลลอน',
  },
  {
    id: 'req-betadine-500',
    category: REQUISITION_CATEGORIES[1],
    name: 'เบตาดีน 500 ML.',
    unit: 'ขวด',
  },
  {
    id: 'req-nss-1000',
    category: REQUISITION_CATEGORIES[1],
    name: 'น้ำเกลือล้างแผล NSS 1000 ml.',
    unit: 'ขวด',
  },
  {
    id: 'req-ammonia',
    category: REQUISITION_CATEGORIES[1],
    name: 'แอมโมเนีย',
    unit: 'ขวด',
  },
  {
    id: 'req-paracetamol',
    category: REQUISITION_CATEGORIES[1],
    name: 'พาราเซตามอล',
    unit: 'แผง/กระปุก',
  },
  {
    id: 'req-antihistamine',
    category: REQUISITION_CATEGORIES[1],
    name: 'ยาแก้แพ้',
    unit: 'แผง/กระปุก',
  },
  {
    id: 'req-perkindol-spray',
    category: REQUISITION_CATEGORIES[1],
    name: 'Perkindol spray',
    unit: 'กระป๋อง',
  },
  {
    id: 'req-counterpain-120',
    category: REQUISITION_CATEGORIES[1],
    name: 'Counterpain 120 กรัม',
    unit: 'หลอด',
  },

  // หมวด 3: อุปกรณ์ป้องกันและตรวจวัดสัญญาณชีพ/น้ำตาล
  {
    id: 'req-glove-s',
    category: REQUISITION_CATEGORIES[2],
    name: 'ถุงมือ S',
    unit: 'กล่อง',
  },
  {
    id: 'req-glove-m',
    category: REQUISITION_CATEGORIES[2],
    name: 'ถุงมือ M',
    unit: 'กล่อง',
  },
  {
    id: 'req-glove-l',
    category: REQUISITION_CATEGORIES[2],
    name: 'ถุงมือ L',
    unit: 'กล่อง',
  },
  {
    id: 'req-mask',
    category: REQUISITION_CATEGORIES[2],
    name: 'หน้ากากอนามัย',
    unit: 'กล่อง',
  },
  {
    id: 'req-lancet-20',
    category: REQUISITION_CATEGORIES[2],
    name: 'เข็มเจาะเลือด 20 ชิ้น/กล่อง',
    unit: 'กล่อง',
  },
  {
    id: 'req-glucose-strip-50',
    category: REQUISITION_CATEGORIES[2],
    name: 'แผ่นวัดค่าน้ำตาลในเลือด 50 ใบ/กล่อง',
    unit: 'กล่อง',
  },
  {
    id: 'req-accu-chek-lancet',
    category: REQUISITION_CATEGORIES[2],
    name: 'ACCU-Chek Safe-T-Pro (เข็มเจาะ)',
    unit: 'กล่อง',
  },
  {
    id: 'req-glucometer',
    category: REQUISITION_CATEGORIES[2],
    name: 'เครื่องตรวจระดับน้ำตาลปลายนิ้ว',
    unit: 'เครื่อง',
  },
  {
    id: 'req-ir-thermometer',
    category: REQUISITION_CATEGORIES[2],
    name: 'เครื่องวัดอุณหภูมิอินฟาเรดชนิดตรวจ',
    unit: 'เครื่อง',
  },
  {
    id: 'req-oxygen-meter',
    category: REQUISITION_CATEGORIES[2],
    name: 'เครื่องวัดระดับออกซิเจนในเลือด',
    unit: 'เครื่อง',
  },
  {
    id: 'req-pulse-oximeter',
    category: REQUISITION_CATEGORIES[2],
    name: 'เครื่องวัดออกซิเจนปลายนิ้ว',
    unit: 'เครื่อง',
  },
  {
    id: 'req-digital-bp',
    category: REQUISITION_CATEGORIES[2],
    name: 'เครื่องวัดความดันโลหิตแบบดิจิตอล',
    unit: 'เครื่อง',
  },
  {
    id: 'req-stethoscope',
    category: REQUISITION_CATEGORIES[2],
    name: 'หูฟังแพทย์',
    unit: 'อัน',
  },
  {
    id: 'req-penlight',
    category: REQUISITION_CATEGORIES[2],
    name: 'ไฟฉายทางแพทย์',
    unit: 'กระบอก',
  },

  // หมวด 4: อุปกรณ์ทางเดินหายใจ ออกซิเจน ดาม และช่วยคลอด
  {
    id: 'req-o2-portable-set',
    category: REQUISITION_CATEGORIES[3],
    name: 'ชุดถังออกซิเจนพกพา',
    unit: 'ชุด',
  },
  {
    id: 'req-o2-refill-valve',
    category: REQUISITION_CATEGORIES[3],
    name: 'หัวเติมออกซิเจน',
    unit: 'ชุด',
  },
  {
    id: 'req-humidifier-metal',
    category: REQUISITION_CATEGORIES[3],
    name: 'Humidifier เกลียวโลหะ',
    unit: 'ชุด',
  },
  {
    id: 'req-o2-mask-ped',
    category: REQUISITION_CATEGORIES[3],
    name: 'หน้ากากออกซิเจน เด็ก',
    unit: 'ชิ้น',
  },
  {
    id: 'req-o2-mask-adult',
    category: REQUISITION_CATEGORIES[3],
    name: 'หน้ากากออกซิเจน ผู้ใหญ่',
    unit: 'ชิ้น',
  },
  {
    id: 'req-cannula',
    category: REQUISITION_CATEGORIES[3],
    name: 'Cannula',
    unit: 'ชิ้น',
  },
  {
    id: 'req-ambubag-adult',
    category: REQUISITION_CATEGORIES[3],
    name: 'Ambubag ผู้ใหญ่',
    unit: 'ชุด',
  },
  {
    id: 'req-bulb-syringe-3',
    category: REQUISITION_CATEGORIES[3],
    name: 'ลูกยางแดง เบอร์ 3',
    unit: 'อัน',
  },
  {
    id: 'req-bulb-syringe-6',
    category: REQUISITION_CATEGORIES[3],
    name: 'ลูกยางแดง เบอร์ 6',
    unit: 'อัน',
  },
  {
    id: 'req-bulb-syringe-9',
    category: REQUISITION_CATEGORIES[3],
    name: 'ลูกยางแดง เบอร์ 9',
    unit: 'อัน',
  },
  {
    id: 'req-pelvic-binder',
    category: REQUISITION_CATEGORIES[3],
    name: 'Pelvic Binder',
    unit: 'ชุด',
  },
  {
    id: 'req-speed-vac-4',
    category: REQUISITION_CATEGORIES[3],
    name: 'เฝือกลมสุญญากาศ รุ่น Speed-Vac 4',
    unit: 'ชุด',
  },
  {
    id: 'req-collar-ped',
    category: REQUISITION_CATEGORIES[3],
    name: 'เฝือกดามคอ (collar) สำหรับเด็ก',
    unit: 'อัน',
  },
  {
    id: 'req-pp-strap-hook',
    category: REQUISITION_CATEGORIES[3],
    name: 'สาย PP ปลายหัวตะขอ',
    unit: 'เส้น',
  },
  {
    id: 'req-pp-strap-safety',
    category: REQUISITION_CATEGORIES[3],
    name: 'สาย PP หัวเซฟตี้',
    unit: 'เส้น',
  },
  {
    id: 'req-umbilical-clamp',
    category: REQUISITION_CATEGORIES[3],
    name: 'ที่หนีบสายสะดือเด็ก',
    unit: 'อัน',
  },
];
