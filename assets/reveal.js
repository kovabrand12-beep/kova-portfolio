/**
 * Reveal-on-scroll, shared by the Kova site and the demos.
 *
 * Two things matter here beyond the effect itself:
 *
 *   - Anyone who has asked their system for reduced motion gets the page
 *     with no animation at all, immediately. Motion sickness and vestibular
 *     disorders are the reason that setting exists.
 *   - If IntersectionObserver is missing or the script fails, everything is
 *     shown. Content must never be left invisible because an effect broke.
 */
(function () {
  var reduced = false;
  try {
    reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch (e) {}

  function showAll(els) {
    for (var i = 0; i < els.length; i++) els[i].classList.add('in');
  }

  document.addEventListener('DOMContentLoaded', function () {
    var els = document.querySelectorAll('.reveal');
    if (!els.length) return;

    if (reduced || !('IntersectionObserver' in window)) {
      showAll(els);
      return;
    }

    document.documentElement.classList.add('has-reveal');

    /* Stagger within each group rather than across the whole page, so the
       fifth card in a grid is not held back by four items in the header
       above it. */
    var seen = new Map();
    for (var i = 0; i < els.length; i++) {
      var parent = els[i].parentNode;
      var n = seen.get(parent) || 0;
      seen.set(parent, n + 1);
      els[i].style.transitionDelay = Math.min(n, 6) * 70 + 'ms';
    }

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('in');
        io.unobserve(entry.target);
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -60px 0px' });

    for (var j = 0; j < els.length; j++) io.observe(els[j]);

    /* Anything already on screen at load should not wait for a scroll that
       may never come, and the hero should not fade in after the fact. */
    requestAnimationFrame(function () {
      for (var k = 0; k < els.length; k++) {
        var r = els[k].getBoundingClientRect();
        if (r.top < window.innerHeight * 0.9) {
          els[k].classList.add('in');
          io.unobserve(els[k]);
        }
      }
    });
  });
})();
