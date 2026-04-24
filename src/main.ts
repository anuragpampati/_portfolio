import './style.css';
import Typed from 'typed.js';

/* ── Types ─────────────────────────────────────────────────────────────────── */

interface StatConfig {
  el: HTMLElement;
  target: number;
  duration: number;
}

interface TerminalLine {
  readonly text: string;
  readonly cls: 'cmd' | 'ok' | 'info' | 'done';
}

/* ── Custom Cursor ──────────────────────────────────────────────────────────── */

class CustomCursor {
  private dot!: HTMLElement;
  private ring!: HTMLElement;
  private mx = 0;
  private my = 0;
  private rx = 0;
  private ry = 0;
  private rafId = 0;

  constructor() {
    const dot  = document.getElementById('cursor-dot');
    const ring = document.getElementById('cursor-ring');
    if (!dot || !ring) return;
    this.dot  = dot;
    this.ring = ring;
    this.bindEvents();
    this.loop();
  }

  private bindEvents(): void {
    document.addEventListener('mousemove', (e) => {
      this.mx = e.clientX;
      this.my = e.clientY;
      this.dot.style.left = `${e.clientX}px`;
      this.dot.style.top  = `${e.clientY}px`;
    });
  }

  private loop(): void {
    const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
    this.rx = lerp(this.rx, this.mx, 0.12);
    this.ry = lerp(this.ry, this.my, 0.12);
    this.ring.style.left = `${this.rx}px`;
    this.ring.style.top  = `${this.ry}px`;
    this.rafId = requestAnimationFrame(() => this.loop());
  }

  destroy(): void { cancelAnimationFrame(this.rafId); }
}

/* ── Scroll Progress ────────────────────────────────────────────────────────── */

class ScrollProgress {
  private bar!: HTMLElement;

  constructor() {
    const bar = document.getElementById('scroll-progress');
    if (!bar) return;
    this.bar = bar;
    window.addEventListener('scroll', () => this.update(), { passive: true });
  }

  private update(): void {
    const scrolled = window.scrollY;
    const total    = document.documentElement.scrollHeight - window.innerHeight;
    const pct      = total > 0 ? (scrolled / total) * 100 : 0;
    this.bar.style.width = `${pct}%`;
  }
}

/* ── Card Tilt ──────────────────────────────────────────────────────────────── */

class CardTilt {
  constructor() {
    document.querySelectorAll<HTMLElement>('[data-tilt]').forEach(card => {
      const shine = card.querySelector<HTMLElement>('.tilt-shine');

      card.addEventListener('mousemove', (e) => {
        const rect   = card.getBoundingClientRect();
        const cx     = rect.left + rect.width  / 2;
        const cy     = rect.top  + rect.height / 2;
        const dx     = (e.clientX - cx) / (rect.width  / 2);
        const dy     = (e.clientY - cy) / (rect.height / 2);
        const tiltX  = dy * -8;
        const tiltY  = dx *  8;

        card.style.transform = `perspective(900px) rotateX(${tiltX}deg) rotateY(${tiltY}deg) scale(1.02)`;
        card.style.transition = 'transform 0.1s ease-out';

        if (shine) {
          const shineX = ((e.clientX - rect.left) / rect.width)  * 100;
          const shineY = ((e.clientY - rect.top)  / rect.height) * 100;
          shine.style.background = `radial-gradient(circle at ${shineX}% ${shineY}%, rgba(249,115,22,0.18), transparent 65%)`;
          shine.style.opacity = '1';
        }
      });

      card.addEventListener('mouseleave', () => {
        card.style.transform  = '';
        card.style.transition = 'transform 0.5s var(--ease)';
        if (shine) shine.style.opacity = '0';
      });
    });
  }
}

/* ── Magnetic Buttons ───────────────────────────────────────────────────────── */

class MagneticButton {
  constructor() {
    document.querySelectorAll<HTMLElement>('[data-magnetic]').forEach(btn => {
      btn.addEventListener('mousemove', (e) => {
        const rect = btn.getBoundingClientRect();
        const cx   = rect.left + rect.width  / 2;
        const cy   = rect.top  + rect.height / 2;
        const dx   = (e.clientX - cx) * 0.28;
        const dy   = (e.clientY - cy) * 0.28;
        btn.style.transform  = `translate(${dx}px, ${dy}px)`;
        btn.style.transition = 'transform 0.15s ease-out';
      });

      btn.addEventListener('mouseleave', () => {
        btn.style.transform  = '';
        btn.style.transition = 'transform 0.5s var(--ease)';
      });
    });
  }
}

/* ── Hero Terminal (auto-looping) ───────────────────────────────────────────── */

class HeroTerminal {
  private timers: ReturnType<typeof setTimeout>[] = [];
  private running = false;

  private static readonly LINES: readonly TerminalLine[] = [
    { text: '> alarm: WorkSpaces-EC2-CPUHigh',       cls: 'cmd'  },
    { text: '  ↳ pulling ticket metadata ...  ✓',    cls: 'ok'   },
    { text: '  ↳ setting up read-only creds .. ✓',   cls: 'ok'   },
    { text: '  ↳ checking CloudWatch alarms .. ✓',   cls: 'ok'   },
    { text: '  ↳ correlating EMF metrics .....✓',    cls: 'ok'   },
    { text: '  ↳ tracing logs by request ID . ✓',    cls: 'ok'   },
    { text: '✓ summary posted  [10 min, was 45]',     cls: 'done' },
  ] as const;

  private static readonly LINE_MS  = 380;
  private static readonly PAUSE_MS = 2200;

  constructor(private readonly bodyEl: HTMLElement) {
    this.cycle();
  }

  private cycle(): void {
    if (this.running) return;
    this.running = true;
    this.bodyEl.innerHTML = '';

    HeroTerminal.LINES.forEach((line, i) => {
      const t = setTimeout(() => {
        const span       = document.createElement('span');
        span.className   = `terminal-line ${line.cls}`;
        span.textContent = line.text;
        this.bodyEl.appendChild(span);
      }, i * HeroTerminal.LINE_MS);
      this.timers.push(t);
    });

    const restart = setTimeout(() => {
      this.running = false;
      this.timers  = [];
      this.bodyEl.innerHTML = '';
      this.cycle();
    }, HeroTerminal.LINES.length * HeroTerminal.LINE_MS + HeroTerminal.PAUSE_MS);

    this.timers.push(restart);
  }
}

/* ── Project Terminal (hover) ───────────────────────────────────────────────── */

class ProjectTerminal {
  private timers: ReturnType<typeof setTimeout>[] = [];
  private running = false;

  private static readonly LINES: readonly TerminalLine[] = [
    { text: '> alarm: WorkSpaces-EC2-CPUHigh',       cls: 'cmd'  },
    { text: '  ↳ pulling ticket metadata ...  ✓',    cls: 'ok'   },
    { text: '  ↳ setting up read-only creds .. ✓',   cls: 'ok'   },
    { text: '  ↳ checking CloudWatch alarms .. ✓',   cls: 'ok'   },
    { text: '  ↳ correlating EMF metrics ..... ✓',   cls: 'ok'   },
    { text: '  ↳ tracing logs by request ID .. ✓',   cls: 'ok'   },
    { text: '✓ summary posted  [10 min, was 45]',     cls: 'done' },
  ] as const;

  private static readonly LINE_MS = 320;

  constructor(bodyElId: string, cardId: string) {
    const body = document.getElementById(bodyElId);
    const card = document.getElementById(cardId);
    if (!body || !card) return;

    this.reset(body);
    card.addEventListener('mouseenter', () => this.run(body));
    card.addEventListener('mouseleave', () => this.reset(body));
  }

  private run(body: HTMLElement): void {
    if (this.running) return;
    this.running  = true;
    body.innerHTML = '';

    ProjectTerminal.LINES.forEach((line, i) => {
      const t = setTimeout(() => {
        const span       = document.createElement('span');
        span.className   = `terminal-line ${line.cls}`;
        span.textContent = line.text;
        body.appendChild(span);
      }, i * ProjectTerminal.LINE_MS);
      this.timers.push(t);
    });

    const end = setTimeout(() => { this.running = false; },
      ProjectTerminal.LINES.length * ProjectTerminal.LINE_MS + 1800);
    this.timers.push(end);
  }

  private reset(body: HTMLElement): void {
    this.timers.forEach(clearTimeout);
    this.timers    = [];
    this.running   = false;
    body.innerHTML = '<span class="terminal-line info">Hover to run a live demo...</span>';
  }
}

/* ── Pipeline Animation ─────────────────────────────────────────────────────── */

class PipelineAnimation {
  private timers: ReturnType<typeof setTimeout>[] = [];
  private running = false;

  private static readonly TERMINAL_LINES: readonly TerminalLine[] = [
    { text: '> pipeline.sh --task "Add retry logic" --max-iter 3', cls: 'cmd'  },
    { text: '  ↳ research agent reading docs ...        ✓',         cls: 'ok'   },
    { text: '  ↳ task_spec.md generated ...             ✓',         cls: 'ok'   },
    { text: '  ↳ human checkpoint: spec approved ...    ✓',         cls: 'ok'   },
    { text: '  ↳ coder: implementing changes (iter 1) . ✓',         cls: 'ok'   },
    { text: '  ↳ tester + reviewer running (parallel) . ✓',         cls: 'ok'   },
    { text: '  ↳ feedback: clean, no issues found ...   ✓',         cls: 'ok'   },
    { text: '✓ CR-8472 ready for review  [4 min total]',             cls: 'done' },
  ] as const;

  /* stage indices: 0=input, 1=research, 2=human, 3=loop, 4=cr-ready */
  private static readonly STAGE_DELAYS = [0, 700, 1500, 2400, 4200];

  constructor(private readonly card: HTMLElement) {
    card.addEventListener('mouseenter', () => this.run());
    card.addEventListener('mouseleave', () => this.reset());
  }

  private run(): void {
    if (this.running) return;
    this.running = true;

    const body = document.getElementById('pipeline-terminal-body');
    if (body) body.innerHTML = '';

    const steps      = this.card.querySelectorAll<HTMLElement>('.pv2-step');
    const connectors = this.card.querySelectorAll<HTMLElement>('.pv2-connector');
    const loopBlock  = this.card.querySelector<HTMLElement>('.pv2-loop-block');
    const coder      = document.getElementById('pv2-coder');
    const tester     = document.getElementById('pv2-tester');
    const reviewer   = document.getElementById('pv2-reviewer');

    PipelineAnimation.STAGE_DELAYS.forEach((delay, i) => {
      const t = setTimeout(() => {
        /* activate step */
        if (i < 3) {
          steps[i]?.classList.add('pv2-active');
          if (i > 0) connectors[i - 1]?.classList.add('conn-active');
        } else if (i === 3) {
          connectors[2]?.classList.add('conn-active');
          loopBlock?.classList.add('pv2-loop-active');
          /* animate loop: coder first, then parallel tester+reviewer */
          coder?.classList.add('ls-active');
          setTimeout(() => { tester?.classList.add('ls-active'); reviewer?.classList.add('ls-active'); }, 600);
          /* simulate second iteration */
          setTimeout(() => {
            [coder, tester, reviewer].forEach(e => e?.classList.remove('ls-active'));
            setTimeout(() => {
              coder?.classList.add('ls-active');
              setTimeout(() => { tester?.classList.add('ls-active'); reviewer?.classList.add('ls-active'); }, 500);
            }, 300);
          }, 1400);
        } else {
          connectors[3]?.classList.add('conn-active');
          steps[i - 1]?.classList.add('pv2-active');
        }

        if (body && i < PipelineAnimation.TERMINAL_LINES.length) {
          const span       = document.createElement('span');
          span.className   = `terminal-line ${PipelineAnimation.TERMINAL_LINES[i]!.cls}`;
          span.textContent = PipelineAnimation.TERMINAL_LINES[i]!.text;
          body.appendChild(span);
        }
      }, delay);
      this.timers.push(t);
    });

    /* final terminal lines after loop */
    [5, 6, 7].forEach((lineIdx, offset) => {
      const t = setTimeout(() => {
        if (!body || lineIdx >= PipelineAnimation.TERMINAL_LINES.length) return;
        const span       = document.createElement('span');
        span.className   = `terminal-line ${PipelineAnimation.TERMINAL_LINES[lineIdx]!.cls}`;
        span.textContent = PipelineAnimation.TERMINAL_LINES[lineIdx]!.text;
        body.appendChild(span);
      }, 4200 + (offset + 1) * 500);
      this.timers.push(t);
    });

    const end = setTimeout(() => { this.running = false; }, 7500);
    this.timers.push(end);
  }

  private reset(): void {
    this.timers.forEach(clearTimeout);
    this.timers  = [];
    this.running = false;

    this.card.querySelectorAll<HTMLElement>('.pv2-step').forEach(s => s.classList.remove('pv2-active'));
    this.card.querySelectorAll<HTMLElement>('.pv2-connector').forEach(c => c.classList.remove('conn-active'));
    this.card.querySelector<HTMLElement>('.pv2-loop-block')?.classList.remove('pv2-loop-active');
    ['pv2-coder', 'pv2-tester', 'pv2-reviewer'].forEach(id =>
      document.getElementById(id)?.classList.remove('ls-active'));

    const body = document.getElementById('pipeline-terminal-body');
    if (body) body.innerHTML = '<span class="terminal-line info">Hover to run a live demo...</span>';
  }
}

/* ── Particle System ────────────────────────────────────────────────────────── */

class Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  readonly radius: number;
  readonly isOrange: boolean;

  constructor(private canvasWidth: number, private canvasHeight: number) {
    const speed = 0.12 + Math.random() * 0.28;
    const angle = Math.random() * Math.PI * 2;
    this.x        = Math.random() * canvasWidth;
    this.y        = Math.random() * canvasHeight;
    this.vx       = Math.cos(angle) * speed;
    this.vy       = Math.sin(angle) * speed;
    this.radius   = 1.0 + Math.random() * 1.2;
    this.isOrange = Math.random() > 0.5;
  }

  update(mx: number | null, my: number | null): void {
    this.x += this.vx;
    this.y += this.vy;
    if (this.x < 0 || this.x > this.canvasWidth)  this.vx *= -1;
    if (this.y < 0 || this.y > this.canvasHeight)  this.vy *= -1;
    if (mx !== null && my !== null) {
      const dx = this.x - mx, dy = this.y - my;
      const d  = Math.hypot(dx, dy);
      if (d < 120 && d > 0) {
        const f = (120 - d) / 120;
        this.x += (dx / d) * f * 2.2;
        this.y += (dy / d) * f * 2.2;
      }
    }
  }

  draw(ctx: CanvasRenderingContext2D): void {
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fillStyle = this.isOrange
      ? 'rgba(249,115,22,0.7)'
      : 'rgba(139,92,246,0.7)';
    ctx.fill();
  }

  resize(w: number, h: number): void { this.canvasWidth = w; this.canvasHeight = h; }
}

class ParticleSystem {
  private readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;
  private particles: Particle[] = [];
  private mx: number | null = null;
  private my: number | null = null;

  constructor(canvasId: string) {
    const canvas = document.getElementById(canvasId);
    if (!(canvas instanceof HTMLCanvasElement)) throw new Error(`#${canvasId} not found`);
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('No 2D context');
    this.canvas = canvas;
    this.ctx    = ctx;
    this.resize();
    this.build();
    this.bind();
    this.tick();
  }

  private resize(): void {
    this.canvas.width  = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  private build(): void {
    const count = Math.min(80, Math.floor((this.canvas.width * this.canvas.height) / 14_000));
    this.particles = Array.from({ length: count }, () =>
      new Particle(this.canvas.width, this.canvas.height));
  }

  private bind(): void {
    window.addEventListener('resize', () => {
      this.resize();
      this.particles.forEach(p => p.resize(this.canvas.width, this.canvas.height));
    });
    document.addEventListener('mousemove', (e) => { this.mx = e.clientX; this.my = e.clientY; });
    document.addEventListener('mouseleave', () => { this.mx = null; this.my = null; });
  }

  private drawConnections(): void {
    const MAX = 110;
    for (let i = 0; i < this.particles.length; i++) {
      for (let j = i + 1; j < this.particles.length; j++) {
        const a = this.particles[i]!;
        const b = this.particles[j]!;
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        if (d < MAX) {
          const alpha = (1 - d / MAX) * 0.18;
          this.ctx.beginPath();
          this.ctx.moveTo(a.x, a.y);
          this.ctx.lineTo(b.x, b.y);
          this.ctx.strokeStyle = `rgba(249,115,22,${alpha})`;
          this.ctx.lineWidth   = 0.6;
          this.ctx.stroke();
        }
      }
    }
  }

  private tick(): void {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.particles.forEach(p => { p.update(this.mx, this.my); p.draw(this.ctx); });
    this.drawConnections();
    requestAnimationFrame(() => this.tick());
  }
}

/* ── Scroll Animations ──────────────────────────────────────────────────────── */

function initScrollAnimations(): void {
  const io = new IntersectionObserver(
    entries => entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible'); }),
    { threshold: 0.1 }
  );
  document.querySelectorAll<HTMLElement>('.fade-up').forEach(el => io.observe(el));
}

/* ── Stat Counters ──────────────────────────────────────────────────────────── */

function animateCounter(cfg: StatConfig): void {
  const { el, target, duration } = cfg;
  const step  = 16;
  const steps = duration / step;
  const inc   = target / steps;
  let val     = 0;
  const timer = setInterval(() => {
    val += inc;
    if (val >= target) { val = target; clearInterval(timer); }
    el.textContent = String(Math.floor(val));
  }, step);
}

function initStatCounters(): void {
  const io = new IntersectionObserver(
    entries => entries.forEach(e => {
      if (!e.isIntersecting) return;
      const el     = e.target as HTMLElement;
      const target = parseInt(el.dataset['count'] ?? '', 10);
      if (!isNaN(target)) animateCounter({ el, target, duration: 1200 });
      io.unobserve(el);
    }),
    { threshold: 0.6 }
  );
  document.querySelectorAll<HTMLElement>('[data-count]').forEach(el => io.observe(el));
}

/* ── Nav Scroll Spy ─────────────────────────────────────────────────────────── */

function initScrollSpy(): void {
  const sections = document.querySelectorAll<HTMLElement>('section[id]');
  const links    = document.querySelectorAll<HTMLAnchorElement>('.nav-links a');
  window.addEventListener('scroll', () => {
    let active = '';
    sections.forEach(s => { if (window.scrollY >= s.offsetTop - 90) active = s.id; });
    links.forEach(l => l.classList.toggle('active', l.getAttribute('href') === `#${active}`));
  }, { passive: true });
}

/* ── Mobile Menu ────────────────────────────────────────────────────────────── */

function initMobileMenu(): void {
  const btn    = document.getElementById('hamburger');
  const mobile = document.getElementById('nav-mobile');
  if (!btn || !mobile) return;
  btn.addEventListener('click', () => {
    const open = mobile.classList.toggle('open');
    btn.classList.toggle('open', open);
    btn.setAttribute('aria-expanded', String(open));
  });
  mobile.querySelectorAll('a').forEach(a => a.addEventListener('click', () => {
    mobile.classList.remove('open');
    btn.classList.remove('open');
    btn.setAttribute('aria-expanded', 'false');
  }));
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
      label.textContent       = 'Copied!';
      label.style.background  = 'rgba(74,222,128,0.15)';
      label.style.color       = '#4ade80';
      label.style.borderColor = 'rgba(74,222,128,0.3)';
      setTimeout(() => {
        label.textContent       = 'Copy';
        label.style.background  = '';
        label.style.color       = '';
        label.style.borderColor = '';
      }, 2200);
    }).catch(() => { window.location.href = `mailto:${email}`; });
  });
}

/* ── Contact Form ───────────────────────────────────────────────────────────── */

function initContactForm(): void {
  const form     = document.getElementById('contact-form') as HTMLFormElement | null;
  const submitBtn = document.getElementById('form-submit') as HTMLButtonElement | null;
  const feedback  = document.getElementById('form-feedback') as HTMLElement | null;
  if (!form || !submitBtn || !feedback) return;

  const labelEl   = submitBtn.querySelector<HTMLElement>('.submit-label');
  const sendingEl = submitBtn.querySelector<HTMLElement>('.submit-sending');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    submitBtn.disabled = true;
    labelEl?.setAttribute('hidden', '');
    sendingEl?.removeAttribute('hidden');
    feedback.hidden = true;
    feedback.className = 'form-feedback';

    try {
      const data = new FormData(form);
      const res  = await fetch('https://api.web3forms.com/submit', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({
          access_key: 'f757b6dc-9331-40a3-a16f-2d6c944e2aba',
          name:        data.get('name'),
          email:       data.get('email'),
          message:     data.get('message'),
          subject:     'Portfolio Contact — New Message',
        }),
      });
      const json = await res.json() as { success: boolean; message?: string };

      if (json.success) {
        feedback.textContent = '✓ Message sent! I\'ll get back to you soon.';
        feedback.classList.add('success');
        form.reset();
      } else {
        feedback.textContent = json.message ?? 'Something went wrong. Please try again.';
        feedback.classList.add('error');
      }
    } catch {
      feedback.textContent = 'Network error. Please try again or email directly.';
      feedback.classList.add('error');
    } finally {
      feedback.hidden = false;
      submitBtn.disabled = false;
      labelEl?.removeAttribute('hidden');
      sendingEl?.setAttribute('hidden', '');
    }
  });
}

/* ── Smooth Scroll ──────────────────────────────────────────────────────────── */

function initSmoothScroll(): void {
  document.querySelectorAll<HTMLAnchorElement>('a[href^="#"]').forEach(a => {
    a.addEventListener('click', (e) => {
      const href   = a.getAttribute('href');
      if (!href) return;
      const target = document.querySelector<HTMLElement>(href);
      if (!target) return;
      e.preventDefault();
      window.scrollTo({ top: target.offsetTop - 72, behavior: 'smooth' });
    });
  });
}

/* ── Hero Parallax ──────────────────────────────────────────────────────────── */

function initHeroParallax(): void {
  const right = document.getElementById('hero-right');
  if (!right) return;
  window.addEventListener('scroll', () => {
    const y = window.scrollY;
    right.style.transform = `translateY(${y * 0.06}px)`;
  }, { passive: true });
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
    typeSpeed:      52,
    backSpeed:      28,
    backDelay:      2200,
    loop:           true,
    cursorChar:     '|',
    smartBackspace: false,
  });
}

/* ── Bootstrap ──────────────────────────────────────────────────────────────── */

function init(): void {
  new CustomCursor();
  new ScrollProgress();
  new CardTilt();
  new MagneticButton();

  new ParticleSystem('particle-canvas');

  const heroBody = document.getElementById('hero-terminal-body');
  if (heroBody) new HeroTerminal(heroBody);

  new ProjectTerminal('ws-terminal-body', 'proj-ws');

  const pipelineCard = document.getElementById('proj-pipeline');
  if (pipelineCard) new PipelineAnimation(pipelineCard);

  initContactForm();
  initTyped();
  initScrollAnimations();
  initStatCounters();
  initScrollSpy();
  initMobileMenu();
  initEmailCopy();
  initSmoothScroll();
  initHeroParallax();
}

document.readyState === 'loading'
  ? document.addEventListener('DOMContentLoaded', init)
  : init();
