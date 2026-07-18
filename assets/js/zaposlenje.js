/* =====================================================================
   ZAPOŠLJAVANJE — "Otvorene pozicije"
   ---------------------------------------------------------------------
   Oglasi se uređuju na /admin.html (stranica Zapošljavanje). Ova skripta
   ih dohvaća s /api/oglasi, iscrtava kartice i dodaje JobPosting
   structured data za tražilice. Ako nema aktivnih oglasa (ili API ne
   radi), sekcija ostaje sakrivena — stranica i dalje radi normalno.
===================================================================== */
(function(){
  var section = document.getElementById('pozicije');
  var list = document.getElementById('oglasi-list');
  if (!section || !list) return;

  function esc(s){
    return String(s == null ? '' : s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  function pick(field){ return window.HedonistI18n ? window.HedonistI18n.pick(field) : (typeof field === 'string' ? field : ''); }

  var VRSTA_LABELS = {
    en: { 'Stalno': 'Full-time', 'Studentski': 'Student job' },
    de: { 'Stalno': 'Festanstellung', 'Studentski': 'Studentenjob' }
  };
  function translateVrsta(v){
    var lang = window.HedonistI18n ? window.HedonistI18n.lang() : 'hr';
    return (VRSTA_LABELS[lang] && VRSTA_LABELS[lang][v]) || v;
  }

  function render(data){
    var active = (data.pozicije || []).filter(function(p){ return p.aktivno; });
    if (!active.length) return;
    active.sort(function(a, b){ return (a.datum || '') < (b.datum || '') ? 1 : -1; });

    section.removeAttribute('hidden');
    var ctaLabel = window.HedonistI18n ? window.HedonistI18n.t('zaposlenje.form.submit_short', 'Prijavi se') : 'Prijavi se';
    list.innerHTML = active.map(function(p){
      var naslov = pick(p.naslov);
      var opis = pick(p.opis);
      return '' +
        '<article class="job-ad-card">' +
          '<div class="job-ad-head">' +
            '<span class="job-ad-badge">' + esc(translateVrsta(p.vrsta) || 'Posao') + '</span>' +
            (p.satnica ? '<span class="job-ad-wage">' + esc(p.satnica) + ' €/h</span>' : '') +
          '</div>' +
          '<h3 class="job-ad-title">' + esc(naslov) + '</h3>' +
          (opis ? '<p class="job-ad-desc">' + esc(opis) + '</p>' : '') +
          '<a class="job-ad-cta" href="#job-form">' + esc(ctaLabel) + ' <span aria-hidden="true">→</span></a>' +
        '</article>';
    }).join('');

    var ld = active.map(function(p){
      var wage = parseFloat(String(p.satnica || '').replace(',', '.'));
      var naslov = pick(p.naslov);
      var opis = pick(p.opis);
      var out = {
        '@context': 'https://schema.org',
        '@type': 'JobPosting',
        title: naslov,
        description: opis || naslov,
        datePosted: p.datum,
        employmentType: p.vrsta === 'Studentski' ? 'PART_TIME' : 'FULL_TIME',
        hiringOrganization: {
          '@type': 'Organization',
          name: 'Hedonist Bar Osijek',
          sameAs: 'https://hedonist-bar.vercel.app/'
        },
        jobLocation: {
          '@type': 'Place',
          address: {
            '@type': 'PostalAddress',
            streetAddress: 'Vukovarska cesta 31',
            addressLocality: 'Osijek',
            postalCode: '31000',
            addressCountry: 'HR'
          }
        }
      };
      if (!isNaN(wage)) {
        out.baseSalary = {
          '@type': 'MonetaryAmount',
          currency: 'EUR',
          value: { '@type': 'QuantitativeValue', value: wage, unitText: 'HOUR' }
        };
      }
      return out;
    });

    var oldLd = document.getElementById('ld-jobposting');
    if (oldLd) oldLd.remove();
    var script = document.createElement('script');
    script.type = 'application/ld+json';
    script.id = 'ld-jobposting';
    script.textContent = JSON.stringify(ld.length === 1 ? ld[0] : ld);
    document.head.appendChild(script);
  }

  /* oglasiPromise (ne varijabla koju jedan poziv slučajno postavi) — ako
     korisnik promijeni jezik prije nego stigne odgovor, taj klik ipak čeka
     na podatke i ispravno ih iscrta čim stignu. */
  var oglasiPromise = fetch('/api/oglasi')
    .then(function(r){ if (!r.ok) throw new Error('api'); return r.json(); })
    .catch(function(){ return null; /* sekcija ostaje sakrivena */ });

  function tryRender(){
    oglasiPromise.then(function(data){ if (data) render(data); });
  }
  tryRender();
  document.addEventListener('hedonist:langchange', tryRender);

  if (new URLSearchParams(location.search).has('poslano')) {
    var success = document.getElementById('job-success');
    var form = document.getElementById('job-form');
    if (success) success.hidden = false;
    if (form) form.hidden = true;
  }
})();
