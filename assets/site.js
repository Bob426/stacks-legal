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
    /* Das Kontaktformular schickt die Sprache mit, damit die Rückmeldung passt. */
    var formLang = document.querySelector('.contact-form input[name="lang"]');
    if (formLang) formLang.value = lang;
    var placeholders = document.querySelectorAll('[data-ph-' + lang + ']');
    for (var p = 0; p < placeholders.length; p++) placeholders[p].placeholder = placeholders[p].getAttribute('data-ph-' + lang);
    syncTopic();
  }

  /* Rückmeldung nach dem Absenden des Kontaktformulars (?status=…). */
  function showFormStatus() {
    var match = /[?&]status=([a-z-]+)/.exec(window.location.search);
    if (!match) return;
    var box = document.querySelector('.form-status[data-status="' + match[1] + '"]');
    if (box) box.hidden = false;
  }

  /* Startseite: Serien / Filme / Bücher wechselt das vordere Telefon (WAI-ARIA Tabs). */
  function mediaTabs() {
    var list = document.querySelector('.media-tabs');
    if (!list) return;
    var tabs = list.querySelectorAll('[role="tab"]');
    var panel = document.getElementById('hero-phones');

    function select(index, focus) {
      for (var i = 0; i < tabs.length; i++) {
        tabs[i].setAttribute('aria-selected', String(i === index));
        tabs[i].tabIndex = i === index ? 0 : -1;
      }
      var kind = tabs[index].dataset.kind;
      panel.setAttribute('aria-labelledby', tabs[index].id);
      var items = panel.querySelectorAll('[data-tab]');
      for (var j = 0; j < items.length; j++) {
        items[j].classList.toggle('is-active', items[j].dataset.tab === kind);
      }
      if (focus) tabs[index].focus();
    }

    function indexOf(tab) { return Array.prototype.indexOf.call(tabs, tab); }

    list.addEventListener('click', function (event) {
      var tab = event.target.closest('[role="tab"]');
      if (tab) select(indexOf(tab), false);
    });
    list.addEventListener('keydown', function (event) {
      var current = indexOf(document.activeElement);
      if (current < 0) return;
      var next = { ArrowRight: current + 1, ArrowLeft: current - 1, Home: 0, End: tabs.length - 1 }[event.key];
      if (next === undefined) return;
      event.preventDefault();
      select((next + tabs.length) % tabs.length, true);
    });
  }

  /* Support: Suche über Frage, Antwort und Menüpfad; ein #anker öffnet seine Frage. */
  function supportSearch() {
    var search = document.querySelector('.search');
    var all = document.querySelectorAll('.faq details');
    if (!all.length) return;

    function openFromHash() {
      var id = decodeURIComponent(window.location.hash.slice(1));
      var target = id && document.getElementById(id);
      if (target && target.tagName === 'DETAILS') target.open = true;
    }
    openFromHash();
    window.addEventListener('hashchange', openFromHash);

    if (!search) return;
    search.hidden = false;
    var input = search.querySelector('input');
    var empties = document.querySelectorAll('.search-empty');

    input.addEventListener('input', function () {
      var query = input.value.trim().toLowerCase();
      var groups = document.querySelectorAll('[data-faq-group]');
      for (var i = 0; i < all.length; i++) {
        var hit = !query || all[i].textContent.toLowerCase().indexOf(query) !== -1;
        all[i].hidden = !hit;
        all[i].open = Boolean(query) && hit;
      }
      for (var g = 0; g < groups.length; g++) {
        groups[g].hidden = !groups[g].querySelector('details:not([hidden])');
      }
      for (var e = 0; e < empties.length; e++) {
        var scope = empties[e].closest('.l') || document;
        empties[e].hidden = !query || Boolean(scope.querySelector('.faq details:not([hidden])'));
        empties[e].querySelector('[data-query]').textContent = input.value.trim();
      }
      if (!query) openFromHash();
    });
  }

  /* Datenschutz: der Abschnitt, der gerade oben steht, ist im Inhaltsverzeichnis markiert.
     Per Scroll statt IntersectionObserver: nach einem Sprung steht die Überschrift unter
     der Kopfzeile, und ein Observer-Fenster meldet dann gar nichts. */
  function policyToc() {
    var policies = document.querySelectorAll('.policy');
    if (!policies.length) return;
    var pending = false;
    function update() {
      pending = false;
      for (var p = 0; p < policies.length; p++) {
        var headings = policies[p].querySelectorAll('.policy__body > h2[id]');
        var current = headings[0];
        for (var i = 0; i < headings.length; i++) {
          if (headings[i].getBoundingClientRect().top < 120) current = headings[i];
        }
        var links = policies[p].querySelectorAll('.jump a');
        for (var j = 0; j < links.length; j++) {
          if (links[j].getAttribute('href') === '#' + current.id) links[j].setAttribute('aria-current', 'true');
          else links[j].removeAttribute('aria-current');
        }
      }
    }
    window.addEventListener('scroll', function () {
      if (!pending) { pending = true; requestAnimationFrame(update); }
    }, { passive: true });
    update();
  }

  /* Kontakt: Anliegen, Prüfung am Feld, Absenden ohne Seitenwechsel.
     Ohne JavaScript bleibt das normale POST mit Rückleitung (?status=…). */
  var PLACEHOLDERS = {
    de: { bug: 'Was ist passiert, und was hättest du erwartet?', question: 'Deine Frage …', idea: 'Was würde Stacks für dich besser machen?' },
    en: { bug: 'What happened, and what did you expect instead?', question: 'Your question …', idea: 'What would make Stacks better for you?' }
  };
  var EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  function syncTopic() {
    var form = document.querySelector('.contact-form');
    if (!form) return;
    var checked = form.querySelector('input[name="topic"]:checked');
    var topic = checked ? checked.value : 'question';
    var bugOnly = form.querySelectorAll('.bug-only');
    for (var i = 0; i < bugOnly.length; i++) bugOnly[i].hidden = topic !== 'bug';
    var lang = root.getAttribute('data-lang') === 'en' ? 'en' : 'de';
    form.querySelector('textarea[name="message"]').placeholder = PLACEHOLDERS[lang][topic];
  }

  function contactForm() {
    var form = document.querySelector('.contact-form');
    if (!form) return;
    var email = form.querySelector('input[name="email"]');
    var message = form.querySelector('textarea[name="message"]');
    var counter = form.querySelector('.counter');
    var button = form.querySelector('button[type="submit"]');
    var sent = document.querySelector('.sent');
    var touched = { email: false, message: false };
    /* Die Prüfung am Feld ersetzt die Browser-Blasen; ohne JavaScript bleiben die. */
    form.noValidate = true;

    function setError(field, bad) {
      field.setAttribute('aria-invalid', String(bad));
      document.getElementById(field.id + '-error').hidden = !bad;
    }
    function check(which) {
      var emailBad = touched.email && !EMAIL_PATTERN.test(email.value.trim());
      var messageBad = touched.message && message.value.trim().length < 10;
      if (!which || which === 'email') setError(email, emailBad);
      if (!which || which === 'message') setError(message, messageBad);
      return !emailBad && !messageBad;
    }
    function hideStatus() {
      var boxes = document.querySelectorAll('.form-status');
      for (var i = 0; i < boxes.length; i++) boxes[i].hidden = true;
    }
    function showStatus(status) {
      var box = document.querySelector('.form-status[data-status="' + status + '"]');
      (box || document.querySelector('.form-status[data-status="failed"]')).hidden = false;
    }

    form.addEventListener('change', function (event) {
      if (event.target.name === 'topic') syncTopic();
    });
    syncTopic();
    counter.textContent = message.value.length + ' / 5000';
    message.addEventListener('input', function () {
      counter.textContent = message.value.length + ' / 5000';
      if (touched.message) check('message');
    });
    email.addEventListener('input', function () { if (touched.email) check('email'); });
    /* Ein Fehler, der beim Verlassen des Felds erscheint, schiebt den Button nach unten —
       wer direkt auf "Senden" klickt, trifft ihn beim Loslassen nicht mehr. Deshalb wartet
       die Prüfung beim Verlassen kurz und entfällt, solange der Button gedrückt wird; das
       Absenden prüft ohnehin. Bei Touch fällt der Blur erst nach pointerup, daher die
       Verzögerung zusätzlich zur Markierung. */
    var pressingSubmit = false;
    button.addEventListener('pointerdown', function () { pressingSubmit = true; });
    document.addEventListener('pointerup', function () {
      setTimeout(function () { pressingSubmit = false; }, 300);
    });
    function onBlur(which) {
      setTimeout(function () {
        if (pressingSubmit) return;
        touched[which] = true;
        check(which);
      }, 200);
    }
    email.addEventListener('blur', function () { onBlur('email'); });
    message.addEventListener('blur', function () { onBlur('message'); });

    form.addEventListener('submit', function (event) {
      event.preventDefault();
      touched.email = touched.message = true;
      if (!check()) {
        (email.getAttribute('aria-invalid') === 'true' ? email : message).focus();
        return;
      }
      hideStatus();
      button.disabled = true;
      fetch(form.action, { method: 'POST', body: new FormData(form), headers: { Accept: 'application/json' } })
        .then(function (response) { return response.json(); })
        .then(function (data) {
          if (data.status !== 'sent') { showStatus(data.status); return; }
          var targets = sent.querySelectorAll('[data-sent-email]');
          for (var i = 0; i < targets.length; i++) targets[i].textContent = email.value.trim();
          form.hidden = true;
          sent.hidden = false;
          sent.querySelector('h2').focus();
        })
        .catch(function () { showStatus('failed'); })
        .then(function () { button.disabled = false; });
    });

    sent.querySelector('[data-new-message]').addEventListener('click', function () {
      message.value = '';
      touched.message = false;
      setError(message, false);
      counter.textContent = '0 / 5000';
      sent.hidden = true;
      form.hidden = false;
      message.focus();
    });
  }

  /* Ab hier steht fest, dass der Umschalter auf der Startseite funktioniert. */
  root.setAttribute('data-tabs', '');
  apply(read());

  document.addEventListener('DOMContentLoaded', function () {
    apply(root.getAttribute('data-lang'));
    showFormStatus();
    mediaTabs();
    supportSearch();
    policyToc();
    contactForm();

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
