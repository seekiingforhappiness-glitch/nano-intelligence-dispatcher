import path from 'path';
import fs from 'fs/promises';

export function getDataDir(): string {
  const fromEnv = process.env.DATA_DIR?.trim();
  if (fromEnv) return fromEnv;
  return path.join(process.cwd(), 'data');
}

export async function ensureDataDir(): Promise<string> {
  const dir = getDataDir();
  await fs.mkdir(dir, { recursive: true });
  return dir;
}


