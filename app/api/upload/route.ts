import { NextRequest, NextResponse } from 'next/server';
import { parseExcelFile, getSheetData, detectFieldMapping } from '@/lib/parser/excel';
import { getAdminFromRequest } from '@/lib/admin/requireAdmin';

export async function POST(request: NextRequest) {
  const admin = getAdminFromRequest(request);
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const sheetNameRaw = formData.get('sheetName');

    if (!file) {
      return NextResponse.json(
        { error: '请上传文件' },
        { status: 400 }
      );
    }

    // 检查文件类型
    const allowedTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'text/csv',
    ];
    const allowedExtensions = ['.xlsx', '.xls', '.csv'];
    const ext = '.' + file.name.split('.').pop()?.toLowerCase();

    if (!allowedExtensions.includes(ext)) {
      return NextResponse.json(
        { error: '不支持的文件类型，请上传 .xlsx、.xls 或 .csv 文件' },
        { status: 400 }
      );
    }

    // 检查文件大小（10MB）
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: '文件大小不能超过 10MB' },
        { status: 400 }
      );
    }

    // 读取文件
    const buffer = await file.arrayBuffer();
    const { sheetNames, workbook } = parseExcelFile(buffer, file.name);

    // 选择工作表（默认第一个；若传入 sheetName 且存在则使用）
    const requestedSheet =
      typeof sheetNameRaw === 'string' ? sheetNameRaw.trim() : '';
    const selectedSheet =
      requestedSheet && sheetNames.includes(requestedSheet)
        ? requestedSheet
        : sheetNames[0];

    const { headers, rows } = getSheetData(workbook, selectedSheet);

    // 自动检测字段映射
    const fieldDetection = detectFieldMapping(headers);

    return NextResponse.json({
      success: true,
      fileName: file.name,
      sheetNames,
      selectedSheet,
      rowCount: rows.length,
      headers,
      fieldMapping: fieldDetection.detectedMapping,
      unmappedColumns: fieldDetection.unmappedColumns,
      mappingConfidence: fieldDetection.confidence,
      // 返回前几行数据预览
      preview: rows.slice(0, 5),
    });
  } catch (error) {
    console.error('文件上传处理失败:', error);
    return NextResponse.json(
      { error: '文件解析失败: ' + (error as Error).message },
      { status: 500 }
    );
  }
}


