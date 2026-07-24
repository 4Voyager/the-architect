/* =================================================================
   AGETA SAMWEL — ARCHITECT
   MASTER SCRIPT

   Every behavior for the entire site lives in this one file. No
   page uses inline or internal JavaScript — each HTML file only
   loads this script.

   Each block below is self-contained (wrapped in its own IIFE) and
   guarded so it safely does nothing on a page that lacks the
   elements it needs — for example, the mobile nav block below no-ops
   on 404.html, which intentionally has no hamburger menu at all.

   TABLE OF CONTENTS
   1. Theme Switch          (every page)
   2. Mobile Navigation     (every page except 404.html)
   3. Scroll Reveal         (every page)
   4. Tilt Hover            (pages with .u-tilt cards)
   5. Stat Count-Up         (Home only)
   6. Hero Parallax         (Home only)
   7. Filter Bar            (Portfolio + Blog only)
   8. Contact Form          (Contact only)
   ================================================================= */


/* =================================================================
   1. THEME SWITCH
   Light / dark mode toggle with an "ink spreading" transition.
   Instead of a hard-edged circle wiping across the screen, this
   blurs the edge of the expanding circle and lets that blur sharpen
   as it settles — similar to how ink diffuses through paper and
   then resolves into a clean edge.
   ================================================================= */
(function themeSwitch() {
  const toggleButton = document.querySelector('.theme-switch');
  if (!toggleButton) return;

  const savedTheme = readStoredTheme() || 'light';
  document.documentElement.setAttribute('data-theme', savedTheme);

  toggleButton.addEventListener('click', function (event) {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const nextTheme = isDark ? 'light' : 'dark';
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Fallback for browsers without View Transitions, or reduced-motion users
    if (!document.startViewTransition || prefersReducedMotion) {
      applyTheme(nextTheme);
      return;
    }

    // Ink spreads outward from the exact point clicked
    const clickX = event.clientX;
    const clickY = event.clientY;
    const endRadius = Math.hypot(
      Math.max(clickX, window.innerWidth - clickX),
      Math.max(clickY, window.innerHeight - clickY)
    );

    const transition = document.startViewTransition(function () {
      applyTheme(nextTheme);
    });

    transition.ready.then(function () {
      document.documentElement.animate(
        {
          clipPath: [
            'circle(0px at ' + clickX + 'px ' + clickY + 'px)',
            'circle(' + endRadius + 'px at ' + clickX + 'px ' + clickY + 'px)',
          ],
          // Soft blur at the start (ink diffusing), sharpening as
          // the "ink" fully spreads and settles into place
          filter: ['blur(28px)', 'blur(0px)'],
        },
        {
          duration: 1100, // matches --duration-theme-switch in style.css
          easing: 'cubic-bezier(0.22, 1, 0.36, 1)', // gentle, organic settle — not mechanical
          pseudoElement: '::view-transition-new(root)',
        }
      );
    });
  });

  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    storeTheme(theme);
  }

  // Wrapped so the script never throws if storage is unavailable
  // (e.g. some private-browsing modes)
  function readStoredTheme() {
    try {
      return localStorage.getItem('theme');
    } catch (error) {
      return null;
    }
  }

  function storeTheme(theme) {
    try {
      localStorage.setItem('theme', theme);
    } catch (error) {
      /* fail silently — theme just won't persist across visits */
    }
  }
})();


/* =================================================================
   2. MOBILE NAVIGATION
   Opens/closes the full-screen overlay menu, locks background
   scroll while it's open, and closes automatically when a link
   inside it is clicked or Escape is pressed.

   Guarded at the top: 404.html has neither a toggle button nor an
   overlay (its nav is deliberately simplified), so this block exits
   immediately and does nothing there.
   ================================================================= */
(function mobileNavigation() {
  const toggleButton = document.getElementById('mobile-nav-toggle');
  const menu = document.getElementById('mobile-nav');
  if (!toggleButton || !menu) return;

  function openMenu() {
    menu.classList.add('is-open');
    toggleButton.classList.add('is-open');
    toggleButton.setAttribute('aria-expanded', 'true');
    document.body.style.overflow = 'hidden'; // prevent background scroll
  }

  function closeMenu() {
    menu.classList.remove('is-open');
    toggleButton.classList.remove('is-open');
    toggleButton.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
  }

  toggleButton.addEventListener('click', function () {
    const isOpen = menu.classList.contains('is-open');
    if (isOpen) {
      closeMenu();
    } else {
      openMenu();
    }
  });

  menu.querySelectorAll('a').forEach(function (link) {
    link.addEventListener('click', closeMenu);
  });

  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape' && menu.classList.contains('is-open')) {
      closeMenu();
    }
  });
})();


/* =================================================================
   3. SCROLL REVEAL
   Watches every element with the ".u-reveal" class. When an element
   scrolls into view, ".is-visible" is added, which triggers the
   fade + rise transition defined in style.css.
   ================================================================= */
(function scrollReveal() {
  const revealElements = document.querySelectorAll('.u-reveal');
  if (revealElements.length === 0) return;

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // If reduced motion is preferred, just show everything immediately
  if (prefersReducedMotion) {
    revealElements.forEach(function (element) {
      element.classList.add('is-visible');
    });
    return;
  }

  const observer = new IntersectionObserver(
    function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target); // animate in once, not every scroll pass
        }
      });
    },
    { threshold: 0.2 } // fires once ~20% of the element is visible
  );

  revealElements.forEach(function (element) {
    observer.observe(element);
  });
})();


/* =================================================================
   4. TILT HOVER
   Applies a subtle magnetic 3D tilt to every element with the
   ".u-tilt" class, wherever it appears (Home, Services, Portfolio,
   Blog). As the cursor moves over a card, its rotation follows the
   cursor's position relative to the card's center.

   Naturally a no-op on pages with no .u-tilt elements (About,
   Contact, 404), since querySelectorAll returns an empty list there.
   ================================================================= */
(function tiltHover() {
  const tiltElements = document.querySelectorAll('.u-tilt');
  if (tiltElements.length === 0) return;

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (prefersReducedMotion) return;

  const MAX_TILT_DEGREES = 6; // keep it subtle, not gimmicky

  tiltElements.forEach(function (element) {
    element.addEventListener('mousemove', function (event) {
      const bounds = element.getBoundingClientRect();
      const centerX = bounds.left + bounds.width / 2;
      const centerY = bounds.top + bounds.height / 2;

      // Distance of the cursor from center, normalized to -1..1
      const offsetX = (event.clientX - centerX) / (bounds.width / 2);
      const offsetY = (event.clientY - centerY) / (bounds.height / 2);

      const rotateX = (-offsetY * MAX_TILT_DEGREES).toFixed(2);
      const rotateY = (offsetX * MAX_TILT_DEGREES).toFixed(2);

      element.style.transform =
        'perspective(1000px) rotateX(' + rotateX + 'deg) rotateY(' + rotateY + 'deg) scale(1.02)';
    });

    element.addEventListener('mouseleave', function () {
      element.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) scale(1)';
    });
  });
})();


/* =================================================================
   5. STAT COUNT-UP
   Any element with [data-count-to="N"] counts up from 0 to N when
   it scrolls into view. Optional [data-suffix="%"] appends a
   character after the number. Currently only used on Home's
   Testimonials section, but written generically in case the same
   pattern is reused elsewhere later.
   ================================================================= */
(function statCountUp() {
  const countElements = document.querySelectorAll('[data-count-to]');
  if (countElements.length === 0) return;

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (prefersReducedMotion) {
    countElements.forEach(function (element) {
      element.textContent = element.dataset.countTo + (element.dataset.suffix || '');
    });
    return;
  }

  function animateCount(element) {
    const target = parseFloat(element.dataset.countTo);
    const suffix = element.dataset.suffix || '';
    const duration = 1200;
    const startTime = performance.now();

    function step(now) {
      const progress = Math.min((now - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic, feels less mechanical than linear
      const currentValue = Math.round(eased * target);
      element.textContent = currentValue + suffix;
      if (progress < 1) requestAnimationFrame(step);
    }

    requestAnimationFrame(step);
  }

  const observer = new IntersectionObserver(
    function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          animateCount(entry.target);
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.5 }
  );

  countElements.forEach(function (element) {
    observer.observe(element);
  });
})();


/* =================================================================
   6. HERO PARALLAX
   Moves Home's hero graphic slightly slower than page scroll, for a
   subtle sense of depth. Guarded on #hero-graphic, which only
   exists on index.html.
   ================================================================= */
(function heroParallax() {
  const heroGraphic = document.getElementById('hero-graphic');
  if (!heroGraphic) return;

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (prefersReducedMotion) return;

  window.addEventListener('scroll', function () {
    const scrollY = window.scrollY;
    if (scrollY < window.innerHeight) {
      heroGraphic.style.transform = 'translateY(' + (scrollY * 0.15) + 'px)';
    }
  });
})();


/* =================================================================
   7. FILTER BAR
   Shared by Portfolio and Blog. Clicking a filter button shows only
   the cards matching its data-filter value (or all cards, for
   "all"). Updates aria-pressed on the buttons so the active filter
   is announced to assistive tech, not just shown visually via color.

   DEEP-LINKING: the active filter is also reflected in the URL as
   ?filter=new-build (etc.), via history.pushState — no page reload.
   This means a filtered view can be bookmarked, shared, or reached
   directly, and browser back/forward restores the filter that was
   active at that point in history.

   Guarded on #filterable-grid, which only exists on Portfolio and
   Blog — this block no-ops everywhere else.
   ================================================================= */
(function filterBar() {
  const grid = document.getElementById('filterable-grid');
  const filterButtons = document.querySelectorAll('.filter-bar__button');
  if (!grid || filterButtons.length === 0) return;

  const cards = grid.querySelectorAll('.u-tilt');

  function applyFilter(selectedFilter, shouldUpdateUrl) {
    filterButtons.forEach(function (button) {
      button.setAttribute('aria-pressed', button.dataset.filter === selectedFilter ? 'true' : 'false');
    });

    cards.forEach(function (card) {
      const matches = selectedFilter === 'all' || card.dataset.category === selectedFilter;
      if (matches) {
        card.removeAttribute('hidden');
      } else {
        card.setAttribute('hidden', '');
      }
    });

    if (shouldUpdateUrl) {
      const url = new URL(window.location);
      if (selectedFilter === 'all') {
        url.searchParams.delete('filter');
      } else {
        url.searchParams.set('filter', selectedFilter);
      }
      history.pushState({ filter: selectedFilter }, '', url);
    }
  }

  filterButtons.forEach(function (button) {
    button.addEventListener('click', function () {
      applyFilter(button.dataset.filter, true);
    });
  });

  // Restore the correct filter on browser back/forward navigation
  window.addEventListener('popstate', function (event) {
    const selectedFilter = (event.state && event.state.filter) || 'all';
    applyFilter(selectedFilter, false);
  });

  // On page load, read ?filter= from the URL so a shared or
  // bookmarked link opens directly to the right filtered view
  (function initializeFromUrl() {
    const params = new URLSearchParams(window.location.search);
    const requestedFilter = params.get('filter');
    const validFilters = Array.from(filterButtons).map(function (button) {
      return button.dataset.filter;
    });

    if (requestedFilter && validFilters.indexOf(requestedFilter) !== -1) {
      applyFilter(requestedFilter, false);
    }
  })();
})();


/* =================================================================
   8. CONTACT FORM
   Inline validation on submit (and re-validated the moment a field
   is fixed and blurred), then a clear success state — no dead
   silence after submission. Guarded on #contact-form, which only
   exists on contact.html.

   NOTE: the success state is currently simulated client-side only —
   see the dev comment above .form-success in contact.html. This
   needs to be wired to a real backend before launch.
   ================================================================= */
(function contactForm() {
  const form = document.getElementById('contact-form');
  if (!form) return;

  const successState = document.getElementById('form-success');
  const requiredFieldNames = ['name', 'email', 'projectType', 'message'];

  function validateField(fieldName) {
    const field = form.elements[fieldName];
    const group = form.querySelector('[data-field="' + fieldName + '"]');
    let isValid;

    if (field.type === 'email') {
      isValid = field.value.trim() !== '' && field.checkValidity();
    } else {
      isValid = field.value.trim() !== '';
    }

    group.classList.toggle('has-error', !isValid);
    return isValid;
  }

  // Re-validate a field the moment the visitor leaves it, so errors
  // clear immediately once fixed rather than waiting for resubmission
  requiredFieldNames.forEach(function (fieldName) {
    form.elements[fieldName].addEventListener('blur', function () {
      validateField(fieldName);
    });
  });

  form.addEventListener('submit', function (event) {
    event.preventDefault();

    let allFieldsValid = true;
    requiredFieldNames.forEach(function (fieldName) {
      if (!validateField(fieldName)) allFieldsValid = false;
    });

    if (!allFieldsValid) {
      // Move focus to the first invalid field so keyboard/screen
      // reader users land directly on what needs fixing
      const firstErroredField = form.querySelector(
        '.has-error .form__input, .has-error .form__select, .has-error .form__textarea'
      );
      if (firstErroredField) firstErroredField.focus();
      return;
    }

    // Simulated success — see dev note above and in contact.html
    form.classList.add('is-hidden');
    successState.classList.add('is-visible');
  });
})();
