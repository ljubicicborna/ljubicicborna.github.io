/* =====================================================================
   I18N — jezični prekidač (HR zadano; tri zastavice, klik izravno bira jezik)
   ---------------------------------------------------------------------
   - Hrvatski tekst ostaje izravno u HTML-u (zadano stanje, bez mreže).
   - EN/DE dolaze iz assets/i18n/en.json i assets/i18n/de.json, primijenjeno
     na elemente s data-i18n="ključ" (textContent) i data-i18n-attr
     ("atribut:ključ|atribut2:ključ2") za atribute (alt, placeholder, content…).
   - CMS-ovisne skripte (main.js, cms-nazivi.js, cjenik.js, novosti.js) čitaju
     trenutni jezik preko window.HedonistI18n.lang()/pick() i osluškuju
     "hedonist:langchange" da ponovno iscrtaju svoj sadržaj.
===================================================================== */
(function(){
  var SUPPORTED = ['hr', 'en', 'de'];
  var DEFAULT_LANG = 'hr';
  var STORAGE_KEY = 'hedonistLang';
  var LABELS = { hr: 'Hrvatski', en: 'English', de: 'Deutsch' };
  var dictCache = { hr: {} };

  function getLang(){
    var saved = null;
    try { saved = localStorage.getItem(STORAGE_KEY); } catch(e){}
    return SUPPORTED.indexOf(saved) !== -1 ? saved : DEFAULT_LANG;
  }

  function loadDict(lang){
    if (dictCache[lang]) return Promise.resolve(dictCache[lang]);
    return fetch('/assets/i18n/' + lang + '.json', { cache: 'force-cache' })
      .then(function(r){ return r.ok ? r.json() : {}; })
      .then(function(d){ dictCache[lang] = d; return d; })
      .catch(function(){ return {}; });
  }

  /* pick(field, lang) — field je ili plain string (pretpostavlja se hr)
     ili { hr, en, de } objekt; uvijek se vraća string, s padom natrag na hr */
  function pick(field, lang){
    lang = lang || getLang();
    if (field == null) return '';
    if (typeof field === 'string') return field;
    if (typeof field === 'object') return field[lang] || field.hr || field.en || field.de || '';
    return String(field);
  }

  function applyStatic(lang, dict){
    document.documentElement.lang = lang;

    document.querySelectorAll('[data-i18n]').forEach(function(el){
      var key = el.getAttribute('data-i18n');
      var asHtml = el.hasAttribute('data-i18n-html');
      var prop = asHtml ? 'innerHTML' : 'textContent';
      if (!el.hasAttribute('data-i18n-orig')) el.setAttribute('data-i18n-orig', el[prop]);
      if (lang === DEFAULT_LANG) { el[prop] = el.getAttribute('data-i18n-orig'); return; }
      var v = dict[key];
      if (v) el[prop] = v;
    });

    document.querySelectorAll('[data-i18n-attr]').forEach(function(el){
      el.getAttribute('data-i18n-attr').split('|').forEach(function(pair){
        var idx = pair.indexOf(':');
        if (idx === -1) return;
        var attr = pair.slice(0, idx);
        var key = pair.slice(idx + 1);
        var origAttr = 'data-i18n-orig-' + attr;
        if (!el.hasAttribute(origAttr)) el.setAttribute(origAttr, el.getAttribute(attr) || '');
        if (lang === DEFAULT_LANG) { el.setAttribute(attr, el.getAttribute(origAttr)); return; }
        var v = dict[key];
        if (v) el.setAttribute(attr, v);
      });
    });
  }

  function updateSwitcherUI(lang){
    document.querySelectorAll('.lang-switch').forEach(function(box){
      box.querySelectorAll('[data-lang]').forEach(function(btn){
        var isCurrent = btn.getAttribute('data-lang') === lang;
        btn.setAttribute('aria-current', isCurrent ? 'true' : 'false');
      });
    });
  }

  function setLang(lang){
    if (SUPPORTED.indexOf(lang) === -1) lang = DEFAULT_LANG;
    try { localStorage.setItem(STORAGE_KEY, lang); } catch(e){}
    loadDict(lang).then(function(dict){
      applyStatic(lang, dict);
      updateSwitcherUI(lang);
      document.dispatchEvent(new CustomEvent('hedonist:langchange', { detail: { lang: lang, dict: dict } }));
    });
  }

  /* tri odvojene zastavice jedna do druge — klik na bilo koju izravno
     postavlja taj jezik, nema skrivenog izbornika niti kruženja */
  function initSwitcher(){
    document.querySelectorAll('.lang-switch').forEach(function(box){
      box.querySelectorAll('[data-lang]').forEach(function(btn){
        btn.addEventListener('click', function(){
          setLang(btn.getAttribute('data-lang'));
        });
      });
    });
  }

  /* t(key, fallback) — dohvati statični prijevod izravno iz učitanog
     rječnika (za tekst koji JS generira, npr. "X rezultata") */
  function t(key, fallback){
    var lang = getLang();
    if (lang === DEFAULT_LANG) return fallback;
    var v = (dictCache[lang] || {})[key];
    return v || fallback;
  }

  window.HedonistI18n = {
    lang: getLang,
    set: setLang,
    pick: pick,
    t: t,
    labels: LABELS
  };

  document.addEventListener('DOMContentLoaded', function(){
    initSwitcher();
    var lang = getLang();
    updateSwitcherUI(lang);
    if (lang !== DEFAULT_LANG) setLang(lang);
  });
})();
