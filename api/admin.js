/* Admin API za /admin.html — sprema program u Blob store i prima slike.
   Autorizacija: header "x-admin-key" mora odgovarati env varijabli
   ADMIN_PASSWORD (postavljena na Vercelu). */

import { put, del, list } from '@vercel/blob';
import crypto from 'node:crypto';

/* svako spremanje = nova nepromjenjiva datoteka (CDN je ne može servirati
   staru); zadnjih nekoliko verzija se čuva kao povijest, ostale se brišu */
const DATA_PREFIX = 'cms/data/glazba-';
const KEEP_VERSIONS = 5;
const FOTO_PREFIX = 'cms/foto/';
const MAX_FOTO_BYTES = 3 * 1024 * 1024;

function authorized(req) {
  const expected = process.env.ADMIN_PASSWORD || '';
  if (!expected) return false;
  const given = String(req.headers['x-admin-key'] || '');
  const a = crypto.createHash('sha256').update(given).digest();
  const b = crypto.createHash('sha256').update(expected).digest();
  return crypto.timingSafeEqual(a, b);
}

function slugify(s) {
  return String(s).toLowerCase()
    .replace(/[čć]/g, 'c').replace(/đ/g, 'd').replace(/š/g, 's').replace(/ž/g, 'z')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'foto';
}

function validateData(data) {
  if (!data || !Array.isArray(data.izvodjaci) || !Array.isArray(data.raspored)) {
    return 'Podaci nisu u očekivanom obliku.';
  }
  const ids = new Set();
  for (const a of data.izvodjaci) {
    if (!a || typeof a.id !== 'string' || !a.id || typeof a.ime !== 'string' || !a.ime.trim()) {
      return 'Svaki izvođač mora imati id i ime.';
    }
    if (ids.has(a.id)) return 'Dvostruki id izvođača: ' + a.id;
    ids.add(a.id);
  }
  for (const r of data.raspored) {
    if (!r || !/^\d{4}-\d{2}-\d{2}$/.test(r.datum || '')) return 'Svirka ima neispravan datum.';
    if (!/^\d{1,2}:\d{2}$/.test(r.vrijeme || '')) return 'Svirka ima neispravno vrijeme.';
    if (!ids.has(r.izvodjac)) return 'Svirka pokazuje na nepostojećeg izvođača.';
  }
  return null;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'method-not-allowed' });
  }
  if (!authorized(req)) {
    await new Promise(function (ok) { setTimeout(ok, 600); });
    return res.status(401).json({ error: 'unauthorized' });
  }

  const body = req.body || {};

  try {
    if (body.action === 'login') {
      return res.status(200).json({ ok: true });
    }

    if (body.action === 'save') {
      const err = validateData(body.data);
      if (err) return res.status(400).json({ error: err });
      const clean = {
        izvodjaci: body.data.izvodjaci.map(function (a) {
          return {
            id: String(a.id),
            ime: String(a.ime).trim(),
            tip: String(a.tip || '').trim(),
            zanr: String(a.zanr || '').trim(),
            opis: String(a.opis || '').trim(),
            foto: String(a.foto || '').trim(),
            instagram: String(a.instagram || '').trim()
          };
        }),
        raspored: body.data.raspored.map(function (r) {
          return { datum: r.datum, vrijeme: r.vrijeme, izvodjac: r.izvodjac };
        }).sort(function (x, y) {
          return x.datum === y.datum ? (x.vrijeme < y.vrijeme ? -1 : 1) : (x.datum < y.datum ? -1 : 1);
        })
      };
      await put(DATA_PREFIX + Date.now() + '.json', JSON.stringify(clean, null, 2), {
        access: 'public',
        addRandomSuffix: false,
        cacheControlMaxAge: 31536000,
        contentType: 'application/json'
      });
      /* obriši starije verzije, zadrži zadnjih KEEP_VERSIONS */
      try {
        const { blobs } = await list({ prefix: DATA_PREFIX });
        blobs.sort(function (a, b) { return a.pathname < b.pathname ? 1 : -1; });
        await Promise.all(blobs.slice(KEEP_VERSIONS).map(function (b) { return del(b.url); }));
      } catch (e) { /* čišćenje nije kritično */ }
      return res.status(200).json({ ok: true });
    }

    if (body.action === 'upload-foto') {
      const m = /^data:(image\/(?:webp|jpeg|png));base64,(.+)$/.exec(String(body.dataUrl || ''));
      if (!m) return res.status(400).json({ error: 'Slika mora biti webp, jpeg ili png.' });
      const buf = Buffer.from(m[2], 'base64');
      if (buf.length > MAX_FOTO_BYTES) return res.status(400).json({ error: 'Slika je prevelika (max 3 MB).' });
      const ext = m[1] === 'image/webp' ? 'webp' : (m[1] === 'image/png' ? 'png' : 'jpg');
      const pathname = FOTO_PREFIX + slugify(body.ime || 'izvodjac') + '-' + Date.now() + '.' + ext;
      const blob = await put(pathname, buf, {
        access: 'public',
        addRandomSuffix: false,
        cacheControlMaxAge: 31536000,
        contentType: m[1]
      });
      return res.status(200).json({ ok: true, url: blob.url });
    }

    if (body.action === 'delete-foto') {
      const url = String(body.url || '');
      if (!/^https:\/\/[a-z0-9]+\.public\.blob\.vercel-storage\.com\/cms\/foto\//.test(url)) {
        return res.status(400).json({ error: 'Može se obrisati samo slika iz CMS-a.' });
      }
      await del(url);
      return res.status(200).json({ ok: true });
    }

    return res.status(400).json({ error: 'unknown-action' });
  } catch (e) {
    return res.status(500).json({ error: 'Spremanje nije uspjelo, pokušaj ponovno.' });
  }
}
