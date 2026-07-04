function rnd(a, b) { return a + Math.random() * (b - a); }

const VW = () => window.innerWidth;
const VH = () => window.innerHeight;

const itemData = {
  clock: {
    start:  () => ({ x: VW() * 0.65, y: VH() * 0.04 }),
    region: () => ({ x0: VW() * 0.52, x1: VW() * 0.88, y0: VH() * 0.02, y1: VH() * 0.35 }),
    base: 14, variance: 6, rotSpeed: 18,
  },
  vase: {
    start:  () => ({ x: VW() * 0.02, y: VH() * 0.02 }),
    region: () => ({ x0: VW() * 0.00, x1: VW() * 0.45, y0: VH() * 0.00, y1: VH() * 0.70 }),
    base: 6,  variance: 2, rotSpeed: 7,
  },
  lamp: {
    start:  () => ({ x: VW() * 0.30, y: VH() * 0.60 }),
    region: () => ({ x0: VW() * 0.05, x1: VW() * 0.62, y0: VH() * 0.55, y1: VH() * 0.95 }),
    base: 20, variance: 7, rotSpeed: 7,
  },
};

// Clamp the target so the ENTIRE element body stays within the region box
function regionPos(el) {
  const r  = itemData[el.id].region();
  const w  = el.offsetWidth;
  const h  = el.offsetHeight;

  const minX = r.x0;
  const maxX = Math.max(r.x0, r.x1 - w);
  const minY = r.y0;
  const maxY = Math.max(r.y0, r.y1 - h);

  return {
    x: rnd(minX, maxX),
    y: rnd(minY, maxY),
  };
}

const tweens = {};

function spinLoop(el) {
  const { rotSpeed } = itemData[el.id] || { rotSpeed: 5 };
  const deg = (Math.random() < 0.5 ? 1 : -1) * rnd(rotSpeed * 0.5, rotSpeed * 1.8);
  gsap.to(el, {
    rotation: `+=${deg}`,
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

  // ── Hero floating items ───────────────────────────────────
  document.querySelectorAll('.item').forEach((el) => {
    const data  = itemData[el.id];
    const start = data ? data.start(el) : { x: 0, y: 0 };
    gsap.set(el, { x: start.x, y: start.y, rotation: rnd(-10, 10) });

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
});
