# PGA Transformaciones · Web corporativa

Web de **PGA Transformaciones**, consultora de transformación de procesos y automatización con inteligencia artificial: chatbots, automatizaciones, agentes de IA, lectura de documentos e integraciones.

![Vista previa de la web](docs/preview.jpg)

Es una web estática (HTML, CSS y JavaScript sin dependencias ni paso de compilación), así que se puede publicar gratis en GitHub Pages, Netlify, Vercel o cualquier hosting.

## Qué incluye

| Sección | Para qué sirve |
| --- | --- |
| **Hero** con flujo animado | Mensaje principal («Si se repite, se automatiza») y llamada al diagnóstico gratuito. |
| **Antes / Con PGA** | Interruptor que «transforma» seis problemas típicos en su versión automatizada. |
| **Servicios** | Chatbots, automatización de procesos, documentos, agentes de ventas, integraciones, informes, asistente interno y consultoría. |
| **Demo de chatbot** | Conversación interactiva con tres ejemplos: clínica, tienda online e inmobiliaria. |
| **Casos de uso** | Pestañas por departamento (ventas, atención al cliente, administración, RR. HH., operaciones y marketing). |
| **Calculadora de ahorro** | El visitante introduce sus datos y ve las horas y euros que podría ahorrar. |
| **Cómo trabajamos, Por qué PGA y FAQ** | Método en 4 pasos, argumentos de confianza y respuestas a las objeciones habituales. |
| **Formulario de contacto** | Solicitud del diagnóstico gratuito, con validación y texto RGPD. |
| **Páginas legales** | Plantillas de aviso legal y de privacidad y cookies. |

También tiene versión móvil, logotipo en SVG, favicon e iconos, imagen para compartir en redes (`og-image.png`), página 404 y `sitemap.xml`.

## Antes de publicar: lo que tienes que cambiar

1. **Email de contacto.** Busca `info@pgatransformaciones.com` y sustitúyelo por el vuestro en `index.html`, `aviso-legal.html` y `privacidad.html`. El formulario envía las solicitudes a la dirección que aparezca en la sección de contacto de `index.html`.
2. **Dominio.** He supuesto `www.pgatransformaciones.com`. Busca `https://www.pgatransformaciones.com/` y sustitúyelo por vuestro dominio real en `index.html` (imagen para redes y datos para buscadores), `robots.txt` y `sitemap.xml`. Cuando tengáis el dominio definitivo, añadid también en el `<head>` de `index.html` la línea `<link rel="canonical" href="https://vuestro-dominio/">`.
3. **Recepción del formulario** (recomendado). Sin configurar nada, el formulario abre el programa de correo del visitante con el mensaje ya escrito. Para recibir las solicitudes directamente:
   - Crea un formulario gratuito en [Formspree](https://formspree.io) (u otro servicio similar).
   - Copia la URL que te dan (por ejemplo, `https://formspree.io/f/abcdwxyz`) en `formEndpoint`, al principio de `js/main.js`.
   - Añade ese proveedor en el apartado «Destinatarios» de `privacidad.html`.
4. **WhatsApp** (opcional). Escribe vuestro número en `whatsapp`, al principio de `js/main.js` (con prefijo y sin espacios, por ejemplo `34600123456`) y aparecerá un botón flotante.
5. **Datos legales.** Rellena los campos resaltados en amarillo de `aviso-legal.html` y `privacidad.html` (razón social, NIF, domicilio…) y haz que los revise vuestra asesoría.
6. **Revisa los textos comerciales.** Algunos compromisos son propuestas que debéis confirmar: el diagnóstico gratuito de 30 minutos, las respuestas de la FAQ, la lista de herramientas con las que os integráis y los ejemplos de la demo (precios, horarios, etc.).

## Verla en tu ordenador

Abre `index.html` con el navegador. Para que todo funcione igual que en Internet, mejor con un pequeño servidor local:

```bash
python3 -m http.server 8000
```

y visita `http://localhost:8000`.

## Publicarla en GitHub Pages

1. Une esta rama a `main` (o publica directamente desde la rama que prefieras).
2. En GitHub, ve a **Settings → Pages**.
3. En «Build and deployment», elige **Deploy from a branch**, la rama `main` y la carpeta `/ (root)`.
4. En uno o dos minutos la web estará en `https://<usuario>.github.io/<repositorio>/`.
5. Para usar vuestro dominio, añádelo en **Custom domain** y crea en tu proveedor de dominio los registros DNS que indica GitHub.

## Estructura

```
index.html            Página principal
aviso-legal.html      Plantilla de aviso legal
privacidad.html       Plantilla de política de privacidad y cookies
404.html              Página de error
css/styles.css        Estilos (colores de marca en las variables del principio)
js/main.js            Interacciones y configuración (formulario, WhatsApp)
assets/img/           Logotipos SVG, favicon, iconos e imagen para redes
assets/fonts/         Tipografías Montserrat e Inter (licencia OFL)
assets/brand/         Logotipo original en JPG
```

## Detalles técnicos

- **Colores de marca**, sacados del logotipo: azul marino `#041E3C`, cian `#05DBFF` y azul `#0046E2`.
- **Logotipo vectorial** recreado a partir del JPG original con la tipografía Montserrat. Si vuestro diseñador tiene el logotipo original en SVG, AI o EPS, podéis sustituir `assets/img/logo*.svg` y los símbolos `logo-lockup` y `logo-full` al principio de `index.html`.
- **Sin cookies ni servicios de terceros**: las tipografías están alojadas en la propia web, así que no hace falta un aviso de cookies. Si añadís analítica (Google Analytics, etc.), tendréis que añadir un aviso de cookies y actualizar la política de privacidad.
- **Accesibilidad**: se puede usar con teclado, respeta la opción «reducir movimiento» del sistema y sigue funcionando sin JavaScript.
- Iconos de [Lucide](https://lucide.dev) (licencia ISC).

## Ideas para vender todavía más

- Añadir **casos de éxito reales** con cifras y testimonios de clientes, con su permiso. Es lo que más confianza genera.
- Enlazar una **agenda online** (Calendly, Google Calendar, Cal.com) para reservar el diagnóstico en un clic.
- Poner en la propia web un **chatbot real** de PGA: es la mejor demostración posible de lo que vendéis.
