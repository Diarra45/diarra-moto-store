import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
const apiKey = process.env.CLOUDINARY_API_KEY;
const apiSecret = process.env.CLOUDINARY_API_SECRET;

if (!cloudName || !apiKey || !apiSecret) {
  throw new Error(
    'Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET in the environment.'
  );
}

async function listFolder(cursor) {
  const endpoint = new URL(
    `https://api.cloudinary.com/v1_1/${encodeURIComponent(cloudName)}/resources/by_asset_folder`
  );
  endpoint.searchParams.set('asset_folder', 'motos');
  endpoint.searchParams.set('max_results', '500');
  if (cursor) endpoint.searchParams.set('next_cursor', cursor);

  const response = await fetch(endpoint, {
    headers: {
      Authorization: `Basic ${Buffer.from(`${apiKey}:${apiSecret}`).toString('base64')}`,
      Accept: 'application/json'
    }
  });

  if (!response.ok) {
    const details = await response.text();
    if (response.status === 404) {
      throw new Error(
        'Cloudinary returned 404 for folder listing. The account may use legacy fixed-folder mode; check its folder mode or list assets by public ID prefix.'
      );
    }
    throw new Error(`Cloudinary listing failed (${response.status}): ${details}`);
  }

  return response.json();
}

const links = [];
let cursor;

try {
  do {
    const result = await listFolder(cursor);
    for (const asset of result.resources ?? []) {
      if (asset.resource_type !== 'image' || !asset.secure_url) continue;

      const imageUrl = new URL(asset.secure_url);
      if (imageUrl.protocol !== 'https:' || imageUrl.hostname !== 'res.cloudinary.com') {
        console.warn(`Skipped ${asset.public_id}: unexpected delivery URL`);
        continue;
      }

      links.push({
        public_id: asset.public_id,
        url: asset.secure_url,
        format: asset.format,
        width: asset.width,
        height: asset.height
      });
    }

    cursor = result.next_cursor;
  } while (cursor);

  const outputFile = path.resolve('public/motos-cloudinary.json');
  await mkdir(path.dirname(outputFile), { recursive: true });
  await writeFile(outputFile, `${JSON.stringify(links, null, 2)}\n`, 'utf8');
  console.log(`Saved ${links.length} Cloudinary image URLs to ${outputFile}`);
} catch (error) {
  console.error(error instanceof Error ? error.message : 'Cloudinary listing failed.');
  process.exitCode = 1;
}