/* ==========================================================================
   PGA Transformaciones · «Del caos al piloto automático»
   Escena 3D que avanza con el scroll: un aluvión de tareas (emails, facturas,
   WhatsApp, hojas de cálculo) atraviesa el chevrón del logotipo y sale
   ordenado hacia CRM, ERP, clientes e informes.

   - Usa three.js (licencia MIT), alojado en assets/vendor/three/ y cargado
     solo cuando la sección está cerca de la pantalla.
   - Si el navegador no tiene WebGL o el usuario ha pedido reducir el
     movimiento, se queda la versión estática (sin animación).
   ========================================================================== */

const section = document.querySelector('[data-story]');
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;


/* ---------------------------------------------------------------------- */
/* Utilidades                                                             */
/* ---------------------------------------------------------------------- */
function hasWebGL() {
  try {
    // three.js necesita WebGL 2 (disponible en todos los navegadores actuales)
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
const easeOutBack = (t) => {
  const c1 = 1.5;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
};
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
/* Controlador: progreso del scroll, textos y carga perezosa de three.js  */
/* ---------------------------------------------------------------------- */
function setup(root) {
  root.classList.add('story--3d');
  const stage = root.querySelector('.story__stage');
  const steps = Array.from(root.querySelectorAll('[data-step]')).map((el) => ({
    el,
    from: Number(el.dataset.from),
    to: Number(el.dataset.to),
  }));
  const bar = root.querySelector('.story__bar span');
  const hint = root.querySelector('.story__hint');
  const cta = root.querySelector('.story__cta');

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
    steps.forEach(({ el, from, to }) => {
      const a = from <= 0 ? 1 : smooth(from - 0.035, from + 0.02, v);
      const b = to >= 1 ? 1 : 1 - smooth(to - 0.02, to + 0.035, v);
      const o = Math.min(a, b);
      el.style.opacity = o.toFixed(3);
      el.style.transform = `translate3d(0, ${((1 - a) * 34 - (1 - b) * 34).toFixed(1)}px, 0)`;
      el.style.visibility = o < 0.02 ? 'hidden' : 'visible';
    });
    if (bar) bar.style.transform = `scaleY(${v.toFixed(4)})`;
    if (hint) hint.style.opacity = (1 - smooth(0.005, 0.05, v)).toFixed(3);
    if (cta) {
      const c = smooth(0.84, 0.9, v);
      cta.style.opacity = c.toFixed(3);
      cta.style.transform = `translate3d(0, ${((1 - c) * 20).toFixed(1)}px, 0)`;
      cta.style.visibility = c < 0.05 ? 'hidden' : 'visible';
    }
  };

  const frame = (now) => {
    if (!running || disabled) return;
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    const target = measure();
    p += (target - p) * (1 - Math.exp(-dt * 6.5));
    if (Math.abs(target - p) < 0.0004) p = target;
    overlay(p);
    if (world) world.render(p, now / 1000);
    requestAnimationFrame(frame);
  };

  overlay(measure());

  new IntersectionObserver(([entry]) => {
    if (entry.isIntersecting && !running) {
      running = true;
      last = performance.now();
      p = measure();
      requestAnimationFrame(frame);
    } else if (!entry.isIntersecting) {
      running = false;
    }
  }).observe(root);

  const teardown = (err) => {
    // Si algo falla, volvemos a la versión estática.
    if (err) console.warn('Animación 3D desactivada:', err);
    disabled = true;
    root.classList.remove('story--3d');
  };

  const loader = new IntersectionObserver(([entry]) => {
    if (!entry.isIntersecting) return;
    loader.disconnect();
    import('../assets/vendor/three/three.module.min.js')
      .then((THREE) => createWorld(THREE, stage))
      .then((w) => {
        world = w;
        stage.classList.add('is-ready');
      })
      .catch(teardown);
  }, { rootMargin: '150% 0px' });
  loader.observe(root);
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
  { icon: 'users', name: 'CRM', unit: ['lead', 'leads'] },
  { icon: 'database', name: 'ERP', unit: ['factura', 'facturas'] },
  { icon: 'send', name: 'Clientes', unit: ['respuesta', 'respuestas'] },
  { icon: 'chart-column', name: 'Informes', unit: ['informe', 'informes'] },
];

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

const W = 512;
const H = 320;

function rawCard(type, icon) {
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const ctx = c.getContext('2d');
  rrect(ctx, 6, 6, W - 12, H - 12, 36);
  ctx.fillStyle = '#ffffff';
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = '#dbe4f0';
  ctx.stroke();
  // icono
  ctx.fillStyle = type.color;
  ctx.beginPath();
  ctx.arc(70, 72, 36, 0, Math.PI * 2);
  ctx.fill();
  if (icon) ctx.drawImage(icon, 46, 48, 48, 48);
  // textos
  ctx.fillStyle = '#041e3c';
  ctx.font = '800 31px Montserrat, Arial, sans-serif';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(fitText(ctx, type.title, W - 150), 124, 66);
  ctx.fillStyle = '#5d6d86';
  ctx.font = '500 23px Inter, Arial, sans-serif';
  ctx.fillText(fitText(ctx, type.sub, W - 150), 124, 100);
  // cuerpo
  if (type.icon === 'file-spreadsheet') {
    const x0 = 34;
    const y0 = 140;
    const cw = (W - 68) / 4;
    for (let r = 0; r < 4; r += 1) {
      for (let k = 0; k < 4; k += 1) {
        ctx.fillStyle = r === 0 ? '#d1fae5' : (r + k) % 2 ? '#f1f5f9' : '#f8fafc';
        ctx.fillRect(x0 + k * cw + 2, y0 + r * 36 + 2, cw - 4, 32);
      }
    }
  } else {
    const widths = type.icon === 'file-text' ? [0.86, 0.62, 0.74] : [0.88, 0.7, 0.5];
    widths.forEach((wf, i) => {
      rrect(ctx, 34, 146 + i * 40, (W - 68) * wf, 18, 9);
      ctx.fillStyle = '#e6edf6';
      ctx.fill();
    });
    if (type.icon === 'file-text') {
      ctx.fillStyle = '#041e3c';
      ctx.font = '800 26px Montserrat, Arial, sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText('1.250,00 €', W - 34, 282);
      ctx.textAlign = 'left';
    }
  }
  // aviso de «sin leer»
  if (type.icon === 'mail' || type.icon === 'message-circle') {
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.arc(W - 44, 50, 13, 0, Math.PI * 2);
    ctx.fill();
  }
  return c;
}

function doneCard(type, check) {
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const ctx = c.getContext('2d');
  rrect(ctx, 6, 6, W - 12, H - 12, 36);
  const g = ctx.createLinearGradient(0, 0, W, H);
  g.addColorStop(0, '#0c3466');
  g.addColorStop(1, '#041e3c');
  ctx.fillStyle = g;
  ctx.fill();
  ctx.lineWidth = 5;
  ctx.strokeStyle = 'rgba(5, 219, 255, 0.85)';
  ctx.stroke();
  // check
  ctx.fillStyle = 'rgba(46, 229, 157, 0.18)';
  ctx.beginPath();
  ctx.arc(70, 72, 36, 0, Math.PI * 2);
  ctx.fill();
  if (check) ctx.drawImage(check, 48, 50, 44, 44);
  ctx.fillStyle = '#ffffff';
  ctx.font = '800 32px Montserrat, Arial, sans-serif';
  ctx.fillText(fitText(ctx, type.done, W - 150), 124, 66);
  ctx.fillStyle = '#66e9ff';
  ctx.font = '600 23px Inter, Arial, sans-serif';
  ctx.fillText(fitText(ctx, type.doneSub, W - 150), 124, 100);
  // barra de progreso completada
  rrect(ctx, 34, 160, W - 68, 16, 8);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
  ctx.fill();
  rrect(ctx, 34, 160, W - 68, 16, 8);
  const gb = ctx.createLinearGradient(34, 0, W - 34, 0);
  gb.addColorStop(0, '#05dbff');
  gb.addColorStop(1, '#4f9dff');
  ctx.fillStyle = gb;
  ctx.fill();
  // firma con el chevrón
  ctx.save();
  ctx.translate(34, 222);
  ctx.scale(0.13, 0.13);
  ctx.beginPath();
  [[0, 0], [92, 0], [194, 118.5], [103, 231.5], [20, 231.5], [105, 118.5]].forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  ctx.closePath();
  const gc = ctx.createLinearGradient(0, 0, 140, 181);
  gc.addColorStop(0, '#05dbff');
  gc.addColorStop(1, '#0046e2');
  ctx.fillStyle = gc;
  ctx.fill();
  ctx.restore();
  ctx.fillStyle = '#a9b9d0';
  ctx.font = '600 21px Inter, Arial, sans-serif';
  ctx.fillText('Automatizado por PGA', 70, 247);
  return c;
}

function nodeTile(icon) {
  const s = 256;
  const c = document.createElement('canvas');
  c.width = s;
  c.height = s;
  const ctx = c.getContext('2d');
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

function radial(inner, size = 256) {
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const ctx = c.getContext('2d');
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
  const canvas = stage.querySelector('.story__canvas');
  const labels = Array.from(stage.querySelectorAll('[data-node]'));
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
  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 120);

  /* --- Entorno para los reflejos del chevrón --- */
  const pmrem = new THREE.PMREMGenerator(renderer);
  const env = new THREE.Scene();
  env.background = new THREE.Color(0x020c1b);
  const panel = (hex, k, w, h, pos, rot) => {
    const m = new THREE.Mesh(
      new THREE.PlaneGeometry(w, h),
      new THREE.MeshBasicMaterial({ color: new THREE.Color(hex).multiplyScalar(k), side: THREE.DoubleSide }),
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

  /* --- Chevrón 3D (misma forma que el logotipo) --- */
  const CH = [[690, 0], [782, 0], [884, 118.5], [793, 231.5], [710, 231.5], [795, 118.5]];
  const rounded = new Set([1, 2, 3]);
  const pts = CH.map(([x, y]) => new THREE.Vector2(x - 787, -(y - 115.75)));
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
  // Degradado cian → azul como en el logotipo
  const pos = chevGeo.attributes.position;
  const colors = new Float32Array(pos.count * 3);
  const cA = new THREE.Color('#05dbff');
  const cB = new THREE.Color('#0046e2');
  const tmp = new THREE.Color();
  const g0 = new THREE.Vector2(-97, 115.75);
  const gv = new THREE.Vector2(140, -181.5);
  const gl = gv.lengthSq();
  for (let i = 0; i < pos.count; i += 1) {
    const t = clamp(((pos.getX(i) - g0.x) * gv.x + (pos.getY(i) - g0.y) * gv.y) / gl);
    tmp.copy(cA).lerp(cB, t);
    colors.set([tmp.r, tmp.g, tmp.b], i * 3);
  }
  chevGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  const CHEV_SCALE = 3.1 / 231.5;
  chevGeo.scale(CHEV_SCALE, CHEV_SCALE, CHEV_SCALE);
  const chevron = new THREE.Mesh(chevGeo, new THREE.MeshPhysicalMaterial({
    vertexColors: true,
    metalness: 0.25,
    roughness: 0.16,
    clearcoat: 1,
    clearcoatRoughness: 0.06,
    envMapIntensity: 1.25,
    emissive: new THREE.Color(0x00265f),
    emissiveIntensity: 0.6,
  }));
  scene.add(chevron);

  const glowTex = new THREE.CanvasTexture(radial('rgba(60, 200, 255, 1)'));
  glowTex.colorSpace = THREE.SRGBColorSpace;
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({
    map: glowTex, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, fog: false, toneMapped: false,
  }));
  glow.position.set(0.3, 0, -1.2);
  scene.add(glow);
  const flash = new THREE.Sprite(new THREE.SpriteMaterial({
    map: glowTex, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, fog: false, toneMapped: false,
  }));
  flash.scale.set(2.6, 2.6, 1);
  scene.add(flash);

  /* --- Tarjetas (tareas) --- */
  const [icons, check, nodeIcons] = await Promise.all([
    Promise.all(TYPES.map((t) => iconImage(t.icon, '#ffffff'))),
    iconImage('check', '#2ee59d'),
    Promise.all(NODES.map((n) => iconImage(n.icon, '#ffffff'))),
  ]);
  const maxAniso = renderer.capabilities.getMaxAnisotropy();
  const tex = (cnv) => {
    const t = new THREE.CanvasTexture(cnv);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = Math.min(8, maxAniso);
    return t;
  };
  const PER_TYPE = small ? 7 : 10;
  const cardGeo = new THREE.PlaneGeometry(1.36, 0.85);
  const cardMat = (map) => new THREE.MeshBasicMaterial({
    map, side: THREE.DoubleSide, alphaToCoverage: true, alphaTest: 0.02, toneMapped: false,
  });
  const rawMeshes = TYPES.map((t, i) => new THREE.InstancedMesh(cardGeo, cardMat(tex(rawCard(t, icons[i]))), PER_TYPE));
  const doneMeshes = TYPES.map((t) => new THREE.InstancedMesh(cardGeo, cardMat(tex(doneCard(t, check))), PER_TYPE));
  [...rawMeshes, ...doneMeshes].forEach((m) => {
    m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    m.frustumCulled = false;
    scene.add(m);
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
        r: [rand(), rand(), rand()],
        e: new THREE.Euler((rand() - 0.5) * 1.4, (rand() - 0.5) * 1.8, (rand() - 0.5) * 1.1),
        s: [rand() * 6.28, rand() * 6.28, rand() * 6.28, rand() * 6.28],
        sw: rand() * Math.PI * 2,
      });
    }
  });
  // reparto uniforme de las salidas para que el flujo sea continuo
  cards.sort((a, b) => a.d - b.d).forEach((c, i) => { c.d = (i + rand() * 0.6) / cards.length; });

  /* --- Carriles y destinos --- */
  const laneGroup = new THREE.Group();
  scene.add(laneGroup);
  const laneMat = new THREE.MeshBasicMaterial({
    color: 0x48c6ff, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, fog: false,
  });
  const nodeGlowMat = () => new THREE.SpriteMaterial({
    map: glowTex, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, fog: false, toneMapped: false,
  });
  const tileGeo = new THREE.PlaneGeometry(1.1, 1.1);
  const nodes = NODES.map((n, i) => {
    const tile = new THREE.Mesh(tileGeo, new THREE.MeshBasicMaterial({
      map: tex(nodeTile(nodeIcons[i])), alphaToCoverage: true, alphaTest: 0.02, toneMapped: false, side: THREE.DoubleSide,
    }));
    const halo = new THREE.Sprite(nodeGlowMat());
    halo.scale.set(3.2, 3.2, 1);
    scene.add(halo);
    scene.add(tile);
    return { tile, halo, curve: null, tube: null, count: 0, label: labels[i] };
  });

  const DOTS_PER_LANE = 7;
  const dotGeo = new THREE.BufferGeometry();
  const dotPos = new Float32Array(NODES.length * DOTS_PER_LANE * 3);
  dotGeo.setAttribute('position', new THREE.BufferAttribute(dotPos, 3));
  const dotMat = new THREE.PointsMaterial({
    color: 0x8fe9ff, size: 0.11, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, fog: false,
  });
  const dots = new THREE.Points(dotGeo, dotMat);
  dots.frustumCulled = false;
  scene.add(dots);

  /* --- Polvo de datos al fondo --- */
  const DUST = small ? 260 : 520;
  const dustPos = new Float32Array(DUST * 3);
  for (let i = 0; i < DUST; i += 1) {
    dustPos.set([(rand() - 0.5) * 34, (rand() - 0.5) * 18, -16 + rand() * 20], i * 3);
  }
  const dustGeo = new THREE.BufferGeometry();
  dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3));
  const dust = new THREE.Points(dustGeo, new THREE.PointsMaterial({
    color: 0x5fcfff, size: 0.05, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false,
  }));
  scene.add(dust);

  /* --- Composición según el formato de pantalla --- */
  const E = new THREE.Vector3(-2.1, 0, 0); // entrada (muesca del chevrón)
  const S = new THREE.Vector3(1.95, 0, 0); // salida (punta)
  let L = null;

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
    const k = (pd, pm) => pm.map((v, i) => lerp(v, pd[i], q));
    L = {
      q,
      nodeX,
      tile: lerp(0.86, 1, q),
      chaosX: [lerp(-7.5, -10.5, q), lerp(0.5, 3.5, q)],
      chaosY: lerp(5.2, 4.6, q),
      cam: [
        // [p, posición, objetivo] — en móvil la escena sube para dejar sitio a los textos
        [0.0, k([-2.2, 0.6, 13.6], [-3.0, 0.2, 18]), k([-2.0, -0.2, 0], [-3.0, -1.6, 0])],
        [0.24, k([-0.5, 0.3, 12.8], [-0.2, 0.1, 17.5]), k([-0.2, -0.5, 0], [0.1, -1.7, 0])],
        [0.5, k([1.4, 0.5, 14.6], [2.0, 0.3, 18.5]), k([1.9, -0.6, 0], [2.4, -1.9, 0])],
        [0.78, k([3.0, 1.8, 15.0], [4.0, 1.0, 19]), k([2.6, -0.7, 0], [4.1, -2.1, 0])],
        [1.0, k([3.4, 2.2, 15.4], [4.3, 1.3, 19.5]), k([2.7, -0.8, 0], [4.2, -2.2, 0])],
      ],
    };
    nodes.forEach((n, i) => {
      const end = new THREE.Vector3(nodeX, laneY[i], 0);
      n.curve = new THREE.QuadraticBezierCurve3(S.clone(), new THREE.Vector3(lerp(S.x, nodeX, 0.5), laneY[i] * 0.95, 0), end);
      if (n.tube) {
        laneGroup.remove(n.tube);
        n.tube.geometry.dispose();
      }
      n.tube = new THREE.Mesh(new THREE.TubeGeometry(n.curve, 72, 0.024, 8, false), laneMat);
      laneGroup.add(n.tube);
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

  /* --- Cámara (con un poco de parallax con el ratón) --- */
  const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
  if (window.matchMedia('(pointer: fine)').matches) {
    window.addEventListener('pointermove', (e) => {
      pointer.tx = (e.clientX / window.innerWidth - 0.5) * 2;
      pointer.ty = (e.clientY / window.innerHeight - 0.5) * 2;
    }, { passive: true });
  }
  const camPos = new THREE.Vector3();
  const camLook = new THREE.Vector3();
  const keyAt = (p, idx) => {
    const ks = L.cam;
    let i = 0;
    while (i < ks.length - 2 && p > ks[i + 1][0]) i += 1;
    const [p0, a0, b0] = ks[i];
    const [p1, a1, b1] = ks[i + 1];
    const t = easeInOut(clamp((p - p0) / (p1 - p0)));
    const A = idx === 1 ? a0 : b0;
    const B = idx === 1 ? a1 : b1;
    return [lerp(A[0], B[0], t), lerp(A[1], B[1], t), lerp(A[2], B[2], t)];
  };

  /* --- Bucle de dibujo --- */
  const m4 = new THREE.Matrix4();
  const v3 = new THREE.Vector3();
  const sc = new THREE.Vector3();
  const qa = new THREE.Quaternion();
  const qb = new THREE.Quaternion();
  const qFlat = new THREE.Quaternion();
  const eTmp = new THREE.Euler();
  const zero = new THREE.Matrix4().makeScale(0, 0, 0);
  const P1 = new THREE.Vector3();
  const P2 = new THREE.Vector3();
  const bez = (a, b, c, d, t, out) => {
    const it = 1 - t;
    return out.set(
      it * it * it * a.x + 3 * it * it * t * b.x + 3 * it * t * t * c.x + t * t * t * d.x,
      it * it * it * a.y + 3 * it * it * t * b.y + 3 * it * t * t * c.y + t * t * t * d.y,
      it * it * it * a.z + 3 * it * it * t * b.z + 3 * it * t * t * c.z + t * t * t * d.z,
    );
  };
  const chaosP = new THREE.Vector3();
  const tan = new THREE.Vector3();
  const proj = new THREE.Vector3();

  const render = (p, t) => {
    // Cámara
    pointer.x += (pointer.tx - pointer.x) * 0.05;
    pointer.y += (pointer.ty - pointer.y) * 0.05;
    camPos.set(...keyAt(p, 1));
    camLook.set(...keyAt(p, 2));
    camera.position.set(camPos.x + pointer.x * 0.45, camPos.y - pointer.y * 0.3, camPos.z);
    camera.lookAt(camLook);

    // Chevrón
    const appear = smooth(0.1, 0.3, p);
    const s = Math.max(0.0001, easeOutBack(appear));
    chevron.scale.setScalar(s);
    chevron.rotation.set(
      Math.sin(t * 0.7) * 0.03,
      lerp(-1.25, 0.12, easeOut(appear)) + smooth(0.75, 1, p) * 0.32 + Math.sin(t * 0.5) * 0.05,
      0,
    );
    chevron.position.y = Math.sin(t * 0.9) * 0.05;

    // Tarjetas
    let inside = 0;
    nodes.forEach((n) => { n.count = 0; n.pulse = 0; });
    cards.forEach((c) => {
      const raw = rawMeshes[c.type];
      const done = doneMeshes[c.type];
      const start = 0.16 + c.d * 0.44;
      const f = clamp((p - start) / 0.27);
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
        v3.copy(chaosP);
        qb.copy(qa);
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

    // Brillos
    const activity = clamp(inside / 3);
    glow.material.opacity = 0.32 * s + 0.4 * activity;
    glow.scale.setScalar(7.5 + activity * 1.5 + Math.sin(t * 2) * 0.15);
    flash.position.set(S.x - 0.55, 0, 0.5);
    flash.material.opacity = 0.75 * activity;
    rim.intensity = 30 + activity * 60;

    // Carriles, puntos y destinos
    const reveal = smooth(0.3, 0.5, p);
    nodes.forEach((n, i) => {
      const r = clamp(reveal * 1.25 - i * 0.08);
      const idx = n.tube.geometry.index.count;
      n.tube.geometry.setDrawRange(0, Math.floor((idx * r) / 6) * 6);
      const appearN = easeOutBack(smooth(0.34 + i * 0.03, 0.46 + i * 0.03, p));
      const pulse = 1 + n.pulse * 0.18;
      n.tile.scale.setScalar(Math.max(0.0001, appearN * pulse * L.tile));
      n.halo.material.opacity = appearN * (0.22 + n.pulse * 0.55);
      if (n.label) {
        proj.copy(n.tile.position);
        proj.x += 0.72 * L.tile;
        proj.project(camera);
        const x = (proj.x * 0.5 + 0.5) * stage.clientWidth;
        const y = (-proj.y * 0.5 + 0.5) * stage.clientHeight;
        n.label.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) translateY(-50%)`;
        n.label.style.opacity = smooth(0.42, 0.5, p).toFixed(3);
        const num = n.label.querySelector('[data-count]');
        const unit = NODES[i].unit[n.count === 1 ? 0 : 1];
        const text = `${n.count} ${unit}`;
        if (num && num.textContent !== text) num.textContent = text;
      }
    });
    for (let i = 0; i < NODES.length; i += 1) {
      for (let k2 = 0; k2 < DOTS_PER_LANE; k2 += 1) {
        const u = (t * 0.22 + k2 / DOTS_PER_LANE + i * 0.13) % 1;
        nodes[i].curve.getPoint(u, v3);
        dotPos.set([v3.x, v3.y, v3.z], (i * DOTS_PER_LANE + k2) * 3);
      }
    }
    dotGeo.attributes.position.needsUpdate = true;
    dotMat.opacity = reveal * 0.9;

    dust.rotation.y = t * 0.012;
    dust.position.x = -p * 2;

    renderer.render(scene, camera);
  };

  return { render };
}

/* Arranque (al final para que todas las constantes ya estén definidas) */
if (section && !reduceMotion && hasWebGL()) setup(section);
