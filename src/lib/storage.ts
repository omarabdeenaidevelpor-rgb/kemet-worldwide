/**
 * File storage abstraction.
 *
 * - If BLOB_READ_WRITE_TOKEN is set  -> Vercel Blob (private access, persistent; required on Vercel).
 * - Otherwise                         -> local disk under FILE_UPLOAD_DIR (dev / self-hosted servers).
 *
 * Stored "keys" written to Document.filePath:
 *   blob:<pathname>    for Vercel Blob objects
 *   <absolute path>    for local files (legacy format, kept for backward compatibility)
 */
import 'server-only';
import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';

const BLOB_PREFIX = 'blob:';

export type StorageDriver = 'blob' | 'local';

export function storageDriver(): StorageDriver {
  return process.env.BLOB_READ_WRITE_TOKEN ? 'blob' : 'local';
}

/** True on serverless hosts where local disk is ephemeral and uploads would be lost. */
export function isEphemeralFs(): boolean {
  return Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
}

export function uploadsEnabled(): boolean {
  return storageDriver() === 'blob' || !isEphemeralFs();
}

function uploadRoot() {
  return path.resolve(process.cwd(), process.env.FILE_UPLOAD_DIR ?? './uploads', 'documents');
}

function isInsideUploadRoot(filePath: string) {
  const relativePath = path.relative(uploadRoot(), path.resolve(filePath));
  return relativePath !== '' && !relativePath.startsWith('..') && !path.isAbsolute(relativePath);
}

export async function saveFile(fileName: string, bytes: Uint8Array, contentType: string): Promise<string> {
  if (storageDriver() === 'blob') {
    const { put } = await import('@vercel/blob');
    const pathname = `documents/${fileName}`;
    await put(pathname, Buffer.from(bytes), {
      access: 'private',
      contentType,
      addRandomSuffix: false,
    });
    return `${BLOB_PREFIX}${pathname}`;
  }

  const storedPath = path.join(uploadRoot(), fileName);
  await mkdir(path.dirname(storedPath), { recursive: true });
  await writeFile(storedPath, bytes, { flag: 'wx' });
  return storedPath;
}

export async function readStoredFile(key: string): Promise<Uint8Array | null> {
  if (key.startsWith(BLOB_PREFIX)) {
    const { get } = await import('@vercel/blob');
    const result = await get(key.slice(BLOB_PREFIX.length), { access: 'private', useCache: false });
    if (!result || result.statusCode !== 200 || !result.stream) return null;
    return new Uint8Array(await new Response(result.stream).arrayBuffer());
  }

  if (!isInsideUploadRoot(key)) throw new Error('INVALID_FILE_PATH');
  try {
    return new Uint8Array(await readFile(key));
  } catch (err: any) {
    if (err?.code === 'ENOENT') return null;
    throw err;
  }
}

export async function deleteStoredFile(key: string): Promise<void> {
  if (key.startsWith(BLOB_PREFIX)) {
    const { del } = await import('@vercel/blob');
    await del(key.slice(BLOB_PREFIX.length));
    return;
  }
  if (!isInsideUploadRoot(key)) throw new Error('INVALID_FILE_PATH');
  try {
    await unlink(key);
  } catch (err: any) {
    if (err?.code !== 'ENOENT') throw err;
  }
}
