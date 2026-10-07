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
