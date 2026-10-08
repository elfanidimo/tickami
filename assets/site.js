// Site vitrine Tickami : thème clair/sombre, menu mobile, choix mensuel/annuel des tarifs,
// mesure d'audience. Le thème choisi est seulement mémorisé dans le navigateur (localStorage).
// Mesure d'audience (voir mentions légales) : sans cookie, chaque page vue est signalée à la
// fonction site-visit (chemin de la page et langue ; l'adresse IP est lue par le serveur).
(function () {
  if (location.hostname === 'tickami.fr' && navigator.webdriver !== true) {
    try {
      fetch('https://jymoktcrfwvzwfuftymo.supabase.co/functions/v1/site-visit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ page: location.pathname, lang: document.documentElement.lang }),
        keepalive: true,
      }).catch(function () { /* mesure facultative */ });
    } catch (e) { /* mesure facultative */ }
  }
})();

(function () {
  var root = document.documentElement;
  var KEY = 'tickami-theme';

  function effectiveTheme() {
    if (root.dataset.theme) return root.dataset.theme;
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  document.querySelectorAll('[data-theme-toggle]').forEach(function (button) {
    button.addEventListener('click', function () {
      var next = effectiveTheme() === 'dark' ? 'light' : 'dark';
      root.dataset.theme = next;
      try { localStorage.setItem(KEY, next); } catch (e) { /* stockage indisponible : choix non mémorisé */ }
    });
  });

  var header = document.querySelector('.site-header');
  var menuButton = document.querySelector('[data-menu-toggle]');
  if (header && menuButton) {
    menuButton.addEventListener('click', function () {
      var open = header.classList.toggle('menu-open');
      menuButton.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    header.querySelectorAll('.nav a').forEach(function (link) {
      link.addEventListener('click', function () {
        header.classList.remove('menu-open');
        menuButton.setAttribute('aria-expanded', 'false');
      });
    });
  }

  document.querySelectorAll('[data-billing-root]').forEach(function (scope) {
    var buttons = scope.querySelectorAll('[data-billing-choice]');
    buttons.forEach(function (button) {
      button.addEventListener('click', function () {
        scope.setAttribute('data-billing', button.getAttribute('data-billing-choice'));
        buttons.forEach(function (other) { other.setAttribute('aria-pressed', other === button ? 'true' : 'false'); });
      });
    });
  });
})();

// F94 : la capture simulée du tableau de bord (1280 × 800) suit la largeur de sa fenêtre.
(function () {
  var screens = document.querySelectorAll('.desk-screen');
  if (!screens.length) return;
  function fit() {
    screens.forEach(function (screen) {
      var canvas = screen.querySelector('.desk-canvas');
      if (canvas) canvas.style.setProperty('--s', String(screen.clientWidth / 1280));
    });
  }
  fit();
  window.addEventListener('resize', fit);
})();

// F102 : lettre d'information. La fenêtre s'ouvre après 15 s ou à la moitié de la page, une fois par
// visite ; fermée sans inscription, elle n'est plus proposée avant 90 jours ; après une inscription,
// plus jamais. Ce choix est seulement gardé dans le navigateur (localStorage), sans cookie : si le
// stockage est indisponible (navigation privée stricte), la fenêtre n'est pas proposée.
// La page newsletter traite aussi les liens des e-mails (?confirm= et ?unsubscribe=).
(function () {
  var API = 'https://jymoktcrfwvzwfuftymo.supabase.co/functions/v1/newsletter';
  var KEY = 'tickami-newsletter';
  var DAY = 24 * 3600 * 1000;
  var lang = document.documentElement.lang === 'en' ? 'en' : 'fr';

  function readChoice() {
    try {
      var raw = localStorage.getItem(KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return undefined;
    }
  }
  function saveChoice(choice) {
    try { localStorage.setItem(KEY, JSON.stringify(choice)); } catch (e) { /* choix non mémorisé */ }
  }
  function call(body) {
    return fetch(API, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      .then(function (response) {
        return response.json().catch(function () { return {}; }).then(function (data) { return { status: response.status, data: data }; });
      });
  }
  function show(root, name) {
    root.querySelectorAll('[data-nl-step]').forEach(function (step) { step.hidden = step.getAttribute('data-nl-step') !== name; });
  }
  function setEmail(root, email) {
    root.querySelectorAll('[data-nl-email]').forEach(function (el) { el.textContent = email; });
  }

  // Formulaires (fenêtre et page) : contrôle, envoi, étape « vérifiez votre boîte ».
  document.querySelectorAll('[data-nl]').forEach(function (root) {
    var form = root.querySelector('[data-nl-form]');
    if (!form) return;
    var error = form.querySelector('[data-nl-error]');
    var submit = form.querySelector('[type="submit"]');
    var label = submit.textContent;
    function fail(key) {
      error.textContent = root.getAttribute('data-' + key) || '';
      error.hidden = false;
    }
    form.addEventListener('submit', function (event) {
      event.preventDefault();
      error.hidden = true;
      var email = form.elements.email.value.trim();
      if (!/^[^\s@]+@[^\s@]+\.[A-Za-z]{2,}$/.test(email)) { fail('erroremail'); form.elements.email.focus(); return; }
      if (!form.elements.consent.checked) { fail('errorconsent'); form.elements.consent.focus(); return; }
      submit.disabled = true;
      submit.textContent = submit.getAttribute('data-sending');
      call({ action: 'subscribe', email: email, lang: lang, consent: true, website: form.elements.website.value })
        .then(function (result) {
          if (result.status === 200) {
            saveChoice({ subscribed: true, at: new Date().toISOString() });
            setEmail(root, email);
            show(root, 'done');
          } else {
            fail(result.status === 429 ? 'errorbusy' : result.data.error === 'invalid_email' ? 'erroremail' : 'errornetwork');
          }
        })
        .catch(function () { fail('errornetwork'); })
        .then(function () { submit.disabled = false; submit.textContent = label; });
    });
  });

  // Fenêtre proposée aux visiteurs.
  var panel = document.querySelector('[data-nl-panel]');
  var backdrop = document.querySelector('[data-nl-backdrop]');
  if (panel) {
    var choice = readChoice();
    var due = choice === null || (choice && !choice.subscribed && (!choice.dismissed || Date.now() - Date.parse(choice.dismissed) > 90 * DAY));
    var opened = false;
    function open() {
      if (opened) return;
      opened = true;
      window.removeEventListener('scroll', onScroll);
      panel.hidden = false;
      if (backdrop) backdrop.hidden = false;
    }
    function close(dismissed) {
      if (dismissed) saveChoice({ dismissed: new Date().toISOString() });
      panel.hidden = true;
      if (backdrop) backdrop.hidden = true;
    }
    function onScroll() {
      var max = document.documentElement.scrollHeight - window.innerHeight;
      if (max > 0 && window.scrollY / max >= 0.5) open();
    }
    panel.querySelectorAll('[data-nl-dismiss]').forEach(function (button) { button.addEventListener('click', function () { close(true); }); });
    panel.querySelectorAll('[data-nl-close]').forEach(function (button) { button.addEventListener('click', function () { close(false); }); });
    if (backdrop) backdrop.addEventListener('click', function () { close(!panel.querySelector('[data-nl-step="done"]:not([hidden])')); });
    panel.addEventListener('keydown', function (event) { if (event.key === 'Escape') close(!panel.querySelector('[data-nl-step="done"]:not([hidden])')); });
    if (due && choice !== undefined) {
      setTimeout(open, 15000);
      window.addEventListener('scroll', onScroll, { passive: true });
    }
  }

  // Page newsletter : liens de confirmation et de désinscription des e-mails.
  var page = document.querySelector('[data-nl-page]');
  if (!page) return;
  var params = new URLSearchParams(location.search);
  var confirmToken = params.get('confirm');
  var unsubscribeToken = params.get('unsubscribe');
  var pageError = page.querySelector('[data-nl-page-error]');
  function pageFail() {
    pageError.textContent = page.getAttribute('data-errornetwork') || '';
    pageError.hidden = false;
  }
  page.querySelectorAll('[data-nl-goto]').forEach(function (button) {
    button.addEventListener('click', function () { show(page, button.getAttribute('data-nl-goto')); });
  });
  if (confirmToken) {
    show(page, 'loading');
    call({ action: 'confirm', token: confirmToken })
      .then(function (result) {
        if (result.status === 200) {
          saveChoice({ subscribed: true, at: new Date().toISOString() });
          setEmail(page, result.data.email || '');
          show(page, 'confirmed');
        } else {
          show(page, 'invalid');
        }
      })
      .catch(function () { show(page, 'invalid'); pageFail(); });
  } else if (unsubscribeToken) {
    show(page, 'loading');
    call({ action: 'status', token: unsubscribeToken })
      .then(function (result) {
        if (result.status !== 200) { show(page, 'unknown'); return; }
        setEmail(page, result.data.email || '');
        show(page, result.data.status === 'unsubscribed' ? 'unsubscribed' : 'ask');
      })
      .catch(function () { show(page, 'unknown'); pageFail(); });
    function act(action, next, button) {
      button.disabled = true;
      pageError.hidden = true;
      call({ action: action, token: unsubscribeToken })
        .then(function (result) {
          if (result.status === 200) {
            if (action === 'unsubscribe') saveChoice({ dismissed: new Date().toISOString() });
            show(page, result.data.status === 'subscribed' ? 'resubscribed' : next);
          } else {
            pageFail();
          }
        })
        .catch(pageFail)
        .then(function () { button.disabled = false; });
    }
    page.querySelectorAll('[data-nl-unsubscribe]').forEach(function (button) {
      button.addEventListener('click', function () { act('unsubscribe', 'unsubscribed', button); });
    });
    page.querySelectorAll('[data-nl-resubscribe]').forEach(function (button) {
      button.addEventListener('click', function () { act('resubscribe', 'unsubscribed', button); });
    });
  }
})();
