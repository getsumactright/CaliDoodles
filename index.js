'use strict';

// ── Footer year ──────────────────────────────────────────────────────────────────
const copyrightYear = document.getElementById('copyrightYear');
if (copyrightYear) copyrightYear.textContent = new Date().getFullYear();

// ── Top bar height sync ─────────────────────────────────────────────────────────
// .site-nav and .hero-content read --top-bar-h to sit below the Instagram bar
// instead of underneath it; measured live since the bar's height can change
// (e.g. the handle text wrapping to a second line on narrow screens).
const topBar = document.getElementById('topBar');
function syncTopBarHeight() {
  document.documentElement.style.setProperty('--top-bar-h', `${topBar.offsetHeight}px`);
}
if (topBar) {
  syncTopBarHeight();
  window.addEventListener('resize', syncTopBarHeight);
}

// ── Hero text wrap ──────────────────────────────────────────────────────────────
// Parks the .hero-shape float on the puppy's face so the copy curves around it.
// The source photo is square but the hero box is not, so object-fit crops a
// different slice at every viewport width; percentage-based shape-outside values
// drift by 80px+ between an 850px and a 1440px window, which makes the wrap look
// accidental rather than deliberate. Measuring the rendered box keeps the circle
// locked to the face at any size. The float is display:none below 769px, where
// there is no room for text beside the dog, and this bails out there.
//
// Face sits at ~(52%, 45%) of the source frame; the head is ~24% of its width.
// Those three constants are the only things tied to this particular photo — swap
// the hero image and they need re-measuring.
const FACE_X = 0.52;
const FACE_Y = 0.45;
const FACE_R = 0.24;

function fitHeroShape() {
  const hero = document.querySelector('.hero');
  if (!hero) return;
  const img = hero.querySelector('.hero-img');
  const shape = hero.querySelector('.hero-shape');
  const content = hero.querySelector('.hero-content');
  if (!img || !shape || !content) return;
  if (getComputedStyle(shape).display === 'none') return;
  if (!img.naturalWidth) return;

  const box = img.getBoundingClientRect();
  const cs = getComputedStyle(content);
  const cb = content.getBoundingClientRect();
  const contentRight = cb.right - parseFloat(cs.paddingRight);
  const contentTop = cb.top + parseFloat(cs.paddingTop);

  // Replicate object-fit: cover to find where the frame really sits.
  const ar = img.naturalWidth / img.naturalHeight;
  let rw, rh;
  if (box.width / box.height > ar) {
    rw = box.width;
    rh = box.width / ar;
  } else {
    rh = box.height;
    rw = box.height * ar;
  }

  const op = getComputedStyle(img).objectPosition.split(' ');
  const offX = (rw - box.width) * parseFloat(op[0]) / 100;
  const offY = (rh - box.height) * parseFloat(op[1]) / 100;

  const fx = box.left + FACE_X * rw - offX;
  const fy = box.top + FACE_Y * rh - offY;
  const fr = FACE_R * rw;

  // The float hangs off the content box's right edge, so its width is whatever
  // it takes to reach the left of the circle. That puts the circle's centre at
  // exactly (fr, fr) inside the float.
  const w = contentRight - (fx - fr);
  if (w <= 0) return;

  shape.style.width = `${w}px`;
  shape.style.height = `${fr * 2}px`;
  shape.style.marginTop = `${Math.max(0, (fy - fr) - contentTop)}px`;
  shape.style.shapeOutside = `circle(${fr}px at ${fr}px ${fr}px)`;

  // The circle's lower arc reaches past the copy and squeezed the two buttons
  // onto separate rows. Nothing below the paragraph needs carving, so clip the
  // float there. This only ever shrinks it, so the copy above cannot reflow and
  // start an oscillation.
  const sub = hero.querySelector('.hero-sub');
  if (sub) {
    const spare = sub.getBoundingClientRect().bottom - shape.getBoundingClientRect().top;
    if (spare > 0 && spare < fr * 2) shape.style.height = `${spare}px`;
  }
}

const heroImg = document.querySelector('.hero-img');
if (heroImg) {
  fitHeroShape();
  heroImg.addEventListener('load', fitHeroShape);
  window.addEventListener('load', fitHeroShape);
  window.addEventListener('resize', fitHeroShape);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(fitHeroShape);
}

// ── Scroll-aware nav ──────────────────────────────────────────────────────────
const nav = document.getElementById('siteNav');
function updateNav() {
  nav.classList.toggle('scrolled', window.scrollY > 60);
}
window.addEventListener('scroll', updateNav, { passive: true });
updateNav();

// ── Mobile hamburger ──────────────────────────────────────────────────────────
const hamburger = document.getElementById('navHamburger');
const mobileMenu = document.getElementById('mobileMenu');

hamburger.addEventListener('click', () => {
  const open = hamburger.getAttribute('aria-expanded') === 'true';
  hamburger.setAttribute('aria-expanded', String(!open));
  hamburger.classList.toggle('open', !open);
  mobileMenu.classList.toggle('open', !open);
  mobileMenu.setAttribute('aria-hidden', String(open));
});

// Close mobile menu when a link is tapped
document.querySelectorAll('.mobile-link').forEach(link => {
  link.addEventListener('click', () => {
    hamburger.setAttribute('aria-expanded', 'false');
    hamburger.classList.remove('open');
    mobileMenu.classList.remove('open');
    mobileMenu.setAttribute('aria-hidden', 'true');
  });
});

// ── Scroll reveal ─────────────────────────────────────────────────────────────
const revealEls = document.querySelectorAll(
  '.trust-item, .about-inner, .section-intro, .puppy-card, ' +
  '.parent-card, .process-list li, .contact-intro, .contact-form'
);

revealEls.forEach(el => el.classList.add('reveal'));

const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry, i) => {
    if (entry.isIntersecting) {
      // Stagger children in lists
      const delay = entry.target.closest('ol') || entry.target.closest('.carousel-track')
        ? Array.from(entry.target.parentElement.children).indexOf(entry.target) * 80
        : 0;
      setTimeout(() => entry.target.classList.add('visible'), delay);
      revealObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.12 });

revealEls.forEach(el => revealObserver.observe(el));

// ── Carousel ──────────────────────────────────────────────────────────────────
(function initCarousel() {
  const track = document.getElementById('carouselTrack');
  const dotsContainer = document.getElementById('carouselDots');
  const prevBtn = document.getElementById('carouselPrev');
  const nextBtn = document.getElementById('carouselNext');

  if (!track) return;

  const cards = Array.from(track.querySelectorAll('.puppy-card'));
  let current = 0;
  let isDragging = false;
  let startX = 0;
  let scrollLeft = 0;

  function getVisible() {
    const w = window.innerWidth;
    if (w < 640) return 1;
    if (w < 1024) return 2;
    return 3;
  }

  function getCardWidth() {
    return cards[0].getBoundingClientRect().width + parseInt(getComputedStyle(track).gap);
  }

  function maxIndex() {
    return Math.max(0, cards.length - getVisible());
  }

  // Build dots
  function buildDots() {
    dotsContainer.innerHTML = '';
    const count = maxIndex() + 1;
    for (let i = 0; i < count; i++) {
      const dot = document.createElement('button');
      dot.className = 'carousel-dot' + (i === current ? ' active' : '');
      dot.setAttribute('role', 'tab');
      dot.setAttribute('aria-label', `Go to slide ${i + 1}`);
      dot.setAttribute('aria-selected', String(i === current));
      dot.addEventListener('click', () => goTo(i));
      dotsContainer.appendChild(dot);
    }
  }

  function updateDots() {
    dotsContainer.querySelectorAll('.carousel-dot').forEach((dot, i) => {
      dot.classList.toggle('active', i === current);
      dot.setAttribute('aria-selected', String(i === current));
    });
  }

  function goTo(index) {
    current = Math.max(0, Math.min(index, maxIndex()));
    track.style.transform = `translateX(-${current * getCardWidth()}px)`;
    updateDots();
    prevBtn.disabled = current === 0;
    nextBtn.disabled = current === maxIndex();
  }

  prevBtn.addEventListener('click', () => goTo(current - 1));
  nextBtn.addEventListener('click', () => goTo(current + 1));

  // Touch/drag support
  track.addEventListener('pointerdown', e => {
    isDragging = true;
    startX = e.clientX;
    scrollLeft = current * getCardWidth();
    track.style.transition = 'none';
  });

  window.addEventListener('pointerup', e => {
    if (!isDragging) return;
    isDragging = false;
    track.style.transition = '';
    const diff = startX - e.clientX;
    if (Math.abs(diff) > 50) {
      goTo(diff > 0 ? current + 1 : current - 1);
    } else {
      goTo(current); // snap back
    }
  });

  window.addEventListener('pointermove', e => {
    if (!isDragging) return;
    const x = scrollLeft + (e.clientX - startX) * -1;
    track.style.transform = `translateX(-${Math.max(0, x)}px)`;
  });

  // Keyboard
  track.setAttribute('tabindex', '0');
  track.addEventListener('keydown', e => {
    if (e.key === 'ArrowLeft') goTo(current - 1);
    if (e.key === 'ArrowRight') goTo(current + 1);
  });

  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      buildDots();
      goTo(Math.min(current, maxIndex()));
    }, 150);
  });

  buildDots();
  goTo(0);
})();

// ── Contact form ──────────────────────────────────────────────────────────────
const form = document.getElementById('contactForm');
if (form) {
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('submitBtn');
    btn.disabled = true;
    btn.querySelector('.btn-label').textContent = 'Sending…';

    // Simulate async submission (replace with real endpoint)
    await new Promise(r => setTimeout(r, 1400));

    form.innerHTML = `
      <div style="text-align:center;padding:3rem 1rem;">
        <div style="font-size:2.5rem;margin-bottom:1rem;">🐾</div>
        <h3 style="font-family:var(--font-display);font-size:var(--step-2);margin-bottom:0.75rem;">Message received!</h3>
        <p style="color:var(--col-ink-mid);">We'll be in touch within 24 hours. In the meantime, follow us on Instagram for the latest puppy updates.</p>
      </div>
    `;
  });
}
