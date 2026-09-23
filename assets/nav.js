/* Mobile navigation drawer. Progressive: with no JS the drawer stays hidden
   and the header links are still reachable, so nothing is ever trapped. */
(function () {
  var burger = document.querySelector('.burger');
  var drawer = document.getElementById('menu');
  if (!burger || !drawer) return;

  function setOpen(open) {
    burger.setAttribute('aria-expanded', String(open));
    drawer.hidden = !open;
    document.body.classList.toggle('nav-open', open);
  }

  burger.addEventListener('click', function () {
    setOpen(burger.getAttribute('aria-expanded') !== 'true');
  });

  drawer.addEventListener('click', function (e) {
    if (e.target.closest('a')) setOpen(false);
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && !drawer.hidden) { setOpen(false); burger.focus(); }
  });

  /* A resize past the breakpoint leaves the drawer open over a desktop
     layout otherwise. */
  window.addEventListener('resize', function () {
    if (window.innerWidth > 860 && !drawer.hidden) setOpen(false);
  });
})();
