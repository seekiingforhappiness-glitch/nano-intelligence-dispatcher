import * as XLSX from 'xlsx';
import { RawOrder, FieldMapping, FieldDetectionResult } from '@/types/order';
import { prepareWorkbookInput } from './encoding';

/**
 * 字段别名映射表
 */
const FIELD_ALIASES: Record<keyof FieldMapping, string[]> = {
  orderId: [
    '送货单号',
    '订单号',
    '单号',
    '发货单号',
    '发运单号',
    'SO号',
    'SO',
    'order',
    'order_id',
  ],
  shipDate: ['发货日期', '发货时间', '出库日期', '装车日期', 'ship_date', 'ship date'],
  deliveryDate: ['到货日期', '送达日期', '要求到达', '最晚到达', '交货日期', 'delivery_date', 'delivery date'],
  customerName: [
    '送达方',
    '客户名称',
    '收货方',
    '收货客户',
    '客户',
    '客户全称',
    'customer',
    'customer_name',
  ],
  weightKg: [
    '重量',
    '货重',
    '毛重',
    '净重',
    '重量(kg)',
    '重量kg',
    '重量（kg）',
    '货物重量',
    '重量（公斤）',
    '重量kg',
    'weight',
    'weight_kg',
  ],
  address: [
    '地址',
    '收货地址',
    '送货地址',
    '送达地址',
    '客户地址',
    '客户送达地',
    '送货地',
    '收货地',
    '交货地址',
    '到货地址',
    '目的地',
    '送货地点',
    '详细地址',
    'address',
  ],
  packageSize: ['规格', '包装规格', '件规', '包装', 'size', 'package_size'],
  requirementsRaw: ['运输商发货要求', '发货要求', '备注', '运输要求', '特殊要求', 'requirements', 'remark', '要求'],
  quantity: ['数量', '件数', '数量(件)', '托数', '托盘数', 'qty', 'quantity'],
};

/**
 * 标准化表头文本，便于匹配
 */
function normalizeText(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[（]/g, '(')
    .replace(/[）]/g, ')')
    .replace(/[【]/g, '[')
    .replace(/[】]/g, ']')
    .replace(/[：:]/g, '')
    .replace(/[\s_-]+/g, '');
}

/**
 * 解析上传的 Excel/CSV 文件
 */
export function parseExcelFile(buffer: ArrayBuffer, fileName?: string): {
  sheetNames: string[];
  workbook: XLSX.WorkBook;
} {
  const workbookInput = prepareWorkbookInput(buffer, fileName);
  const workbook = XLSX.read(workbookInput.data, {
    type: workbookInput.type,
    cellDates: true,
  });
  return {
    sheetNames: workbook.SheetNames,
    workbook,
  };
}

/**
 * 获取工作表数据
 */
export function getSheetData(workbook: XLSX.WorkBook, sheetName: string): {
  headers: string[];
  rows: Record<string, unknown>[];
} {
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) {
    throw new Error(`工作表 "${sheetName}" 不存在`);
  }

  // 转换为 JSON，保留表头
  const jsonData = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    raw: false,
    defval: '',
  });

  // 获取表头
  const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1');
  const headers: string[] = [];
  for (let col = range.s.c; col <= range.e.c; col++) {
    const cellAddress = XLSX.utils.encode_cell({ r: range.s.r, c: col });
    const cell = sheet[cellAddress];
    headers.push(cell ? String(cell.v) : `Column${col + 1}`);
  }

  return { headers, rows: jsonData };
}

/**
 * 自动检测字段映射
 */
export function detectFieldMapping(headers: string[]): FieldDetectionResult {
  const detectedMapping: FieldMapping = {};
  const unmappedColumns: string[] = [];
  let matchCount = 0;

  for (const header of headers) {
    const normalizedHeader = normalizeText(header);
    let matched = false;

    for (const [field, aliases] of Object.entries(FIELD_ALIASES)) {
      for (const alias of aliases) {
        const normalizedAlias = normalizeText(alias);
        if (
          normalizedAlias === normalizedHeader ||
          normalizedHeader.includes(normalizedAlias) ||
          normalizedAlias.includes(normalizedHeader)
        ) {
          detectedMapping[field as keyof FieldMapping] = header;
          matchCount++;
          matched = true;
          break;
        }
      }
      if (matched) break;
    }

    if (!matched) {
      unmappedColumns.push(header);
    }
  }

  return {
    detectedMapping,
    unmappedColumns,
    confidence: matchCount / Math.max(Object.keys(FIELD_ALIASES).length, 1),
  };
}

/**
 * 将原始行数据转换为订单对象
 */
export function mapRowToOrder(
  row: Record<string, unknown>,
  rowIndex: number,
  mapping: FieldMapping
): RawOrder {
  // 获取字段值的辅助函数
  const getValue = (field: keyof FieldMapping): string => {
    const columnName = mapping[field];
    if (!columnName) return '';
    const value = row[columnName];
    if (value === null || value === undefined) return '';
    return String(value).trim();
  };

  // 解析送货单号（处理科学计数法）
  const parseOrderId = (value: string): string => {
    if (!value) return '';
    // 如果是科学计数法数字
    if (/^\d+\.?\d*[eE][+-]?\d+$/.test(value)) {
      return String(parseFloat(value));
    }
    // 如果是数字
    const num = parseFloat(value);
    if (!isNaN(num) && num > 1000000000) {
      return String(num).replace(/\.0+$/, '');
    }
    return value;
  };

  // 解析重量
  const parseWeight = (value: string): number => {
    if (!value) return 0;
    const num = parseFloat(value.replace(/[^\d.]/g, ''));
    if (isNaN(num)) return 0;
    // 如果包含"吨"或者数值很小，按吨处理
    if (/吨|t$/i.test(value) || (num > 0 && num < 100 && !value.includes('kg'))) {
      return num * 1000;
    }
    return num;
  };

  // 解析规格
  const parsePackageSize = (value: string): number => {
    if (!value) return 25; // 默认小包
    const num = parseFloat(value.replace(/[^\d.]/g, ''));
    return isNaN(num) ? 25 : num;
  };

  return {
    rowIndex: rowIndex + 2, // Excel 行号从 1 开始，表头占 1 行
    orderId: parseOrderId(getValue('orderId')),
    shipDate: getValue('shipDate'),
    deliveryDate: getValue('deliveryDate'),
    customerName: getValue('customerName'),
    weightKg: parseWeight(getValue('weightKg')),
    address: getValue('address'),
    packageSize: parsePackageSize(getValue('packageSize')),
    requirementsRaw: getValue('requirementsRaw'),
    quantity: parseInt(getValue('quantity')) || undefined,
    rawRow: row,
  };
}

/**
 * 批量解析订单
 */
export function parseOrders(
  rows: Record<string, unknown>[],
  mapping: FieldMapping
): RawOrder[] {
  return rows.map((row, index) => mapRowToOrder(row, index, mapping));
}

/**
 * 生成结果 Excel 文件
 */
export function generateResultExcel(
  originalRows: Record<string, unknown>[],
  headers: string[],
  resultData: {
    rowIndex: number;
    tripId: string;
    stopSequence: number;
    vehicleType: string;
    estimatedDistance: number;
    estimatedDuration: number;
    eta: string;
    etd: string;
    estimatedCost: number;
    costPerOrder: number;
    warnings: string[];
  }[]
): ArrayBuffer {
  // 创建结果映射
  const resultMap = new Map(resultData.map(r => [r.rowIndex, r]));

  // 新增列
  const newHeaders = [
    ...headers,
    '车次编号',
    '串点顺序',
    '推荐车型',
    '预计里程(km)',
    '预计时长(h)',
    '预计到达时间',
    '预计提货时间',
    '车次成本(元)',
    '分摊成本(元)',
    '异常标记',
  ];

  // 构建数据
  const outputData = originalRows.map((row, index) => {
    const result = resultMap.get(index + 2); // rowIndex 从 2 开始
    const newRow: Record<string, unknown> = { ...row };
    
    if (result) {
      newRow['车次编号'] = result.tripId;
      newRow['串点顺序'] = result.stopSequence;
      newRow['推荐车型'] = result.vehicleType;
      newRow['预计里程(km)'] = result.estimatedDistance.toFixed(1);
      newRow['预计时长(h)'] = result.estimatedDuration.toFixed(2);
      newRow['预计到达时间'] = result.eta;
      newRow['预计提货时间'] = result.etd;
      newRow['车次成本(元)'] = result.estimatedCost.toFixed(0);
      newRow['分摊成本(元)'] = result.costPerOrder.toFixed(0);
      newRow['异常标记'] = result.warnings.join('; ');
    }

    return newRow;
  });

  // 创建工作簿
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(outputData, { header: newHeaders });
  
  // 设置列宽
  ws['!cols'] = newHeaders.map(h => ({ wch: Math.max(h.length * 2, 12) }));
  
  XLSX.utils.book_append_sheet(wb, ws, '排线结果');

  // 导出为 buffer
  const buffer = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
  return buffer;
}


