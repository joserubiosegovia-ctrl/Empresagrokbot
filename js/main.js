/* ==========================================================================
   PGA Transformaciones · Interacciones de la web
   ========================================================================== */
(() => {
  'use strict';

  /* ------------------------------------------------------------------------
     CONFIGURACIÓN · cambia estos valores para personalizar la web
     ------------------------------------------------------------------------ */
  const CONFIG = {
    // Servicio para recibir el formulario sin salir de la web (Formspree, Getform, Basin…).
    // Ejemplo: 'https://formspree.io/f/abcdwxyz'
    // Si se deja vacío, el formulario abre el programa de correo del visitante con la
    // solicitud ya redactada y dirigida al email que aparece en la sección de contacto.
    formEndpoint: '',

    // Número de WhatsApp con prefijo de país, sin espacios ni «+». Ejemplo: '34600123456'
    // Si se deja vacío, no se muestra el botón flotante de WhatsApp.
    whatsapp: '',
    whatsappMessage: 'Hola, me gustaría saber qué podemos automatizar en mi empresa.',
  };

  /* ------------------------------------------------------------------------ */
  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));
  const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const hasIO = 'IntersectionObserver' in window;

  const nf = (opts) => {
    try {
      return new Intl.NumberFormat('es-ES', { useGrouping: 'always', ...opts });
    } catch (e) {
      return new Intl.NumberFormat('es-ES', opts);
    }
  };
  const fmtInt = nf({ maximumFractionDigits: 0 });
  const fmtEur = nf({ style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });
  const fmtOne = nf({ minimumFractionDigits: 1, maximumFractionDigits: 1 });

  const contactLink = $('[data-contact-email]');
  const contactEmail = contactLink ? contactLink.getAttribute('href').replace(/^mailto:/i, '') : '';

  /* ---------- Año del pie ---------- */
  $$('[data-year]').forEach((el) => { el.textContent = String(new Date().getFullYear()); });

  /* ---------- Cabecera: fondo al hacer scroll ---------- */
  const header = $('[data-header]');
  const onScroll = () => header.classList.toggle('is-scrolled', window.scrollY > 8);
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  /* ---------- Menú móvil ---------- */
  const nav = $('[data-nav]');
  const navToggle = $('[data-nav-toggle]');
  const navToggleLabel = $('.visually-hidden', navToggle);
  const outside = [$('main'), $('.site-footer')];

  const setNav = (open) => {
    nav.classList.toggle('is-open', open);
    header.classList.toggle('is-open', open);
    document.body.classList.toggle('nav-open', open);
    navToggle.setAttribute('aria-expanded', String(open));
    navToggleLabel.textContent = open ? 'Cerrar menú' : 'Abrir menú';
    outside.forEach((el) => { if (el) el.inert = open; });
  };
  navToggle.addEventListener('click', () => {
    const open = navToggle.getAttribute('aria-expanded') !== 'true';
    setNav(open);
    if (open) { const first = $('a', nav); if (first) first.focus({ preventScroll: true }); }
  });
  nav.addEventListener('click', (e) => { if (e.target.closest('a')) setNav(false); });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && nav.classList.contains('is-open')) {
      setNav(false);
      navToggle.focus();
    }
  });
  window.matchMedia('(min-width: 1080px)').addEventListener('change', (e) => { if (e.matches) setNav(false); });

  /* ---------- Enlace activo del menú según la sección visible ---------- */
  const navLinks = $$('.nav__list a');
  if (hasIO && navLinks.length) {
    const byId = new Map(navLinks.map((a) => [a.getAttribute('href').slice(1), a]));
    const spy = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const active = byId.get(entry.target.id);
        navLinks.forEach((a) => {
          const on = a === active;
          a.classList.toggle('is-active', on);
          if (on) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current');
        });
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    $$('main section[id]').forEach((s) => spy.observe(s));
  }

  /* ---------- Animaciones de entrada ---------- */
  const revealEls = $$('[data-reveal]');
  const finishReveal = (el) => {
    el.classList.add('is-visible');
    // Al terminar, se quita el atributo para que cada elemento recupere sus propias transiciones.
    const done = () => el.removeAttribute('data-reveal');
    el.addEventListener('transitionend', done, { once: true });
    setTimeout(done, 1700);
  };
  if (!hasIO || reduceMotion) {
    revealEls.forEach((el) => { el.classList.add('is-visible'); el.removeAttribute('data-reveal'); });
  } else {
    const counters = new Map();
    revealEls.forEach((el) => {
      const parent = el.parentElement;
      const i = counters.get(parent) || 0;
      el.style.setProperty('--rd', `${Math.min(i, 5) * 0.08}s`);
      counters.set(parent, i + 1);
    });
    const revealer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        finishReveal(entry.target);
        revealer.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    revealEls.forEach((el) => revealer.observe(el));
  }

  /* ---------- Hero: actividad simulada del panel ---------- */
  const hero = $('.hero');
  const ticker = $('[data-ticker]');
  const kpiTasks = $('[data-kpi-tasks]');
  const kpiHours = $('[data-kpi-hours]');
  const EVENTS = [
    'Pedido #4821 confirmado y albarán generado',
    'Informe semanal enviado a dirección',
    'Cita reservada y recordatorio programado',
    'Email de cliente clasificado y respondido',
    'Candidatura preseleccionada para entrevista',
    'Stock bajo: pedido al proveedor preparado',
    'Factura de proveedor registrada en el ERP',
    'Consulta por WhatsApp resuelta en 8 s',
    'Nuevo lead cualificado y asignado',
  ];
  const TIMES = ['ahora', 'hace 3 s', 'hace 6 s'];
  let eventIndex = 0;
  let tasks = 1284;
  let hours = 126;
  let tickTimer = null;

  const tick = () => {
    if (!ticker || !ticker.firstElementChild) return;
    const item = ticker.firstElementChild.cloneNode(true);
    $('span', item).textContent = EVENTS[eventIndex % EVENTS.length];
    eventIndex += 1;
    ticker.prepend(item);
    while (ticker.children.length > 3) ticker.lastElementChild.remove();
    Array.from(ticker.children).forEach((li, i) => {
      li.classList.toggle('is-new', i === 0);
      $('time', li).textContent = TIMES[i];
    });
    tasks += 1 + Math.floor(Math.random() * 3);
    hours += 0.1;
    if (kpiTasks) kpiTasks.textContent = fmtInt.format(tasks);
    if (kpiHours) kpiHours.textContent = fmtOne.format(hours);
  };
  const startTicker = () => { if (!tickTimer) tickTimer = setInterval(tick, 3000); };
  const stopTicker = () => { clearInterval(tickTimer); tickTimer = null; };

  if (hero && !reduceMotion) {
    if (hasIO) {
      new IntersectionObserver(([entry]) => {
        hero.classList.toggle('is-paused', !entry.isIntersecting);
        if (entry.isIntersecting && !document.hidden) startTicker(); else stopTicker();
      }).observe(hero);
    } else {
      startTicker();
    }
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) stopTicker();
      else if (!hero.classList.contains('is-paused')) startTicker();
    });
  }

  /* ---------- Interruptor «Antes / Con PGA» ---------- */
  const flipSwitch = $('[data-switch]');
  const flipGrid = $('[data-flip-grid]');
  if (flipSwitch && flipGrid) {
    const buttons = $$('[data-mode]', flipSwitch);
    flipSwitch.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-mode]');
      if (!btn) return;
      const after = btn.dataset.mode === 'after';
      flipSwitch.classList.toggle('is-after', after);
      flipGrid.classList.toggle('is-after', after);
      buttons.forEach((b) => {
        const on = b === btn;
        b.classList.toggle('is-active', on);
        b.setAttribute('aria-pressed', String(on));
      });
      $$('.flip', flipGrid).forEach((card) => {
        $('.flip__face--before', card).setAttribute('aria-hidden', String(after));
        $('.flip__face--after', card).setAttribute('aria-hidden', String(!after));
      });
    });
  }

  /* ---------- Demo de chatbot ---------- */
  const SCENARIOS = {
    clinica: {
      name: 'Asistente · Clínica',
      flow: {
        start: {
          bot: ['¡Hola! Soy el asistente virtual de la clínica. ¿En qué te puedo ayudar?'],
          replies: [['Quiero pedir cita', 'cita'], ['¿Qué horario tenéis?', 'horario'], ['¿Cuánto cuesta una limpieza?', 'precio']],
        },
        cita: {
          bot: ['¡Perfecto! Estos son los próximos huecos libres:\nMartes 10:30 · Miércoles 17:00 · Jueves 12:15', '¿Cuál te viene mejor?'],
          replies: [['Miércoles a las 17:00', 'reservada'], ['Jueves a las 12:15', 'reservada']],
        },
        reservada: {
          bot: ['¡Hecho! Tu cita queda reservada ✓', 'Te he enviado la confirmación por WhatsApp y te recordaré la cita 24 horas antes.'],
          replies: [['Hablar con una persona', 'humano'], ['Empezar de nuevo', 'start']],
        },
        horario: {
          bot: ['Abrimos de lunes a viernes de 9:00 a 20:00 y los sábados de 10:00 a 14:00.', '¿Quieres que te busque un hueco?'],
          replies: [['Sí, quiero pedir cita', 'cita'], ['No, gracias', 'fin']],
        },
        precio: {
          bot: ['La limpieza dental cuesta 45 € e incluye una revisión completa.', '¿Te reservo cita?'],
          replies: [['Sí, resérvame cita', 'cita'], ['Hablar con una persona', 'humano']],
        },
        humano: {
          bot: ['Te paso con recepción. Ya tienen un resumen de la conversación, así que no tendrás que repetir nada.', 'Te escribirán por aquí en unos minutos.'],
          replies: [['Empezar de nuevo', 'start']],
        },
        fin: {
          bot: ['¡A ti! Aquí estaré a cualquier hora si necesitas algo.'],
          replies: [['Empezar de nuevo', 'start']],
        },
      },
    },
    tienda: {
      name: 'Asistente · Tienda online',
      flow: {
        start: {
          bot: ['¡Hola! Soy el asistente de la tienda. ¿Te ayudo con algo?'],
          replies: [['¿Dónde está mi pedido?', 'pedido'], ['¿Tenéis la chaqueta en talla M?', 'talla'], ['Quiero hacer una devolución', 'devolucion']],
        },
        pedido: {
          bot: ['He encontrado tu pedido #48213.', 'Salió ayer del almacén y llegará mañana entre las 10:00 y las 14:00. ¿Quieres que te avise cuando esté en reparto?'],
          replies: [['Sí, avísame', 'aviso'], ['No hace falta, gracias', 'fin']],
        },
        aviso: {
          bot: ['¡Listo! Te enviaré un WhatsApp cuando el repartidor esté de camino ✓'],
          replies: [['Tengo otra consulta', 'start']],
        },
        talla: {
          bot: ['¡Sí! Quedan 3 unidades en talla M: 2 en azul y 1 en negro.', '¿Te la reservo y te envío el enlace de pago?'],
          replies: [['Sí, en azul', 'reserva'], ['Mejor en negro', 'reserva']],
        },
        reserva: {
          bot: ['Reservada ✓ Te acabo de enviar el enlace de pago seguro por email.', 'Te la guardo durante 30 minutos.'],
          replies: [['Tengo otra consulta', 'start']],
        },
        devolucion: {
          bot: ['Sin problema. He generado tu etiqueta de devolución gratuita y te la he enviado por email.', 'Puedes dejar el paquete en cualquier punto de recogida.'],
          replies: [['Hablar con una persona', 'humano'], ['Tengo otra consulta', 'start']],
        },
        humano: {
          bot: ['Te paso con atención al cliente junto con el resumen de tu caso. Te responderán en breve.'],
          replies: [['Empezar de nuevo', 'start']],
        },
        fin: {
          bot: ['¡Perfecto! Aquí estoy si necesitas cualquier cosa.'],
          replies: [['Empezar de nuevo', 'start']],
        },
      },
    },
    inmobiliaria: {
      name: 'Asistente · Inmobiliaria',
      flow: {
        start: {
          bot: ['¡Hola! Soy el asistente de la inmobiliaria. ¿Buscas comprar, alquilar o vender?'],
          replies: [['Quiero comprar', 'comprar'], ['Busco alquiler', 'alquilar'], ['Quiero vender mi piso', 'vender']],
        },
        comprar: {
          bot: ['¡Genial! ¿Qué zona y presupuesto tienes en mente?'],
          replies: [['Centro, hasta 250.000 €', 'opciones'], ['Afueras, con jardín', 'opciones']],
        },
        alquilar: {
          bot: ['¡Perfecto! ¿Cuántas habitaciones necesitas y qué presupuesto mensual tienes?'],
          replies: [['2 habitaciones, hasta 900 €', 'opciones'], ['3 habitaciones, hasta 1.200 €', 'opciones']],
        },
        opciones: {
          bot: ['Tengo 4 viviendas que encajan contigo. Te las acabo de enviar por email con fotos y planos.', '¿Te gustaría visitar alguna esta semana?'],
          replies: [['Sí, el viernes por la tarde', 'visita'], ['Prefiero que me llamen', 'humano']],
        },
        visita: {
          bot: ['Visita agendada el viernes a las 18:00 ✓', 'Un agente te acompañará y recibirás un recordatorio ese mismo día.'],
          replies: [['Empezar de nuevo', 'start']],
        },
        vender: {
          bot: ['¡Te ayudamos! Con unos datos básicos preparamos una valoración gratuita.', '¿Cuántos metros tiene y en qué zona está?'],
          replies: [['90 m², zona norte', 'valoracion'], ['120 m², centro', 'valoracion']],
        },
        valoracion: {
          bot: ['Gracias. Un asesor te enviará la valoración y te llamará para resolver tus dudas.'],
          replies: [['Empezar de nuevo', 'start']],
        },
        humano: {
          bot: ['Hecho. Un agente te llamará hoy mismo y ya tiene el resumen de lo que buscas.'],
          replies: [['Empezar de nuevo', 'start']],
        },
      },
    },
  };

  const chatLog = $('[data-chat-log]');
  const chatReplies = $('[data-chat-replies]');
  const chatName = $('[data-chat-name]');
  const scenarioGroup = $('[data-scenarios]');

  if (chatLog && chatReplies) {
    const chat = { scenario: 'clinica', run: 0, step: 0, started: false };

    const addMessage = (text, who) => {
      const p = document.createElement('p');
      p.className = `msg msg--${who}`;
      p.textContent = text;
      chatLog.appendChild(p);
      chatLog.scrollTop = chatLog.scrollHeight;
      return p;
    };

    const addTyping = () => {
      const p = document.createElement('p');
      p.className = 'msg msg--bot msg--typing';
      p.setAttribute('aria-hidden', 'true');
      p.innerHTML = '<i></i><i></i><i></i>';
      chatLog.appendChild(p);
      chatLog.scrollTop = chatLog.scrollHeight;
      return p;
    };

    const say = async (lines, run) => {
      for (const line of lines) {
        if (run !== chat.run) return false;
        if (!reduceMotion) {
          const typing = addTyping();
          await wait(Math.min(450 + line.length * 13, 1500));
          typing.remove();
          if (run !== chat.run) return false;
        }
        addMessage(line, 'bot');
      }
      return true;
    };

    // Muestra los mensajes del bot de un paso y después sus respuestas rápidas.
    const go = async (key, opts = {}) => {
      const run = chat.run;
      const node = SCENARIOS[chat.scenario].flow[key];
      chatReplies.innerHTML = '';
      const ok = await say(node.bot, run);
      if (!ok) return false;
      node.replies.forEach(([label, next], i) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = `reply${opts.hint && i === 0 ? ' reply--hint' : ''}`;
        b.textContent = label;
        b.addEventListener('click', (e) => choose(label, next, { focus: e.detail === 0 }));
        chatReplies.appendChild(b);
      });
      chatLog.scrollTop = chatLog.scrollHeight;
      if (opts.focus && chatReplies.firstElementChild) chatReplies.firstElementChild.focus({ preventScroll: true });
      return true;
    };

    const choose = (label, next, opts = {}) => {
      chat.step += 1;
      chatReplies.innerHTML = '';
      addMessage(label, 'user');
      return go(next, opts);
    };

    const start = async (scenario, opts = {}) => {
      chat.run += 1;
      chat.step = 0;
      chat.scenario = scenario;
      chat.started = true;
      chatLog.innerHTML = '';
      if (chatName) chatName.textContent = SCENARIOS[scenario].name;
      const run = chat.run;
      const ok = await go('start', opts);
      if (!ok || !opts.autoplay) return;
      // Demostración automática: el «cliente» elige la primera opción si el visitante no ha tocado nada.
      await wait(1500);
      if (run !== chat.run || chat.step !== 0) return;
      const [label, next] = SCENARIOS[scenario].flow.start.replies[0];
      choose(label, next, { hint: true });
    };

    if (scenarioGroup) {
      scenarioGroup.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-scenario]');
        if (!btn) return;
        $$('[data-scenario]', scenarioGroup).forEach((b) => {
          const on = b === btn;
          b.classList.toggle('is-active', on);
          b.setAttribute('aria-pressed', String(on));
        });
        start(btn.dataset.scenario, { focus: e.detail === 0 });
      });
    }

    if (hasIO) {
      const watcher = new IntersectionObserver(([entry]) => {
        if (entry.isIntersecting && !chat.started) {
          start('clinica', { autoplay: !reduceMotion, hint: reduceMotion });
          watcher.disconnect();
        }
      }, { threshold: 0.35 });
      watcher.observe(chatLog);
    } else {
      start('clinica', { hint: true });
    }
  }

  /* ---------- Pestañas de casos de uso ---------- */
  $$('[data-tabs]').forEach((root) => {
    const tabs = $$('[role="tab"]', root);
    const panels = tabs.map((t) => document.getElementById(t.getAttribute('aria-controls')));
    const list = $('[role="tablist"]', root);

    const select = (index, focus) => {
      tabs.forEach((tab, i) => {
        const on = i === index;
        tab.setAttribute('aria-selected', String(on));
        tab.tabIndex = on ? 0 : -1;
        panels[i].hidden = !on;
      });
      if (focus) tabs[index].focus();
      if (list.scrollWidth > list.clientWidth) {
        list.scrollTo({ left: tabs[index].offsetLeft - list.offsetLeft - 16, behavior: reduceMotion ? 'auto' : 'smooth' });
      }
    };

    tabs.forEach((tab, i) => {
      tab.addEventListener('click', () => select(i));
      tab.addEventListener('keydown', (e) => {
        const keys = { ArrowRight: i + 1, ArrowLeft: i - 1, Home: 0, End: tabs.length - 1 };
        if (!(e.key in keys)) return;
        e.preventDefault();
        select((keys[e.key] + tabs.length) % tabs.length, true);
      });
    });
    select(0, false);
  });

  /* ---------- Calculadora de ahorro ---------- */
  const calc = $('[data-calc]');
  if (calc) {
    const WEEKS_PER_YEAR = 45;
    const HOURS_PER_FTE = 1760;
    const ranges = $$('input[type="range"]', calc);
    const out = (name) => $(`[data-out="${name}"]`, calc);
    const res = (name) => $(`[data-res="${name}"]`);
    const bar = $('[data-res-bar]');
    const live = $('[data-calc-live]');
    let liveTimer = null;

    const tween = (el, to, format) => {
      if (!el) return;
      const from = typeof el._value === 'number' ? el._value : to;
      el._value = to;
      if (reduceMotion || from === to) { el.textContent = format(to); return; }
      const t0 = performance.now();
      const dur = 450;
      cancelAnimationFrame(el._raf);
      const step = (now) => {
        const p = Math.min((now - t0) / dur, 1);
        const eased = 1 - Math.pow(1 - p, 3);
        el.textContent = format(from + (to - from) * eased);
        if (p < 1) el._raf = requestAnimationFrame(step);
      };
      el._raf = requestAnimationFrame(step);
    };

    const update = () => {
      const people = Number($('[name="people"]', calc).value);
      const hoursWeek = Number($('[name="hours"]', calc).value);
      const cost = Number($('[name="cost"]', calc).value);
      const checked = $('[name="pct"]:checked', calc);
      const pct = Number(checked ? checked.value : 0.5);

      ranges.forEach((r) => {
        const p = ((r.value - r.min) / (r.max - r.min)) * 100;
        r.style.setProperty('--p', `${p}%`);
      });
      out('people').textContent = fmtInt.format(people);
      out('hours').textContent = `${hoursWeek} h`;
      out('cost').textContent = `${cost} €`;

      const hoursYear = people * hoursWeek * WEEKS_PER_YEAR * pct;
      const money = hoursYear * cost;
      const fte = hoursYear / HOURS_PER_FTE;

      tween(res('hours'), hoursYear, (n) => fmtInt.format(Math.round(n)));
      tween(res('money'), money, (n) => fmtEur.format(Math.round(n / 10) * 10));
      res('fte').textContent = fmtOne.format(fte);
      if (bar) bar.style.setProperty('--w', `${pct * 100}%`);

      clearTimeout(liveTimer);
      liveTimer = setTimeout(() => {
        if (live) {
          live.textContent = `Ahorro estimado: ${fmtEur.format(Math.round(money / 10) * 10)} al año y ${fmtInt.format(Math.round(hoursYear))} horas recuperadas.`;
        }
      }, 700);
    };

    calc.addEventListener('input', update);
    calc.addEventListener('change', update);
    update();
  }

  /* ---------- Formulario de contacto ---------- */
  const form = $('[data-contact-form]');
  if (form) {
    const status = $('[data-form-status]');
    const submit = $('[type="submit"]', form);
    const submitHTML = submit.innerHTML;
    const fields = ['nombre', 'empresa', 'email', 'privacidad'].map((n) => form.elements[n]);
    const MESSAGES = {
      required: 'Este campo es obligatorio.',
      email: 'Introduce un email válido, por ejemplo nombre@empresa.com.',
      privacy: 'Debes aceptar la política de privacidad para continuar.',
    };
    let attempted = false;

    const setError = (input, message) => {
      input.setAttribute('aria-invalid', message ? 'true' : 'false');
      const err = document.getElementById(input.getAttribute('aria-describedby'));
      if (err) err.textContent = message || '';
    };

    const check = (input) => {
      let message = '';
      if (input.type === 'checkbox') {
        if (!input.checked) message = MESSAGES.privacy;
      } else if (!input.value.trim()) {
        message = MESSAGES.required;
      } else if (input.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(input.value.trim())) {
        message = MESSAGES.email;
      }
      setError(input, message);
      return !message;
    };

    fields.forEach((input) => {
      const evt = input.type === 'checkbox' ? 'change' : 'input';
      input.addEventListener(evt, () => { if (attempted) check(input); });
      input.addEventListener('blur', () => { if (attempted) check(input); });
    });

    const showStatus = (message, ok) => {
      status.textContent = message;
      status.className = `form__status ${ok ? 'is-ok' : 'is-error'}`;
    };

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      attempted = true;
      status.textContent = '';
      status.className = 'form__status';

      // Trampa anti-spam: los robots rellenan este campo oculto.
      if (form.elements._gotcha && form.elements._gotcha.value) {
        form.reset();
        showStatus('¡Gracias! Hemos recibido tu solicitud.', true);
        return;
      }

      const invalid = fields.filter((input) => !check(input));
      if (invalid.length) {
        invalid[0].focus();
        return;
      }

      const data = new FormData(form);
      const company = String(data.get('empresa')).trim();
      const subject = `Solicitud de diagnóstico gratuito · ${company}`;

      if (CONFIG.formEndpoint) {
        submit.disabled = true;
        submit.textContent = 'Enviando…';
        data.append('_subject', subject);
        try {
          const response = await fetch(CONFIG.formEndpoint, {
            method: 'POST',
            body: data,
            headers: { Accept: 'application/json' },
          });
          if (!response.ok) throw new Error(String(response.status));
          form.reset();
          attempted = false;
          showStatus('¡Gracias! Hemos recibido tu solicitud y te contactaremos muy pronto.', true);
        } catch (err) {
          showStatus(`No hemos podido enviar el formulario. Escríbenos a ${contactEmail} y te responderemos enseguida.`, false);
        } finally {
          submit.disabled = false;
          submit.innerHTML = submitHTML;
        }
        return;
      }

      const body = [
        `Nombre: ${data.get('nombre')}`,
        `Empresa: ${company}`,
        `Email: ${data.get('email')}`,
        `Teléfono: ${data.get('telefono') || '-'}`,
        '',
        '¿Qué me gustaría automatizar?',
        String(data.get('mensaje') || '-'),
      ].join('\n');
      window.location.href = `mailto:${contactEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      showStatus(`Hemos abierto tu programa de correo con la solicitud lista para enviar. Si no se ha abierto, escríbenos a ${contactEmail}.`, true);
    });
  }

  /* ---------- Botón flotante de WhatsApp ---------- */
  const wa = $('[data-whatsapp]');
  if (wa && CONFIG.whatsapp) {
    wa.href = `https://wa.me/${CONFIG.whatsapp}?text=${encodeURIComponent(CONFIG.whatsappMessage)}`;
    wa.hidden = false;
  }
})();
