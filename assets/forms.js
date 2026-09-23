/**
 * Form handling for the booking form.
 *
 * Two modes. A plain form validates and submits as one page. A form marked
 * data-steps runs as one question at a time: each .form-step is shown on its
 * own, and Next validates only what is visible before moving on.
 *
 * Validation here is for speed of feedback only. It is not security, since
 * the whole file can be bypassed with devtools, so submit.php validates
 * every field again on the server and is the thing that actually decides.
 *
 * Three anti-spam signals are collected here and checked server-side:
 *   - a honeypot field no human can see or tab into
 *   - firstTouch, the time the visitor first interacted with the form; bots
 *     submit within milliseconds of load, people take seconds
 *   - the server additionally rate-limits by IP
 */
(function () {
  var form = document.querySelector('form[data-validate]');
  if (!form) return;

  var result = document.getElementById('result');
  var btn = form.querySelector('[type="submit"]');
  var fallbackPhone = form.getAttribute('data-phone') || '';
  var fallbackEmail = form.getAttribute('data-email') || '';

  /* When the visitor first touched the form. Set on the first real
     interaction rather than on load, so a page left open in a tab does not
     look like a slow human. */
  var firstTouch = 0;
  ['focusin', 'input', 'change'].forEach(function (evt) {
    form.addEventListener(evt, function () {
      if (!firstTouch) firstTouch = Date.now();
    });
  });

  /* ------------------------------------------------------- validation */

  function fieldError(input, message) {
    var field = input.closest('.field') || input.parentNode;
    var err = field.querySelector('.err-msg');
    if (!err) {
      err = document.createElement('span');
      err.className = 'err-msg';
      err.id = (input.id || input.name) + '-error';
      field.appendChild(err);
    }
    err.textContent = message;
    input.setAttribute('aria-invalid', 'true');
    input.setAttribute('aria-describedby', err.id);
  }

  function clearError(input) {
    var field = input.closest('.field') || input.parentNode;
    var err = field.querySelector('.err-msg');
    if (err) err.textContent = '';
    input.removeAttribute('aria-invalid');
    input.removeAttribute('aria-describedby');
  }

  function validateField(input) {
    var v = (input.value || '').trim();
    if (input.hasAttribute('required') && !v) return false;
    if (input.type === 'email' && v && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) return false;
    if (input.type === 'date' && v && input.min && v < input.min) return false;
    return true;
  }

  function message(input) {
    var v = (input.value || '').trim();
    if (input.hasAttribute('required') && !v) return 'This one is needed.';
    if (input.type === 'email' && v) return 'That does not look like an email address.';
    if (input.type === 'date' && v) return 'Pick a date in the future.';
    return 'Please check this.';
  }

  form.addEventListener('input', function (e) {
    if (e.target.getAttribute('aria-invalid') === 'true' && validateField(e.target)) {
      clearError(e.target);
    }
  });

  function fieldsIn(scope) {
    return [].slice.call(scope.querySelectorAll('input, select, textarea'))
      .filter(function (i) {
        if (i.closest('.hp')) return false;             // honeypot
        /* Hidden inputs are normally machine-set and not worth validating,
           but the calendar writes the chosen date and time into a pair of
           them. Those carry `required` and do need checking. */
        if (i.type === 'hidden') return i.hasAttribute('required');
        return true;
      });
  }

  /** Focus, but only on something a person can actually focus. The
   *  calendar's hidden inputs cannot take focus, so we move to the widget
   *  standing in for them instead. */
  function focusFor(input) {
    if (input.type !== 'hidden') { input.focus(); return; }
    var proxy = (input.closest('.field') || document).querySelector('[data-focus-proxy]');
    if (proxy) proxy.focus();
  }

  /** Validates everything in scope. Returns the first bad field, or null. */
  function check(scope) {
    var bad = null;
    fieldsIn(scope).forEach(function (input) {
      if (validateField(input)) { clearError(input); return; }
      fieldError(input, message(input));
      if (!bad) bad = input;
    });
    return bad;
  }

  function show(kind, html) {
    if (!result) return;
    result.hidden = false;
    result.className = 'note ' + kind;
    result.innerHTML = html;
    result.setAttribute('role', kind === 'err' ? 'alert' : 'status');
  }

  /* A failed form must never be a dead end: always give them the phone. */
  function reachUsAnyway() {
    var parts = [];
    if (fallbackPhone && fallbackPhone.indexOf('TODO') === -1) {
      parts.push('call <a href="tel:' + fallbackPhone.replace(/[^0-9+]/g, '') + '">' + fallbackPhone + '</a>');
    }
    if (fallbackEmail) parts.push('email <a href="mailto:' + fallbackEmail + '">' + fallbackEmail + '</a>');
    return parts.length ? ' In the meantime you can ' + parts.join(' or ') + '.' : '';
  }

  /* ------------------------------------------------------- step mode */

  var steps = [].slice.call(form.querySelectorAll('.form-step'));
  var stepped = form.hasAttribute('data-steps') && steps.length > 0;
  var at = 0;
  var barFill, count, btnBack;

  if (stepped) {
    barFill = form.querySelector('.gen-bar span');
    count = form.querySelector('.gen-count');
    btnBack = form.querySelector('[data-back]');

    steps.forEach(function (s, i) { s.hidden = i !== 0; });

    if (btnBack) {
      btnBack.addEventListener('click', function () {
        if (at === 0) return;
        at--;
        paint(true);
      });
    }

    /* Enter moves to the next question rather than submitting early. The
       last step is the only one where Enter should actually submit. */
    form.addEventListener('keydown', function (e) {
      if (e.key !== 'Enter') return;
      if (e.target.tagName === 'TEXTAREA') return;
      if (at < steps.length - 1) { e.preventDefault(); advance(); }
    });

    paint();
  }

  /* moveFocus is false on the very first paint and true whenever the visitor
     moved between questions themselves.

     This matters more than it looks. Focusing an input scrolls it into view,
     so focusing on load dragged the browser straight down to this form,
     past the booking calendar above it. Anyone clicking "Book a call" landed
     on "Rather send a message?" and never saw the calendar at all. Focus
     belongs to whoever asked for it, and on page load nobody has. */
  function paint(moveFocus) {
    steps.forEach(function (s, i) { s.hidden = i !== at; });
    if (btnBack) btnBack.disabled = at === 0;
    btn.textContent = at === steps.length - 1 ? 'Send it' : 'Next question';
    if (count) count.textContent = 'Question ' + (at + 1) + ' of ' + steps.length;
    if (barFill) barFill.style.width = (at / steps.length * 100) + '%';

    if (!moveFocus) return;
    var first = fieldsIn(steps[at])[0];
    if (first) setTimeout(function () { focusFor(first); }, 40);
  }

  function advance() {
    var bad = check(steps[at]);
    if (bad) { focusFor(bad); return false; }
    if (at < steps.length - 1) { at++; paint(true); return false; }
    return true;
  }

  /* ---------------------------------------------------------- submit */

  form.addEventListener('submit', function (e) {
    e.preventDefault();

    if (stepped && !advance()) return;

    var bad = check(form);
    if (bad) {
      show('err', 'Please fix the highlighted fields.');
      /* In step mode the bad field may be on an earlier step, so go to it
         rather than reporting an error the visitor cannot see. */
      if (stepped) {
        var owner = bad.closest('.form-step');
        var i = steps.indexOf(owner);
        if (i !== -1 && i !== at) { at = i; paint(true); }
      }
      focusFor(bad);
      return;
    }

    var data = new FormData(form);
    data.append('elapsed', String(firstTouch ? Date.now() - firstTouch : 0));

    btn.disabled = true;
    var label = btn.textContent;
    btn.textContent = 'Sending…';

    fetch(form.getAttribute('action'), { method: 'POST', body: data })
      .then(function (r) { return r.json().then(function (j) { return { ok: r.ok, j: j }; }); })
      .then(function (res) {
        if (!res.ok || !res.j.ok) throw new Error((res.j && res.j.error) || 'Something went wrong.');
        form.reset();
        form.hidden = true;
        show('ok', res.j.message || 'Got it. We will be in touch shortly.');
        if (result) { result.setAttribute('tabindex', '-1'); result.focus(); }
      })
      .catch(function (err) {
        show('err', 'That did not send: ' + err.message + reachUsAnyway());
      })
      .finally(function () {
        btn.disabled = false;
        btn.textContent = label;
      });
  });
})();
