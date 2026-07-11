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

  function render(data){
    var active = (data.pozicije || []).filter(function(p){ return p.aktivno; });
    if (!active.length) return;
    active.sort(function(a, b){ return (a.datum || '') < (b.datum || '') ? 1 : -1; });

    section.removeAttribute('hidden');
    list.innerHTML = active.map(function(p){
      return '' +
        '<article class="job-ad-card">' +
          '<div class="job-ad-head">' +
            '<span class="job-ad-badge">' + esc(p.vrsta || 'Posao') + '</span>' +
            (p.satnica ? '<span class="job-ad-wage">' + esc(p.satnica) + ' €/h</span>' : '') +
          '</div>' +
          '<h3 class="job-ad-title">' + esc(p.naslov) + '</h3>' +
          (p.opis ? '<p class="job-ad-desc">' + esc(p.opis) + '</p>' : '') +
          '<a class="job-ad-cta" href="#job-form">Prijavi se <span aria-hidden="true">→</span></a>' +
        '</article>';
    }).join('');

    var ld = active.map(function(p){
      var wage = parseFloat(String(p.satnica || '').replace(',', '.'));
      var out = {
        '@context': 'https://schema.org',
        '@type': 'JobPosting',
        title: p.naslov,
        description: p.opis || p.naslov,
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

    var script = document.createElement('script');
    script.type = 'application/ld+json';
    script.textContent = JSON.stringify(ld.length === 1 ? ld[0] : ld);
    document.head.appendChild(script);
  }

  fetch('/api/oglasi')
    .then(function(r){ if (!r.ok) throw new Error('api'); return r.json(); })
    .then(render)
    .catch(function(){ /* sekcija ostaje sakrivena */ });
})();
