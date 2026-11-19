/**
 * Converts source images to resized WebP files in public/images/<folder>/.
 *
 *   npm run images:optimize -- products ~/Downloads/teapot.jpg ~/Downloads/kettle.png
 *
 * Output names are the source basename with non-alphanumerics replaced by "-",
 * e.g. "teapot.jpg" -> public/images/products/teapot.webp. Reference that path
 * (without "public/images/") from src/data/home.json.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

// Widths are about 2x the largest rendered size of each image type.
const MAX_WIDTH = { banners: 1600, categories: 400, products: 800, gifts: 1000 };
const QUALITY = 78;

export async function optimize(src, folder, { publicDir = 'public' } = {}) {
  const name = path.parse(src).name.replace(/[^a-z0-9]+/gi, '-');
  const outDir = path.join(publicDir, 'images', folder);
  const out = path.join(outDir, `${name}.webp`);
  await fs.mkdir(outDir, { recursive: true });
  const info = await sharp(src)
    .rotate()
    .resize({ width: MAX_WIDTH[folder] ?? 1200, withoutEnlargement: true })
    .webp({ quality: QUALITY })
    .toFile(out);
  const before = (await fs.stat(src)).size;
  return { out, before, after: info.size };
}

const [folder, ...files] = process.argv.slice(2);
if (!folder || files.length === 0) {
  console.error(`Usage: npm run images:optimize -- <${Object.keys(MAX_WIDTH).join('|')}> <image...>`);
  process.exit(1);
}

const kb = (b) => `${(b / 1024).toFixed(0)} KB`;
for (const file of files) {
  try {
    const { out, before, after } = await optimize(file, folder);
    console.log(`${file} -> ${out} (${kb(before)} -> ${kb(after)})`);
  } catch (error) {
    console.error(`Failed to convert ${file}: ${error.message}`);
    process.exitCode = 1;
  }
}
