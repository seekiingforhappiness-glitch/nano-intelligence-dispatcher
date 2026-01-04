import { RawOrder, CleanedOrder, CleaningReport } from '@/types/order';

/**
 * 清洗单个订单
 */
export function cleanOrder(order: RawOrder): CleanedOrder {
  const warnings: string[] = [];
  const errors: string[] = [];
  let isValid = true;

  // 复制原始数据
  const cleaned: CleanedOrder = {
    ...order,
    cleaningWarnings: [],
    cleaningErrors: [],
    isValid: true,
  };

  // 1. 清洗送货单号
  if (!order.orderId) {
    warnings.push('送货单号为空，将使用行号作为标识');
    cleaned.orderId = `ROW-${order.rowIndex}`;
  }

  // 2. 清洗日期（到货日期为空时警告，不标记为无效）
  if (!order.deliveryDate) {
    warnings.push('到货日期为空，将使用默认值');
    cleaned.deliveryDate = new Date().toISOString().slice(0, 10); // 默认今天
  } else {
    const cleanedDate = cleanDate(order.deliveryDate);
    if (cleanedDate.warning) {
      warnings.push(cleanedDate.warning);
    }
    if (cleanedDate.error) {
      errors.push(cleanedDate.error);
      isValid = false;
    }
    cleaned.deliveryDate = cleanedDate.value || order.deliveryDate;
  }

  if (order.shipDate) {
    const cleanedShipDate = cleanDate(order.shipDate);
    if (cleanedShipDate.warning) {
      warnings.push(cleanedShipDate.warning);
    }
    cleaned.shipDate = cleanedShipDate.value || order.shipDate;
  }

  // 3. 清洗地址
  if (!order.address) {
    errors.push('地址为空');
    isValid = false;
  } else {
    const cleanedAddr = cleanAddress(order.address);
    if (cleanedAddr.warnings.length > 0) {
      warnings.push(...cleanedAddr.warnings);
    }
    cleaned.address = cleanedAddr.address;
  }

  // 4. 清洗重量
  if (order.weightKg <= 0) {
    errors.push('重量无效');
    isValid = false;
  } else if (order.weightDerivedFrom === 'quantity_times_package_size') {
    warnings.push('重量由“数量 × 规格”推导');
  } else if (order.weightKg > 50000) {
    warnings.push(`重量异常大 (${order.weightKg}kg)，请确认`);
  }

  // 5. 清洗客户名称
  if (!order.customerName) {
    warnings.push('送达方为空');
  } else {
    cleaned.customerName = cleanCustomerName(order.customerName);
  }

  cleaned.cleaningWarnings = warnings;
  cleaned.cleaningErrors = errors;
  cleaned.isValid = isValid;

  return cleaned;
}

/**
 * 批量清洗订单
 */
export function cleanOrders(orders: RawOrder[]): {
  cleanedOrders: CleanedOrder[];
  report: CleaningReport;
} {
  const cleanedOrders: CleanedOrder[] = [];
  const report: CleaningReport = {
    totalRows: orders.length,
    validRows: 0,
    warningRows: 0,
    errorRows: 0,
    autoFixes: [],
    warnings: [],
    errors: [],
  };

  for (const order of orders) {
    const cleaned = cleanOrder(order);
    cleanedOrders.push(cleaned);

    if (cleaned.isValid) {
      report.validRows++;
    } else {
      report.errorRows++;
    }

    if (cleaned.cleaningWarnings.length > 0) {
      report.warningRows++;
      for (const warning of cleaned.cleaningWarnings) {
        report.warnings.push({
          rowIndex: order.rowIndex,
          field: 'multiple',
          message: warning,
        });
      }
    }

    for (const error of cleaned.cleaningErrors) {
      report.errors.push({
        rowIndex: order.rowIndex,
        field: 'multiple',
        message: error,
      });
    }
  }

  return { cleanedOrders, report };
}

/**
 * 清洗日期
 */
function cleanDate(value: string): { value: string | null; warning?: string; error?: string } {
  if (!value) {
    return { value: null, error: '日期为空' };
  }

  const str = String(value).trim();

  // 尝试解析常见格式
  const patterns = [
    // 2024-11-03, 2024/11/03
    { regex: /^(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})$/, format: (m: RegExpMatchArray) => `${m[1]}-${m[2].padStart(2,'0')}-${m[3].padStart(2,'0')}` },
    // 11-03-2024, 11/03/2024
    { regex: /^(\d{1,2})[-\/](\d{1,2})[-\/](\d{4})$/, format: (m: RegExpMatchArray) => `${m[3]}-${m[1].padStart(2,'0')}-${m[2].padStart(2,'0')}` },
    // 11月3日
    { regex: /^(\d{1,2})月(\d{1,2})日?$/, format: (m: RegExpMatchArray) => `${new Date().getFullYear()}-${m[1].padStart(2,'0')}-${m[2].padStart(2,'0')}` },
    // 2024年11月3日
    { regex: /^(\d{4})年(\d{1,2})月(\d{1,2})日?$/, format: (m: RegExpMatchArray) => `${m[1]}-${m[2].padStart(2,'0')}-${m[3].padStart(2,'0')}` },
    // 20241103
    { regex: /^(\d{4})(\d{2})(\d{2})$/, format: (m: RegExpMatchArray) => `${m[1]}-${m[2]}-${m[3]}` },
  ];

  for (const { regex, format } of patterns) {
    const match = str.match(regex);
    if (match) {
      return { value: format(match) };
    }
  }

  // 尝试 JS Date 解析
  const parsed = new Date(str);
  if (!isNaN(parsed.getTime())) {
    const formatted = `${parsed.getFullYear()}-${String(parsed.getMonth()+1).padStart(2,'0')}-${String(parsed.getDate()).padStart(2,'0')}`;
    return { value: formatted, warning: `日期格式已标准化: ${str} → ${formatted}` };
  }

  return { value: str, warning: `日期格式无法识别: ${str}` };
}

/**
 * 清洗地址
 */
function cleanAddress(value: string): { address: string; warnings: string[] } {
  const warnings: string[] = [];
  let addr = String(value).trim();

  // 去除多余空格和换行
  addr = addr.replace(/\s+/g, '');

  // 全角转半角
  addr = addr.replace(/[\uff01-\uff5e]/g, ch => 
    String.fromCharCode(ch.charCodeAt(0) - 0xfee0)
  );

  // 补全省市前缀
  if (!addr.startsWith('江苏') && !addr.startsWith('上海') && !addr.startsWith('浙江') && !addr.startsWith('安徽')) {
    if (/^(南京|苏州|无锡|常州|镇江|扬州|泰州|南通|盐城|淮安|连云港|徐州|宿迁)/.test(addr)) {
      addr = '江苏省' + addr;
      warnings.push('已自动补全省份前缀');
    }
  }

  // 修正常见的简写
  addr = addr.replace(/^江苏(?!省)/, '江苏省');
  addr = addr.replace(/^上海(?!市)/, '上海市');

  // 地址太短警告
  if (addr.length < 10) {
    warnings.push('地址信息可能不完整');
  }

  return { address: addr, warnings };
}

/**
 * 清洗客户名称
 */
function cleanCustomerName(value: string): string {
  let name = String(value).trim();
  
  // 去除多余空格
  name = name.replace(/\s+/g, '');
  
  return name;
}

/**
 * 生成清洗报告摘要
 */
export function generateCleaningSummary(report: CleaningReport): string {
  const lines: string[] = [];
  
  lines.push(`📊 数据清洗报告`);
  lines.push(`总行数: ${report.totalRows}`);
  lines.push(`有效行: ${report.validRows}`);
  lines.push(`警告行: ${report.warningRows}`);
  lines.push(`错误行: ${report.errorRows}`);
  
  if (report.autoFixes.length > 0) {
    lines.push(`\n✅ 自动修正 ${report.autoFixes.length} 项`);
  }
  
  if (report.warnings.length > 0) {
    lines.push(`\n⚠️ 警告 ${report.warnings.length} 项`);
  }
  
  if (report.errors.length > 0) {
    lines.push(`\n❌ 错误 ${report.errors.length} 项`);
    for (const error of report.errors.slice(0, 5)) {
      lines.push(`  - 第 ${error.rowIndex} 行: ${error.message}`);
    }
    if (report.errors.length > 5) {
      lines.push(`  ... 还有 ${report.errors.length - 5} 项错误`);
    }
  }
  
  return lines.join('\n');
}


