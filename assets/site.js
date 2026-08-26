/* Sprachumschaltung. Läuft absichtlich als erstes im <head>, damit die
   Sprache vor dem ersten Paint feststeht und nichts aufblitzt.
   Ohne JavaScript bleibt data-lang ungesetzt und beide Fassungen stehen
   untereinander — die Seite bleibt vollständig lesbar. */
(function () {
  var STORE_KEY = 'stacks-lang';
  var root = document.documentElement;

  function read() {
    try {
      var saved = localStorage.getItem(STORE_KEY);
      if (saved === 'de' || saved === 'en') return saved;
    } catch (err) {
      /* Private-Modus o. ä. — dann entscheidet die Browsersprache. */
    }
    return (navigator.language || 'de').toLowerCase().indexOf('de') === 0 ? 'de' : 'en';
  }

  function apply(lang) {
    root.setAttribute('data-lang', lang);
    root.setAttribute('lang', lang);
    var buttons = document.querySelectorAll('.langswitch [data-set-lang]');
    for (var i = 0; i < buttons.length; i++) {
      buttons[i].setAttribute('aria-pressed', String(buttons[i].dataset.setLang === lang));
    }
  }

  apply(read());

  document.addEventListener('DOMContentLoaded', function () {
    apply(root.getAttribute('data-lang'));

    document.addEventListener('click', function (event) {
      var button = event.target.closest('[data-set-lang]');
      if (!button) return;
      var lang = button.dataset.setLang;
      apply(lang);
      try {
        localStorage.setItem(STORE_KEY, lang);
      } catch (err) {
        /* Auswahl gilt dann nur für diesen Seitenaufruf. */
      }
    });
  });
})();
