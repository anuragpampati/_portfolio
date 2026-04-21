import './style.css';
import Typed from 'typed.js';

/* ── Types ─────────────────────────────────────────────────────────────────── */

interface MousePosition {
  x: number | null;
  y: number | null;
}

interface TerminalLine {
  readonly text: string;
  readonly cls: 'cmd' | 'ok' | 'info' | 'done';
}

interface StatConfig {
  el: HTMLElement;
  target: number;
  duration: number;
}

/* ── Particle System ────────────────────────────────────────────────────────── */

class Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  readonly radius: number;
  readonly isCyan: boolean;

  constructor(private canvasWidth: number, private canvasHeight: number) {
    const speed = 0.15 + Math.random() * 0.35;
    const angle = Math.random() * Math.PI * 2;
    this.x      = Math.random() * canvasWidth;
    this.y      = Math.random() * canvasHeight;
    this.vx     = Math.cos(angle) * speed;
    this.vy     = Math.sin(angle) * speed;
    this.radius = 1.2 + Math.random() * 1.4;
    this.isCyan = Math.random() > 0.45;
  }

  update(mouse: MousePosition): void {
    this.x += this.vx;
    this.y += this.vy;

    if (this.x < 0 || this.x > this.canvasWidth)  this.vx *= -1;
    if (this.y < 0 || this.y > this.canvasHeight)  this.vy *= -1;

    if (mouse.x !== null && mouse.y !== null) {
      const dx   = this.x - mouse.x;
      const dy   = this.y - mouse.y;
      const dist = Math.hypot(dx, dy);
      if (dist < 130 && dist > 0) {
        const force = (130 - dist) / 130;
        this.x += (dx / dist) * force * 2.5;
        this.y += (dy / dist) * force * 2.5;
      }
    }
  }

  draw(ctx: CanvasRenderingContext2D): void {
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fillStyle = this.isCyan
      ? 'rgba(34,211,238,0.75)'
      : 'rgba(167,139,250,0.75)';
    ctx.fill();
  }

  resize(width: number, height: number): void {
    this.canvasWidth  = width;
    this.canvasHeight = height;
  }
}

class ParticleSystem {
  private readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;
  private particles: Particle[] = [];
  private mouse: MousePosition = { x: null, y: null };
  private readonly CONNECTION_DISTANCE = 115;

  constructor(canvasId: string) {
    const canvas = document.getElementById(canvasId);
    if (!(canvas instanceof HTMLCanvasElement)) {
      throw new Error(`Canvas element #${canvasId} not found`);
    }
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not get 2D context');

    this.canvas = canvas;
    this.ctx    = ctx;

    this.resize();
    this.buildParticles();
    this.bindEvents();
    this.tick();
  }

  private resize(): void {
    this.canvas.width  = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  private buildParticles(): void {
    const count = Math.min(90, Math.floor(
      (this.canvas.width * this.canvas.height) / 12_000
    ));
    this.particles = Array.from({ length: count }, () =>
      new Particle(this.canvas.width, this.canvas.height)
    );
  }

  private bindEvents(): void {
    window.addEventListener('resize', () => {
      this.resize();
      this.particles.forEach(p => p.resize(this.canvas.width, this.canvas.height));
    });
    document.addEventListener('mousemove', (e) => {
      this.mouse = { x: e.clientX, y: e.clientY };
    });
    document.addEventListener('mouseleave', () => {
      this.mouse = { x: null, y: null };
    });
  }

  private drawConnections(): void {
    const { particles, ctx, CONNECTION_DISTANCE: maxDist } = this;
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const a = particles[i]!;
        const b = particles[j]!;
        const dist = Math.hypot(a.x - b.x, a.y - b.y);
        if (dist < maxDist) {
          const alpha = (1 - dist / maxDist) * 0.22;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.strokeStyle = `rgba(34,211,238,${alpha})`;
          ctx.lineWidth   = 0.7;
          ctx.stroke();
        }
      }
    }
  }

  private tick(): void {
    const { ctx, canvas } = this;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    this.particles.forEach(p => { p.update(this.mouse); p.draw(ctx); });
    this.drawConnections();
    requestAnimationFrame(() => this.tick());
  }
}

/* ── Terminal Animation ─────────────────────────────────────────────────────── */

class TerminalAnimation {
  private timers: ReturnType<typeof setTimeout>[] = [];
  private running = false;
  private readonly bodyEl: HTMLElement;

  private static readonly LINES: readonly TerminalLine[] = [
    { text: '> alarm: WorkSpaces-EC2-CPUHigh',            cls: 'cmd'  },
    { text: '  ↳ pulling ticket metadata ...    ✓',       cls: 'ok'   },
    { text: '  ↳ setting up read-only creds ... ✓',       cls: 'ok'   },
    { text: '  ↳ checking CloudWatch alarms ... ✓',       cls: 'ok'   },
    { text: '  ↳ correlating EMF metrics ...    ✓',       cls: 'ok'   },
    { text: '  ↳ tracing logs by request ID ... ✓',       cls: 'ok'   },
    { text: '✓ summary posted  [10 min, was 45]',          cls: 'done' },
  ] as const;

  private static readonly LINE_DELAY_MS = 320;
  private static readonly IDLE_AFTER_MS =
    TerminalAnimation.LINES.length * TerminalAnimation.LINE_DELAY_MS + 1800;

  constructor(bodyElId: string, cardId: string) {
    const body = document.getElementById(bodyElId);
    const card = document.getElementById(cardId);
    if (!body || !card) throw new Error('Terminal elements not found');

    this.bodyEl = body;
    this.reset();

    card.addEventListener('mouseenter', () => this.run());
    card.addEventListener('mouseleave', () => this.reset());
  }

  private run(): void {
    if (this.running) return;
    this.running  = true;
    this.bodyEl.innerHTML = '';

    TerminalAnimation.LINES.forEach((line, i) => {
      const t = setTimeout(() => {
        const span = document.createElement('span');
        span.className   = `terminal-line ${line.cls}`;
        span.textContent = line.text;
        this.bodyEl.appendChild(span);
      }, i * TerminalAnimation.LINE_DELAY_MS);
      this.timers.push(t);
    });

    const loop = setTimeout(
      () => { this.running = false; },
      TerminalAnimation.IDLE_AFTER_MS
    );
    this.timers.push(loop);
  }

  private reset(): void {
    this.timers.forEach(clearTimeout);
    this.timers  = [];
    this.running = false;
    this.bodyEl.innerHTML =
      '<span class="terminal-line info">Hover to run a live demo...</span>';
  }
}

/* ── Scroll Animations ──────────────────────────────────────────────────────── */

function initScrollAnimations(): void {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) entry.target.classList.add('visible');
      });
    },
    { threshold: 0.1 }
  );
  document.querySelectorAll<HTMLElement>('.fade-up').forEach(el => observer.observe(el));
}

/* ── Stat Counters ──────────────────────────────────────────────────────────── */

function animateCounter(config: StatConfig): void {
  const { el, target, duration } = config;
  const step = 16;
  const steps = duration / step;
  const inc   = target / steps;
  let val     = 0;

  const timer = setInterval(() => {
    val += inc;
    if (val >= target) {
      val = target;
      clearInterval(timer);
    }
    el.textContent = String(Math.floor(val));
  }, step);
}

function initStatCounters(): void {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        const el     = entry.target as HTMLElement;
        const target = parseInt(el.dataset['count'] ?? '', 10);
        if (isNaN(target)) return;
        animateCounter({ el, target, duration: 1200 });
        observer.unobserve(el);
      });
    },
    { threshold: 0.6 }
  );
  document.querySelectorAll<HTMLElement>('[data-count]').forEach(el => observer.observe(el));
}

/* ── Nav: Scroll Spy ────────────────────────────────────────────────────────── */

function initScrollSpy(): void {
  const sections = document.querySelectorAll<HTMLElement>('section[id]');
  const navLinks = document.querySelectorAll<HTMLAnchorElement>('.nav-links a');

  window.addEventListener('scroll', () => {
    let active = '';
    sections.forEach(sec => {
      if (window.scrollY >= sec.offsetTop - 90) active = sec.id;
    });
    navLinks.forEach(link => {
      link.classList.toggle('active', link.getAttribute('href') === `#${active}`);
    });
  }, { passive: true });
}

/* ── Mobile Menu ────────────────────────────────────────────────────────────── */

function initMobileMenu(): void {
  const hamburger = document.getElementById('hamburger');
  const navMobile = document.getElementById('nav-mobile');
  if (!hamburger || !navMobile) return;

  hamburger.addEventListener('click', () => {
    const open = navMobile.classList.toggle('open');
    hamburger.classList.toggle('open', open);
    hamburger.setAttribute('aria-expanded', String(open));
  });

  navMobile.querySelectorAll('a').forEach(a => {
    a.addEventListener('click', () => {
      navMobile.classList.remove('open');
      hamburger.classList.remove('open');
      hamburger.setAttribute('aria-expanded', 'false');
    });
  });
}

/* ── Email Copy ─────────────────────────────────────────────────────────────── */

function initEmailCopy(): void {
  const btn = document.getElementById('copy-email');
  if (!(btn instanceof HTMLButtonElement)) return;

  const email = btn.dataset['email'] ?? '';
  const label = btn.querySelector<HTMLElement>('.email-copy');
  if (!label) return;

  btn.addEventListener('click', () => {
    navigator.clipboard.writeText(email).then(() => {
      label.textContent        = 'Copied!';
      label.style.background   = 'rgba(74,222,128,0.15)';
      label.style.color        = '#4ade80';
      label.style.borderColor  = 'rgba(74,222,128,0.3)';

      setTimeout(() => {
        label.textContent       = 'Copy';
        label.style.background  = '';
        label.style.color       = '';
        label.style.borderColor = '';
      }, 2200);
    }).catch(() => {
      window.location.href = `mailto:${email}`;
    });
  });
}

/* ── Smooth Scroll ──────────────────────────────────────────────────────────── */

function initSmoothScroll(): void {
  const NAV_OFFSET = 72;
  document.querySelectorAll<HTMLAnchorElement>('a[href^="#"]').forEach(a => {
    a.addEventListener('click', (e) => {
      const href   = a.getAttribute('href');
      if (!href) return;
      const target = document.querySelector<HTMLElement>(href);
      if (!target) return;
      e.preventDefault();
      window.scrollTo({ top: target.offsetTop - NAV_OFFSET, behavior: 'smooth' });
    });
  });
}

/* ── Typed.js ───────────────────────────────────────────────────────────────── */

function initTyped(): void {
  new Typed('#typed-text', {
    strings: [
      'Software Development Engineer @ AWS',
      'Production&nbsp;LLM&nbsp;Agent Builder',
      'AWS Cloud Infrastructure Engineer',
      'Applied AI Engineer',
    ],
    typeSpeed:   52,
    backSpeed:   28,
    backDelay:   2200,
    loop:        true,
    cursorChar:  '|',
    smartBackspace: false,
  });
}

/* ── Bootstrap ──────────────────────────────────────────────────────────────── */

function init(): void {
  new ParticleSystem('particle-canvas');
  new TerminalAnimation('ws-terminal-body', 'proj-ws');
  initTyped();
  initScrollAnimations();
  initStatCounters();
  initScrollSpy();
  initMobileMenu();
  initEmailCopy();
  initSmoothScroll();
}

document.readyState === 'loading'
  ? document.addEventListener('DOMContentLoaded', init)
  : init();
