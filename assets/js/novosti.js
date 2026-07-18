/* =====================================================================
   NOVOSTI (početna) — događaji (npr. Music Night) i aktivni oglasi za posao
   Oboje se uređuje na /admin.html; ova skripta ih dohvaća s /api/dogadjaji
   i /api/oglasi i puni #home-gigs / #home-jobs kad ih ima.
===================================================================== */
(function(){
  var esc = function(s){ return String(s == null ? '' : s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); };
  var IMG = 'assets/images/gallery/';

  function pick(field){ return window.HedonistI18n ? window.HedonistI18n.pick(field) : (typeof field === 'string' ? field : ''); }
  function lang(){ return window.HedonistI18n ? window.HedonistI18n.lang() : 'hr'; }

  var DAN_LABELS = {
    en: { 'Ponedjeljak': 'Monday', 'Utorak': 'Tuesday', 'Srijeda': 'Wednesday', 'Četvrtak': 'Thursday', 'Petak': 'Friday', 'Subota': 'Saturday', 'Nedjelja': 'Sunday' },
    de: { 'Ponedjeljak': 'Montag', 'Utorak': 'Dienstag', 'Srijeda': 'Mittwoch', 'Četvrtak': 'Donnerstag', 'Petak': 'Freitag', 'Subota': 'Samstag', 'Nedjelja': 'Sonntag' }
  };
  var VRSTA_LABELS = {
    en: { 'Stalno': 'Full-time', 'Studentski': 'Student job' },
    de: { 'Stalno': 'Festanstellung', 'Studentski': 'Studentenjob' }
  };
  function translateDan(d){ var l = lang(); return (DAN_LABELS[l] && DAN_LABELS[l][d]) || d; }
  function translateVrsta(v){ var l = lang(); return (VRSTA_LABELS[l] && VRSTA_LABELS[l][v]) || v; }

  /* nema CMS polja za sliku uz događaj/oglas, pa se svakoj kartici slika
     bira po ključnim riječima iz njenog vlastitog teksta -- tako svaka
     dobije sliku "u skladu s njom", a ne istu sliku kao sve ostale */
  var GIG_IMAGES = [
    { test: /party|house/i, src: 'disco-ball-bar.jpg' },
    { test: /music|glazb|dj\b|ex-yu/i, src: 'dj-set-motion.jpg' }
  ];
  var GIG_FALLBACK = 'monogram-bottles-disco.jpg';
  function pickGigImage(d){
    var haystack = (d.naziv || '') + ' ' + (d.opis || '');
    for (var i = 0; i < GIG_IMAGES.length; i++) { if (GIG_IMAGES[i].test.test(haystack)) return GIG_IMAGES[i].src; }
    return GIG_FALLBACK;
  }

  /* "vrsta" je tip zaposlenja (Stalno/Studentski), ne uloga -- slika se
     zato bira po naslovu oglasa (npr. "Tražimo barmena/icu") */
  var JOB_IMAGES = [
    { test: /barmen|šank/i, src: 'pouring-shot-bar.jpg' },
    { test: /konobar/i, src: 'terrace-day.webp' },
    { test: /kuhar|kuhinj/i, src: 'novosti-pouring-shots.jpg' }
  ];
  var JOB_FALLBACK = 'pouring-shot-bar.jpg';
  function pickJobImage(p){
    var haystack = p.naslov || '';
    for (var i = 0; i < JOB_IMAGES.length; i++) { if (JOB_IMAGES[i].test.test(haystack)) return JOB_IMAGES[i].src; }
    return JOB_FALLBACK;
  }

  /* rezerva ako API/CMS zataji — ne treba je ručno održavati */
  var REZERVA_DOGADJAJI = { dogadjaji: [
    { dan: 'Petak', naziv: 'Music Night', opis: { hr: 'Ex-Yu glazba cijelu večer', en: 'Ex-Yu music all evening', de: 'Ex-Yu-Musik den ganzen Abend' }, aktivno: true },
    { dan: 'Subota', naziv: 'Party Night', opis: { hr: 'House zvuk do kasno u noć', en: 'House sound till late', de: 'House-Sound bis spät in die Nacht' }, aktivno: true }
  ] };

  /* fetch-promisi (ne varijable koje jedan poziv slučajno postavi) — ako
     korisnik promijeni jezik prije nego stigne odgovor, taj klik ipak čeka
     na podatke i ispravno ih iscrta čim stignu. */
  var homeGigs = document.getElementById('home-gigs');
  if (homeGigs) {
    var gigsPromise = fetch('/api/dogadjaji')
      .then(function(r){ if (!r.ok) throw new Error('api'); return r.json(); })
      .then(function(data){ return (data && Array.isArray(data.dogadjaji)) ? data : REZERVA_DOGADJAJI; })
      .catch(function(){ return REZERVA_DOGADJAJI; });
    var renderGigs = function(){ gigsPromise.then(render); };
    renderGigs();
    document.addEventListener('hedonist:langchange', renderGigs);
  }

  function render(data){
    var active = data.dogadjaji.filter(function(d){ return d.aktivno; });
    if (!active.length) return;
    homeGigs.innerHTML = active.map(function(d){
      var naziv = pick(d.naziv);
      var opis = pick(d.opis);
      return '' +
        '<div class="home-night">' +
          '<img class="home-night-photo" src="' + IMG + pickGigImage(d) + '" alt="" aria-hidden="true" loading="lazy">' +
          '<span class="home-night-day">' + esc(translateDan(d.dan)) + '</span>' +
          '<span class="home-night-name">' + esc(naziv) + '</span>' +
          (opis ? '<span class="home-night-tag">' + esc(opis) + '</span>' : '') +
        '</div>';
    }).join('');
  }

  var homeJobs = document.getElementById('home-jobs');
  if (homeJobs) {
    var jobsPromise = fetch('/api/oglasi')
      .then(function(r){ if (!r.ok) throw new Error('api'); return r.json(); })
      .catch(function(){ return null; /* nema oglasa, sekcija ostaje kakva jest */ });
    var renderJobsFromPromise = function(){ jobsPromise.then(function(data){ if (data) renderJobs(data); }); };
    renderJobsFromPromise();
    document.addEventListener('hedonist:langchange', renderJobsFromPromise);
  }

  function renderJobs(data){
    var active = (data.pozicije || []).filter(function(p){ return p.aktivno; });
    if (!active.length) return;
    var ctaLabel = window.HedonistI18n ? window.HedonistI18n.t('zaposlenje.form.submit_short', 'Prijavi se') : 'Prijavi se';
    homeJobs.innerHTML = active.map(function(p){
      return '' +
        '<a class="home-job" href="zaposlenje.html#job-form">' +
          '<img class="home-job-photo" src="' + IMG + pickJobImage(p) + '" alt="" aria-hidden="true" loading="lazy">' +
          '<span class="home-job-badge">' + esc(translateVrsta(p.vrsta) || 'Posao') + '</span>' +
          '<h3 class="home-job-title">' + esc(pick(p.naslov)) + '</h3>' +
          (p.satnica ? '<span class="home-job-wage">' + esc(p.satnica) + ' €/h</span>' : '') +
          '<span class="home-job-cta">' + esc(ctaLabel) + ' <span aria-hidden="true">→</span></span>' +
        '</a>';
    }).join('');
  }
})();
