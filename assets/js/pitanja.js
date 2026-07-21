/* =====================================================================
   PITANJA (FAQ) — uređuje se na /admin.html (spremljeno u data/faq.json).
   Ova skripta izgradi harmoniku pitanja i osvježi FAQPage structured data
   iz te datoteke; statični HTML u pitanja.html ostaje kao rezerva.
===================================================================== */
(function(){
  var groupsEl = document.querySelector('.faq-groups');
  if (!groupsEl) return;

  function esc(s){ return String(s == null ? '' : s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
  function strip(s){ return String(s == null ? '' : s).replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim(); }

  fetch('data/faq.json')
    .then(function(r){ if (!r.ok) throw 0; return r.json(); })
    .then(function(d){
      if (!d || !Array.isArray(d.grupe) || !d.grupe.length) return;

      groupsEl.innerHTML = d.grupe.map(function(g, gi){
        return '<details class="faq-group"' + (gi === 0 ? ' open' : '') + '>' +
          '<summary class="faq-group-summary">' +
            '<h2 class="faq-group-title">' + esc(g.naziv) + '</h2>' +
            '<svg class="faq-group-chevron" viewBox="0 0 24 24"><path d="M6 9l6 6 6-6"/></svg>' +
          '</summary>' +
          '<div class="faq-group-body">' +
          (g.pitanja || []).map(function(p){
            return '<div class="faq-item">' +
              (p.ikona ? '<span class="faq-item-icon" style="--icon: var(--icon-' + esc(p.ikona) + ');" aria-hidden="true"></span>' : '') +
              '<div class="faq-item-body">' +
                '<h3 class="faq-question">' + esc(p.pitanje) + '</h3>' +
                '<p class="faq-answer">' + (p.odgovor || '') + '</p>' +
              '</div></div>';
          }).join('') +
          '</div></details>';
      }).join('');

      /* osvježi FAQPage structured data */
      var entities = [];
      d.grupe.forEach(function(g){
        (g.pitanja || []).forEach(function(p){
          entities.push({ '@type': 'Question', name: strip(p.pitanje),
            acceptedAnswer: { '@type': 'Answer', text: strip(p.odgovor) } });
        });
      });
      var ld = { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: entities };
      var scripts = document.querySelectorAll('script[type="application/ld+json"]');
      for (var i = 0; i < scripts.length; i++) {
        if (scripts[i].textContent.indexOf('"FAQPage"') !== -1) { scripts[i].textContent = JSON.stringify(ld); break; }
      }
    })
    .catch(function(){ /* rezerva: statični FAQ */ });
})();
