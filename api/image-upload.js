/* Image upload — prima binary sliku, sprema je u Vercel Blob, vraća URL
   POST /api/image-upload → { key: "x-admin-key", file: FormData }
   Returns: { url: "https://..." } */

import { put } from '@vercel/blob';
import crypto from 'node:crypto';

function authorized(req) {
  const expected = process.env.ADMIN_PASSWORD || '';
  if (!expected) return false;
  const given = String(req.headers['x-admin-key'] || '');
  const a = crypto.createHash('sha256').update(given).digest();
  const b = crypto.createHash('sha256').update(expected).digest();
  return crypto.timingSafeEqual(a, b);
}

export const config = {
  api: { bodyParser: { sizeLimit: '10mb' } }
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'method-not-allowed' });
  }

  if (!authorized(req)) {
    return res.status(401).json({ error: 'unauthorized' });
  }

  try {
    const buffer = req.body;
    if (!buffer || buffer.length === 0) {
      return res.status(400).json({ error: 'no-file' });
    }

    const filename = req.headers['x-filename'] || 'image-' + Date.now();
    const contentType = req.headers['content-type'] || 'application/octet-stream';

    const blob = await put('cms/images/' + filename, buffer, {
      access: 'public',
      addRandomSuffix: false,
      contentType: contentType,
      cacheControlMaxAge: 31536000
    });

    return res.status(200).json({ url: blob.url });
  } catch (e) {
    console.error('image-upload error:', e);
    return res.status(500).json({ error: 'upload-failed' });
  }
}
