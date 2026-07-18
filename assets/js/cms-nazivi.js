/* Nazivi stranica — dinamički učitaj i primijeni sve nazive, naslove, meta opise
   Koristi /api/nazivi CMS, fallback na hardkodirane vrijednosti ako API ne radi */

(function(){
  function pick(field){
    if (window.HedonistI18n) return window.HedonistI18n.pick(field);
    return typeof field === 'string' ? field : '';
  }

  /* nazivi-promise (ne varijabla koju jedan poziv slučajno postavi) — ako
     korisnik promijeni jezik prije nego stigne odgovor, taj klik ipak čeka
     na podatke i ispravno ih primijeni čim stignu. */
  var naziviPromise = fetch('/api/nazivi')
    .then(function(r){ if (!r.ok) throw new Error('api'); return r.json(); })
    .then(function(data){ return (data && typeof data === 'object') ? data : null; })
    .catch(function(){
      /* ako API zataji, koristi fallback — obavezno je hardkodirati u <head> kao prije */
      return null;
    });

  function tryApply(){
    naziviPromise.then(function(data){ if (data) applyNazivi(data); });
  }
  tryApply();
  document.addEventListener('hedonist:langchange', tryApply);

  function applyNazivi(nazivi){
    /* <title> tag — index.title, cjenik.title, itd. — polja su {hr,en,de}
       (ili plain string za staru rezervu), biraju se po trenutnom jeziku */
    var titleKey = getTitleKey();
    var titleVal = titleKey ? pick(nazivi[titleKey]) : '';
    if (titleVal) document.title = titleVal;

    /* <meta name="description"> */
    var metaDescKey = titleKey ? titleKey + '-meta-desc' : null;
    var descVal = metaDescKey ? pick(nazivi[metaDescKey]) : '';
    if (descVal) {
      var metaDesc = document.querySelector('meta[name="description"]');
      if (metaDesc) metaDesc.setAttribute('content', descVal);
    }

    /* <meta property="og:title"> i og:description */
    if (titleVal) {
      var ogTitle = document.querySelector('meta[property="og:title"]');
      if (ogTitle) ogTitle.setAttribute('content', titleVal);
    }
    if (descVal) {
      var ogDesc = document.querySelector('meta[property="og:description"]');
      if (ogDesc) ogDesc.setAttribute('content', descVal);
    }

    /* nav linkovi */
    applyNavText(nazivi);
  }

  function getTitleKey(){
    var path = window.location.pathname;
    if (path.includes('cjenik')) return 'cjenik.title';
    if (path.includes('zaposlenje')) return 'zaposlenje.title';
    if (path.includes('lokacija')) return 'lokacija.title';
    if (path.includes('privatnost')) return 'privatnost.title';
    return 'index.title';
  }

  function applyNavText(nazivi){
    var zaposlenje = pick(nazivi['nav.zaposlenje']);
    var lokacija = pick(nazivi['nav.lokacija']);
    if (!zaposlenje && !lokacija) return;

    ['.nav-links', '.mobile-nav'].forEach(function(sel){
      var nav = document.querySelector(sel);
      if (!nav) return;
      nav.querySelectorAll('a').forEach(function(link){
        var href = link.getAttribute('href');
        if (zaposlenje && href && href.includes('zaposlenje')) link.textContent = zaposlenje;
        else if (lokacija && href && href.includes('lokacija')) link.textContent = lokacija;
      });
    });
  }
})();
