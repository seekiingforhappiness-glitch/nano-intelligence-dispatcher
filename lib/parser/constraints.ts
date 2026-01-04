import { RouteConstraints, createDefaultConstraints } from '@/types/constraints';

/**
 * 约束规则定义
 */
interface ConstraintRule {
  id: string;
  category: 'time' | 'vehicle' | 'load' | 'route';
  patterns: RegExp[];
  apply: (result: RouteConstraints, match: RegExpMatchArray) => void;
}

// ============ 全部规则定义 ============

const CONSTRAINT_RULES: ConstraintRule[] = [
  
  // ===== 时间窗规则 =====
  {
    id: 'time_6digit',
    category: 'time',
    patterns: [/(\d{6})\s*[-~至到]\s*(\d{6})/],
    apply: (result, match) => {
      result.timeWindow = {
        start: `${match[1].slice(0,2)}:${match[1].slice(2,4)}`,
        end: `${match[2].slice(0,2)}:${match[2].slice(2,4)}`,
      };
    },
  },
  {
    id: 'time_standard',
    category: 'time',
    patterns: [/(\d{1,2}):(\d{2})\s*[-~至到]\s*(\d{1,2}):(\d{2})/],
    apply: (result, match) => {
      result.timeWindow = {
        start: `${match[1].padStart(2,'0')}:${match[2]}`,
        end: `${match[3].padStart(2,'0')}:${match[4]}`,
      };
    },
  },
  {
    id: 'time_morning',
    category: 'time',
    patterns: [/上午送|上午到|只.*上午|限上午/],
    apply: (result) => {
      result.timeWindow = { start: '08:00', end: '12:00' };
    },
  },
  {
    id: 'time_afternoon',
    category: 'time',
    patterns: [/下午送|下午到|只.*下午|限下午/],
    apply: (result) => {
      result.timeWindow = { start: '13:00', end: '18:00' };
    },
  },
  {
    id: 'weekend_both',
    category: 'time',
    patterns: [/周六日不|周末不|双休.*不|周六周日.*不/],
    apply: (result) => {
      result.excludeSunday = true;
      result.excludeSaturday = true;
    },
  },
  {
    id: 'weekend_sunday',
    category: 'time',
    patterns: [/周日不收|周日不送|周日休|星期天不|星期日不/],
    apply: (result) => {
      result.excludeSunday = true;
    },
  },
  {
    id: 'weekend_saturday',
    category: 'time',
    patterns: [/周六不收|周六不送|周六休|星期六不/],
    apply: (result) => {
      result.excludeSaturday = true;
    },
  },

  // ===== 车型规则 =====
  {
    id: 'vehicle_feiyi',
    category: 'vehicle',
    patterns: [/飞翼车|飞翼|使用飞翼|侧开门|侧开|侧面卸货/],
    apply: (result) => {
      result.requiredVehicleType = '飞翼';
    },
  },
  {
    id: 'vehicle_box',
    category: 'vehicle',
    patterns: [/厢式车|厢式|厢车|封闭车|封闭厢/],
    apply: (result) => {
      result.requiredVehicleType = '厢式';
    },
  },
  {
    id: 'vehicle_flat',
    category: 'vehicle',
    patterns: [/平板车|平板|敞车/],
    apply: (result) => {
      result.requiredVehicleType = '平板';
    },
  },
  {
    id: 'vehicle_rail',
    category: 'vehicle',
    patterns: [/高栏车|高栏/],
    apply: (result) => {
      result.requiredVehicleType = '高栏';
    },
  },
  {
    id: 'vehicle_cold',
    category: 'vehicle',
    patterns: [/冷藏车|冷藏|冷链|保温/],
    apply: (result) => {
      result.requiredVehicleType = '冷藏';
    },
  },

  // ===== 装载规则 =====
  {
    id: 'load_no_stack',
    category: 'load',
    patterns: [/不可堆叠|不堆叠|禁止堆叠|不可叠|不压货|禁止压货/],
    apply: (result) => {
      result.noStack = true;
    },
  },
  {
    id: 'load_no_height',
    category: 'load',
    patterns: [/不加高|禁止加高|不能加高/],
    apply: (result) => {
      result.noStack = true;
    },
  },

  // ===== 路由规则 =====
  {
    id: 'route_no_other_goods',
    category: 'route',
    patterns: [
      /不允许带货进厂/,
      /不能带.*货.*进厂/,
      /禁止带货/,
      /不可带其他货/,
      /单独送货/,
      /单独配送/,
      /不可拼车/,
      /专车配送/,
    ],
    apply: (result) => {
      result.mustBeLast = true;
    },
  },
  {
    id: 'route_must_last',
    category: 'route',
    patterns: [
      /最后送|最后一家|排最后|放最后|末位送达/,
    ],
    apply: (result) => {
      result.mustBeLast = true;
    },
  },
  {
    id: 'route_must_first',
    category: 'route',
    patterns: [
      /最先送|第一家|优先送|排第一|首位送达|必须先送/,
    ],
    apply: (result) => {
      result.mustBeFirst = true;
    },
  },
  {
    id: 'route_single_only',
    category: 'route',
    patterns: [
      /只能单独/,
      /必须专车/,
      /不可合单/,
      /不可拼单/,
      /独立车次/,
    ],
    apply: (result) => {
      result.singleTripOnly = true;
    },
  },
];

// 大小包特殊规则
const BIG_PACKAGE_RULE = {
  id: 'load_big_no_height',
  patterns: [/大包不能加高|大包不加高|大包禁止加高/],
};

const SMALL_PACKAGE_RULE = {
  id: 'load_small_no_height',
  patterns: [/小包不能加高|小包不加高|小包禁止加高/],
};

/**
 * 解析运输要求文本，提取排线约束
 * @param rawText 原始运输要求文本
 * @param packageSize 规格值，用于判断大小包（>=750为大包）
 * @returns 解析后的约束条件
 */
export function parseConstraints(
  rawText: string,
  packageSize: number = 25
): RouteConstraints {
  const result = createDefaultConstraints();
  result.rawText = rawText || '';

  if (!rawText || rawText.trim() === '') {
    return result;
  }

  // 预处理文本
  const text = rawText
    .replace(/\s+/g, '')
    .replace(/[;；\n\r]/g, ',')
    .replace(/，/g, ',');

  // 大小包判断
  const isBigPackage = packageSize >= 750;
  let bigPackageNoStack = false;
  let smallPackageNoStack = false;

  // 检查大小包规则
  for (const pattern of BIG_PACKAGE_RULE.patterns) {
    if (pattern.test(text)) {
      bigPackageNoStack = true;
      result.parsedRules.push(BIG_PACKAGE_RULE.id);
      break;
    }
  }

  for (const pattern of SMALL_PACKAGE_RULE.patterns) {
    if (pattern.test(text)) {
      smallPackageNoStack = true;
      result.parsedRules.push(SMALL_PACKAGE_RULE.id);
      break;
    }
  }

  // 根据规格判断堆叠限制
  if (bigPackageNoStack && isBigPackage) {
    result.noStack = true;
  }
  if (smallPackageNoStack && !isBigPackage) {
    result.noStack = true;
  }

  // 遍历所有规则
  for (const rule of CONSTRAINT_RULES) {
    for (const pattern of rule.patterns) {
      const match = text.match(pattern);
      if (match) {
        rule.apply(result, match);
        result.parsedRules.push(rule.id);
        break;
      }
    }
  }

  // 冲突处理：mustBeFirst 和 mustBeLast 不能同时为 true
  if (result.mustBeFirst && result.mustBeLast) {
    result.mustBeFirst = false;
    result.parsedRules.push('conflict_resolved_last_priority');
  }

  // singleTripOnly 优先级最高
  if (result.singleTripOnly) {
    result.mustBeFirst = false;
    result.mustBeLast = false;
  }

  return result;
}

/**
 * 获取约束的简短描述
 */
export function getConstraintSummary(constraints: RouteConstraints): string[] {
  const summary: string[] = [];

  if (constraints.requiredVehicleType) {
    summary.push(`需${constraints.requiredVehicleType}车`);
  }
  if (constraints.timeWindow) {
    summary.push(`${constraints.timeWindow.start}-${constraints.timeWindow.end}`);
  }
  if (constraints.excludeSunday && constraints.excludeSaturday) {
    summary.push('周末不收');
  } else if (constraints.excludeSunday) {
    summary.push('周日不收');
  } else if (constraints.excludeSaturday) {
    summary.push('周六不收');
  }
  if (constraints.noStack) {
    summary.push('不可堆叠');
  }
  if (constraints.singleTripOnly) {
    summary.push('单独配送');
  } else if (constraints.mustBeLast) {
    summary.push('排最后');
  } else if (constraints.mustBeFirst) {
    summary.push('排最先');
  }

  return summary;
}


