import { copyFile, mkdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';

const botDir = process.env.MAKEFUN_BOT_DIR ?? '/bot';
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

try {
  const source = join(botDir, 'POST.json');
  let post: unknown;
  try {
    post = JSON.parse(await readFile(source, 'utf8'));
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new Error(`POST.json is not valid JSON: ${detail}`);
  }
  if (post === null || typeof post !== 'object' || Array.isArray(post)) {
    throw new Error('POST.json must contain a JSON object');
  }
  if (typeof (post as { url?: unknown }).url !== 'string' || !(post as { url: string }).url.trim()) {
    throw new Error('POST.json must have a non-empty string "url" field');
  }
  await mkdir(outputDir, { recursive: true });
  await copyFile(source, join(outputDir, 'POST.json'));
} catch (error) {
  const detail = error instanceof Error ? error.message : String(error);
  console.error(`Failed to process POST.json: ${detail}`);
  process.exitCode = 1;
}
