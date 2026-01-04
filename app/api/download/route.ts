import { NextRequest, NextResponse } from 'next/server';
import { getAdminFromRequest } from '@/lib/admin/requireAdmin';
import * as XLSX from 'xlsx';
import { ScheduleResult } from '@/types/schedule';

export async function POST(request: NextRequest) {
  const admin = getAdminFromRequest(request);
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { result, originalData } = await request.json() as {
      result: ScheduleResult;
      originalData?: Record<string, unknown>[];
    };

    if (!result || !result.trips) {
      return NextResponse.json({ error: '无效的调度结果' }, { status: 400 });
    }

    // 构建结果数据
    const outputRows: Record<string, unknown>[] = [];

    for (const trip of result.trips) {
      for (const stop of trip.stops) {
        const order = stop.order;
        const constraints = order.constraints;
        const requiredVehicle = constraints?.requiredVehicleType || '不限';
        const vehicleMatched =
          requiredVehicle === '不限' || requiredVehicle === trip.vehicleType;
        const stackingLimit = constraints?.noStack ? '不可堆叠' : '可堆叠';
        const specialConstraints = [
          constraints?.mustBeFirst ? '必须首站' : null,
          constraints?.mustBeLast ? '必须末站' : null,
          constraints?.singleTripOnly ? '单独派车' : null,
        ]
          .filter(Boolean)
          .join(' / ') || '无';
        const constraintNotes =
          constraints?.parsedRules?.join('；') || order.requirementsRaw || '';

        outputRows.push({
          '送货单号': order.orderId,
          '发货日期': order.shipDate,
          '到货日期': order.deliveryDate,
          '送达方': order.customerName,
          '重量(kg)': order.weightKg,
          '地址': order.address,
          '规格': order.packageSize,
          '运输要求': order.requirementsRaw,
          '需求车型': requiredVehicle,
          '车型匹配': vehicleMatched ? '✅ 满足' : `⚠️ 不满足（需求 ${requiredVehicle}）`,
          '装载限制': stackingLimit,
          '节点约束': specialConstraints,
          '约束说明': constraintNotes,
          // 新增列
          '车次编号': trip.tripId,
          '串点顺序': stop.sequence,
          '推荐车型': trip.vehicleType,
          '预计里程(km)': Math.round(stop.cumulativeDistance * 10) / 10,
          '预计时长(h)': Math.round(stop.cumulativeDuration * 100) / 100,
          '预计到达时间': stop.eta,
          '预计提货时间': stop.etd,
          '车次成本(元)': trip.estimatedCost,
          '分摊成本(元)': Math.round(trip.estimatedCost / trip.stops.length),
          '异常标记': stop.isOnTime ? '' : `晚到${stop.delayMinutes || 0}分钟`,
        });
      }
    }

    // 添加无法排线的订单
    if (result.summary.invalidOrders.length > 0) {
      for (const orderId of result.summary.invalidOrders) {
        outputRows.push({
          '送货单号': orderId,
          '车次编号': '-',
          '异常标记': '地址解析失败，无法排线',
        });
      }
    }

    // 创建工作簿
    const wb = XLSX.utils.book_new();

    // 排线结果表
    const wsResult = XLSX.utils.json_to_sheet(outputRows);
    wsResult['!cols'] = [
      { wch: 15 }, // 送货单号
      { wch: 12 }, // 发货日期
      { wch: 12 }, // 到货日期
      { wch: 20 }, // 送达方
      { wch: 10 }, // 重量
      { wch: 40 }, // 地址
      { wch: 8 },  // 规格
      { wch: 30 }, // 运输要求
      { wch: 10 }, // 需求车型
      { wch: 16 }, // 车型匹配
      { wch: 10 }, // 装载限制
      { wch: 16 }, // 节点约束
      { wch: 40 }, // 约束说明
      { wch: 10 }, // 车次编号
      { wch: 10 }, // 串点顺序
      { wch: 12 }, // 推荐车型
      { wch: 12 }, // 预计里程
      { wch: 12 }, // 预计时长
      { wch: 12 }, // 预计到达
      { wch: 12 }, // 预计提货
      { wch: 12 }, // 车次成本
      { wch: 12 }, // 分摊成本
      { wch: 20 }, // 异常标记
    ];
    XLSX.utils.book_append_sheet(wb, wsResult, '排线结果');

    // 汇总表
    const summaryData = [
      { '指标': '总订单数', '数值': result.summary.totalOrders, '单位': '单' },
      { '指标': '总车次数', '数值': result.summary.totalTrips, '单位': '趟' },
      { '指标': '总里程', '数值': result.summary.totalDistance, '单位': 'km' },
      { '指标': '总时长', '数值': result.summary.totalDuration, '单位': '小时' },
      { '指标': '总成本', '数值': result.summary.totalCost, '单位': '元' },
      { '指标': '平均装载率(重量)', '数值': Math.round(result.summary.avgLoadRateWeight * 100), '单位': '%' },
      { '指标': '平均装载率(托盘)', '数值': Math.round(result.summary.avgLoadRatePallet * 100), '单位': '%' },
      { '指标': '风险订单数', '数值': result.summary.riskOrders.length, '单位': '单' },
      { '指标': '无法排线订单数', '数值': result.summary.invalidOrders.length, '单位': '单' },
    ];
    const wsSummary = XLSX.utils.json_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, wsSummary, '调度汇总');

    // 车型分布表
    const vehicleData = Object.entries(result.summary.vehicleBreakdown).map(([type, count]) => ({
      '车型': type,
      '车次数': count,
      '占比': Math.round((count / result.summary.totalTrips) * 100) + '%',
    }));
    const wsVehicle = XLSX.utils.json_to_sheet(vehicleData);
    XLSX.utils.book_append_sheet(wb, wsVehicle, '车型分布');

    // 导出为 buffer
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    // 返回文件：保持响应头纯 ASCII，避免某些运行时对 Header 的 ByteString 校验失败
    // 浏览器端会用 a.download 指定中文文件名，因此这里仅用安全的英文文件名。
    const dateStr = new Date().toISOString().slice(0, 10);
    const fileName = `schedule_result_${dateStr}.xlsx`;

    const contentDisposition = `attachment; filename="${fileName}"`;
    let firstNonLatin1Code: number | null = null;
    for (let i = 0; i < contentDisposition.length; i += 1) {
      const code = contentDisposition.charCodeAt(i);
      if (code > 255) {
        firstNonLatin1Code = code;
        break;
      }
    }



    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': contentDisposition,
      },
    });
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    console.error('生成下载文件失败:', error);
    return NextResponse.json(
      { error: '生成文件失败: ' + (error as Error).message },
      { status: 500 }
    );
  }
}


