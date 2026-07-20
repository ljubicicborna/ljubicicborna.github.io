/* =====================================================================
   CJENIK — katalog ponude (bez cijena), prikaz i interakcije
   ---------------------------------------------------------------------
   Ponuda je statični HTML u cjenik.html; ova skripta ga samo oživi
   (sklapanje detalja u pločice, pretraga, scrollspy nad kategorijama).
===================================================================== */
(function(){
  /* NIKAD document.querySelector('.price-categories .section-inner') --
     taj čvor nosi i .price-search i .price-notice (18+/alergeni upozorenje)
     kao svoju BRAĆU, pa bi ih .innerHTML zamjena izbrisala čim CMS podaci
     stignu (a stignu gotovo uvijek). #price-categories-list je poseban
     omot SAMO oko <details> kategorija, uveden baš zato da ostatak
     section-inner preživi svaki rebuild. */
  var sectionInner = document.getElementById('price-categories-list');
  if (!sectionInner) return;

  /* mora se poklapati s html.age-restricted pravilima u styles.css --
     ako netko na 18+ upitu (main.js) odgovori "ne", te kategorije ostaju
     u DOM-u (CSS ih samo sakriva) ali ih ovdje ipak isključujemo iz
     pretrage, inače bi brojač rezultata prijavio pogotke unutar
     kategorije koju posjetitelj fizički ne može vidjeti. */
  var RESTRICTED_IDS = ['pivo', 'vino', 'zestoko', 'kokteli', 'trgovacka'];
  /* pokoja alkoholna stavka živi izvan tih pet kategorija -- npr. kuhano
     vino i Baileys coffee su svrstani pod "Kave i topli napici" jer se
     poslužuju kao topli napitak, ne kao piće iz bara. CMS podaci nemaju
     poseban "sadrži alkohol" flag pa se ovo ručno održava; ako se doda
     nova alkoholna stavka izvan pet restringiranih kategorija, ime joj
     treba dodati ovdje da bude skrivena za "nemam 18". */
  var RESTRICTED_ITEM_NAMES = ['Baileys coffee', 'Baileys coffee bez kofeina', 'Kuhano vino crno', 'Kuhano vino bijelo', 'Kuhani Gin'];
  function isAgeRestricted(){
    return document.documentElement.classList.contains('age-restricted');
  }
  /* obilježava alkoholne stavke izvan restringiranih kategorija sa
     [data-contains-alcohol] BEZ OBZIRA na trenutno stanje dobi -- CSS
     (html.age-restricted [data-contains-alcohol]) ih onda skriva
     reaktivno, čim se .age-restricted doda na <html>, umjesto da ovisi
     o tome je li ova funkcija pozvana prije ili poslije odgovora na
     18+ upit (main.js). */
  function tagAlcoholItems(){
    document.querySelectorAll('.price-item').forEach(function(item){
      var strong = item.querySelector('.price-item-name strong');
      if (strong && RESTRICTED_ITEM_NAMES.indexOf(strong.textContent.trim()) !== -1) {
        item.setAttribute('data-contains-alcohol', '');
      }
    });
  }
  /* ---- interakcije nad trenutnim DOM-om (statični katalog iz cjenik.html) ---- */
  function enhance(){
    var categories = document.querySelectorAll('.price-category');
    var navLinks = document.querySelectorAll('.price-nav-inner a');
    if (!categories.length) return;

    tagAlcoholItems();

    /* svaka stavka sa sastojcima postaje klikabilni red s detaljem */
    document.querySelectorAll('.price-item').forEach(function(item){
      var em = item.querySelector('.price-item-name em');
      var nameEl = item.querySelector('.price-item-name');
      if (!nameEl) return;

      var row = document.createElement('div');
      row.className = 'price-item-row';
      item.appendChild(row);
      row.appendChild(nameEl);

      if (!em) return;

      item.classList.add('has-detail');
      row.setAttribute('tabindex', '0');
      row.setAttribute('role', 'button');
      row.setAttribute('aria-expanded', 'false');

      var raw = em.textContent.trim();
      var note = '';
      var dashMatch = raw.match(/^(.*?)\s+[—-]\s+(.*)$/);
      if (dashMatch) { note = dashMatch[1]; raw = dashMatch[2]; }
      var parts = raw.split(',').map(function(s){ return s.trim(); }).filter(Boolean);

      var wrap = document.createElement('div');
      wrap.className = 'price-item-detail-wrap';
      var inner = document.createElement('div');
      inner.className = 'price-item-detail-inner';
      var detail = document.createElement('div');
      detail.className = 'price-item-detail';

      var icon = document.createElement('span');
      icon.className = 'price-item-detail-icon';
      icon.setAttribute('aria-hidden', 'true');
      detail.appendChild(icon);

      var content = document.createElement('div');
      var list = document.createElement('ul');
      list.className = 'price-item-ingredients';
      if (note) {
        var noteLi = document.createElement('li');
        noteLi.className = 'price-item-note';
        noteLi.textContent = note;
        list.appendChild(noteLi);
      }
      parts.forEach(function(p){
        var li = document.createElement('li');
        li.textContent = p;
        list.appendChild(li);
      });
      content.appendChild(list);
      detail.appendChild(content);

      inner.appendChild(detail);
      wrap.appendChild(inner);
      item.appendChild(wrap);

      function toggle(){
        var open = item.classList.toggle('is-open');
        row.setAttribute('aria-expanded', open ? 'true' : 'false');
      }
      row.addEventListener('click', toggle);
      row.addEventListener('keydown', function(e){
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); }
      });
    });

    /* blaga animacija pri svakom otvaranju kategorije */
    categories.forEach(function(details){
      details.addEventListener('toggle', function(){
        if (!details.open) return;
        var body = details.querySelector('.price-category-body');
        if (!body) return;
        body.classList.remove('just-opened');
        void body.offsetWidth;
        body.classList.add('just-opened');
      });
    });

    /* scrollspy: istakni aktivnu pilulu u ljepljivoj navigaciji */
    if ('IntersectionObserver' in window && navLinks.length) {
      var linkByHash = {};
      navLinks.forEach(function(a){ linkByHash[a.getAttribute('href')] = a; });

      var nav = document.querySelector('.price-nav-inner');

      function scrollPillIntoView(link){
        if (!nav) return;
        var linkLeft = link.offsetLeft;
        var linkRight = linkLeft + link.offsetWidth;
        var viewLeft = nav.scrollLeft;
        var viewRight = viewLeft + nav.clientWidth;
        if (linkLeft < viewLeft) {
          nav.scrollTo({ left: linkLeft - 16, behavior: 'smooth' });
        } else if (linkRight > viewRight) {
          nav.scrollTo({ left: linkRight - nav.clientWidth + 16, behavior: 'smooth' });
        }
      }

      var spy = new IntersectionObserver(function(entries){
        entries.forEach(function(entry){
          var link = linkByHash['#' + entry.target.id];
          if (!link) return;
          if (entry.isIntersecting) {
            navLinks.forEach(function(a){ a.classList.remove('is-active'); });
            link.classList.add('is-active');
            scrollPillIntoView(link);
          }
        });
      }, { rootMargin: '-140px 0px -75% 0px', threshold: 0 });

      categories.forEach(function(details){ spy.observe(details); });
    }
  }

  /* ---- pretraga: 300+ stavki iza samih sidra na desktopu je podnošljivo,
     na mobitelu je scroll-kroz-sve mučenje -- filtrira po nazivu i
     sastojcima, otvara sve kategorije dok se traži i vraća ih na
     "samo prva otvorena" kad se pretraga isprazni ---- */
  function setupSearch(){
    var input = document.getElementById('price-search-input');
    var countEl = document.getElementById('price-search-count');
    if (!input) return;

    var categories = document.querySelectorAll('.price-category');
    var wasOpen = null;

    function norm(s){
      return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
    }

    function run(){
      var q = norm(input.value.trim());
      var items = document.querySelectorAll('.price-item');

      if (!q) {
        items.forEach(function(item){ item.hidden = false; });
        document.querySelectorAll('.price-group, .price-category').forEach(function(el){ el.hidden = false; });
        if (wasOpen) { categories.forEach(function(d){ d.open = false; }); wasOpen.open = true; wasOpen = null; }
        if (countEl) countEl.textContent = '';
        return;
      }

      if (wasOpen === null) {
        wasOpen = Array.prototype.find.call(categories, function(d){ return d.open; }) || null;
        categories.forEach(function(d){ d.open = true; });
      }

      var restricted = isAgeRestricted();
      var matches = 0;
      items.forEach(function(item){
        var cat = item.closest('.price-category');
        var isRestrictedCategory = cat && RESTRICTED_IDS.indexOf(cat.id) !== -1;
        var isRestrictedItem = item.hasAttribute('data-contains-alcohol');
        if (restricted && (isRestrictedCategory || isRestrictedItem)) { item.hidden = true; return; }
        var hit = norm(item.textContent).indexOf(q) !== -1;
        item.hidden = !hit;
        if (hit) matches++;
      });
      document.querySelectorAll('.price-group').forEach(function(g){
        g.hidden = !g.querySelector('.price-item:not([hidden])');
      });
      categories.forEach(function(c){
        c.hidden = !c.querySelector('.price-item:not([hidden])');
      });
      if (countEl) countEl.textContent = matches === 0 ? 'Nema rezultata' : (matches + (matches === 1 ? ' rezultat' : ' rezultata'));
    }

    input.addEventListener('input', run);
  }

  enhance();
  setupSearch();
})();
