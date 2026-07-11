/* Javni API: vraća program žive glazbe (izvođači + raspored).
   Podaci se uređuju na /admin.html — ovdje se ništa ručno ne mijenja.

   Svako spremanje zapisuje NOVU datoteku cms/data/glazba-<timestamp>.json
   (nepromjenjivu, pa je CDN cache nikad ne može servirati staru), a
   najnovija se pronalazi preko Blob list() API-ja koji ne ide kroz CDN. */

import { list } from '@vercel/blob';

const PREFIX = 'cms/data/glazba-';
/* prva, ručno učitana verzija podataka — koristi se samo dok ne postoji
   nijedno spremanje iz admina */
const LEGACY_URL = 'https://xtj8jtby8zz99n1i.public.blob.vercel-storage.com/cms/glazba.json';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'method-not-allowed' });
  }
  try {
    let url = LEGACY_URL;
    const { blobs } = await list({ prefix: PREFIX });
    if (blobs.length) {
      blobs.sort(function (a, b) { return a.pathname < b.pathname ? 1 : -1; });
      url = blobs[0].url;
    }
    const r = await fetch(url, { cache: 'no-store' });
    if (!r.ok) throw new Error('blob ' + r.status);
    const data = await r.json();
    res.setHeader('Cache-Control', 'public, s-maxage=15');
    return res.status(200).json(data);
  } catch (e) {
    return res.status(502).json({ error: 'data-unavailable' });
  }
}
