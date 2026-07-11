/* Admin API za /admin.html — sprema program u Blob store i prima slike.
   Autorizacija: header "x-admin-key" mora odgovarati env varijabli
   ADMIN_PASSWORD (postavljena na Vercelu). */

import { put, del, list } from '@vercel/blob';
import crypto from 'node:crypto';

/* svako spremanje = nova nepromjenjiva datoteka (CDN je ne može servirati
   staru); zadnjih nekoliko verzija se čuva kao povijest, ostale se brišu */
const PREFIXES = {
  glazba: 'cms/data/glazba-',
  cjenik: 'cms/data/cjenik-',
  tekstovi: 'cms/data/tekstovi-',
  oglasi: 'cms/data/oglasi-'
};
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

function validateCjenik(data) {
  if (!data || !Array.isArray(data.kategorije)) return 'Cjenik nije u očekivanom obliku.';
  for (const c of data.kategorije) {
    if (!c || typeof c.id !== 'string' || !c.id || typeof c.naziv !== 'string' || !c.naziv.trim()) {
      return 'Svaka kategorija mora imati id i naziv.';
    }
    if (!Array.isArray(c.grupe)) return 'Kategorija "' + c.naziv + '" nema grupe.';
    for (const g of c.grupe) {
      if (!g || typeof g.naziv !== 'string' || !Array.isArray(g.stavke)) return 'Grupa u "' + c.naziv + '" nije ispravna.';
      for (const s of g.stavke) {
        if (!s || typeof s.naziv !== 'string' || !s.naziv.trim()) return 'Stavka bez naziva u grupi "' + g.naziv + '".';
        if (!/^\d{1,3},\d{2}$/.test(s.cijena || '')) {
          return 'Cijena za "' + s.naziv + '" mora biti u obliku 2,20 — upisano je "' + (s.cijena || '') + '".';
        }
      }
    }
  }
  return null;
}

function cleanCjenik(data) {
  return {
    kategorije: data.kategorije.map(function (c) {
      return {
        id: String(c.id),
        naziv: String(c.naziv).trim(),
        grupe: c.grupe.map(function (g) {
          return {
            naziv: String(g.naziv || '').trim(),
            ikona: String(g.ikona || '').trim(),
            stavke: g.stavke.map(function (s) {
              return {
                naziv: String(s.naziv).trim(),
                opis: String(s.opis || '').trim(),
                cijena: String(s.cijena).trim()
              };
            })
          };
        })
      };
    })
  };
}

function validateTekstovi(data) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return 'Tekstovi nisu u očekivanom obliku.';
  for (const k of Object.keys(data)) {
    if (typeof data[k] !== 'string') return 'Tekst "' + k + '" nije tekst.';
    if (data[k].length > 2000) return 'Tekst "' + k + '" je predug.';
  }
  return null;
}

function cleanTekstovi(data) {
  const out = {};
  for (const k of Object.keys(data)) out[String(k).slice(0, 80)] = String(data[k]).trim();
  return out;
}

function validateOglasi(data) {
  if (!data || !Array.isArray(data.pozicije)) return 'Oglasi nisu u očekivanom obliku.';
  for (const p of data.pozicije) {
    if (!p || typeof p.id !== 'string' || !p.id || typeof p.naslov !== 'string' || !p.naslov.trim()) {
      return 'Svaki oglas mora imati id i naslov.';
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(p.datum || '')) return 'Oglas "' + p.naslov + '" ima neispravan datum.';
  }
  return null;
}

function cleanOglasi(data) {
  return {
    pozicije: data.pozicije.map(function (p) {
      return {
        id: String(p.id),
        naslov: String(p.naslov).trim(),
        vrsta: String(p.vrsta || '').trim(),
        satnica: String(p.satnica || '').trim(),
        opis: String(p.opis || '').trim(),
        datum: p.datum,
        aktivno: !!p.aktivno
      };
    })
  };
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
      const vrsta = body.vrsta || 'glazba';
      const prefix = PREFIXES[vrsta];
      if (!prefix) return res.status(400).json({ error: 'unknown-vrsta' });

      let clean;
      if (vrsta === 'glazba') {
        const err = validateData(body.data);
        if (err) return res.status(400).json({ error: err });
        clean = {
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
      } else if (vrsta === 'cjenik') {
        const err = validateCjenik(body.data);
        if (err) return res.status(400).json({ error: err });
        clean = cleanCjenik(body.data);
      } else if (vrsta === 'oglasi') {
        const err = validateOglasi(body.data);
        if (err) return res.status(400).json({ error: err });
        clean = cleanOglasi(body.data);
      } else {
        const err = validateTekstovi(body.data);
        if (err) return res.status(400).json({ error: err });
        clean = cleanTekstovi(body.data);
      }

      await put(prefix + Date.now() + '.json', JSON.stringify(clean, null, 2), {
        access: 'public',
        addRandomSuffix: false,
        cacheControlMaxAge: 31536000,
        contentType: 'application/json'
      });
      /* obriši starije verzije, zadrži zadnjih KEEP_VERSIONS */
      try {
        const { blobs } = await list({ prefix: prefix });
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
