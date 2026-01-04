import fs from 'fs/promises';
import path from 'path';

export async function readJsonFile<T>(filePath: string, fallback: T): Promise<T> {
  try {
    const raw = await fs.readFile(filePath, 'utf8');
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export async function writeJsonFile<T>(filePath: string, data: T): Promise<void> {
  const dir = path.dirname(filePath);
  await fs.mkdir(dir, { recursive: true });
  const tmp = `${filePath}.tmp`;
  const raw = JSON.stringify(data, null, 2);
  await fs.writeFile(tmp, raw, 'utf8');
  await fs.rename(tmp, filePath);
}


