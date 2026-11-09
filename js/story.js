/* ==========================================================================
   PGA Transformaciones · Historia que avanza con el scroll
   Toda la portada es una escena 3D continua (three.js, licencia MIT):
     1. Portada con el chevrón del logotipo en 3D.
     2. Llega un aluvión de tareas (emails, facturas, WhatsApp, Excel).
     3. Atraviesan el chevrón y salen ordenadas hacia CRM, ERP, clientes e informes.
     4. Carrusel con los servicios.
     5. Fondo para la demo del chatbot.
     6. Carretera con los 4 pasos del método, recorrida por el chevrón.
     7. Vista aérea final y llamada a la acción.
   Los textos son HTML (index.html, bloques .scene) y aparecen según data-from/data-to.
   Sin WebGL 2, sin JavaScript o con «reducir movimiento», la página se ve en
   versión estática con los mismos textos.
   ========================================================================== */

const section = document.querySelector('[data-story]');
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------------------------------------------------------------------- */
/* Utilidades                                                             */
/* ---------------------------------------------------------------------- */
function hasWebGL() {
  // three.js necesita WebGL 2 (disponible en todos los navegadores actuales)
  try {
    const c = document.createElement('canvas');
    return !!(window.WebGL2RenderingContext && c.getContext('webgl2'));
  } catch (e) {
    return false;
  }
}
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = (a, b, v) => {
  const t = clamp((v - a) / (b - a));
  return t * t * (3 - 2 * t);
};
const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const easeOut = (t) => 1 - Math.pow(1 - t, 3);
function rng(seed) {
  // mulberry32: aleatorio reproducible para que la escena sea siempre igual
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ---------------------------------------------------------------------- */
/* Línea de tiempo (0 = principio de la historia, 1 = final)              */
/* ---------------------------------------------------------------------- */
const TL = {
  arrive: 0.035, // las tareas empiezan a llegar desde el fondo
  flightStart: 0.17,
  flightSpread: 0.11,
  flightDur: 0.09,
  lanes: [0.235, 0.3],
  carousel: [0.44, 0.6],
  road: [0.735, 0.865],
  chaseIn: [0.705, 0.735],
  chaseOut: [0.875, 0.905],
};

/* ---------------------------------------------------------------------- */
/* Controlador: progreso del scroll, textos y navegación                  */
/* ---------------------------------------------------------------------- */
function setup(root) {
  root.classList.add('story--3d');
  const stage = root.querySelector('.story__stage');
  const steps = Array.from(root.querySelectorAll('[data-step]')).map((el) => ({
    el,
    from: Number(el.dataset.from),
    to: Number(el.dataset.to),
    links: Array.from(el.querySelectorAll('a, button')),
    o: -1,
    off: null,
  }));
  const msgs = Array.from(root.querySelectorAll('[data-at]')).map((el) => ({
    el,
    at: Number(el.dataset.at),
    until: el.dataset.until ? Number(el.dataset.until) : 2,
    on: null,
  }));
  const bar = root.querySelector('.story__bar span');
  const skip = root.querySelector('.story__skip');

  let p = 0;
  let last = performance.now();
  let running = false;
  let disabled = false;
  let world = null;

  const measure = () => {
    const r = root.getBoundingClientRect();
    const total = r.height - stage.clientHeight;
    return total > 0 ? clamp(-r.top / total) : 0;
  };

  const overlay = (v) => {
    steps.forEach((s) => {
      const span = s.to - s.from;
      const fi = Math.min(0.022, span * 0.28);
      const fo = Math.min(0.018, span * 0.22);
      const a = s.from <= 0 ? 1 : smooth(s.from, s.from + fi, v);
      const b = s.to >= 1 ? 1 : 1 - smooth(s.to - fo, s.to, v);
      const o = Math.min(a, b);
      if (Math.abs(o - s.o) > 0.0015) {
        s.o = o;
        s.el.style.opacity = o.toFixed(3);
        s.el.style.transform = `translate3d(0, ${((1 - a) * 30 - (1 - b) * 30).toFixed(1)}px, 0)`;
      }
      const off = o < 0.5;
      if (off !== s.off) {
        s.off = off;
        s.el.classList.toggle('is-off', off);
        s.links.forEach((l) => (off ? l.setAttribute('tabindex', '-1') : l.removeAttribute('tabindex')));
      }
    });
    msgs.forEach((m) => {
      const on = v >= m.at && v < m.until;
      if (on !== m.on) {
        m.on = on;
        m.el.classList.toggle('is-in', on);
      }
    });
    if (bar) bar.style.transform = `scaleY(${v.toFixed(4)})`;
    if (skip) {
      const k = smooth(0.045, 0.065, v) * (1 - smooth(0.93, 0.955, v));
      skip.style.opacity = k.toFixed(3);
      skip.style.visibility = k < 0.05 ? 'hidden' : 'visible';
    }
  };

  const frame = (now) => {
    if (!running || disabled) return;
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    const target = measure();
    p += (target - p) * (1 - Math.exp(-dt * 6.5));
    if (Math.abs(target - p) < 0.0002) p = target;
    overlay(p);
    if (world) world.render(p, now / 1000);
    requestAnimationFrame(frame);
  };

  // Los enlaces del menú llevan a la escena correspondiente dentro de la historia.
  const scrollToStep = (s, smoothScroll) => {
    const top = root.getBoundingClientRect().top + window.scrollY;
    const total = root.offsetHeight - stage.clientHeight;
    const target = s.from + (s.to - s.from) * 0.4;
    window.scrollTo({ top: top + total * target, behavior: smoothScroll ? 'smooth' : 'auto' });
  };
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href^="#"]');
    if (!a || disabled) return;
    const id = a.getAttribute('href').slice(1);
    const s = steps.find((x) => x.el.id === id);
    if (!s) return;
    e.preventDefault();
    history.pushState(null, '', `#${id}`);
    setTimeout(() => scrollToStep(s, true), 0);
  }, true);
  if (location.hash) {
    const s = steps.find((x) => x.el.id === location.hash.slice(1));
    if (s) setTimeout(() => scrollToStep(s, false), 80);
  }

  p = measure();
  overlay(p);

  new IntersectionObserver(([entry]) => {
    if (entry.isIntersecting && !running) {
      running = true;
      last = performance.now();
      requestAnimationFrame(frame);
    } else if (!entry.isIntersecting) {
      running = false;
    }
  }).observe(root);

  import('../assets/vendor/three/three.module.min.js')
    .then((THREE) => createWorld(THREE, stage))
    .then((w) => {
      world = w;
      stage.classList.add('is-ready');
    })
    .catch((err) => {
      // Si algo falla, volvemos a la versión estática.
      console.warn('Animación 3D desactivada:', err);
      disabled = true;
      root.classList.remove('story--3d');
      steps.forEach((s) => {
        s.el.style.opacity = '';
        s.el.style.transform = '';
        s.el.classList.remove('is-off');
        s.links.forEach((l) => l.removeAttribute('tabindex'));
      });
    });
}

/* ---------------------------------------------------------------------- */
/* Texturas dibujadas con canvas 2D                                       */
/* ---------------------------------------------------------------------- */
const TYPES = [
  { lane: 0, icon: 'message-circle', color: '#16a34a', title: '¿Tenéis cita mañana?', sub: 'WhatsApp · 23:41', done: 'Cita reservada', doneSub: 'Lead añadido al CRM' },
  { lane: 1, icon: 'file-text', color: '#ea580c', title: 'Factura F-2041', sub: 'Proveedor · 1.250,00 €', done: 'Factura registrada', doneSub: 'ERP actualizado' },
  { lane: 2, icon: 'mail', color: '#0b63ec', title: 'Nuevo pedido', sub: 'compras@cliente.es', done: 'Cliente respondido', doneSub: 'Respuesta en 8 s' },
  { lane: 3, icon: 'file-spreadsheet', color: '#15803d', title: 'Ventas_semana.xlsx', sub: 'Excel · 248 filas', done: 'Informe generado', doneSub: 'Enviado a dirección' },
];
const NODES = [
  { icon: 'users', unit: ['lead', 'leads'] },
  { icon: 'database', unit: ['factura', 'facturas'] },
  { icon: 'send', unit: ['respuesta', 'respuestas'] },
  { icon: 'chart-column', unit: ['informe', 'informes'] },
];
const SERVICES = [
  { icon: 'bot', title: 'Chatbots y asistentes con IA' },
  { icon: 'workflow', title: 'Automatización de procesos' },
  { icon: 'scan-text', title: 'Lectura inteligente de documentos' },
  { icon: 'trending-up', title: 'Agentes de IA para ventas' },
  { icon: 'plug-zap', title: 'Integraciones a medida' },
  { icon: 'layout-dashboard', title: 'Informes automáticos' },
];
const MILESTONES = [0.12, 0.37, 0.62, 0.87];

function iconImage(name, color, size = 96) {
  // Reutiliza los iconos del sprite SVG de la página.
  const symbol = document.getElementById(`i-${name}`);
  const inner = symbol ? symbol.innerHTML : '';
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${inner}</svg>`;
  const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = () => { URL.revokeObjectURL(url); resolve(null); };
    img.src = url;
  });
}

function canvas2d(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return [c, c.getContext('2d')];
}

function rrect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function fitText(ctx, text, maxWidth) {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let t = text;
  while (t.length > 1 && ctx.measureText(`${t}…`).width > maxWidth) t = t.slice(0, -1);
  return `${t}…`;
}

function wrapText(ctx, text, maxWidth) {
  const words = text.split(' ');
  const lines = [];
  let line = '';
  words.forEach((w) => {
    const test = line ? `${line} ${w}` : w;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = w;
    } else {
      line = test;
    }
  });
  if (line) lines.push(line);
  return lines;
}

function chevronPath(ctx, x, y, s) {
  ctx.beginPath();
  [[0, 0], [92, 0], [194, 118.5], [103, 231.5], [20, 231.5], [105, 118.5]].forEach(([px, py], i) => {
    const X = x + px * s;
    const Y = y + py * s;
    if (i) ctx.lineTo(X, Y); else ctx.moveTo(X, Y);
  });
  ctx.closePath();
}

const CW = 512;
const CH = 320;

function rawCard(type, icon) {
  const [c, ctx] = canvas2d(CW, CH);
  rrect(ctx, 6, 6, CW - 12, CH - 12, 36);
  ctx.fillStyle = '#ffffff';
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = '#dbe4f0';
  ctx.stroke();
  ctx.fillStyle = type.color;
  ctx.beginPath();
  ctx.arc(70, 72, 36, 0, Math.PI * 2);
  ctx.fill();
  if (icon) ctx.drawImage(icon, 46, 48, 48, 48);
  ctx.fillStyle = '#041e3c';
  ctx.font = '800 31px Montserrat, Arial, sans-serif';
  ctx.fillText(fitText(ctx, type.title, CW - 150), 124, 66);
  ctx.fillStyle = '#5d6d86';
  ctx.font = '500 23px Inter, Arial, sans-serif';
  ctx.fillText(fitText(ctx, type.sub, CW - 150), 124, 100);
  if (type.icon === 'file-spreadsheet') {
    const cw = (CW - 68) / 4;
    for (let r = 0; r < 4; r += 1) {
      for (let k = 0; k < 4; k += 1) {
        ctx.fillStyle = r === 0 ? '#d1fae5' : (r + k) % 2 ? '#f1f5f9' : '#f8fafc';
        ctx.fillRect(34 + k * cw + 2, 140 + r * 36 + 2, cw - 4, 32);
      }
    }
  } else {
    const widths = type.icon === 'file-text' ? [0.86, 0.62, 0.74] : [0.88, 0.7, 0.5];
    widths.forEach((wf, i) => {
      rrect(ctx, 34, 146 + i * 40, (CW - 68) * wf, 18, 9);
      ctx.fillStyle = '#e6edf6';
      ctx.fill();
    });
    if (type.icon === 'file-text') {
      ctx.fillStyle = '#041e3c';
      ctx.font = '800 26px Montserrat, Arial, sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText('1.250,00 €', CW - 34, 282);
      ctx.textAlign = 'left';
    }
  }
  if (type.icon === 'mail' || type.icon === 'message-circle') {
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.arc(CW - 44, 50, 13, 0, Math.PI * 2);
    ctx.fill();
  }
  return c;
}

function doneCard(type, check) {
  const [c, ctx] = canvas2d(CW, CH);
  rrect(ctx, 6, 6, CW - 12, CH - 12, 36);
  const g = ctx.createLinearGradient(0, 0, CW, CH);
  g.addColorStop(0, '#0c3466');
  g.addColorStop(1, '#041e3c');
  ctx.fillStyle = g;
  ctx.fill();
  ctx.lineWidth = 5;
  ctx.strokeStyle = 'rgba(5, 219, 255, 0.85)';
  ctx.stroke();
  ctx.fillStyle = 'rgba(46, 229, 157, 0.18)';
  ctx.beginPath();
  ctx.arc(70, 72, 36, 0, Math.PI * 2);
  ctx.fill();
  if (check) ctx.drawImage(check, 48, 50, 44, 44);
  ctx.fillStyle = '#ffffff';
  ctx.font = '800 32px Montserrat, Arial, sans-serif';
  ctx.fillText(fitText(ctx, type.done, CW - 150), 124, 66);
  ctx.fillStyle = '#66e9ff';
  ctx.font = '600 23px Inter, Arial, sans-serif';
  ctx.fillText(fitText(ctx, type.doneSub, CW - 150), 124, 100);
  rrect(ctx, 34, 160, CW - 68, 16, 8);
  const gb = ctx.createLinearGradient(34, 0, CW - 34, 0);
  gb.addColorStop(0, '#05dbff');
  gb.addColorStop(1, '#4f9dff');
  ctx.fillStyle = gb;
  ctx.fill();
  chevronPath(ctx, 34, 222, 0.13);
  const gc = ctx.createLinearGradient(34, 222, 52, 246);
  gc.addColorStop(0, '#05dbff');
  gc.addColorStop(1, '#0046e2');
  ctx.fillStyle = gc;
  ctx.fill();
  ctx.fillStyle = '#a9b9d0';
  ctx.font = '600 21px Inter, Arial, sans-serif';
  ctx.fillText('Automatizado por PGA', 70, 247);
  return c;
}

function nodeTile(icon) {
  const s = 256;
  const [c, ctx] = canvas2d(s, s);
  rrect(ctx, 8, 8, s - 16, s - 16, 54);
  const g = ctx.createLinearGradient(0, 0, s, s);
  g.addColorStop(0, '#0d3a72');
  g.addColorStop(1, '#041e3c');
  ctx.fillStyle = g;
  ctx.fill();
  ctx.lineWidth = 6;
  ctx.strokeStyle = 'rgba(5, 219, 255, 0.9)';
  ctx.stroke();
  if (icon) ctx.drawImage(icon, s / 2 - 52, s / 2 - 52, 104, 104);
  return c;
}

function servicePanel(svc, icon) {
  const w = 1024;
  const h = 640;
  const [c, ctx] = canvas2d(w, h);
  rrect(ctx, 10, 10, w - 20, h - 20, 64);
  const g = ctx.createLinearGradient(0, 0, w, h);
  g.addColorStop(0, 'rgba(15, 62, 120, 0.97)');
  g.addColorStop(1, 'rgba(4, 30, 60, 0.97)');
  ctx.fillStyle = g;
  ctx.fill();
  ctx.save();
  rrect(ctx, 10, 10, w - 20, h - 20, 64);
  ctx.clip();
  const rg = ctx.createRadialGradient(170, 150, 0, 170, 150, 520);
  rg.addColorStop(0, 'rgba(5, 219, 255, 0.28)');
  rg.addColorStop(1, 'rgba(5, 219, 255, 0)');
  ctx.fillStyle = rg;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
  rrect(ctx, 10, 10, w - 20, h - 20, 64);
  ctx.lineWidth = 6;
  ctx.strokeStyle = 'rgba(5, 219, 255, 0.85)';
  ctx.stroke();
  rrect(ctx, 80, 80, 150, 150, 40);
  const gi = ctx.createLinearGradient(80, 80, 230, 230);
  gi.addColorStop(0, '#05dbff');
  gi.addColorStop(1, '#0046e2');
  ctx.fillStyle = gi;
  ctx.fill();
  if (icon) ctx.drawImage(icon, 107, 107, 96, 96);
  ctx.fillStyle = '#ffffff';
  ctx.font = '800 66px Montserrat, Arial, sans-serif';
  wrapText(ctx, svc.title, w - 170).slice(0, 2).forEach((line, i) => ctx.fillText(line, 80, 350 + i * 80));
  rrect(ctx, 80, h - 122, 230, 10, 5);
  const gb = ctx.createLinearGradient(80, 0, 310, 0);
  gb.addColorStop(0, '#05dbff');
  gb.addColorStop(1, '#4f9dff');
  ctx.fillStyle = gb;
  ctx.fill();
  ctx.fillStyle = '#a9b9d0';
  ctx.font = '600 30px Inter, Arial, sans-serif';
  ctx.fillText('PGA Transformaciones', 80, h - 66);
  return c;
}

function roadTexture() {
  const [c, ctx] = canvas2d(512, 128);
  const g = ctx.createLinearGradient(0, 0, 0, 128);
  g.addColorStop(0, '#0a2346');
  g.addColorStop(0.5, '#061730');
  g.addColorStop(1, '#0a2346');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 512, 128);
  ctx.fillStyle = 'rgba(5, 219, 255, 0.95)';
  ctx.fillRect(0, 6, 512, 7);
  ctx.fillRect(0, 115, 512, 7);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
  ctx.fillRect(0, 60, 210, 8);
  return c;
}

function gridTexture() {
  const [c, ctx] = canvas2d(128, 128);
  ctx.strokeStyle = 'rgba(90, 190, 255, 0.5)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, 1);
  ctx.lineTo(128, 1);
  ctx.moveTo(1, 0);
  ctx.lineTo(1, 128);
  ctx.stroke();
  return c;
}

function beamTexture() {
  const [c, ctx] = canvas2d(32, 256);
  const g = ctx.createLinearGradient(0, 256, 0, 0);
  g.addColorStop(0, 'rgba(120, 220, 255, 1)');
  g.addColorStop(0.5, 'rgba(60, 170, 255, 0.35)');
  g.addColorStop(1, 'rgba(60, 170, 255, 0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 32, 256);
  return c;
}

function radial(inner, size = 256) {
  const [c, ctx] = canvas2d(size, size);
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, inner);
  g.addColorStop(0.35, inner.replace(/[\d.]+\)$/, '0.35)'));
  g.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  return c;
}

/* ---------------------------------------------------------------------- */
/* Escena 3D                                                              */
/* ---------------------------------------------------------------------- */
async function createWorld(THREE, stage) {
  const { Vector3, Quaternion, Matrix4, Euler, Color } = THREE;
  const canvas = stage.querySelector('.story__canvas');
  const nodeLabels = Array.from(stage.querySelectorAll('[data-node]'));
  const mileLabels = Array.from(stage.querySelectorAll('[data-mile]'));
  const small = window.matchMedia('(max-width: 760px)').matches;

  await Promise.all([
    document.fonts.load('800 31px Montserrat'),
    document.fonts.load('500 23px Inter'),
    document.fonts.load('600 23px Inter'),
  ]).catch(() => {});

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, small ? 1.5 : 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.setClearColor(0x000000, 0);

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x031630, 15, 38);
  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 200);

  /* --- Entorno para los reflejos --- */
  const pmrem = new THREE.PMREMGenerator(renderer);
  const env = new THREE.Scene();
  env.background = new Color(0x020c1b);
  const panel = (hex, k, w, h, pos, rot) => {
    const m = new THREE.Mesh(
      new THREE.PlaneGeometry(w, h),
      new THREE.MeshBasicMaterial({ color: new Color(hex).multiplyScalar(k), side: THREE.DoubleSide }),
    );
    m.position.set(...pos);
    m.rotation.set(...rot);
    env.add(m);
  };
  panel(0xffffff, 5, 10, 3, [0, 7, 1], [Math.PI / 2, 0, 0]);
  panel(0x05dbff, 4, 4, 8, [-7, 0, 2], [0, Math.PI / 2, 0]);
  panel(0x3a6dff, 4, 4, 8, [7, 0, 2], [0, -Math.PI / 2, 0]);
  panel(0xffffff, 1.6, 12, 2.5, [0, 1, 9], [0, Math.PI, 0]);
  scene.environment = pmrem.fromScene(env, 0.04).texture;
  pmrem.dispose();

  scene.add(new THREE.AmbientLight(0x8fb4ff, 0.35));
  const key = new THREE.DirectionalLight(0xffffff, 1.6);
  key.position.set(-4, 6, 9);
  scene.add(key);
  const rim = new THREE.PointLight(0x05dbff, 40, 16, 2);
  rim.position.set(1, 0.5, -3);
  scene.add(rim);

  const maxAniso = renderer.capabilities.getMaxAnisotropy();
  const tex = (cnv, repeat) => {
    const t = new THREE.CanvasTexture(cnv);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = Math.min(8, maxAniso);
    if (repeat) {
      t.wrapS = THREE.RepeatWrapping;
      t.wrapT = THREE.RepeatWrapping;
    }
    return t;
  };
  const glowTex = tex(radial('rgba(60, 200, 255, 1)'));
  const additive = (opts = {}) => ({
    transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, fog: false, ...opts,
  });
  const sprite = (scale, opacity = 0) => {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, opacity, ...additive() }));
    s.scale.set(scale, scale, 1);
    return s;
  };

  /* --- Chevrón 3D (misma forma que el logotipo) --- */
  const CHV = [[690, 0], [782, 0], [884, 118.5], [793, 231.5], [710, 231.5], [795, 118.5]];
  const rounded = new Set([1, 2, 3]);
  const pts = CHV.map(([x, y]) => new THREE.Vector2(x - 787, -(y - 115.75)));
  const shape = new THREE.Shape();
  pts.forEach((pt, i) => {
    const prev = pts[(i + pts.length - 1) % pts.length];
    const next = pts[(i + 1) % pts.length];
    if (rounded.has(i)) {
      const a = pt.clone().add(prev.clone().sub(pt).setLength(10));
      const b = pt.clone().add(next.clone().sub(pt).setLength(10));
      shape.lineTo(a.x, a.y);
      shape.quadraticCurveTo(pt.x, pt.y, b.x, b.y);
    } else if (i === 0) {
      shape.moveTo(pt.x, pt.y);
    } else {
      shape.lineTo(pt.x, pt.y);
    }
  });
  shape.closePath();
  const chevGeo = new THREE.ExtrudeGeometry(shape, {
    depth: 46, bevelEnabled: true, bevelThickness: 7, bevelSize: 6, bevelSegments: 5, curveSegments: 10,
  });
  chevGeo.translate(0, 0, -23);
  const cpos = chevGeo.attributes.position;
  const colors = new Float32Array(cpos.count * 3);
  const cA = new Color('#05dbff');
  const cB = new Color('#0046e2');
  const ctmp = new Color();
  for (let i = 0; i < cpos.count; i += 1) {
    const t = clamp(((cpos.getX(i) + 97) * 140 + (cpos.getY(i) - 115.75) * -181.5) / (140 * 140 + 181.5 * 181.5));
    ctmp.copy(cA).lerp(cB, t);
    colors.set([ctmp.r, ctmp.g, ctmp.b], i * 3);
  }
  chevGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  const CS = 3.1 / 231.5;
  chevGeo.scale(CS, CS, CS);
  const chevMat = new THREE.MeshPhysicalMaterial({
    vertexColors: true,
    metalness: 0.25,
    roughness: 0.16,
    clearcoat: 1,
    clearcoatRoughness: 0.06,
    envMapIntensity: 1.25,
    emissive: new Color(0x00265f),
    emissiveIntensity: 0.6,
  });
  const chevron = new THREE.Mesh(chevGeo, chevMat);
  scene.add(chevron);
  const glow = sprite(7.5);
  glow.position.set(0.3, 0, -1.2);
  scene.add(glow);
  const flash = sprite(2.6);
  scene.add(flash);

  /* --- Tarjetas (tareas) --- */
  const [icons, check, nodeIcons, svcIcons] = await Promise.all([
    Promise.all(TYPES.map((t) => iconImage(t.icon, '#ffffff'))),
    iconImage('check', '#2ee59d'),
    Promise.all(NODES.map((n) => iconImage(n.icon, '#ffffff'))),
    Promise.all(SERVICES.map((s) => iconImage(s.icon, '#ffffff'))),
  ]);
  const PER_TYPE = small ? 7 : 10;
  const cardGeo = new THREE.PlaneGeometry(1.36, 0.85);
  const cardMat = (map) => new THREE.MeshBasicMaterial({
    map, side: THREE.DoubleSide, alphaToCoverage: true, alphaTest: 0.02, toneMapped: false,
  });
  const cardGroup = new THREE.Group();
  scene.add(cardGroup);
  const rawMeshes = TYPES.map((t, i) => new THREE.InstancedMesh(cardGeo, cardMat(tex(rawCard(t, icons[i]))), PER_TYPE));
  const doneMeshes = TYPES.map((t) => new THREE.InstancedMesh(cardGeo, cardMat(tex(doneCard(t, check))), PER_TYPE));
  [...rawMeshes, ...doneMeshes].forEach((m) => {
    m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    m.frustumCulled = false;
    cardGroup.add(m);
  });

  const rand = rng(20261109);
  const cards = [];
  TYPES.forEach((t, type) => {
    for (let j = 0; j < PER_TYPE; j += 1) {
      cards.push({
        type,
        j,
        lane: t.lane,
        d: rand(),
        arr: rand(),
        r: [rand(), rand(), rand()],
        far: [(rand() - 0.5) * 16, (rand() - 0.5) * 10],
        e: new Euler((rand() - 0.5) * 1.4, (rand() - 0.5) * 1.8, (rand() - 0.5) * 1.1),
        s: [rand() * 6.28, rand() * 6.28, rand() * 6.28, rand() * 6.28],
        sw: rand() * Math.PI * 2,
      });
    }
  });
  cards.sort((a, b) => a.d - b.d).forEach((c, i) => { c.d = (i + rand() * 0.6) / cards.length; });

  /* --- Carriles y destinos --- */
  const systemGroup = new THREE.Group();
  scene.add(systemGroup);
  const laneMat = new THREE.MeshBasicMaterial({ color: 0x48c6ff, opacity: 0.55, ...additive() });
  const tileGeo = new THREE.PlaneGeometry(1.1, 1.1);
  const nodes = NODES.map((n, i) => {
    const tile = new THREE.Mesh(tileGeo, new THREE.MeshBasicMaterial({
      map: tex(nodeTile(nodeIcons[i])), alphaToCoverage: true, alphaTest: 0.02, toneMapped: false, side: THREE.DoubleSide,
    }));
    const halo = sprite(3.2);
    systemGroup.add(halo, tile);
    return { tile, halo, curve: null, tube: null, count: 0, pulse: 0, label: nodeLabels[i] };
  });
  const DOTS = 7;
  const dotPos = new Float32Array(NODES.length * DOTS * 3);
  const dotGeo = new THREE.BufferGeometry();
  dotGeo.setAttribute('position', new THREE.BufferAttribute(dotPos, 3));
  const dotMat = new THREE.PointsMaterial({ color: 0x8fe9ff, size: 0.11, opacity: 0, ...additive() });
  const dots = new THREE.Points(dotGeo, dotMat);
  dots.frustumCulled = false;
  systemGroup.add(dots);

  /* --- Carrusel de servicios --- */
  const K = new Vector3(18, 0, -3);
  const RADIUS = 4.2;
  const carousel = new THREE.Group();
  carousel.position.copy(K);
  carousel.rotation.x = -0.05;
  scene.add(carousel);
  const panelGeo = new THREE.PlaneGeometry(3.4, 2.125);
  const panels = SERVICES.map((s, i) => {
    const m = new THREE.Mesh(panelGeo, new THREE.MeshBasicMaterial({
      map: tex(servicePanel(s, svcIcons[i])), transparent: true, depthWrite: false, toneMapped: false, side: THREE.DoubleSide,
    }));
    carousel.add(m);
    return m;
  });
  const carGlow = sprite(8);
  carGlow.position.set(0, 0, RADIUS - 1.2);
  carousel.add(carGlow);

  /* --- Fondo de la demo del chatbot: contorno del chevrón --- */
  const outline = new THREE.LineSegments(
    new THREE.EdgesGeometry(chevGeo, 25),
    new THREE.LineBasicMaterial({ color: 0x47c8ff, opacity: 0, ...additive() }),
  );
  outline.position.set(33.5, 0.4, -9.5);
  outline.scale.setScalar(2.3);
  scene.add(outline);
  const outGlow = sprite(14);
  outGlow.position.set(33.5, 0.4, -11);
  scene.add(outGlow);

  /* --- Carretera del método --- */
  const ROAD_Y = -2;
  const roadGroup = new THREE.Group();
  scene.add(roadGroup);
  const road = new THREE.CatmullRomCurve3([
    new Vector3(37, ROAD_Y, 2.5), new Vector3(42, ROAD_Y, -0.5), new Vector3(47, ROAD_Y, 1.8),
    new Vector3(52, ROAD_Y, -1.6), new Vector3(57, ROAD_Y, 1.2), new Vector3(62, ROAD_Y, -1.0),
    new Vector3(67, ROAD_Y, 0.4),
  ], false, 'centripetal');
  const roadLen = road.getLength();
  {
    const N = 300;
    const W = 1.7;
    const pos = new Float32Array((N + 1) * 6);
    const uv = new Float32Array((N + 1) * 4);
    const idx = [];
    const P = new Vector3();
    const T = new Vector3();
    for (let i = 0; i <= N; i += 1) {
      const u = i / N;
      road.getPointAt(u, P);
      road.getTangentAt(u, T);
      const sx = -T.z;
      const sz = T.x;
      const sl = Math.hypot(sx, sz) || 1;
      pos.set([P.x + (sx / sl) * W / 2, ROAD_Y + 0.01, P.z + (sz / sl) * W / 2, P.x - (sx / sl) * W / 2, ROAD_Y + 0.01, P.z - (sz / sl) * W / 2], i * 6);
      const uu = (u * roadLen) / 4;
      uv.set([uu, 0, uu, 1], i * 4);
      if (i < N) {
        const a = i * 2;
        idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    g.setIndex(idx);
    const rmat = new THREE.MeshBasicMaterial({ map: tex(roadTexture(), true), toneMapped: false, side: THREE.DoubleSide });
    roadGroup.add(new THREE.Mesh(g, rmat));
  }
  const grid = tex(gridTexture(), true);
  grid.repeat.set(45, 20);
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(90, 40),
    new THREE.MeshBasicMaterial({ map: grid, transparent: true, opacity: 0.45, depthWrite: false, toneMapped: false }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(52, ROAD_Y - 0.02, 0);
  roadGroup.add(ground);
  const beamTex = tex(beamTexture());
  const ringGeo = new THREE.TorusGeometry(0.66, 0.05, 8, 56);
  const beamGeo = new THREE.PlaneGeometry(0.16, 3.4);
  const miles = MILESTONES.map((u, i) => {
    const P = road.getPointAt(u);
    const ring = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ color: 0x2f8fff, transparent: true, toneMapped: false }));
    ring.rotation.x = Math.PI / 2;
    ring.position.set(P.x, ROAD_Y + 0.04, P.z);
    const beam = new THREE.Mesh(beamGeo, new THREE.MeshBasicMaterial({ map: beamTex, color: 0x6fd8ff, opacity: 0.5, ...additive() }));
    beam.position.set(P.x, ROAD_Y + 1.7, P.z);
    roadGroup.add(ring, beam);
    return { u, P, ring, beam, label: mileLabels[i] };
  });
  const vehicle = new THREE.Mesh(chevGeo, chevMat);
  vehicle.scale.setScalar(0.26);
  roadGroup.add(vehicle);
  const vGlow = sprite(2.4, 0.7);
  vGlow.material.depthTest = false; // si no, el suelo corta el brillo en una línea recta
  roadGroup.add(vGlow);
  const endP = road.getPointAt(1);
  const endT = road.getTangentAt(1);
  const gate = new THREE.Mesh(chevGeo, chevMat);
  gate.position.copy(endP).addScaledVector(endT, 1.7);
  gate.position.y = ROAD_Y + 1.6;
  roadGroup.add(gate);
  const gateGlow = sprite(9, 0.5);
  gateGlow.material.depthTest = false;
  gateGlow.position.copy(gate.position).addScaledVector(endT, 1.2);
  roadGroup.add(gateGlow);
  const gateLight = new THREE.PointLight(0x05dbff, 30, 14, 2);
  gateLight.position.copy(gate.position).addScaledVector(endT, -2).setY(ROAD_Y + 2.5);
  roadGroup.add(gateLight);

  /* --- Polvo de datos --- */
  const DUST = small ? 520 : 1100;
  const dustPos = new Float32Array(DUST * 3);
  for (let i = 0; i < DUST; i += 1) {
    dustPos.set([-16 + rand() * 96, -9 + rand() * 34, -24 + rand() * 34], i * 3);
  }
  const dustGeo = new THREE.BufferGeometry();
  dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3));
  const dust = new THREE.Points(dustGeo, new THREE.PointsMaterial({ color: 0x5fcfff, size: 0.06, opacity: 0.55, ...additive({ fog: true }) }));
  scene.add(dust);

  /* --- Composición según el formato de pantalla --- */
  const E = new Vector3(-2.1, 0, 0); // entrada (muesca del chevrón)
  const S = new Vector3(1.95, 0, 0); // salida (punta)
  let L = null;
  // [p, posición escritorio, objetivo escritorio, posición móvil, objetivo móvil]
  const KEYS = [
    [0.0, [-1.5, 0.4, 8.8], [-2.0, 0.1, 0], [0.0, 0.3, 13.2], [0.0, -2.0, 0]],
    [0.045, [-1.6, 0.5, 10.6], [-1.8, 0.0, 0], [-0.3, 0.3, 14.2], [-0.3, -1.8, 0]],
    [0.095, [-1.8, 0.6, 14.0], [-1.4, -0.2, 0], [-2.4, 0.2, 18.0], [-2.4, -1.6, 0]],
    [0.17, [-1.0, 0.5, 13.4], [-0.8, -0.3, 0], [-1.2, 0.2, 17.6], [-1.0, -1.6, 0]],
    [0.23, [-0.5, 0.3, 12.8], [-0.2, -0.5, 0], [-0.2, 0.1, 17.5], [0.1, -1.7, 0]],
    [0.32, [1.4, 0.5, 14.6], [1.9, -0.6, 0], [2.6, 0.3, 18.5], [3.0, -1.9, 0]],
    [0.395, [3.2, 1.8, 15.0], [2.7, -0.7, 0], [4.4, 1.0, 19.0], [4.7, -2.1, 0]],
    [0.445, [16.5, 1.2, 8.2], [15.9, -0.9, -3], [18.0, 1.0, 13.5], [18.0, -1.9, -3]],
    [0.6, [16.8, 1.2, 8.4], [16.1, -0.9, -3], [18.2, 1.0, 13.7], [18.1, -1.9, -3]],
    [0.65, [27.5, 1.5, 7.0], [29.5, 0.5, -4], [28.0, 1.0, 10.0], [29.0, -0.5, -4]],
    [0.705, [30.5, 1.6, 6.0], [32.5, 0.3, -4], [30.5, 1.2, 9.5], [31.5, -0.6, -4]],
    [0.905, [49.0, 15.0, 21.0], [54.0, -2.0, -1], [52.0, 26.0, 22.0], [53.5, -2.0, -1]],
    [1.0, [50.0, 20.0, 25.0], [54.5, -1.5, -2], [52.5, 31.0, 26.0], [54.0, -1.5, -2]],
  ];

  const layout = () => {
    const w = stage.clientWidth;
    const h = stage.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    const q = smooth(0.62, 1.25, camera.aspect); // 0 = vertical (móvil), 1 = horizontal
    const nodeX = lerp(4.4, 6.4, q);
    const spread = lerp(1.55, 1.9, q);
    const laneY = [1.5, 0.5, -0.5, -1.5].map((k) => k * spread);
    const mix = (d, m) => m.map((v, i) => lerp(v, d[i], q));
    L = {
      q,
      tile: lerp(0.86, 1, q),
      chaosX: [lerp(-7.5, -10.5, q), lerp(0.5, 3.5, q)],
      chaosY: lerp(5.2, 4.6, q),
      keys: KEYS.map(([p, pd, ld, pm, lm]) => [p, mix(pd, pm), mix(ld, lm)]),
      chase: {
        back: lerp(5.4, 7.0, q), up: lerp(8.8, 4.6, q), side: lerp(0, 0.9, q), ahead: lerp(1.6, 3.6, q), lookY: lerp(-1.5, -1.0, q),
      },
    };
    nodes.forEach((n, i) => {
      const end = new Vector3(nodeX, laneY[i], 0);
      n.curve = new THREE.QuadraticBezierCurve3(S.clone(), new Vector3(lerp(S.x, nodeX, 0.5), laneY[i] * 0.95, 0), end);
      if (n.tube) {
        systemGroup.remove(n.tube);
        n.tube.geometry.dispose();
      }
      n.tube = new THREE.Mesh(new THREE.TubeGeometry(n.curve, 72, 0.024, 8, false), laneMat);
      systemGroup.add(n.tube);
      n.tile.position.set(nodeX + 0.62, laneY[i], 0);
      n.halo.position.set(nodeX + 0.62, laneY[i], -0.3);
    });
  };
  layout();
  let resizeTimer = null;
  new ResizeObserver(() => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(layout, 120);
  }).observe(stage);

  /* --- Cámara --- */
  const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
  if (window.matchMedia('(pointer: fine)').matches) {
    window.addEventListener('pointermove', (e) => {
      pointer.tx = (e.clientX / window.innerWidth - 0.5) * 2;
      pointer.ty = (e.clientY / window.innerHeight - 0.5) * 2;
    }, { passive: true });
  }
  const keyPose = (p, pos, look) => {
    const ks = L.keys;
    let i = 0;
    while (i < ks.length - 2 && p > ks[i + 1][0]) i += 1;
    const [p0, a0, b0] = ks[i];
    const [p1, a1, b1] = ks[i + 1];
    const t = easeInOut(clamp((p - p0) / (p1 - p0)));
    pos.set(lerp(a0[0], a1[0], t), lerp(a0[1], a1[1], t), lerp(a0[2], a1[2], t));
    look.set(lerp(b0[0], b1[0], t), lerp(b0[1], b1[1], t), lerp(b0[2], b1[2], t));
  };
  const vP = new Vector3();
  const vT = new Vector3();
  const roadU = (p) => {
    const x = clamp((p - TL.road[0]) / (TL.road[1] - TL.road[0]));
    return x * x * (3 - 2 * x);
  };
  const chasePose = (p, pos, look) => {
    road.getPointAt(roadU(p), vP);
    road.getTangentAt(roadU(p), vT);
    const c = L.chase;
    pos.copy(vP).addScaledVector(vT, -c.back);
    pos.y += c.up;
    pos.x += -vT.z * c.side;
    pos.z += vT.x * c.side;
    look.copy(vP).addScaledVector(vT, c.ahead);
    look.y += c.lookY;
  };
  const posA = new Vector3();
  const lookA = new Vector3();
  const posB = new Vector3();
  const lookB = new Vector3();
  const pose = (p, pos, look) => {
    if (p <= TL.chaseIn[0] || p >= TL.chaseOut[1]) {
      keyPose(p, pos, look);
      return;
    }
    chasePose(p, posB, lookB);
    if (p < TL.chaseIn[1]) {
      keyPose(TL.chaseIn[0], posA, lookA);
      const t = easeInOut(clamp((p - TL.chaseIn[0]) / (TL.chaseIn[1] - TL.chaseIn[0])));
      pos.lerpVectors(posA, posB, t);
      look.lerpVectors(lookA, lookB, t);
    } else if (p > TL.chaseOut[0]) {
      keyPose(TL.chaseOut[1], posA, lookA);
      const t = easeInOut(clamp((p - TL.chaseOut[0]) / (TL.chaseOut[1] - TL.chaseOut[0])));
      pos.lerpVectors(posB, posA, t);
      look.lerpVectors(lookB, lookA, t);
    } else {
      pos.copy(posB);
      look.copy(lookB);
    }
  };

  /* --- Bucle de dibujo --- */
  const m4 = new Matrix4();
  const v3 = new Vector3();
  const sc = new Vector3();
  const qa = new Quaternion();
  const qb = new Quaternion();
  const qFlat = new Quaternion();
  const eTmp = new Euler();
  const zero = new Matrix4().makeScale(0, 0, 0);
  const P1 = new Vector3();
  const P2 = new Vector3();
  const chaosP = new Vector3();
  const farP = new Vector3();
  const tan = new Vector3();
  const proj = new Vector3();
  const camPos = new Vector3();
  const camLook = new Vector3();
  const up = new Vector3(0, 1, 0);
  const bez = (a, b, c, d, t, out) => {
    const it = 1 - t;
    return out.set(
      it * it * it * a.x + 3 * it * it * t * b.x + 3 * it * t * t * c.x + t * t * t * d.x,
      it * it * it * a.y + 3 * it * it * t * b.y + 3 * it * t * t * c.y + t * t * t * d.y,
      it * it * it * a.z + 3 * it * it * t * b.z + 3 * it * t * t * c.z + t * t * t * d.z,
    );
  };
  const place = (el, x, y, opacity) => {
    if (!el._w || el._sw !== stage.clientWidth) {
      el._w = el.offsetWidth;
      el._sw = stage.clientWidth;
    }
    x = clamp(x, 8, stage.clientWidth - el._w - 8);
    el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;
    el.style.opacity = opacity.toFixed(3);
  };
  const toScreen = (v) => {
    proj.copy(v).project(camera);
    return [(proj.x * 0.5 + 0.5) * stage.clientWidth, (-proj.y * 0.5 + 0.5) * stage.clientHeight, proj.z < 1];
  };

  const render = (p, t) => {
    /* Cámara */
    pointer.x += (pointer.tx - pointer.x) * 0.05;
    pointer.y += (pointer.ty - pointer.y) * 0.05;
    pose(p, camPos, camLook);
    camera.position.set(camPos.x + pointer.x * 0.4, camPos.y - pointer.y * 0.28, camPos.z);
    camera.lookAt(camLook);

    /* Niebla: más cerrada en el carrusel, más abierta en la vista aérea */
    const wCar = smooth(0.41, 0.45, p) * (1 - smooth(0.6, 0.64, p));
    const wRoad = smooth(0.7, 0.74, p) * (1 - smooth(0.87, 0.9, p));
    const wZoom = smooth(0.87, 0.93, p);
    scene.fog.near = lerp(lerp(lerp(15, 9, wCar), 12, wRoad), 30, wZoom);
    scene.fog.far = lerp(lerp(lerp(38, 28, wCar), 46, wRoad), 110, wZoom);

    /* Escenas 1-3: portada, aluvión de tareas y sistema ordenado */
    const sysVisible = p < 0.47;
    cardGroup.visible = sysVisible;
    chevron.visible = sysVisible;
    glow.visible = sysVisible;
    flash.visible = sysVisible;
    systemGroup.visible = p > 0.2 && sysVisible;
    let inside = 0;
    if (sysVisible) {
      const hero = 1 - smooth(0.02, 0.09, p);
      chevron.rotation.set(
        Math.sin(t * 0.7) * 0.03,
        lerp(0.12, 0.42, hero) + smooth(0.36, 0.42, p) * 0.32 + Math.sin(t * 0.5) * (0.05 + 0.08 * hero),
        0,
      );
      chevron.position.y = Math.sin(t * 0.9) * 0.05;

      nodes.forEach((n) => { n.count = 0; n.pulse = 0; });
      cards.forEach((c) => {
        const raw = rawMeshes[c.type];
        const done = doneMeshes[c.type];
        const arrive = smooth(TL.arrive + c.arr * 0.05, TL.arrive + 0.04 + c.arr * 0.05, p);
        const f = clamp((p - (TL.flightStart + c.d * TL.flightSpread)) / TL.flightDur);
        const node = nodes[c.lane];
        chaosP.set(
          lerp(L.chaosX[0], L.chaosX[1], c.r[0]) + Math.sin(t * 0.35 + c.s[0]) * 0.35,
          (c.r[1] - 0.5) * 2 * L.chaosY + Math.cos(t * 0.3 + c.s[1]) * 0.3,
          -9 + c.r[2] * 12 + Math.sin(t * 0.25 + c.s[2]) * 0.3,
        );
        eTmp.set(
          c.e.x + Math.sin(t * 0.4 + c.s[3]) * 0.25,
          c.e.y + Math.cos(t * 0.33 + c.s[0]) * 0.3,
          c.e.z + Math.sin(t * 0.27 + c.s[1]) * 0.2,
        );
        qa.setFromEuler(eTmp);
        let isDone = false;
        let scale = 1;
        if (f <= 0) {
          farP.set(chaosP.x + c.far[0], chaosP.y + c.far[1], chaosP.z - 46);
          v3.lerpVectors(farP, chaosP, easeOut(arrive));
          qb.copy(qa);
          scale = arrive <= 0 ? 0 : lerp(0.4, 1, arrive);
        } else if (f < 0.5) {
          const u = easeInOut(f / 0.5);
          P1.copy(chaosP).lerp(E, 0.35);
          P1.z += 2.6;
          P2.set(E.x - 2.4, 0, 0);
          bez(chaosP, P1, P2, E, u, v3);
          const rad = 1.3 * Math.sin(Math.PI * u) * Math.sqrt(1 - u);
          const ang = c.sw + u * Math.PI * 2.6;
          v3.y += Math.cos(ang) * rad;
          v3.z += Math.sin(ang) * rad;
          qb.copy(qa).slerp(qFlat, easeOut(u));
          scale = lerp(1, 0.62, u);
        } else if (f < 0.62) {
          const v = easeInOut((f - 0.5) / 0.12);
          v3.set(lerp(E.x, S.x, v), 0, 0);
          qb.copy(qFlat);
          scale = lerp(0.62, 0.72, v) * (1 - 0.62 * Math.sin(Math.PI * v));
          isDone = v3.x > 0.55;
          inside += 1;
        } else if (f < 1) {
          const w = easeInOut((f - 0.62) / 0.38);
          node.curve.getPoint(w, v3);
          node.curve.getTangent(w, tan);
          v3.z += Math.sin(t * 1.4 + c.s[2]) * 0.04;
          eTmp.set(0, 0, Math.atan2(tan.y, tan.x) * 0.35);
          qb.setFromEuler(eTmp);
          scale = lerp(0.72, 0.5, w) * (1 - smooth(0.86, 1, w));
          isDone = true;
          node.pulse = Math.max(node.pulse, Math.exp(-Math.pow((w - 0.97) / 0.05, 2)));
        } else {
          scale = 0;
          isDone = true;
          node.count += 1;
        }
        sc.setScalar(Math.max(scale, 0.0001));
        m4.compose(v3, qb, sc);
        raw.setMatrixAt(c.j, isDone || scale <= 0 ? zero : m4);
        done.setMatrixAt(c.j, isDone && scale > 0 ? m4 : zero);
      });
      rawMeshes.forEach((m) => { m.instanceMatrix.needsUpdate = true; });
      doneMeshes.forEach((m) => { m.instanceMatrix.needsUpdate = true; });

      const activity = clamp(inside / 3);
      chevMat.emissiveIntensity = 0.6 - 0.25 * smooth(0.07, 0.13, p) * (1 - smooth(0.16, 0.2, p)) + activity * 0.5;
      glow.material.opacity = 0.3 + 0.1 * hero + 0.42 * activity;
      glow.scale.setScalar(7.5 + activity * 1.5 + Math.sin(t * 2) * 0.15);
      flash.position.set(S.x - 0.55, 0, 0.5);
      flash.material.opacity = 0.75 * activity;
      rim.intensity = 30 + activity * 60;

      const reveal = smooth(TL.lanes[0], TL.lanes[1], p);
      const labelsOn = smooth(0.27, 0.31, p) * (1 - smooth(0.395, 0.425, p));
      nodes.forEach((n, i) => {
        const r = clamp(reveal * 1.25 - i * 0.08);
        const idx = n.tube.geometry.index.count;
        n.tube.geometry.setDrawRange(0, Math.floor((idx * r) / 6) * 6);
        const appearN = smooth(0.245 + i * 0.012, 0.29 + i * 0.012, p);
        n.tile.scale.setScalar(Math.max(0.0001, appearN * (1 + n.pulse * 0.18) * L.tile));
        n.halo.material.opacity = appearN * (0.22 + n.pulse * 0.55);
        if (n.label) {
          proj.copy(n.tile.position);
          proj.x += 0.72 * L.tile;
          const [x, y, front] = toScreen(proj);
          place(n.label, x, y - 20, front ? labelsOn : 0);
          const text = `${n.count} ${NODES[i].unit[n.count === 1 ? 0 : 1]}`;
          const num = n.label.querySelector('[data-count]');
          if (num && num.textContent !== text) num.textContent = text;
        }
      });
      for (let i = 0; i < NODES.length; i += 1) {
        for (let k = 0; k < DOTS; k += 1) {
          nodes[i].curve.getPoint((t * 0.22 + k / DOTS + i * 0.13) % 1, v3);
          dotPos.set([v3.x, v3.y, v3.z], (i * DOTS + k) * 3);
        }
      }
      dotGeo.attributes.position.needsUpdate = true;
      dotMat.opacity = reveal * 0.9;
    } else {
      nodeLabels.forEach((el) => { el.style.opacity = '0'; });
    }

    /* Escena 4: carrusel de servicios */
    const carIn = smooth(0.4, 0.45, p) * (1 - smooth(0.6, 0.64, p));
    carousel.visible = carIn > 0.001;
    if (carousel.visible) {
      const cs = clamp((p - TL.carousel[0]) / (TL.carousel[1] - TL.carousel[0])) * 6;
      const k = Math.min(5, Math.floor(cs));
      const steps = k + (k < 5 ? smooth(0.62, 1, cs - k) : 0);
      const theta = -steps * (Math.PI / 3);
      panels.forEach((m, i) => {
        const ang = i * (Math.PI / 3) + theta;
        m.position.set(Math.sin(ang) * RADIUS, Math.sin(t * 0.8 + i) * 0.05, Math.cos(ang) * RADIUS);
        m.rotation.y = ang;
        const facing = (Math.cos(ang) + 1) / 2;
        m.material.opacity = (0.1 + 0.9 * Math.pow(facing, 2.2)) * carIn;
        m.scale.setScalar(0.86 + 0.14 * facing);
      });
      carGlow.material.opacity = 0.45 * carIn;
    }

    /* Escena 5: fondo del chatbot */
    const outIn = smooth(0.58, 0.63, p) * (1 - smooth(0.71, 0.76, p));
    outline.visible = outIn > 0.001;
    outGlow.visible = outline.visible;
    if (outline.visible) {
      outline.material.opacity = 0.75 * outIn;
      outline.rotation.set(Math.sin(t * 0.4) * 0.08, -0.5 + p * 1.2 + Math.sin(t * 0.3) * 0.1, 0);
      outGlow.material.opacity = 0.35 * outIn;
    }

    /* Escena 6: carretera con los 4 pasos */
    roadGroup.visible = p > 0.62;
    const milesOn = smooth(0.73, 0.75, p) * (1 - smooth(0.865, 0.885, p));
    if (roadGroup.visible) {
      const u = roadU(p);
      road.getPointAt(u, vP);
      road.getTangentAt(u, vT);
      const xAxis = new Vector3(vT.x, 0, vT.z).normalize();
      const yAxis = new Vector3(vT.z, 0, -vT.x).normalize();
      m4.makeBasis(xAxis, yAxis, up);
      vehicle.quaternion.setFromRotationMatrix(m4);
      const arriving = smooth(0.92, 1, u);
      vehicle.position.set(vP.x, ROAD_Y + 0.14 + Math.sin(t * 3) * 0.02, vP.z);
      vehicle.scale.setScalar(Math.max(0.0001, 0.26 * (1 - arriving)));
      vGlow.position.set(vP.x, ROAD_Y + 0.25, vP.z);
      vGlow.material.opacity = 0.7 * (1 - arriving);
      gate.rotation.set(0, Math.atan2(camera.position.x - gate.position.x, camera.position.z - gate.position.z), 0);
      gateGlow.material.opacity = 0.35 + 0.5 * arriving;
      gateLight.intensity = 25 + 50 * arriving;
      miles.forEach((m) => {
        const active = u >= m.u - 0.012;
        m.ring.material.color.setHex(active ? 0x05dbff : 0x2a5fa8);
        m.beam.material.opacity = active ? 0.85 : 0.3;
        m.beam.rotation.set(0, Math.atan2(camera.position.x - m.beam.position.x, camera.position.z - m.beam.position.z), 0);
        if (m.label) {
          v3.copy(m.P);
          v3.y += 0.9;
          const [x, y, front] = toScreen(v3);
          // Se ocultan los hitos ya superados y los que caerían encima de los textos
          const h = stage.clientHeight;
          const fade = (1 - smooth(m.u + 0.04, m.u + 0.1, u)) * (1 - smooth(h * 0.56, h * 0.66, y));
          place(m.label, x + 20, y - 30, front ? milesOn * fade : 0);
          m.label.classList.toggle('is-active', active);
        }
      });
    } else {
      mileLabels.forEach((el) => { el.style.opacity = '0'; });
    }

    dust.rotation.y = t * 0.004;

    renderer.render(scene, camera);
  };

  return { render };
}

/* Arranque (al final para que todas las constantes ya estén definidas) */
if (section && !reduceMotion && hasWebGL()) setup(section);
