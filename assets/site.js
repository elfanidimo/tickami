// Site vitrine Tickami : thème clair/sombre, menu mobile, choix mensuel/annuel des tarifs.
// Le thème choisi est seulement mémorisé dans le navigateur (localStorage), jamais envoyé.
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
