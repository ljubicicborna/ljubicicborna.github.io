/* =====================================================================
   NOVOSTI (početna) — događaji (npr. Music Night) i aktivni oglasi za posao
   Oboje se uređuje na /admin.html; ova skripta ih dohvaća s /api/dogadjaji
   i /api/oglasi i puni #home-gigs / #home-jobs kad ih ima.
===================================================================== */
(function(){
  var esc = function(s){ return String(s == null ? '' : s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); };

  /* rezerva ako API/CMS zataji — ne treba je ručno održavati */
  var REZERVA_DOGADJAJI = { dogadjaji: [
    { dan: 'Petak', naziv: 'Music Night', opis: 'Ex-Yu glazba cijelu večer', aktivno: true },
    { dan: 'Subota', naziv: 'Party Night', opis: 'House zvuk do kasno u noć', aktivno: true }
  ] };

  var homeGigs = document.getElementById('home-gigs');
  if (homeGigs) {
    fetch('/api/dogadjaji')
      .then(function(r){ if (!r.ok) throw new Error('api'); return r.json(); })
      .then(function(data){ render(data && Array.isArray(data.dogadjaji) ? data : REZERVA_DOGADJAJI); })
      .catch(function(){ render(REZERVA_DOGADJAJI); });
  }

  function render(data){
    var active = data.dogadjaji.filter(function(d){ return d.aktivno; });
    if (!active.length) return;
    homeGigs.innerHTML = active.map(function(d){
      return '' +
        '<div class="home-night">' +
          '<span class="home-night-day">' + esc(d.dan) + '</span>' +
          '<span class="home-night-name">' + esc(d.naziv) + '</span>' +
          (d.opis ? '<span class="home-night-tag">' + esc(d.opis) + '</span>' : '') +
        '</div>';
    }).join('');
  }

  var homeJobs = document.getElementById('home-jobs');
  if (homeJobs) {
    fetch('/api/oglasi')
      .then(function(r){ if (!r.ok) throw new Error('api'); return r.json(); })
      .then(function(data){
        var active = (data.pozicije || []).filter(function(p){ return p.aktivno; });
        if (!active.length) return;
        homeJobs.innerHTML = active.map(function(p){
          return '' +
            '<a class="home-job" href="zaposlenje.html#job-form">' +
              '<span class="home-job-badge">' + esc(p.vrsta || 'Posao') + '</span>' +
              '<h3 class="home-job-title">' + esc(p.naslov) + '</h3>' +
              (p.satnica ? '<span class="home-job-wage">' + esc(p.satnica) + ' €/h</span>' : '') +
              '<span class="home-job-cta">Prijavi se <span aria-hidden="true">→</span></span>' +
            '</a>';
        }).join('');
      })
      .catch(function(){ /* nema oglasa, sekcija ostaje kakva jest */ });
  }
})();
