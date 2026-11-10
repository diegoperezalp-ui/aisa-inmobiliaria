document.addEventListener('DOMContentLoaded', () => {
  const api = window.gkApi;
  const state = {
    properties: [],
    visits: [],
    preparations: [],
    inventoryQuery: '',
    inventoryOperation: 'all',
    inventoryStatus: 'all',
    preparationQuery: '',
    preparationStatus: 'all',
    currentMonth: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
    selectedDate: dateKey(new Date()),
    query: '',
    status: 'all',
    propertyId: 'all',
    activeVisit: null,
    activePreparation: null,
    activeRepair: null
  };
  const $ = (id) => document.getElementById(id);
  const monthFormatter = new Intl.DateTimeFormat('es-MX', { month: 'long', year: 'numeric' });
  const dateFormatter = new Intl.DateTimeFormat('es-MX', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const dateShortFormatter = new Intl.DateTimeFormat('es-MX', { day: 'numeric', month: 'short', year: 'numeric' });
  const timeFormatter = (value) => value || 'Hora pendiente';

  function dateKey(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  function escapeHTML(value) {
    return String(value ?? '').replace(/[&<>"']/g, (char) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    })[char]);
  }

  function propertyPhoto(images) {
    if (!Array.isArray(images)) return '';
    return images.find((value) => typeof value === 'string' && (
      /^https:\/\//i.test(value.trim())
      || (/^\/assets\/[a-z0-9_./%-]+$/i.test(value.trim()) && !value.includes('..'))
    )) || '';
  }

  function visitDate(visit) {
    return visit.scheduledDate || visit.date || '';
  }

  function statusLabel(status) {
    return ({ pendiente: 'Pendiente', confirmada: 'Confirmada', realizada: 'Realizada', cancelada: 'Cancelada' })[status] || status;
  }

  function showNotice(message, type = 'error') {
    const notice = $('notice');
    notice.textContent = message;
    notice.classList.toggle('success', type === 'success');
    notice.hidden = false;
  }

  function hideNotice() {
    $('notice').hidden = true;
  }

  function applyTheme(theme, persist = false) {
    const nextTheme = theme === 'dark' ? 'dark' : 'light';
    document.documentElement.dataset.theme = nextTheme;
    const isDark = nextTheme === 'dark';
    $('theme-toggle-icon').textContent = isDark ? '☀' : '☾';
    $('theme-toggle-label').textContent = isDark ? 'Modo claro' : 'Modo oscuro';
    $('theme-toggle').setAttribute('aria-label', `Cambiar a modo ${isDark ? 'claro' : 'oscuro'}`);
    document.querySelector('meta[name="theme-color"]').content = isDark ? '#17231b' : '#f2f5ef';

    if (persist) {
      try {
        localStorage.setItem('aisa-agenda-theme', nextTheme);
      } catch {
        showNotice('El tema cambió, pero el navegador no permitió guardar esta preferencia.');
      }
    }
  }

  function updateActiveNavigation(sectionId) {
    document.querySelectorAll('.sidebar-link[href^="#"]').forEach((link) => {
      const isActive = link.getAttribute('href') === `#${sectionId}`;
      link.classList.toggle('is-active', isActive);
      if (isActive) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    });
  }

  const aiDraftState = {
    currentScripts: [],
    activeIndex: 0
  };

  // Motor Inteligente de Razonamiento Local (Criterio Experto en caso de desconexión)
  function generateLocalReasoningAndScripts(message) {
    const normalized = String(message || '').toLowerCase();
    let intent = 'compra';
    if (/renta|rentar|alquilar|amueblad|arrend/.test(normalized)) intent = 'renta';
    else if (/vender|vender mi casa|consignar|traspas|comision|cuanto cobran por vender/.test(normalized)) intent = 'vender';
    else if (/avaluo|avalúo|peritaje|dictamen|cuanto cuesta el avaluo/.test(normalized)) intent = 'avaluo';
    else if (/sello rojo|rehabilitad|cableado|luz y agua/.test(normalized)) intent = 'sello_rojo';

    // Buscar la propiedad más afin del estado actual
    let prop = state.properties.find(p => {
      const text = [p.title, p.location, p.neighborhood, p.city].join(' ').toLowerCase();
      if (normalized.includes('lincoln') && text.includes('lincoln')) return true;
      if (normalized.includes('santa maria') && text.includes('santa mar')) return true;
      if (normalized.includes('palmiras') && text.includes('palmiras')) return true;
      return false;
    }) || state.properties[0] || {
      title: 'Casa Rehabilitada en Valle de Lincoln 4a Etapa',
      location: 'Valle de Lincoln, García, N.L.',
      priceFormatted: '$720,000 MXN',
      bedrooms: 2,
      bathrooms: 1,
      appraisalFee: 7000
    };

    const title = prop.title || 'Casa en Venta en Zona Metropolitana';
    const loc = prop.location || 'García, N.L.';
    const price = prop.priceFormatted || (prop.price ? `${Number(prop.price).toLocaleString('es-MX')} MXN` : '$720,000 MXN');
    const beds = prop.bedrooms || 2;
    const baths = prop.bathrooms || 1;
    const fee = prop.appraisalFee ? `${Number(prop.appraisalFee).toLocaleString('es-MX')} MXN` : '$7,000 MXN';

    if (intent === 'compra' || intent === 'sello_rojo') {
      return {
        reasoningHtml: `
          <div class="ai-reasoning-step">
            <span class="reasoning-badge intent">🎯 INTENCIÓN DETECTADA: Adquisición de Vivienda / Crédito</span>
            <p>El cliente busca comprar casa y requiere conocer <strong>precio total</strong>, <strong>ubicación exacta</strong>, si califica con <strong>Infonavit</strong>, y <strong>con cuánto dinero se aparta</strong>.</p>
          </div>
          <div class="ai-reasoning-step">
            <span class="reasoning-badge match">🏠 PROPIEDAD ASIGNADA: ${title}</span>
            <p>Se seleccionó la propiedad <strong>${title}</strong> en <strong>${loc}</strong> por <strong>${price}</strong>, con ${beds} recámaras y separación con avalúo de <strong>${fee}</strong>.</p>
          </div>
          <div class="ai-reasoning-step">
            <span class="reasoning-badge closing">⚡ ESTRATEGIA DE CIERRE: Despejar objeciones & Agendar cita</span>
            <p>Se garantiza el Sello Rojo (luz y agua activos), se aclara que los ${fee} cubren su avalúo y se propone visita con opción doble de horario este fin de semana.</p>
          </div>
        `,
        coveredFields: ['Precio total', 'Ubicación exacta', 'Recámaras y Baños', 'Apartado ' + fee, 'Crédito Infonavit', 'Garantía Sello Rojo', 'Cita de visita'],
        scripts: [
          {
            title: 'Opción 1: Completa & Ficha Técnica Oficial (Recomendada)',
            badge: 'Más Completa',
            content: `¡Hola! Con mucho gusto te brindo la información completa y detallada de la propiedad en *${loc}*:

🏡 *FICHA TÉCNICA Y ESPECIFICACIONES:*
• *Propiedad:* ${title}
• *Precio de venta:* ${price}
• *Distribución:* ${beds} recámaras, sala, comedor, cocina independiente, ${baths} baño(s) y patio de servicio.
• *Estado físico:* 🔴 *Rehabilitada con Sello Rojo Infonavit* (centro de carga y cableado de luz nuevos, tuberías de agua y drenaje revisadas, pintura e impermeabilización al 100%).

💰 *CONDICIONES DE PAGO Y APARTADO:*
• *Separación:* Se aparta con únicamente *${fee}*, monto que cubre el avalúo técnico oficial.
• *Créditos aceptados:* Infonavit Tradicional, Unamos Créditos, Cofinavit, Crédito Bancario o Pago de Contado.
• *Asesoría:* En Aisa Inmobiliaria realizamos toda la gestión notarial y de escrituras sin costo extra de gestoría.

¿Te gustaría ir a conocerla por dentro? Tenemos citas disponibles este *viernes por la tarde o sábado a las 11:00 AM*. ¿Cuál horario te queda más cómodo?`
          },
          {
            title: 'Opción 2: Comercial Rápida para Cierre de Cita',
            badge: 'Cierre Rápido',
            content: `¡Hola! Claro que sí, tenemos lista para entrega la *${title}* en *${loc}* con precio de *${price}*.

Cuenta con ${beds} recámaras, ${baths} baño(s), sala, comedor, cocina y patio. La casa se entrega con *Sello Rojo garantizado* (luz, agua y pintura al 100%).

Se aparta con *${fee}* (que cubre tu avalúo oficial) y aceptamos tu crédito Infonavit o bancario. ¿Te gustaría que la visitemos este fin de semana para que la conozcas y apartarla?`
          },
          {
            title: 'Opción 3: Guía Paso a Paso (Crédito, Apartado y Entrega)',
            badge: 'Informativa',
            content: `¡Hola! Con gusto te explico los 4 sencillos pasos para adquirir la casa con nosotros en Aisa Inmobiliaria:

1️⃣ *Precalificación:* Te ayudamos a consultar tu monto exacto de crédito Infonavit sin compromiso.
2️⃣ *Visita y Apartado:* Conocemos la casa físicamente; si te gusta, se aparta con *${fee}* para ingresar el avalúo oficial a tu nombre.
3️⃣ *Certificación Sello Rojo:* Verificamos que la casa cuente con centro de carga, cableado, agua y drenaje en óptimas condiciones.
4️⃣ *Firma y Entrega:* Te acompañamos ante Notaría Pública para la firma de escrituras y entrega formal de tus llaves.

¿Tienes a la mano tu Número de Seguridad Social (NSS) y fecha de nacimiento para revisar tu crédito de inmediato?`
          },
          {
            title: 'Opción 4: Mensaje de Seguimiento por WhatsApp',
            badge: 'Seguimiento',
            content: `¡Hola! ¿Qué tal? Te escribo de Aisa Inmobiliaria para dar seguimiento a tu interés en la casa de *${loc}* (${price}).

¿Tuviste oportunidad de revisar la información o te gustaría que agendemos una llamada rápida de 2 minutos para resolver tus dudas de crédito? ¡Quedo a tus órdenes!`
          }
        ]
      };
    }

    if (intent === 'renta') {
      return {
        reasoningHtml: `
          <div class="ai-reasoning-step">
            <span class="reasoning-badge intent">🔑 INTENCIÓN DETECTADA: Arrendamiento Residencial</span>
            <p>El cliente busca rentar casa o departamento. Es indispensable aclarar de inmediato las <strong>modalidades (amueblada vs sin amueblar)</strong>, requisitos de depósito, comprobante de ingresos y aval o póliza jurídica.</p>
          </div>
        `,
        coveredFields: ['Renta amueblada', 'Renta sin amueblar', 'Depósito en garantía', 'Requisitos de ingresos', 'Contrato 12 meses'],
        scripts: [
          {
            title: 'Opción 1: Renta Amueblada vs Sin Amueblar (Completa)',
            badge: 'Recomendada',
            content: `¡Hola! Con mucho gusto te comparto nuestras opciones y condiciones de *renta residencial* en Aisa Inmobiliaria:

🛋️ *1. OPCIÓN AMUEBLADA:*
• *Equipamiento:* Incluye sala, comedor, cocina integral con estufa y refrigerador, camas en recámaras y minisplit instalado.
• *Rango de renta:* Desde $8,500 hasta $14,000 MXN mensuales (según zona y acabados).
• *Ideal para:* Parejas, profesionistas o ejecutivos que buscan mudarse de inmediato sin trasladar muebles.

🏠 *2. OPCIÓN SIN AMUEBLAR:*
• *Condición:* Casa lista para habitar con tarja, boiler, protectores en ventanas y servicios de agua y luz al corriente.
• *Rango de renta:* Desde $5,000 hasta $8,500 MXN mensuales.

📋 *REQUISITOS GENERALES DE ARRENDAMIENTO:*
1. 1 mes de depósito en garantía + 1er mes de renta al firmar contrato.
2. Identificación oficial vigente (INE) y comprobante de ingresos (últimos 3 meses de nómina o estados de cuenta).
3. Aval con propiedad libre de gravamen en N.L. o contratación de Póliza Jurídica.
4. Contrato mínimo por 12 meses.

¿Para cuántas personas sería la casa y para qué fecha aproximada tienes planeada tu mudanza?`
          },
          {
            title: 'Opción 2: Renta Ágil para Cita',
            badge: 'Ágil',
            content: `¡Hola! Claro que sí, manejamos casas en renta tanto *amuebladas* (con sala, estufa, refrigerador y minisplit) como *sin amueblar* en excelentes sectores residenciales.

Los requisitos básicos son 1 mes de depósito, 1 mes de renta y comprobantes de ingresos con contrato a 1 año.

¿En qué zona de la ciudad estás buscando y cuál es tu presupuesto mensual aproximado para enviarte las fotos disponibles?`
          }
        ]
      };
    }

    if (intent === 'vender') {
      return {
        reasoningHtml: `
          <div class="ai-reasoning-step">
            <span class="reasoning-badge intent">💼 INTENCIÓN DETECTADA: Venta / Consignación de Propiedad</span>
            <p>Un propietario busca asesoría para vender su casa. El objetivo es <strong>ganar la consignación</strong> demostrando que Aisa ofrece avalúo gratuito, revisión legal, opción de restauración con Sello Rojo y cobro de comisión solo a éxito en Notaría.</p>
          </div>
        `,
        coveredFields: ['Avalúo comercial gratis', 'Revisión legal de escrituras', 'Sello Rojo opcional', 'Publicidad masiva', 'Comisión sin anticipos'],
        scripts: [
          {
            title: 'Opción 1: Asesoría Integral para Vender su Propiedad',
            badge: 'Recomendada',
            content: `¡Hola! Qué gusto saludarte. En Aisa Inmobiliaria somos especialistas en la venta y regularización de viviendas en todo Nuevo León. Con todo gusto te ayudamos a vender tu casa al mejor valor comercial y de forma 100% segura:

🤝 *¿CÓMO TRABAJAMOS LA VENTA DE TU CASA?*
1️⃣ *Opinión de Valor Gratuita:* Realizamos un estudio de mercado sin costo para fijar el precio real y competitivo de venta.
2️⃣ *Diagnóstico Legal:* Verificamos escrituras, gravámenes o adeudos de Infonavit y predial para que todo esté en regla ante notario.
3️⃣ *Rehabilitación Sello Rojo (Opcional):* Si la casa tiene detalles de cableado, agua o pintura, nosotros podemos coordinar la restauración para que califique a créditos Infonavit y se venda mucho más rápido.
4️⃣ *Promoción y Publicidad:* Publicamos en nuestro portal oficial, redes sociales, portales inmobiliarios y cartera de compradores con crédito ya autorizado.
5️⃣ *Firma y Cobro Seguro:* Te acompañamos hasta la Notaría Pública, donde recibes tu pago garantizado en cheque certificado o transferencia.

💼 *Honorarios:* Cobramos la comisión estándar de mercado (4% al 5%), la cual se paga *únicamente al momento de concretar la venta en Notaría* (no cobramos ningún anticipo).

¿En qué colonia y municipio se ubica tu propiedad y cuentas actualmente con algún crédito activo sobre ella?`
          }
        ]
      };
    }

    // Default Avaluo
    return {
      reasoningHtml: `
        <div class="ai-reasoning-step">
          <span class="reasoning-badge intent">📋 INTENCIÓN DETECTADA: Solicitud de Avalúo Inmobiliario</span>
          <p>El cliente requiere un peritaje oficial. Se listan los documentos requeridos (escritura, predial, INE) y tiempos de entrega (3 a 5 días).</p>
        </div>
      `,
      coveredFields: ['Documentos requeridos', 'Visita de inspección', 'Tiempos de entrega (3-5 días)', 'Validez oficial'],
      scripts: [
        {
          title: 'Opción 1: Procedimiento y Documentos para Avalúo Oficial',
          badge: 'Recomendada',
          content: `¡Hola! Claro que sí, en Aisa Inmobiliaria contamos con servicio de *Avalúo Inmobiliario Oficial con Perito Certificado*, válido para trámites de Infonavit, crédito bancario, escrituración o compraventa:

📄 *DOCUMENTACIÓN EN COPIA NECESARIA:*
1. Copia de la Escritura pública con sello del Registro Público de la Propiedad.
2. Boleta de Impuesto Predial al corriente (año en curso).
3. Identificación oficial con foto (INE o Pasaporte) del solicitante/propietario.
4. Comprobante de domicilio reciente (recibo de luz CFE o agua).
5. Plano arquitectónico o croquis de la propiedad (en caso de contar con él).

⏱️ *PROCESO Y TIEMPOS:*
• La visita de inspección física se programa en un lapso de 24 a 48 horas.
• El dictamen técnico oficial se emite en un periodo de *3 a 5 días hábiles* tras la visita.

¿Para qué trámite necesitas el avalúo y en qué municipio se ubica la propiedad?`
        }
      ]
    };
  }

  function displayDraftResult(data) {
    const reasoningBox = $('whatsapp-reasoning-body');
    const coveredBox = $('whatsapp-covered-badges');
    const tabsBar = $('whatsapp-script-tabs-bar');
    const titleElem = $('whatsapp-active-script-title');
    const badgeElem = $('whatsapp-active-script-badge');
    const answerElem = $('whatsapp-draft-answer');

    // Razonamiento
    if (reasoningBox) {
      reasoningBox.innerHTML = data.reasoningHtml || '<p>Análisis comercial completado con inventario disponible.</p>';
    }

    // Campos cubiertos
    if (coveredBox && Array.isArray(data.coveredFields)) {
      coveredBox.innerHTML = data.coveredFields.map(f => `<span class="covered-pill">✓ ${escapeHTML(f)}</span>`).join('');
    }

    // Scripts y pestañas
    const scripts = Array.isArray(data.scripts) && data.scripts.length 
      ? data.scripts 
      : [{ title: 'Respuesta General para WhatsApp', badge: 'Principal', content: data.answer || '' }];

    aiDraftState.currentScripts = scripts;
    aiDraftState.activeIndex = 0;

    if (tabsBar) {
      tabsBar.innerHTML = scripts.map((s, idx) => `
        <button class="script-tab ${idx === 0 ? 'is-active' : ''}" type="button" data-script-idx="${idx}">
          ${escapeHTML(s.title || ('Opción ' + (idx + 1)))}
        </button>
      `).join('');

      tabsBar.querySelectorAll('.script-tab').forEach((tab) => {
        tab.addEventListener('click', () => {
          const idx = Number(tab.dataset.scriptIdx);
          switchActiveScript(idx);
        });
      });
    }

    switchActiveScript(0);
    $('whatsapp-draft-result').hidden = false;
  }

  function switchActiveScript(index) {
    aiDraftState.activeIndex = index;
    const script = aiDraftState.currentScripts[index] || aiDraftState.currentScripts[0];
    if (!script) return;

    // Actualizar tabs activas
    const tabsBar = $('whatsapp-script-tabs-bar');
    if (tabsBar) {
      tabsBar.querySelectorAll('.script-tab').forEach((t, idx) => {
        t.classList.toggle('is-active', idx === index);
      });
    }

    const titleElem = $('whatsapp-active-script-title');
    const badgeElem = $('whatsapp-active-script-badge');
    const answerElem = $('whatsapp-draft-answer');

    if (titleElem) titleElem.textContent = script.title || `Opción ${index + 1}`;
    if (badgeElem) badgeElem.textContent = script.badge || `Opción ${index + 1}`;
    if (answerElem) answerElem.textContent = script.content || '';
  }

  async function draftWhatsAppReply(event) {
    if (event && event.preventDefault) event.preventDefault();
    const messageInput = $('whatsapp-customer-message');
    const message = messageInput ? messageInput.value.trim() : '';
    const button = $('whatsapp-draft-submit');
    const status = $('whatsapp-draft-status');
    if (!message) return;

    if (button) {
      button.disabled = true;
      button.textContent = '🧠 Razonando y cotejando inventario…';
    }
    if (status) status.textContent = '';
    $('whatsapp-draft-result').hidden = true;

    try {
      let result = null;
      try {
        result = await api.request('/ai/admin-draft', {
          method: 'POST',
          body: JSON.stringify({ message })
        });
      } catch (e) {
        console.warn('API /ai/admin-draft no disponible, usando motor local de razonamiento:', e.message);
      }

      if (result && result.scripts && result.scripts.length) {
        displayDraftResult(result);
      } else {
        // Fallback local con razonamiento completo
        const local = generateLocalReasoningAndScripts(message);
        displayDraftResult(local);
      }

      if (status) status.textContent = '✓ Razonamiento completado con éxito. Opciones listas para copiar.';
    } catch (error) {
      if (status) status.textContent = error.message || 'No se pudo redactar la respuesta.';
    } finally {
      if (button) {
        button.disabled = false;
        button.innerHTML = '<span class="btn-icon">🧠</span> Razonar y Redactar Opciones';
      }
    }
  }

  async function copyWhatsAppReply() {
    const answer = $('whatsapp-draft-answer').textContent.trim();
    if (!answer) return;
    const status = $('whatsapp-draft-status');
    const copyBtn = $('whatsapp-draft-copy');
    try {
      await navigator.clipboard.writeText(answer);
      status.textContent = 'Respuesta copiada. Puedes pegarla en WhatsApp Business.';
      if (copyBtn) {
        const originalText = copyBtn.textContent;
        copyBtn.textContent = '✓ ¡Copiado!';
        copyBtn.style.color = '#34d399';
        setTimeout(() => {
          copyBtn.textContent = originalText;
          copyBtn.style.color = '';
        }, 2200);
      }
    } catch {
      status.textContent = 'No se pudo acceder al portapapeles. Selecciona y copia la respuesta manualmente.';
    }
  }

  function setConnection(online, text) {
    const indicator = $('connection-status');
    indicator.classList.toggle('is-online', online);
    indicator.classList.toggle('is-offline', !online);
    indicator.lastChild.textContent = ` ${text}`;
  }

  function showLoginPrompt() {
    return new Promise((resolve) => {
      const overlay = document.createElement('div');
      overlay.className = 'agenda-auth-overlay';
      overlay.innerHTML = `
        <form class="agenda-auth-card" id="agenda-login-form">
          <img src="/assets/aisa-symbol.png" alt="" class="agenda-auth-logo">
          <p class="eyebrow">ACCESO ADMINISTRATIVO</p>
          <h1>Inicia sesión para abrir tu agenda</h1>
          <p class="welcome-copy">Usa la cuenta administradora de Aisa. Al actualizar la página permanecerás en la agenda.</p>
          <label class="field">Correo electrónico<input name="email" type="email" autocomplete="username" required></label>
          <label class="field">Contraseña<input name="password" type="password" autocomplete="current-password" required></label>
          <p class="agenda-auth-error" id="agenda-login-error" role="alert" hidden></p>
          <button class="button button-primary" type="submit">Entrar a la agenda</button>
          <a href="/" class="agenda-auth-back">Volver al sitio de Aisa</a>
        </form>`;
      document.body.append(overlay);

      overlay.querySelector('form').addEventListener('submit', async (event) => {
        event.preventDefault();
        const form = event.currentTarget;
        const button = form.querySelector('button[type="submit"]');
        const errorMessage = $('agenda-login-error');
        button.disabled = true;
        button.textContent = 'Verificando…';
        errorMessage.hidden = true;

        try {
          const result = await api.login(form.elements.email.value.trim(), form.elements.password.value);
          if (result.user?.role !== 'admin') {
            throw new Error('Esta cuenta no tiene permisos de administrador. La sesión de cliente se conserva al volver a Aisa.');
          }
          overlay.remove();
          resolve(true);
        } catch (error) {
          errorMessage.textContent = error.message || 'No se pudo iniciar sesión.';
          errorMessage.hidden = false;
          button.disabled = false;
          button.textContent = 'Entrar a la agenda';
        }
      });
    });
  }

  async function authenticate() {
    if (!api) {
      window.location.replace('/');
      return false;
    }

    let user = api.isAuthenticated() ? await api.getMe() : null;
    if (user && user.role !== 'admin') {
      window.location.replace('/');
      return false;
    }

    if (!user) {
      if (!await showLoginPrompt()) return false;
      user = await api.getMe();
    }

    if (user?.role !== 'admin') {
      window.location.replace('/');
      return false;
    }

    document.documentElement.classList.remove('agenda-auth-pending');
    document.documentElement.classList.add('agenda-authenticated');
    $('avatar').textContent = (user.name || 'A').trim().charAt(0).toUpperCase();
    $('today-label').textContent = dateFormatter.format(new Date());
    return true;
  }

  async function loadData() {
    hideNotice();
    $('refresh-button').disabled = true;
    setConnection(false, 'Sincronizando...');
    try {
      const [propertyResult, visitResult, preparationResult] = await Promise.all([
        api.getAdminProperties(),
        api.getVisits(),
        api.getPreparations()
      ]);
      state.properties = propertyResult.data || [];
      state.visits = visitResult.data || [];
      state.preparations = preparationResult.data || [];
      setConnection(true, 'Conectado');
      render();
    } catch (error) {
      setConnection(false, 'Sin conexión');
      showNotice(`${error.message} Revisa tu sesión y vuelve a actualizar.`);
    } finally {
      $('refresh-button').disabled = false;
    }
  }

  function filteredVisits() {
    const query = state.query.trim().toLowerCase();
    return state.visits.filter((visit) => {
      const matchesStatus = state.status === 'all' || visit.status === state.status;
      const matchesProperty = state.propertyId === 'all' || String(visit.propertyId) === state.propertyId;
      const searchText = [visit.clientName, visit.clientPhone, visit.clientEmail, visit.propertyTitle, visit.propertyLocation].join(' ').toLowerCase();
      return matchesStatus && matchesProperty && (!query || searchText.includes(query));
    }).sort((a, b) => {
      const first = `${visitDate(a)}T${a.scheduledTime || a.time || '99:99'}`;
      const second = `${visitDate(b)}T${b.scheduledTime || b.time || '99:99'}`;
      return first.localeCompare(second);
    });
  }

  function render() {
    populatePropertyFilters();
    renderMetrics();
    renderPreparations();
    renderInventory();
    renderCalendar();
    renderSelectedDay();
    renderTable();
  }

  function populatePropertyFilters() {
    const options = state.properties.map((property) =>
      `<option value="${escapeHTML(property._id)}">${escapeHTML(property.title)}</option>`
    ).join('');
    $('property-filter').innerHTML = `<option value="all">Todas las propiedades</option>${options}`;
    $('property-filter').value = state.propertyId;
    $('visit-property').innerHTML = `<option value="">Selecciona una propiedad</option>${options}`;
  }

  function renderMetrics() {
    const today = dateKey(new Date());
    const totalVisits = state.visits.length;
    const pendingVisits = state.visits.filter((visit) => visit.status === 'pendiente').length;
    const confirmedVisits = state.visits.filter((visit) => visit.status === 'confirmada').length;
    const todayVisits = state.visits.filter((visit) => visitDate(visit) === today && visit.status !== 'cancelada').length;

    const metricTotal = $('metric-total');
    if (metricTotal) metricTotal.textContent = totalVisits;
    const metricPending = $('metric-pending');
    if (metricPending) metricPending.textContent = pendingVisits;
    const metricConfirmed = $('metric-confirmed');
    if (metricConfirmed) metricConfirmed.textContent = confirmedVisits;
    const metricToday = $('metric-today');
    if (metricToday) metricToday.textContent = todayVisits;

    // Badges en vivo del Dock de Navegación
    const dockToday = $('dock-today-badge');
    if (dockToday) dockToday.textContent = todayVisits > 0 ? `${todayVisits} hoy` : 'Hoy';
    const dockMonth = $('dock-month-badge');
    if (dockMonth) dockMonth.textContent = monthFormatter.format(state.currentMonth).slice(0, 3);
    const dockPending = $('dock-pending-badge');
    if (dockPending) dockPending.textContent = pendingVisits;
    const dockInventory = $('dock-inventory-badge');
    if (dockInventory) dockInventory.textContent = state.properties.length;
    const dockPrep = $('dock-prep-badge');
    if (dockPrep) dockPrep.textContent = state.preparations.filter((p) => p.status !== 'publicada').length;
  }

  function filteredProperties() {
    const query = state.inventoryQuery.trim().toLowerCase();
    return state.properties.filter((property) => {
      const matchesOperation = state.inventoryOperation === 'all' || property.operation === state.inventoryOperation;
      const matchesStatus = state.inventoryStatus === 'all' || property.status === state.inventoryStatus;
      const text = [property.title, property.location, property.neighborhood, property.city].join(' ').toLowerCase();
      return matchesOperation && matchesStatus && (!query || text.includes(query));
    });
  }

  function renderInventory() {
    const properties = filteredProperties();
    $('inventory-count').textContent = `${state.properties.length} ${state.properties.length === 1 ? 'propiedad' : 'propiedades'}`;
    $('inventory-result-count').textContent = `${properties.length} ${properties.length === 1 ? 'resultado' : 'resultados'}`;
    $('inventory-grid').innerHTML = properties.length ? properties.map((property) => {
      const photo = propertyPhoto(property.images);
      const statusClass = property.status === 'disponible' ? 'confirmada' : property.status === 'apartada' ? 'pendiente' : property.status === 'vendida' ? 'cancelada' : 'realizada';
      return `
        <article class="property-card">
          <div class="property-card-image">${photo ? `<img src="${escapeHTML(photo)}" alt="${escapeHTML(property.title)}" loading="lazy">` : '<div class="property-image-placeholder"><span>⌂</span><small>Sin fotografía</small></div>'}<span class="property-card-badge">${escapeHTML(property.status || 'disponible')}</span></div>
          <div class="property-card-body">
            <div class="property-card-heading"><div><p class="property-card-location">${escapeHTML([property.neighborhood, property.city].filter(Boolean).join(' · ') || property.location)}</p><h3>${escapeHTML(property.title)}</h3></div><span class="status ${statusClass}">${property.operation === 'renta' ? 'Renta' : 'Venta'}</span></div>
            <strong class="property-card-price">${escapeHTML(property.priceFormatted || `$${Number(property.price || 0).toLocaleString('es-MX')} MXN`)}</strong>
            <div class="property-specs"><span>${Number(property.bedrooms || 0)} rec.</span><span>${Number(property.bathrooms || 0)} baños</span><span>${Number(property.constructionAreaM2 || 0)} m²</span></div>
            <button class="button button-quiet button-small" type="button" data-edit-property="${escapeHTML(property._id)}">Editar ficha completa</button>
          </div>
        </article>`;
    }).join('') : '<div class="empty-state">No se encontraron propiedades con esos filtros.</div>';
  }

  const preparationLabels = {
    por_inspeccionar: 'Por inspeccionar',
    en_preparacion: 'En preparación',
    lista_para_publicar: 'Lista para publicar',
    publicada: 'Publicada en Aisa'
  };
  const repairLabels = {
    pendiente: 'Pendiente',
    programada: 'Programada',
    en_proceso: 'En proceso',
    completada: 'Completada'
  };

  function filteredPreparations() {
    const query = state.preparationQuery.trim().toLowerCase();
    return state.preparations.filter((property) => {
      const matchesStatus = state.preparationStatus === 'all' || property.readinessStatus === state.preparationStatus;
      const searchable = [property.title, property.location, property.neighborhood, property.city].join(' ').toLowerCase();
      return matchesStatus && (!query || searchable.includes(query));
    });
  }

  function renderPreparations() {
    const properties = filteredPreparations();
    const active = state.preparations.filter((property) => property.readinessStatus !== 'publicada');
    const repairs = active.flatMap((property) => (property.repairs || []).map((repair) => ({ property, repair })));
    const pending = repairs.filter(({ repair }) => repair.status !== 'completada').length;
    const scheduled = repairs.filter(({ repair }) => repair.scheduledDate && repair.status !== 'completada').length;
    $('preparation-summary').innerHTML = `
      <div><strong>${active.filter((property) => property.readinessStatus === 'por_inspeccionar').length}</strong><span>Por inspeccionar</span></div>
      <div><strong>${active.filter((property) => property.readinessStatus === 'en_preparacion').length}</strong><span>En preparación</span></div>
      <div><strong>${pending}</strong><span>Trabajos pendientes</span></div>
      <div><strong>${scheduled}</strong><span>Visitas de reparación</span></div>`;
    $('preparation-grid').innerHTML = properties.length ? properties.map((property) => {
      const photo = propertyPhoto(property.images);
      const tasks = property.repairs || [];
      const completed = tasks.filter((repair) => repair.status === 'completada').length;
      const pendingTasks = tasks.filter((repair) => repair.status !== 'completada');
      const statusClass = property.readinessStatus === 'lista_para_publicar' ? 'ready' : property.readinessStatus === 'publicada' ? 'published' : property.readinessStatus === 'en_preparacion' ? 'working' : 'inspection';
      const taskMarkup = tasks.length ? tasks.slice(0, 3).map((repair) => `
        <div class="repair-item ${repair.status === 'completada' ? 'is-complete' : ''}">
          <div><strong>${escapeHTML(repair.title)}</strong><small>${escapeHTML(repair.scheduledDate ? `${repair.scheduledDate}${repair.scheduledTime ? ` · ${repair.scheduledTime}` : ''}` : (repairCategoriesLabel(repair.category)))} · ${escapeHTML(repairLabels[repair.status] || repair.status)}</small></div>
          <div class="repair-actions"><button class="text-action" type="button" data-open-repair="${escapeHTML(property._id)}" data-repair-id="${escapeHTML(repair._id)}">Editar</button>${repair.status !== 'completada' ? `<button class="text-action complete-action" type="button" data-complete-repair="${escapeHTML(property._id)}" data-repair-id="${escapeHTML(repair._id)}">Concluir</button>` : ''}</div>
        </div>`).join('') : '<p class="no-repairs">Aún no hay trabajos cargados. Agrega los detalles después de inspeccionar.</p>';
      const canPromote = property.readinessStatus === 'lista_para_publicar' && tasks.every((repair) => repair.status === 'completada') && !property.promotedPropertyId;
      return `
        <article class="preparation-card">
          <div class="preparation-image">${photo ? `<img src="${escapeHTML(photo)}" alt="${escapeHTML(property.title)}" loading="lazy">` : '<div class="property-image-placeholder"><span>⌂</span><small>Agrega fotos del inmueble</small></div>'}<span class="preparation-badge ${statusClass}">${escapeHTML(preparationLabels[property.readinessStatus] || property.readinessStatus)}</span></div>
          <div class="preparation-card-body">
            <p class="property-card-location">${escapeHTML([property.neighborhood, property.city, property.state].filter(Boolean).join(' · '))}</p>
            <h3>${escapeHTML(property.title)}</h3>
            <p class="preparation-address">${escapeHTML(property.location)}${property.postalCode ? ` · CP ${escapeHTML(property.postalCode)}` : ''}</p>
            ${property.price ? `<strong class="property-card-price">${escapeHTML(new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(property.price))}</strong>` : ''}
            <div class="property-specs"><span>${property.bedrooms == null ? 'Recámaras pendientes' : `${Number(property.bedrooms)} rec.`}</span><span>${property.bathrooms == null ? 'Baños pendientes' : `${Number(property.bathrooms)} baños`}</span><span>${property.constructionAreaM2 == null ? 'Construcción pendiente' : `${Number(property.constructionAreaM2)} m² const.`}</span></div>
            <div class="property-specs"><span>${property.age == null ? 'Antigüedad pendiente' : `${Number(property.age)} años`}</span><span>${property.landAreaM2 == null ? 'Terreno pendiente' : `${Number(property.landAreaM2)} m² terreno`}</span><span>${completed}/${tasks.length} trabajos listos</span></div>
            <div class="repair-list">${taskMarkup}${tasks.length > 3 ? `<p class="more-repairs">y ${tasks.length - 3} trabajos más</p>` : ''}</div>
            <div class="preparation-actions">
              ${property.readinessStatus === 'publicada'
                ? '<span class="published-note">Ya está disponible en Aisa · edición desde Inventario</span>'
                : `<button class="button button-quiet button-small" type="button" data-edit-preparation="${escapeHTML(property._id)}">Editar ficha</button>
                  <button class="button button-quiet button-small" type="button" data-add-repair="${escapeHTML(property._id)}">+ Trabajo / visita</button>
                  ${property.readinessStatus !== 'lista_para_publicar' && pendingTasks.length === 0 ? `<button class="button button-quiet button-small" type="button" data-mark-ready="${escapeHTML(property._id)}">Marcar lista</button>` : ''}
                  ${canPromote ? `<button class="button button-primary button-small" type="button" data-promote-preparation="${escapeHTML(property._id)}">Dar de alta para venta</button>` : ''}`}
            </div>
          </div>
        </article>`;
    }).join('') : '<div class="empty-state">No hay inmuebles en esta etapa. Usa “Agregar inmueble” para crear una ficha privada.</div>';
  }

  function repairCategoriesLabel(category) {
    return ({ electricidad: 'Electricidad', agua: 'Agua', plomeria: 'Plomería', estructura: 'Estructura', acabados: 'Acabados', limpieza: 'Limpieza', documentacion: 'Documentación', otro: 'Otro' })[category] || 'Trabajo';
  }

  function openPreparationDialog(property = null) {
    const form = $('preparation-form');
    form.reset();
    form.elements.preparationId.value = property?._id || '';
    form.elements.type.value = property?.type || 'casa';
    form.elements.state.value = property?.state || 'Nuevo León';
    $('preparation-dialog-title').textContent = property ? `Editar: ${property.title}` : 'Agregar inmueble en preparación';
    $('save-preparation-button').textContent = property ? 'Guardar cambios' : 'Guardar ficha interna';
    if (property) {
      for (const field of ['title', 'readinessStatus', 'location', 'neighborhood', 'city', 'state', 'postalCode', 'age', 'price', 'bedrooms', 'bathrooms', 'constructionAreaM2', 'landAreaM2', 'parkingSpaces', 'floors', 'description', 'notes']) {
        form.elements[field].value = property[field] ?? '';
      }
      form.elements.latitude.value = property.coordinates?.latitude ?? '';
      form.elements.longitude.value = property.coordinates?.longitude ?? '';
      form.elements.images.value = Array.isArray(property.images) ? property.images.join('\n') : '';
      form.elements.features.value = Array.isArray(property.features) ? property.features.join('\n') : '';
    } else {
      // Estos campos proceden de la solicitud de avalúo adjunta; la colonia queda pendiente de confirmación.
      form.elements.title.value = 'Casa en preparación · Cerro de Loreto 130';
      form.elements.location.value = 'Cerro de Loreto 130';
      form.elements.neighborhood.value = 'Provileon (confirmar)';
      form.elements.city.value = 'General Escobedo';
      form.elements.postalCode.value = '66070';
      form.elements.age.value = '40';
      form.elements.notes.value = 'Pendiente inspección física y confirmación de la ortografía de la colonia, medidas, estado de servicios, trabajos necesarios y fotos reales del inmueble. No se copiaron datos personales del expediente.';
    }
    $('preparation-dialog').showModal();
  }

  async function savePreparation(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const preparationId = formData.get('preparationId');
    const payload = Object.fromEntries(formData.entries());
    delete payload.preparationId;
    payload.features = String(payload.features || '').split(/\r?\n/).map((item) => item.trim()).filter(Boolean);
    payload.images = String(payload.images || '').split(/\r?\n/).map((item) => item.trim()).filter(Boolean);
    payload.coordinates = {
      latitude: payload.latitude === '' ? null : Number(payload.latitude),
      longitude: payload.longitude === '' ? null : Number(payload.longitude)
    };
    delete payload.latitude;
    delete payload.longitude;
    for (const field of ['age', 'price', 'bedrooms', 'bathrooms', 'constructionAreaM2', 'landAreaM2', 'parkingSpaces', 'floors']) {
      payload[field] = payload[field] === '' ? null : Number(payload[field]);
    }
    const button = $('save-preparation-button');
    button.disabled = true;
    try {
      if (preparationId) await api.updatePreparation(preparationId, payload);
      else await api.createPreparation(payload);
      $('preparation-dialog').close();
      showNotice(preparationId ? 'La ficha interna quedó actualizada.' : 'El inmueble quedó agregado al tablero privado.', 'success');
      await loadData();
    } catch (error) {
      showNotice(error.message || 'No se pudo guardar el inmueble.');
    } finally {
      button.disabled = false;
    }
  }

  function openRepairDialog(propertyId, repairId = '') {
    const property = state.preparations.find((item) => String(item._id) === String(propertyId));
    if (!property) return;
    const repair = repairId ? (property.repairs || []).find((item) => String(item._id) === String(repairId)) : null;
    const form = $('repair-form');
    form.reset();
    form.elements.preparationId.value = property._id;
    form.elements.repairId.value = repair?._id || '';
    $('repair-dialog-title').textContent = repair ? `Trabajo · ${property.title}` : `Programar trabajo · ${property.title}`;
    $('save-repair-button').textContent = repair ? 'Guardar cambios' : 'Agregar trabajo';
    form.elements.category.value = repair?.category || 'electricidad';
    form.elements.priority.value = repair?.priority || 'media';
    form.elements.status.value = repair?.status || 'pendiente';
    for (const field of ['title', 'description', 'scheduledDate', 'scheduledTime', 'assignedTo', 'completionNotes']) {
      form.elements[field].value = repair?.[field] || '';
    }
    $('repair-dialog').showModal();
  }

  async function saveRepair(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const payload = Object.fromEntries(new FormData(form).entries());
    const preparationId = payload.preparationId;
    const repairId = payload.repairId;
    delete payload.preparationId;
    delete payload.repairId;
    if (payload.scheduledDate && !payload.scheduledTime) payload.scheduledTime = '';
    if (payload.scheduledDate && payload.status === 'pendiente') payload.status = 'programada';
    const button = $('save-repair-button');
    button.disabled = true;
    try {
      if (repairId) await api.updatePreparationRepair(preparationId, repairId, payload);
      else await api.addPreparationRepair(preparationId, payload);
      $('repair-dialog').close();
      showNotice(repairId ? 'El trabajo quedó actualizado.' : 'El trabajo quedó agregado a la agenda.', 'success');
      await loadData();
    } catch (error) {
      showNotice(error.message || 'No se pudo guardar el trabajo.');
    } finally {
      button.disabled = false;
    }
  }

  async function completeRepair(preparationId, repairId) {
    const property = state.preparations.find((item) => String(item._id) === String(preparationId));
    const repair = property?.repairs?.find((item) => String(item._id) === String(repairId));
    if (!repair) return;
    if (!window.confirm(`¿Marcar como concluido “${repair.title}”?`)) return;
    try {
      await api.updatePreparationRepair(preparationId, repairId, { status: 'completada' });
      showNotice('El trabajo quedó marcado como concluido.', 'success');
      await loadData();
    } catch (error) {
      showNotice(error.message || 'No se pudo concluir el trabajo.');
    }
  }

  async function markPreparationReady(preparationId) {
    try {
      await api.updatePreparation(preparationId, { readinessStatus: 'lista_para_publicar' });
      showNotice('El inmueble quedó listo para completar sus datos de publicación.', 'success');
      await loadData();
    } catch (error) {
      showNotice(error.message || 'Revisa los trabajos pendientes antes de marcarlo listo.');
    }
  }

  async function promotePreparation(preparationId) {
    const property = state.preparations.find((item) => String(item._id) === String(preparationId));
    if (!property || !window.confirm(`Vas a publicar “${property.title}” en el catálogo público de Aisa para venta. ¿Continuar?`)) return;
    try {
      const result = await api.promotePreparation(preparationId);
      showNotice(result.message || 'El inmueble quedó dado de alta en Aisa.', 'success');
      await loadData();
    } catch (error) {
      showNotice(error.message || 'Completa fotos y datos de venta antes de publicar.');
      if (property.readinessStatus === 'lista_para_publicar') openPreparationDialog(property);
    }
  }

  function editProperty(propertyId) {
    const property = state.properties.find((item) => String(item._id) === String(propertyId));
    if (!property) return;
    const form = $('property-form');
    form.elements.propertyId.value = property._id;
    for (const field of [
      'title', 'operation', 'type', 'price', 'status', 'city', 'neighborhood',
      'location', 'bedrooms', 'bathrooms', 'halfBathrooms', 'parkingSpaces',
      'constructionAreaM2', 'landAreaM2', 'floors', 'age', 'appraisalFee',
      'maintenanceFee', 'condition', 'legalStatus', 'description'
    ]) {
      form.elements[field].value = property[field] ?? '';
    }
    for (const field of ['features', 'amenities', 'images']) {
      form.elements[field].value = Array.isArray(property[field]) ? property[field].join('\n') : '';
    }
    $('property-dialog-title').textContent = `Editar: ${property.title}`;
    $('property-dialog').showModal();
  }

  async function saveProperty(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const propertyId = formData.get('propertyId');
    const payload = Object.fromEntries(formData.entries());
    delete payload.propertyId;

    for (const field of ['price', 'bedrooms', 'bathrooms', 'parkingSpaces', 'constructionAreaM2', 'landAreaM2', 'floors']) {
      payload[field] = Number(payload[field] || 0);
    }
    for (const field of ['halfBathrooms', 'age', 'appraisalFee', 'maintenanceFee']) {
      payload[field] = payload[field] === '' ? null : Number(payload[field]);
    }
    payload.features = payload.features.split(/\r?\n/).map((value) => value.trim()).filter(Boolean);
    payload.amenities = payload.amenities.split(/\r?\n/).map((value) => value.trim()).filter(Boolean);
    payload.images = payload.images.split(/\r?\n/).map((value) => value.trim()).filter(Boolean);
    if (!payload.images.length) {
      showNotice('Agrega por lo menos una imagen antes de guardar.');
      return;
    }

    const button = $('save-property-button');
    button.disabled = true;
    try {
      await api.updateProperty(propertyId, payload);
      $('property-dialog').close();
      showNotice('La ficha de la propiedad se actualizó correctamente.', 'success');
      await loadData();
    } catch (error) {
      showNotice(error.message || 'No se pudo actualizar la propiedad.');
    } finally {
      button.disabled = false;
    }
  }

  function renderCalendar() {
    $('month-label').textContent = monthFormatter.format(state.currentMonth);
    const year = state.currentMonth.getFullYear();
    const month = state.currentMonth.getMonth();
    const first = new Date(year, month, 1);
    const mondayOffset = (first.getDay() + 6) % 7;
    const start = new Date(year, month, 1 - mondayOffset);
    const today = dateKey(new Date());
    const cells = [];

    for (let index = 0; index < 42; index += 1) {
      const date = new Date(start.getFullYear(), start.getMonth(), start.getDate() + index);
      const key = dateKey(date);
      const visits = state.visits.filter((visit) => visitDate(visit) === key && visit.status !== 'cancelada');
      const repairs = repairsForDate(key);
      const activities = [
        ...visits.map((visit) => ({ type: 'visit', time: visit.scheduledTime || visit.time || '', label: visit.clientName, status: visit.status })),
        ...repairs.map(({ property, repair }) => ({ type: 'repair', time: repair.scheduledTime || '', label: repair.title, status: repair.status, property: property.title }))
      ].sort((a, b) => a.time.localeCompare(b.time));
      const eventMarkup = activities.slice(0, 2).map((activity) =>
        `<span class="day-event ${activity.type === 'repair' ? 'repair-event' : escapeHTML(activity.status)}">${escapeHTML(activity.time || (activity.type === 'repair' ? 'Trabajo' : 'Cita'))} · ${escapeHTML(activity.type === 'repair' ? activity.property : activity.label)}</span>`
      ).join('');
      const more = activities.length > 2 ? `<span class="more-events">+${activities.length - 2} más</span>` : '';
      cells.push(`
        <button class="calendar-cell ${date.getMonth() !== month ? 'is-outside' : ''} ${key === today ? 'is-today' : ''} ${key === state.selectedDate ? 'is-selected' : ''}" type="button" data-date="${key}" aria-label="${escapeHTML(dateFormatter.format(date))}, ${activities.length} actividades">
          <span class="day-number">${date.getDate()}</span>
          <span class="day-events">${eventMarkup}${more}</span>
        </button>`);
    }
    $('calendar-grid').innerHTML = cells.join('');
  }

  function renderSelectedDay() {
    const selected = new Date(`${state.selectedDate}T12:00:00`);
    $('selected-date-label').textContent = dateFormatter.format(selected);
    const visits = state.visits
      .filter((visit) => visitDate(visit) === state.selectedDate && visit.status !== 'cancelada')
      .sort((a, b) => (a.scheduledTime || a.time || '').localeCompare(b.scheduledTime || b.time || ''));
    const repairs = repairsForDate(state.selectedDate);
    const activities = [
      ...visits.map((visit) => ({ type: 'visit', time: visit.scheduledTime || visit.time || '', visit })),
      ...repairs.map(({ property, repair }) => ({ type: 'repair', time: repair.scheduledTime || '', property, repair }))
    ].sort((a, b) => a.time.localeCompare(b.time));
    $('selected-day-count').textContent = `${activities.length} ${activities.length === 1 ? 'actividad' : 'actividades'}`;
    $('day-appointments').innerHTML = activities.length ? activities.map((activity) => activity.type === 'visit' ? `
      <article class="day-card">
        <div class="day-card-top"><time>${escapeHTML(timeFormatter(activity.visit.scheduledTime || activity.visit.time))}</time><span class="status ${escapeHTML(activity.visit.status)}">${escapeHTML(statusLabel(activity.visit.status))}</span></div>
        <h3>${escapeHTML(activity.visit.clientName)}</h3>
        <p>${escapeHTML(activity.visit.propertyTitle)}${activity.visit.clientPhone ? ` · ${escapeHTML(activity.visit.clientPhone)}` : ''}</p>
        <button class="text-action" type="button" data-open-visit="${escapeHTML(activity.visit._id)}">Ver y gestionar →</button>
      </article>` : `
      <article class="day-card repair-day-card">
        <div class="day-card-top"><time>${escapeHTML(timeFormatter(activity.repair.scheduledTime))}</time><span class="status pendiente">Reparación</span></div>
        <h3>${escapeHTML(activity.repair.title)}</h3>
        <p>${escapeHTML(activity.property.title)} · ${escapeHTML(repairCategoriesLabel(activity.repair.category))}</p>
        <button class="text-action" type="button" data-open-repair="${escapeHTML(activity.property._id)}" data-repair-id="${escapeHTML(activity.repair._id)}">Ver trabajo →</button>
      </article>`).join('') : '<div class="empty-state">No hay citas ni visitas de reparación programadas para este día.</div>';
  }

  function repairsForDate(key) {
    return state.preparations.flatMap((property) => (property.repairs || [])
      .filter((repair) => repair.scheduledDate === key && repair.status !== 'completada')
      .map((repair) => ({ property, repair })));
  }

  function renderTable() {
    const visits = filteredVisits();
    $('result-count').textContent = `${visits.length} ${visits.length === 1 ? 'resultado' : 'resultados'}`;
    $('visits-table-body').innerHTML = visits.length ? visits.map((visit) => `
      <tr>
        <td><strong>${escapeHTML(visit.clientName)}</strong><small>${escapeHTML(visit.clientEmail || 'Sin correo')}</small></td>
        <td><strong>${escapeHTML(visit.propertyTitle)}</strong><small>${escapeHTML(visit.propertyLocation || '')}</small></td>
        <td><strong>${escapeHTML(dateShortFormatter.format(new Date(`${visitDate(visit)}T12:00:00`)))}</strong><small>${escapeHTML(visit.scheduledTime || visit.time || 'Hora pendiente')}</small></td>
        <td><span class="status ${escapeHTML(visit.status)}">${escapeHTML(statusLabel(visit.status))}</span></td>
        <td>${visit.clientPhone ? `<a href="tel:${escapeHTML(visit.clientPhone)}">${escapeHTML(visit.clientPhone)}</a>` : '—'}</td>
        <td><button class="row-action" type="button" data-open-visit="${escapeHTML(visit._id)}">Gestionar</button></td>
      </tr>`).join('') : '<tr><td colspan="6"><div class="empty-state">No encontramos citas con esos filtros.</div></td></tr>';
  }

  function openVisitDetails(visitId) {
    const visit = state.visits.find((item) => String(item._id) === String(visitId));
    if (!visit) return;
    state.activeVisit = visit;
    $('details-title').textContent = visit.clientName;
    $('details-summary').innerHTML = `
      <span><strong>Propiedad:</strong> ${escapeHTML(visit.propertyTitle)}</span>
      <span><strong>Contacto:</strong> ${escapeHTML(visit.clientPhone)}${visit.clientEmail ? ` · ${escapeHTML(visit.clientEmail)}` : ''}</span>
      <span><strong>Estado:</strong> ${escapeHTML(statusLabel(visit.status))}</span>
      ${visit.notes ? `<span><strong>Notas:</strong> ${escapeHTML(visit.notes)}</span>` : ''}`;
    $('details-form').elements.visitId.value = visit._id;
    $('details-form').elements.scheduledDate.value = visitDate(visit);
    $('details-form').elements.scheduledTime.value = visit.scheduledTime || visit.time || '';
    $('details-dialog').showModal();
  }

  async function updateVisit(status) {
    const visit = state.activeVisit;
    if (!visit) return;
    const form = $('details-form');
    const updates = { status };
    if (status === 'confirmada') {
      updates.scheduledDate = form.elements.scheduledDate.value;
      updates.scheduledTime = form.elements.scheduledTime.value;
      if (!updates.scheduledDate || !updates.scheduledTime) {
        showNotice('Para confirmar, selecciona una fecha y una hora.');
        return;
      }
    }
    const button = $('details-dialog').querySelector(`[data-action="${status}"]`);
    button.disabled = true;
    try {
      await api.updateVisitStatus(visit._id, updates);
      $('details-dialog').close();
      showNotice(status === 'cancelada' ? 'La cita quedó cancelada.' : 'La cita se actualizó correctamente.', 'success');
      await loadData();
    } catch (error) {
      showNotice(error.message);
    } finally {
      button.disabled = false;
    }
  }

  async function createVisit(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = Object.fromEntries(new FormData(form).entries());
    const property = state.properties.find((item) => String(item._id) === data.propertyId);
    if (!property) {
      showNotice('Selecciona una propiedad del inventario.');
      return;
    }
    const button = $('save-visit-button');
    button.disabled = true;
    try {
      await api.createAdminVisit({
        ...data,
        propertyId: property._id,
        propertyTitle: property.title,
        propertyPrice: property.priceFormatted || String(property.price || ''),
        propertyLocation: property.location || property.city || ''
      });
      form.reset();
      form.elements.time.value = '10:00';
      $('visit-dialog').close();
      showNotice('La cita quedó agregada a la agenda.', 'success');
      await loadData();
    } catch (error) {
      showNotice(error.message);
    } finally {
      button.disabled = false;
    }
  }

  function exportCSV() {
    const rows = [
      ['Cliente', 'Teléfono', 'Correo', 'Propiedad', 'Fecha', 'Hora', 'Estado', 'Notas'],
      ...filteredVisits().map((visit) => [
        visit.clientName, visit.clientPhone, visit.clientEmail, visit.propertyTitle,
        visitDate(visit), visit.scheduledTime || visit.time, statusLabel(visit.status), visit.notes
      ])
    ];
    const csv = rows.map((row) => row.map((value) => `"${String(value || '').replace(/"/g, '""')}"`).join(',')).join('\r\n');
    const url = URL.createObjectURL(new Blob(['\uFEFF', csv], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `aisa-agenda-${dateKey(new Date())}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  function bindEvents() {
    // Dock Toggle & Modo Drawer
    function toggleDock() {
      const isMobile = window.innerWidth <= 1024;
      if (isMobile) {
        document.body.classList.toggle('sidebar-open');
      } else {
        const isCollapsed = document.body.classList.toggle('sidebar-collapsed');
        document.body.classList.toggle('sidebar-expanded', !isCollapsed);
        try {
          localStorage.setItem('aisa-agenda-dock-collapsed', isCollapsed ? 'true' : 'false');
        } catch {}
      }
    }

    const menuToggleBtn = $('menu-toggle-btn');
    if (menuToggleBtn) menuToggleBtn.addEventListener('click', toggleDock);

    const dockCollapseBtn = $('dock-collapse-btn');
    if (dockCollapseBtn) dockCollapseBtn.addEventListener('click', toggleDock);

    const sidebarBackdrop = $('sidebar-backdrop');
    if (sidebarBackdrop) {
      sidebarBackdrop.addEventListener('click', () => {
        document.body.classList.remove('sidebar-open');
      });
    }

    // Auto-cerrar drawer al navegar en móvil
    document.querySelectorAll('.sidebar-link').forEach((link) => {
      link.addEventListener('click', () => {
        if (window.innerWidth <= 1024) {
          document.body.classList.remove('sidebar-open');
        }
      });
    });

    // Buscador Global Rápido en Topbar
    const globalSearch = $('global-quick-search');
    if (globalSearch) {
      globalSearch.addEventListener('input', (event) => {
        const value = event.target.value.trim();
        state.query = value;
        state.inventoryQuery = value;
        state.preparationQuery = value;

        const tableSearch = $('search-input');
        if (tableSearch) tableSearch.value = value;
        const invSearch = $('inventory-search');
        if (invSearch) invSearch.value = value;
        const prepSearch = $('preparation-search');
        if (prepSearch) prepSearch.value = value;

        renderTable();
        renderInventory();
        renderPreparations();
      });

      globalSearch.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
          event.preventDefault();
          const target = $('inventory-management') || $('appointment-management');
          if (target) target.scrollIntoView({ behavior: 'smooth' });
        }
      });
    }

    // Atajos de teclado: Ctrl+B (Dock) y Ctrl+K (Buscador)
    window.addEventListener('keydown', (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'b') {
        event.preventDefault();
        toggleDock();
      }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        if (globalSearch) {
          globalSearch.focus();
          globalSearch.select();
        }
      }
      if (event.key === 'Escape') {
        document.body.classList.remove('sidebar-open');
      }
    });

    $('theme-toggle').addEventListener('click', () => {
      const nextTheme = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
      applyTheme(nextTheme, true);
    });
    document.querySelectorAll('.sidebar-link[href^="#"]').forEach((link) => {
      link.addEventListener('click', () => updateActiveNavigation(link.hash.slice(1)));
    });
    const navigationSections = ['overview', 'calendar-management', 'appointment-management', 'inventory-management', 'preparation-management', 'whatsapp-assistant']
      .map((id) => $(id)).filter(Boolean);
    if ('IntersectionObserver' in window) {
      const sectionObserver = new IntersectionObserver((entries) => {
        const visibleSections = entries.filter((entry) => entry.isIntersecting)
          .sort((first, second) => second.intersectionRatio - first.intersectionRatio);
        if (visibleSections[0]) updateActiveNavigation(visibleSections[0].target.id);
      }, { rootMargin: '-18% 0px -68% 0px', threshold: [0, 0.2, 0.5] });
      navigationSections.forEach((section) => sectionObserver.observe(section));
    }

    $('previous-month').addEventListener('click', () => {
      state.currentMonth = new Date(state.currentMonth.getFullYear(), state.currentMonth.getMonth() - 1, 1);
      renderCalendar();
    });
    $('next-month').addEventListener('click', () => {
      state.currentMonth = new Date(state.currentMonth.getFullYear(), state.currentMonth.getMonth() + 1, 1);
      renderCalendar();
    });
    $('today-button').addEventListener('click', () => {
      const today = new Date();
      state.currentMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      state.selectedDate = dateKey(today);
      renderCalendar();
      renderSelectedDay();
    });
    $('calendar-grid').addEventListener('click', (event) => {
      const cell = event.target.closest('[data-date]');
      if (!cell) return;
      state.selectedDate = cell.dataset.date;
      const date = new Date(`${state.selectedDate}T12:00:00`);
      state.currentMonth = new Date(date.getFullYear(), date.getMonth(), 1);
      renderCalendar();
      renderSelectedDay();
    });
    $('day-appointments').addEventListener('click', (event) => {
      const button = event.target.closest('[data-open-visit]');
      if (button) openVisitDetails(button.dataset.openVisit);
      const repairButton = event.target.closest('[data-open-repair]');
      if (repairButton) openRepairDialog(repairButton.dataset.openRepair, repairButton.dataset.repairId);
    });
    $('visits-table-body').addEventListener('click', (event) => {
      const button = event.target.closest('[data-open-visit]');
      if (button) openVisitDetails(button.dataset.openVisit);
    });
    $('inventory-grid').addEventListener('click', (event) => {
      const button = event.target.closest('[data-edit-property]');
      if (button) editProperty(button.dataset.editProperty);
    });
    $('preparation-grid').addEventListener('click', (event) => {
      const editButton = event.target.closest('[data-edit-preparation]');
      if (editButton) {
        openPreparationDialog(state.preparations.find((item) => String(item._id) === String(editButton.dataset.editPreparation)));
        return;
      }
      const addRepairButton = event.target.closest('[data-add-repair]');
      if (addRepairButton) {
        openRepairDialog(addRepairButton.dataset.addRepair);
        return;
      }
      const openRepairButton = event.target.closest('[data-open-repair]');
      if (openRepairButton) {
        openRepairDialog(openRepairButton.dataset.openRepair, openRepairButton.dataset.repairId);
        return;
      }
      const completeButton = event.target.closest('[data-complete-repair]');
      if (completeButton) {
        completeRepair(completeButton.dataset.completeRepair, completeButton.dataset.repairId);
        return;
      }
      const readyButton = event.target.closest('[data-mark-ready]');
      if (readyButton) {
        markPreparationReady(readyButton.dataset.markReady);
        return;
      }
      const promoteButton = event.target.closest('[data-promote-preparation]');
      if (promoteButton) promotePreparation(promoteButton.dataset.promotePreparation);
    });
    $('inventory-search').addEventListener('input', (event) => {
      state.inventoryQuery = event.target.value;
      renderInventory();
    });
    $('inventory-operation-filter').addEventListener('change', (event) => {
      state.inventoryOperation = event.target.value;
      renderInventory();
    });
    $('inventory-status-filter').addEventListener('change', (event) => {
      state.inventoryStatus = event.target.value;
      renderInventory();
    });
    $('preparation-search').addEventListener('input', (event) => {
      state.preparationQuery = event.target.value;
      renderPreparations();
    });
    $('preparation-status-filter').addEventListener('change', (event) => {
      state.preparationStatus = event.target.value;
      renderPreparations();
    });
    $('status-filter').addEventListener('change', (event) => { state.status = event.target.value; renderTable(); });
    $('property-filter').addEventListener('change', (event) => { state.propertyId = event.target.value; renderTable(); });
    $('search-input').addEventListener('input', (event) => { state.query = event.target.value; renderTable(); });
    $('refresh-button').addEventListener('click', () => {
      hideNotice();
      loadData();
    });
    $('export-button').addEventListener('click', exportCSV);
        // Atajos Rápidos de Escenarios en el Asistente de IA
    const SCENARIO_TEMPLATES = {
      compra: "Hola buenas tardes, me interesa la casa de Valle de Lincoln en García de $720,000, ¿con cuánto se aparta, qué papeles piden y aceptan crédito Infonavit?",
      renta: "Buenas tardes, busco casa en renta en Escobedo o Monterrey, ¿tienen opciones amuebladas o sin amueblar, cuánto piden de depósito y qué requisitos piden?",
      vender: "Hola buenas tardes, me gustaría vender mi casa en Pesquería, ¿cómo le hacen ustedes para venderla y cuánto cobran de comisión?",
      avaluo: "Oigan ocupo un avalúo para un crédito de Infonavit de una casa, ¿qué papeles tengo que entregar y cuánto tiempo tarda?",
      sello_rojo: "Hola me interesa la casa pero quiero saber qué significa que tenga Sello Rojo y si ya tiene la luz y el agua conectadas"
    };

    document.querySelectorAll('.scenario-pill').forEach((pill) => {
      pill.addEventListener('click', () => {
        const scenarioKey = pill.dataset.scenario;
        const msg = SCENARIO_TEMPLATES[scenarioKey];
        if (msg) {
          const input = $('whatsapp-customer-message');
          if (input) {
            input.value = msg;
            input.focus();
            draftWhatsAppReply(new Event('submit'));
          }
        }
      });
    });
    $('whatsapp-draft-form').addEventListener('submit', draftWhatsAppReply);
    $('whatsapp-draft-copy').addEventListener('click', copyWhatsAppReply);
    $('new-visit-button').addEventListener('click', () => {
      if (!state.properties.length) {
        showNotice('No hay propiedades disponibles para vincular. Revisa el inventario.');
        return;
      }
      const dateInput = $('visit-form').elements.date;
      dateInput.value = state.selectedDate || dateKey(new Date());
      $('visit-dialog').showModal();
    });
    $('close-visit-dialog').addEventListener('click', () => $('visit-dialog').close());
    $('cancel-visit-dialog').addEventListener('click', () => $('visit-dialog').close());
    $('visit-form').addEventListener('submit', createVisit);
    $('close-details-dialog').addEventListener('click', () => $('details-dialog').close());
    $('details-form').querySelectorAll('[data-action]').forEach((button) => {
      button.addEventListener('click', () => updateVisit(button.dataset.action));
    });
    $('refresh-inventory').addEventListener('click', loadData);
    $('close-property-dialog').addEventListener('click', () => $('property-dialog').close());
    $('cancel-property-dialog').addEventListener('click', () => $('property-dialog').close());
    $('property-form').addEventListener('submit', saveProperty);
    $('new-preparation-button').addEventListener('click', () => openPreparationDialog());
    $('close-preparation-dialog').addEventListener('click', () => $('preparation-dialog').close());
    $('cancel-preparation-dialog').addEventListener('click', () => $('preparation-dialog').close());
    $('preparation-form').addEventListener('submit', savePreparation);
    $('close-repair-dialog').addEventListener('click', () => $('repair-dialog').close());
    $('cancel-repair-dialog').addEventListener('click', () => $('repair-dialog').close());
    $('repair-form').addEventListener('submit', saveRepair);
    $('avatar').addEventListener('click', () => {
      api.logout();
      window.location.assign('/');
    });
  }

  async function init() {
    applyTheme(document.documentElement.dataset.theme);

    // Restaurar estado preferido del dock
    try {
      const isCollapsed = localStorage.getItem('aisa-agenda-dock-collapsed') === 'true';
      if (window.innerWidth > 1024) {
        document.body.classList.toggle('sidebar-collapsed', isCollapsed);
        document.body.classList.toggle('sidebar-expanded', !isCollapsed);
      }
    } catch {}

    updateActiveNavigation(location.hash.slice(1) || 'overview');
    if (!await authenticate()) return;
    bindEvents();
    await loadData();
  }

  init().catch((error) => {
    setConnection(false, 'Error');
    showNotice(error.message || 'No se pudo iniciar la agenda.');
  });
});
