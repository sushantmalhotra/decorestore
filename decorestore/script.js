function rnd(a, b) { return a + Math.random() * (b - a); }

const VW = () => window.innerWidth;
// Height of the hero box itself (not the window) — the hero is 100vh on
// desktop but a fixed 700px on mobile, so item positions (all computed as
// fractions/scales of VH) stay correctly proportioned to it either way.
const VH = () => document.querySelector('.hero').offsetHeight;
const isMobile = () => VW() <= 760;

// Small wobble radius (px) each mobile item drifts around its anchor point.
const ANCHOR_DRIFT = 14;

// Reference viewport the exact clock/vase pixel positions below were
// captured at — scaled proportionally for other mobile widths/heights.
const BASE_VW = 393;
const BASE_VH = 852;

// Each item drifts within a box hugging one side of the centered brand
// text (name + tagline), so it stays close around it at any screen size.
// On mobile, `anchorPx`/`anchor` pin the item to a fixed spot instead
// (see the marked design reference), overriding `region`.
const itemData = {
  clock: {
    start:  () => isMobile() ? { x: VW() * 0.50, y: VH() * 0.32 } : { x: VW() * 0.65, y: VH() * 0.04 },
    // Exact captured position (top-left translate), scaled to viewport.
    anchorPx: () => ({ x: VW() / BASE_VW * 250.0773, y: VH() / BASE_VH * 207.309 }),
    region: () =>
      ({ x0: VW() * 0.52, x1: VW() * 0.88, y0: VH() * 0.02, y1: VH() * 0.35 }),
    base: 14, variance: 6, rotSpeed: 18,
  },
  vase: {
    start:  () => isMobile() ? { x: VW() * 0.02 - 10, y: VH() * 0.06 } : { x: VW() * 0.02, y: VH() * 0.02 },
    // Exact captured position (top-left translate), scaled to viewport.
    anchorPx: () => ({ x: VW() / BASE_VW * -52.4337, y: VH() / BASE_VH * 297.3704 }),
    region: () =>
      ({ x0: VW() * 0.00, x1: VW() * 0.45, y0: VH() * 0.00, y1: VH() * 0.70 }),
    base: 6,  variance: 2, rotSpeed: 7,
  },
  lamp: {
    start:  () => isMobile() ? { x: VW() * 0.28, y: VH() * 0.52 } : { x: VW() * 0.30, y: VH() * 0.60 },
    // Exact captured position (top-left translate), scaled to viewport.
    anchorPx: () => ({ x: VW() / BASE_VW * 69.4647, y: VH() / BASE_VH * 495.3862 }),
    region: () =>
      ({ x0: VW() * 0.05, x1: VW() * 0.62, y0: VH() * 0.55, y1: VH() * 0.95 }),
    base: 20, variance: 7, rotSpeed: 7,
  },
};

// Items gently rock back and forth within this angle instead of spinning
// without limit — keeps their on-screen bounding box predictable so the
// viewport clamp below can be accurate instead of assuming a worst-case
// 45° diagonal.
const ROT_CAP = 12;

// Clamp the target so the ENTIRE element body stays within the region box
// AND within the viewport itself, accounting for the rotated bounding box
// (an item rotated by ROT_CAP is wider/taller on-screen than its own
// unrotated w/h) by clamping the item's CENTER using that rotated extent.
function regionPos(el) {
  const data = itemData[el.id];
  const w  = el.offsetWidth;
  const h  = el.offsetHeight;
  const margin = 10;
  const rad = ROT_CAP * Math.PI / 180;
  const bboxW = w * Math.cos(rad) + h * Math.sin(rad);
  const bboxH = w * Math.sin(rad) + h * Math.cos(rad);
  const radiusX = bboxW / 2;
  const radiusY = bboxH / 2;

  // Hard viewport bounds for the item's center (rotation-safe).
  let vMinX = radiusX + margin, vMaxX = VW() - radiusX - margin;
  let vMinY = radiusY + margin, vMaxY = VH() - radiusY - margin;
  if (vMinX > vMaxX) { vMinX = vMaxX = VW() / 2; }
  if (vMinY > vMaxY) { vMinY = vMaxY = VH() / 2; }

  // Mobile: pin the item's center to its anchor point (the marked circle),
  // with only a small wobble, clamped to the rotation-safe viewport bounds.
  // `anchorPx` gives an exact captured top-left position (convert to center
  // by adding half the item's own size); `anchor` gives a center directly.
  if (isMobile() && (data.anchorPx || data.anchor)) {
    const a = data.anchorPx
      ? (() => { const p = data.anchorPx(); return { x: p.x + w / 2, y: p.y + h / 2 }; })()
      : data.anchor();
    const ax = Math.min(Math.max(a.x, vMinX), vMaxX);
    const ay = Math.min(Math.max(a.y, vMinY), vMaxY);
    const cx = rnd(
      Math.max(vMinX, ax - ANCHOR_DRIFT),
      Math.min(vMaxX, ax + ANCHOR_DRIFT)
    );
    const cy = rnd(
      Math.max(vMinY, ay - ANCHOR_DRIFT),
      Math.min(vMaxY, ay + ANCHOR_DRIFT)
    );
    return { x: cx - w / 2, y: cy - h / 2 };
  }

  const r = data.region();

  // Soft preferred region, expressed in center coordinates.
  const rMinX = r.x0 + w / 2, rMaxX = r.x1 - w / 2;
  const rMinY = r.y0 + h / 2, rMaxY = r.y1 - h / 2;

  const minX = Math.max(vMinX, Math.min(rMinX, vMaxX));
  const maxX = Math.min(vMaxX, Math.max(rMinX, rMaxX));
  const minY = Math.max(vMinY, Math.min(rMinY, vMaxY));
  const maxY = Math.min(vMaxY, Math.max(rMinY, rMaxY));

  const cx = rnd(Math.min(minX, maxX), Math.max(minX, maxX));
  const cy = rnd(Math.min(minY, maxY), Math.max(minY, maxY));

  return {
    x: cx - w / 2,
    y: cy - h / 2,
  };
}

const tweens = {};

function spinLoop(el) {
  const target = rnd(-ROT_CAP, ROT_CAP);
  gsap.to(el, {
    rotation: target,
    duration: rnd(10, 20),
    ease: 'sine.inOut',
    onComplete: () => spinLoop(el),
  });
}

function drift(el) {
  const { base, variance } = itemData[el.id] || { base: 22, variance: 7 };
  const target = regionPos(el);
  tweens[el.id] = gsap.to(el, {
    x: target.x,
    y: target.y,
    duration: rnd(base, base + variance),
    ease: 'sine.inOut',
    onComplete: () => drift(el),
  });
}

window.addEventListener('DOMContentLoaded', () => {
  // Always start at the top on refresh
  history.scrollRestoration = 'manual';
  window.scrollTo(0, 0);

  gsap.registerPlugin(ScrollTrigger);

  // ── About section animations ──────────────────────────────
  const aboutImg     = document.querySelector('.about-hero-img');
  const aboutContent = document.querySelector('.about-content');
  const aboutEyebrow = document.querySelector('.about-eyebrow');
  const aboutHeadline = document.querySelector('.about-headline');
  const aboutBody    = document.querySelector('.about-body-text');

  // Image: starts clipped from the left, reveals as you scroll in
  gsap.set(aboutImg, { clipPath: 'inset(0 100% 0 0)', x: -60, opacity: 0 });
  gsap.to(aboutImg, {
    clipPath: 'inset(0 0% 0 0)',
    x: 0,
    opacity: 1,
    duration: 1.4,
    ease: 'expo.out',
    scrollTrigger: {
      trigger: '#about',
      start: 'top 80%',
      toggleActions: 'play none none none',
    },
  });

  // Subtle parallax on the image while scrolling through the section
  gsap.to(aboutImg.querySelector('img'), {
    y: 60,
    ease: 'none',
    scrollTrigger: {
      trigger: '#about',
      start: 'top bottom',
      end: 'bottom top',
      scrub: true,
    },
  });

  // Text: staggered fade + slide up from the right
  gsap.set([aboutEyebrow, aboutHeadline, aboutBody], { opacity: 0, y: 36 });
  gsap.to([aboutEyebrow, aboutHeadline, aboutBody], {
    opacity: 1,
    y: 0,
    duration: 1.0,
    ease: 'power3.out',
    stagger: 0.18,
    scrollTrigger: {
      trigger: '#about',
      start: 'top 70%',
      toggleActions: 'play none none none',
    },
  });

  // ── Hero entrance ──────────────────────────────────────────
  gsap.set('.hero-cta', { opacity: 0, y: 16 });
  gsap.to('.hero-cta', {
    opacity: 1,
    y: 0,
    duration: 1,
    delay: 0.6,
    ease: 'power3.out',
  });

  // ── Generic scroll-reveal helper ──────────────────────────
  // Fades + slides a group of elements up together as they enter view.
  function revealGroup(selector, opts = {}) {
    const els = gsap.utils.toArray(selector);
    if (!els.length) return;
    gsap.set(els, { opacity: 0, y: opts.y ?? 40 });
    gsap.to(els, {
      opacity: 1,
      y: 0,
      duration: opts.duration ?? 1,
      ease: opts.ease ?? 'power3.out',
      stagger: opts.stagger ?? 0,
      scrollTrigger: {
        trigger: opts.trigger ?? els[0],
        start: opts.start ?? 'top 85%',
        toggleActions: 'play none none none',
      },
    });
  }

  // Collection
  revealGroup('.collection-header > *', { stagger: 0.12 });
  revealGroup('.category-card', {
    trigger: '.collection-grid',
    stagger: 0.15,
    y: 50,
  });

  // Shop
  revealGroup('.shop-header > *', { stagger: 0.12 });
  revealGroup('.shop-card', {
    trigger: '.shop-grid',
    stagger: 0.1,
    y: 50,
  });

  // Testimonials
  revealGroup('.testimonials-header > *', { stagger: 0.12 });
  revealGroup('.testimonial-card', {
    trigger: '.testimonials-grid',
    stagger: 0.15,
    y: 50,
  });

  // Contact
  revealGroup('.contact-top > *, .logo--dark, .contact-block, .contact-footer', {
    trigger: '.contact-section',
    start: 'top 80%',
    stagger: 0.08,
    y: 24,
  });

  // ── Hero floating items ───────────────────────────────────
  document.querySelectorAll('.item').forEach((el) => {
    const data  = itemData[el.id];
    const w = el.offsetWidth, h = el.offsetHeight;

    // An exact captured position (anchorPx) is used verbatim, matching the
    // reference exactly. The item stays put — only rotating in place — and
    // if dragged, eases back to this same spot instead of drifting off.
    if (isMobile() && data && data.anchorPx) {
      const p = data.anchorPx();
      gsap.set(el, { x: p.x, y: p.y, rotation: rnd(-ROT_CAP, ROT_CAP) });
      spinLoop(el);
      Draggable.create(el, {
        type: 'x,y',
        zIndexBoost: false,
        onDragStart() {
          gsap.killTweensOf(el, 'rotation');
        },
        onDragEnd() {
          const home = data.anchorPx();
          gsap.to(el, {
            x: home.x,
            y: home.y,
            duration: 1,
            ease: 'power3.out',
            onComplete: () => spinLoop(el),
          });
        },
      });
      return;
    }

    const start = !data ? { x: 0, y: 0 }
      : (isMobile() && data.anchor)
        ? { x: data.anchor().x - w / 2, y: data.anchor().y - h / 2 }
        : data.start();
    // Pad the clamp by the rotated bounding box growth (see ROT_CAP) so the
    // very first frame can't overflow the viewport either.
    const rad = ROT_CAP * Math.PI / 180;
    const padX = (w * Math.cos(rad) + h * Math.sin(rad) - w) / 2;
    const padY = (w * Math.sin(rad) + h * Math.cos(rad) - h) / 2;
    const startX = Math.min(Math.max(start.x, 10 + padX), Math.max(10 + padX, VW() - 10 - padX - w));
    const startY = Math.min(Math.max(start.y, 10 + padY), Math.max(10 + padY, VH() - 10 - padY - h));
    gsap.set(el, { x: startX, y: startY, rotation: rnd(-ROT_CAP, ROT_CAP) });

    drift(el);
    spinLoop(el);

    Draggable.create(el, {
      type: 'x,y',
      zIndexBoost: false,
      onDragStart() {
        if (tweens[el.id]) tweens[el.id].kill();
        gsap.killTweensOf(el, 'rotation');
      },
      onDragEnd() {
        drift(el);
        spinLoop(el);
      },
    });
  });

  // ── Cart ───────────────────────────────────────────────────
  const cart = [];
  const cartBtns    = document.querySelectorAll('.cart-btn');
  const cartCounts  = document.querySelectorAll('.cart-count');
  const cartOverlay = document.getElementById('cartOverlay');
  const cartDrawer  = document.getElementById('cartDrawer');
  const cartClose   = document.getElementById('cartClose');
  const cartItemsEl = document.getElementById('cartItems');
  const cartTotalEl = document.getElementById('cartTotal');
  const cartCheckout = document.getElementById('cartCheckout');

  const money = (n) => `₹${n.toLocaleString('en-IN')}`;

  function openCart() {
    cartOverlay.classList.add('is-open');
    cartDrawer.classList.add('is-open');
    cartDrawer.setAttribute('aria-hidden', 'false');
  }

  function closeCart() {
    cartOverlay.classList.remove('is-open');
    cartDrawer.classList.remove('is-open');
    cartDrawer.setAttribute('aria-hidden', 'true');
  }

  function renderCart() {
    cartCounts.forEach((el) => {
      el.textContent = cart.length;
      el.classList.toggle('has-items', cart.length > 0);
    });

    if (!cart.length) {
      cartItemsEl.innerHTML = `<p class="cart-empty">Your cart is empty. Every piece here is one of a kind — once it's gone, it's gone.</p>`;
      cartTotalEl.textContent = money(0);
      cartCheckout.href = 'https://wa.me/9372909869';
      return;
    }

    cartItemsEl.innerHTML = cart.map((item, i) => `
      <div class="cart-item">
        <img class="cart-item-img" src="${item.img}" alt="${item.name}">
        <div class="cart-item-info">
          <span class="cart-item-name">${item.name}</span>
          <span class="cart-item-price">${money(item.price)}</span>
        </div>
        <button class="cart-item-remove" data-index="${i}" aria-label="Remove item">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>
    `).join('');

    const total = cart.reduce((sum, item) => sum + item.price, 0);
    cartTotalEl.textContent = money(total);

    const lines = cart.map((item) => `• ${item.name} — ${money(item.price)}`).join('\n');
    const message = `Hi Relique, I'd like to buy:\n${lines}\n\nTotal: ${money(total)}`;
    cartCheckout.href = `https://wa.me/9372909869?text=${encodeURIComponent(message)}`;

    cartItemsEl.querySelectorAll('.cart-item-remove').forEach((btn) => {
      btn.addEventListener('click', () => {
        cart.splice(Number(btn.dataset.index), 1);
        renderCart();
      });
    });
  }

  document.querySelectorAll('.shop-card').forEach((card) => {
    const cta = card.querySelector('.shop-cta');
    if (!cta) return;
    const label = cta.querySelector('.shop-cta-label');
    cta.addEventListener('click', (e) => {
      e.stopPropagation();
      cart.push({
        name: card.dataset.name,
        price: Number(card.dataset.price),
        img: card.querySelector('.shop-img').src,
      });
      renderCart();

      cta.classList.add('is-added');
      const prevLabel = label.textContent;
      label.textContent = 'Added';
      setTimeout(() => {
        cta.classList.remove('is-added');
        label.textContent = prevLabel;
      }, 1200);

      gsap.fromTo(cartBtns, { scale: 1 }, { scale: 1.15, duration: 0.15, yoyo: true, repeat: 1, ease: 'power1.inOut' });
    });
  });

  cartBtns.forEach((btn) => btn.addEventListener('click', openCart));
  cartClose?.addEventListener('click', closeCart);
  cartOverlay?.addEventListener('click', closeCart);

  renderCart();

  // ── Mobile menu ──────────────────────────────────────────────
  const menuToggle   = document.getElementById('menuToggle');
  const mobileMenu   = document.getElementById('mobileMenu');
  const mobileOverlay = document.getElementById('mobileMenuOverlay');
  const mobileMenuClose = document.getElementById('mobileMenuClose');

  function closeMenu() {
    menuToggle.classList.remove('is-open');
    menuToggle.setAttribute('aria-expanded', 'false');
    mobileMenu.classList.remove('is-open');
    mobileOverlay.classList.remove('is-open');
  }

  menuToggle?.addEventListener('click', () => {
    const isOpen = mobileMenu.classList.toggle('is-open');
    mobileOverlay.classList.toggle('is-open', isOpen);
    menuToggle.classList.toggle('is-open', isOpen);
    menuToggle.setAttribute('aria-expanded', String(isOpen));
  });

  mobileOverlay?.addEventListener('click', closeMenu);
  mobileMenuClose?.addEventListener('click', closeMenu);
  mobileMenu?.querySelectorAll('a').forEach((a) => a.addEventListener('click', closeMenu));
});
