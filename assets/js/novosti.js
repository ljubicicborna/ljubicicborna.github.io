/* =====================================================================
   NOVOSTI (početna) — tjedni događaji (npr. Music Night, Party Night).
   Statična stranica: događaji su fiksni u DOGADJAJI ispod. Ako se mijenjaju,
   uredi ih ovdje.
===================================================================== */
(function(){
  var esc = function(s){ return String(s == null ? '' : s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); };
  var IMG = 'assets/images/gallery/';

  /* nema polja za sliku uz događaj, pa se svakoj kartici slika bira po
     ključnim riječima iz njenog vlastitog teksta -- tako svaka dobije
     sliku "u skladu s njom", a ne istu sliku kao sve ostale */
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

  var DOGADJAJI = [
    { dan: 'Petak', naziv: 'Music Night', opis: 'Ex-Yu glazba cijelu večer', aktivno: true },
    { dan: 'Subota', naziv: 'Party Night', opis: 'House zvuk do kasno u noć', aktivno: true }
  ];

  var homeGigs = document.getElementById('home-gigs');
  if (homeGigs) {
    var active = DOGADJAJI.filter(function(d){ return d.aktivno; });
    homeGigs.innerHTML = active.map(function(d){
      return '' +
        '<div class="home-night">' +
          '<img class="home-night-photo" src="' + IMG + pickGigImage(d) + '" alt="" aria-hidden="true" loading="lazy">' +
          '<span class="home-night-day">' + esc(d.dan) + '</span>' +
          '<span class="home-night-name">' + esc(d.naziv) + '</span>' +
          (d.opis ? '<span class="home-night-tag">' + esc(d.opis) + '</span>' : '') +
        '</div>';
    }).join('');
  }
})();
