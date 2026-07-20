/* =====================================================================
   ZAPOŠLJAVANJE — nakon slanja obrasca (FormSubmit vrati na
   ?poslano=1) prikaži poruku uspjeha umjesto obrasca.
   Sekcija "Otvorene pozicije" ostaje sakrivena (nema dinamičkih oglasa
   na statičnoj stranici; ako se otvori pozicija, doda se ručno u HTML).
===================================================================== */
(function(){
  if (new URLSearchParams(location.search).has('poslano')) {
    var success = document.getElementById('job-success');
    var form = document.getElementById('job-form');
    if (success) success.hidden = false;
    if (form) form.hidden = true;
  }
})();
