(function(){
  var categories = document.querySelectorAll('.price-category');
  var navLinks = document.querySelectorAll('.price-nav-inner a');
  if (!categories.length) return;

  /* ---- wrap every priced item that has ingredients/notes into a
     clickable row + collapsible "exploded" detail (icon + composition) ---- */
  document.querySelectorAll('.price-item').forEach(function(item){
    var em = item.querySelector('.price-item-name em');
    var nameEl = item.querySelector('.price-item-name');
    var priceEl = item.querySelector('.price-item-price');
    if (!nameEl || !priceEl) return;

    var row = document.createElement('div');
    row.className = 'price-item-row';
    item.appendChild(row);
    row.appendChild(nameEl);
    row.appendChild(priceEl);

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
    if (note) {
      var noteEl = document.createElement('p');
      noteEl.className = 'price-item-note';
      noteEl.textContent = note;
      content.appendChild(noteEl);
    }
    var list = document.createElement('ul');
    list.className = 'price-item-ingredients';
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

  /* ---- gentle reveal animation each time a category is opened ---- */
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

  /* ---- scrollspy: highlight the active pill in the sticky category nav ---- */
  if ('IntersectionObserver' in window && navLinks.length) {
    var linkByHash = {};
    navLinks.forEach(function(a){ linkByHash[a.getAttribute('href')] = a; });

    var navInner = document.querySelector('.price-nav-inner');

    function scrollPillIntoView(link){
      if (!navInner) return;
      var linkLeft = link.offsetLeft;
      var linkRight = linkLeft + link.offsetWidth;
      var viewLeft = navInner.scrollLeft;
      var viewRight = viewLeft + navInner.clientWidth;
      if (linkLeft < viewLeft) {
        navInner.scrollTo({ left: linkLeft - 16, behavior: 'smooth' });
      } else if (linkRight > viewRight) {
        navInner.scrollTo({ left: linkRight - navInner.clientWidth + 16, behavior: 'smooth' });
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
})();
