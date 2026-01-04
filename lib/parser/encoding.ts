import iconv from 'iconv-lite';
import * as jschardet from 'jschardet';

const UTF8_ALIASES = ['utf-8', 'utf8', 'ascii'];

export type WorkbookInputType = 'buffer' | 'string';

export interface WorkbookInput {
  data: Buffer | string;
  type: WorkbookInputType;
  encoding: string;
  isCsv: boolean;
}

/**
 * 将上传的文件内容转换为 XLSX 可读取的形式，并在处理 CSV 时自动转码为 UTF-8。
 */
export function prepareWorkbookInput(buffer: ArrayBuffer, fileName?: string): WorkbookInput {
  const nodeBuffer = Buffer.from(buffer);
  const lowerName = (fileName || '').toLowerCase();
  const isCsvByExt = lowerName.endsWith('.csv');

  // 文件签名判断：xlsx 为 zip（PK..），xls 为 OLE（D0 CF 11 E0 A1 B1 1A E1）
  const head = nodeBuffer.subarray(0, 8);
  const isZipXlsx = head.length >= 4 && head[0] === 0x50 && head[1] === 0x4b;
  const isOleXls =
    head.length >= 8 &&
    head[0] === 0xd0 &&
    head[1] === 0xcf &&
    head[2] === 0x11 &&
    head[3] === 0xe0 &&
    head[4] === 0xa1 &&
    head[5] === 0xb1 &&
    head[6] === 0x1a &&
    head[7] === 0xe1;

  // 内容启发式：当扩展名不是 csv，但文件看起来是纯文本且含分隔符/换行时，按 CSV 处理
  const sample = nodeBuffer.subarray(0, Math.min(nodeBuffer.length, 4096));
  const hasNullByte = sample.includes(0x00);
  const hasNewline = sample.includes(0x0a) || sample.includes(0x0d);
  const hasDelimiter = sample.includes(0x2c) || sample.includes(0x09) || sample.includes(0x3b); // , \t ;
  const looksLikeTextCsv = !hasNullByte && hasNewline && hasDelimiter;

  const isCsv = isCsvByExt || (!isZipXlsx && !isOleXls && looksLikeTextCsv);

  if (!isCsv) {
    return {
      data: nodeBuffer,
      type: 'buffer',
      encoding: 'binary',
      isCsv,
    };
  }

  const detection = jschardet.detect(nodeBuffer) || { encoding: 'utf-8', confidence: 0 };
  let encoding = detection.encoding?.toLowerCase() || 'utf-8';

  if (!encoding || !iconv.encodingExists(encoding)) {
    encoding = 'gbk';
  }

  if (UTF8_ALIASES.includes(encoding)) {
    return {
      data: nodeBuffer.toString('utf8'),
      type: 'string',
      encoding: 'utf-8',
      isCsv,
    };
  }

  const decoded = iconv.decode(nodeBuffer, encoding);
  return {
    data: decoded,
    type: 'string',
    encoding,
    isCsv,
  };
}


