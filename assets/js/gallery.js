/* =====================================================================
   Galerija (galerija.html) — 3×3 mreža, svaka pločica krije 3 fotke u
   okomitoj vrpci (.gallery-tile-strip) iza overflow:hidden okvira.
   Prije je smjer klizanja bio fiksan CSS @keyframes po retku (cijeli
   red uvijek "gore" ili uvijek "dolje", zauvijek) — to sad radi ova
   skripta: svaka pločica posebno, pri SVAKOJ izmjeni, nasumično bira
   sljedeću od preostale dvije fotke, pa smjer (gore/dolje) ispada
   nasumičan iz izmjene u izmjenu. Ritam (2.9 s drži, 0.6 s klizi) je
   isti za sve pločice — samo je taj ritam ono što drži prizor "skladnim"
   dok se svaka pločica giba neovisno. ---- */
(function(){
  var strips = document.querySelectorAll('.gallery-tile-strip');
  if (!strips.length) return;
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  var HOLD_MS = 2900;
  var SLIDE_MS = 600;

  strips.forEach(function(strip){
    var frames = strip.children.length;
    if (frames < 2) return;
    var current = 0;

    function tick(){
      var next;
      do { next = Math.floor(Math.random() * frames); } while (next === current);
      current = next;
      strip.style.transform = 'translateY(-' + (current * 100 / frames) + '%)';
      setTimeout(tick, HOLD_MS + SLIDE_MS);
    }

    setTimeout(tick, Math.random() * HOLD_MS);
  });
})();
