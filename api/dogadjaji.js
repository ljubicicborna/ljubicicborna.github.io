/* Javni API: vraća tjedne događaje (sekcija "Novosti" na početnoj, npr.
   Music Night petkom). Uređuje se na /admin.html; svako spremanje je nova
   nepromjenjiva datoteka cms/data/dogadjaji-<timestamp>.json (vidi api/admin.js). */

import { list } from '@vercel/blob';

const PREFIX = 'cms/data/dogadjaji-';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'method-not-allowed' });
  }
  try {
    const { blobs } = await list({ prefix: PREFIX });
    if (!blobs.length) return res.status(404).json({ error: 'no-data' });
    blobs.sort(function (a, b) { return a.pathname < b.pathname ? 1 : -1; });
    const r = await fetch(blobs[0].url, { cache: 'no-store' });
    if (!r.ok) throw new Error('blob ' + r.status);
    const data = await r.json();
    res.setHeader('Cache-Control', 'public, s-maxage=15');
    return res.status(200).json(data);
  } catch (e) {
    return res.status(502).json({ error: 'data-unavailable' });
  }
}
