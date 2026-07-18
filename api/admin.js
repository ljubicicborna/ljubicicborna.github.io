/* Admin API za /admin.html — sprema program u Blob store i prima slike.
   Autorizacija: header "x-admin-key" mora odgovarati env varijabli
   ADMIN_PASSWORD (postavljena na Vercelu). */

import { put, del, list } from '@vercel/blob';
import crypto from 'node:crypto';

/* svako spremanje = nova nepromjenjiva datoteka (CDN je ne može servirati
   staru); zadnjih nekoliko verzija se čuva kao povijest, ostale se brišu */
const PREFIXES = {
  cjenik: 'cms/data/cjenik-',
  tekstovi: 'cms/data/tekstovi-',
  oglasi: 'cms/data/oglasi-',
  dogadjaji: 'cms/data/dogadjaji-',
  slike: 'cms/data/slike-',
  nazivi: 'cms/data/nazivi-'
};
const KEEP_VERSIONS = 5;
const LANGS = ['hr', 'en', 'de'];

/* Prevedena polja (naziv, opis, tekstovi…) spremaju se kao { hr, en, de }.
   normLang prihvaća i stari plain-string oblik (rezerva) i normalizira sve
   u { hr, en, de } s praznim stringom za jezike koji nisu prevedeni. */
function normLang(v, maxLen) {
  var out = { hr: '', en: '', de: '' };
  if (typeof v === 'string') {
    out.hr = v.slice(0, maxLen);
    return out;
  }
  if (v && typeof v === 'object') {
    for (const l of LANGS) out[l] = String(v[l] || '').trim().slice(0, maxLen);
  }
  return out;
}
function langHr(v) {
  if (typeof v === 'string') return v;
  return (v && typeof v === 'object') ? String(v.hr || '') : '';
}

function authorized(req) {
  const expected = process.env.ADMIN_PASSWORD || '';
  if (!expected) return false;
  const given = String(req.headers['x-admin-key'] || '');
  const a = crypto.createHash('sha256').update(given).digest();
  const b = crypto.createHash('sha256').update(expected).digest();
  return crypto.timingSafeEqual(a, b);
}

/* najbolje-moguća zaštita od pogađanja lozinke: pamti neuspjele pokušaje
   po IP-u dok je serverless instanca topla (nije savršeno kroz hladne
   startove/više instanci, ali čini brute-force skriptu nepraktičnom) */
const LOGIN_ATTEMPTS = new Map();
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const RATE_LIMIT_MAX = 8;

function clientIp(req) {
  const fwd = String(req.headers['x-forwarded-for'] || '');
  return fwd.split(',')[0].trim() || req.socket.remoteAddress || 'unknown';
}

function rateLimited(ip) {
  const now = Date.now();
  const entry = LOGIN_ATTEMPTS.get(ip);
  if (!entry || now - entry.since > RATE_LIMIT_WINDOW_MS) return false;
  return entry.count >= RATE_LIMIT_MAX;
}

function recordFailure(ip) {
  const now = Date.now();
  const entry = LOGIN_ATTEMPTS.get(ip);
  if (!entry || now - entry.since > RATE_LIMIT_WINDOW_MS) {
    LOGIN_ATTEMPTS.set(ip, { count: 1, since: now });
  } else {
    entry.count += 1;
  }
}

function clearFailures(ip) {
  LOGIN_ATTEMPTS.delete(ip);
}

function validateCjenik(data) {
  if (!data || !Array.isArray(data.kategorije)) return 'Cjenik nije u očekivanom obliku.';
  for (const c of data.kategorije) {
    if (!c || typeof c.id !== 'string' || !c.id || !langHr(c.naziv).trim()) {
      return 'Svaka kategorija mora imati id i naziv (barem na hrvatskom).';
    }
    if (!Array.isArray(c.grupe)) return 'Kategorija "' + langHr(c.naziv) + '" nema grupe.';
    for (const g of c.grupe) {
      if (!g || !Array.isArray(g.stavke)) return 'Grupa u "' + langHr(c.naziv) + '" nije ispravna.';
      for (const s of g.stavke) {
        if (!s || !langHr(s.naziv).trim()) return 'Stavka bez naziva u grupi "' + langHr(g.naziv) + '".';
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
        naziv: normLang(c.naziv, 120),
        grupe: c.grupe.map(function (g) {
          return {
            naziv: normLang(g.naziv, 120),
            ikona: String(g.ikona || '').trim(),
            stavke: g.stavke.map(function (s) {
              return {
                naziv: normLang(s.naziv, 160),
                opis: normLang(s.opis, 300)
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
    const v = data[k];
    if (typeof v !== 'string' && (typeof v !== 'object' || v === null)) return 'Tekst "' + k + '" nije tekst.';
    for (const l of LANGS) {
      if (String((v && v[l]) || (l === 'hr' && typeof v === 'string' ? v : '')).length > 2000) {
        return 'Tekst "' + k + '" je predug.';
      }
    }
  }
  return null;
}

function cleanTekstovi(data) {
  const out = {};
  for (const k of Object.keys(data)) out[String(k).slice(0, 80)] = normLang(data[k], 2000);
  return out;
}

function validateOglasi(data) {
  if (!data || !Array.isArray(data.pozicije)) return 'Oglasi nisu u očekivanom obliku.';
  for (const p of data.pozicije) {
    if (!p || typeof p.id !== 'string' || !p.id || !langHr(p.naslov).trim()) {
      return 'Svaki oglas mora imati id i naslov (barem na hrvatskom).';
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(p.datum || '')) return 'Oglas "' + langHr(p.naslov) + '" ima neispravan datum.';
  }
  return null;
}

function cleanOglasi(data) {
  return {
    pozicije: data.pozicije.map(function (p) {
      return {
        id: String(p.id),
        naslov: normLang(p.naslov, 160),
        vrsta: String(p.vrsta || '').trim(),
        satnica: String(p.satnica || '').trim(),
        opis: normLang(p.opis, 800),
        datum: p.datum,
        aktivno: !!p.aktivno
      };
    })
  };
}

function validateDogadjaji(data) {
  if (!data || !Array.isArray(data.dogadjaji)) return 'Događaji nisu u očekivanom obliku.';
  for (const d of data.dogadjaji) {
    if (!d || typeof d.id !== 'string' || !d.id || !langHr(d.naziv).trim()) {
      return 'Svaki događaj mora imati id i naziv (barem na hrvatskom).';
    }
    if (!d.dan || typeof d.dan !== 'string' || !d.dan.trim()) return 'Događaj "' + langHr(d.naziv) + '" nema dan.';
  }
  return null;
}

function cleanDogadjaji(data) {
  return {
    dogadjaji: data.dogadjaji.map(function (d) {
      return {
        id: String(d.id),
        dan: String(d.dan || '').trim(),
        naziv: normLang(d.naziv, 120),
        opis: normLang(d.opis, 300),
        aktivno: !!d.aktivno
      };
    })
  };
}

function validateSlike(data) {
  if (!data || !Array.isArray(data.slike)) return 'Slike nisu u očekivanom obliku.';
  for (const s of data.slike) {
    if (!s || typeof s.id !== 'string' || !s.id) return 'Svaka slika mora imati id.';
    if (!s.url || typeof s.url !== 'string' || !s.url.startsWith('https://')) {
      return 'Slika "' + s.id + '" mora imati valjani URL.';
    }
  }
  return null;
}

function cleanSlike(data) {
  return {
    slike: data.slike.map(function (s) {
      return {
        id: String(s.id),
        url: String(s.url).trim(),
        alt: String(s.alt || '').trim(),
        stranica: String(s.stranica || '').trim()
      };
    })
  };
}

function validateNazivi(data) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return 'Nazivi nisu u očekivanom obliku.';
  for (const k of Object.keys(data)) {
    const v = data[k];
    if (typeof v !== 'string' && (typeof v !== 'object' || v === null)) return 'Naziv "' + k + '" nije tekst.';
    for (const l of LANGS) {
      if (String((v && v[l]) || (l === 'hr' && typeof v === 'string' ? v : '')).length > 500) {
        return 'Naziv "' + k + '" je predug.';
      }
    }
  }
  return null;
}

function cleanNazivi(data) {
  const out = {};
  for (const k of Object.keys(data)) out[String(k).slice(0, 60)] = normLang(data[k], 500);
  return out;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'method-not-allowed' });
  }
  const ip = clientIp(req);
  if (rateLimited(ip)) {
    res.setHeader('Retry-After', String(Math.ceil(RATE_LIMIT_WINDOW_MS / 1000)));
    return res.status(429).json({ error: 'too-many-attempts' });
  }
  if (!authorized(req)) {
    recordFailure(ip);
    await new Promise(function (ok) { setTimeout(ok, 600); });
    return res.status(401).json({ error: 'unauthorized' });
  }
  clearFailures(ip);

  const body = req.body || {};

  try {
    if (body.action === 'login') {
      return res.status(200).json({ ok: true });
    }

    if (body.action === 'save') {
      const vrsta = body.vrsta || 'cjenik';
      const prefix = PREFIXES[vrsta];
      if (!prefix) return res.status(400).json({ error: 'unknown-vrsta' });

      let clean;
      if (vrsta === 'cjenik') {
        const err = validateCjenik(body.data);
        if (err) return res.status(400).json({ error: err });
        clean = cleanCjenik(body.data);
      } else if (vrsta === 'oglasi') {
        const err = validateOglasi(body.data);
        if (err) return res.status(400).json({ error: err });
        clean = cleanOglasi(body.data);
      } else if (vrsta === 'dogadjaji') {
        const err = validateDogadjaji(body.data);
        if (err) return res.status(400).json({ error: err });
        clean = cleanDogadjaji(body.data);
      } else if (vrsta === 'slike') {
        const err = validateSlike(body.data);
        if (err) return res.status(400).json({ error: err });
        clean = cleanSlike(body.data);
      } else if (vrsta === 'nazivi') {
        const err = validateNazivi(body.data);
        if (err) return res.status(400).json({ error: err });
        clean = cleanNazivi(body.data);
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

    return res.status(400).json({ error: 'unknown-action' });
  } catch (e) {
    return res.status(500).json({ error: 'Spremanje nije uspjelo, pokušaj ponovno.' });
  }
}
