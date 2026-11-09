(() => {
  if (!document.querySelector('link[href*="ai-assistant.css"]')) {
    const stylesheet = document.createElement('link');
    stylesheet.rel = 'stylesheet';
    stylesheet.href = `css/ai-assistant.css?v=aisa-ai-v1`;
    document.head.appendChild(stylesheet);
  }

  const API_BASE = (window.GK_API_BASE_URL || (
    ['localhost', '127.0.0.1'].includes(window.location.hostname)
      ? 'http://localhost:3000/api'
      : 'https://aisa-inmobiliaria-api.onrender.com/api'
  )).replace(/\/+$/, '');

  const root = document.createElement('div');
  root.className = 'aisa-ai-root';
  root.innerHTML = `
    <button class="aisa-ai-launcher" type="button" aria-label="Abrir asistente inmobiliario">
      <span class="aisa-ai-launcher-icon" aria-hidden="true">✦</span>
      <span class="aisa-ai-launcher-label">Asistente IA</span>
    </button>
    <section class="aisa-ai-panel" aria-label="Asistente inmobiliario" aria-hidden="true">
      <header class="aisa-ai-header">
        <div>
          <span class="aisa-ai-status"></span>
          <strong>Asistente Aisa</strong>
          <small>Catálogo actualizado</small>
        </div>
        <button class="aisa-ai-close" type="button" aria-label="Cerrar">×</button>
      </header>
      <div class="aisa-ai-messages" aria-live="polite">
        <div class="aisa-ai-message aisa-ai-message--bot">
          Hola. ¿Buscas comprar o rentar una propiedad? Puedes indicarme la zona, presupuesto o tipo de inmueble.
        </div>
      </div>
      <div class="aisa-ai-quick-actions">
        <button type="button" data-message="Busco una casa en venta">Casas en venta</button>
        <button type="button" data-message="Busco un departamento en renta">Departamentos en renta</button>
        <button type="button" data-message="Quiero agendar una visita">Agendar visita</button>
      </div>
      <form class="aisa-ai-form">
        <input type="text" name="message" maxlength="500" autocomplete="off" placeholder="Escribe tu búsqueda..." aria-label="Mensaje">
        <button type="submit" aria-label="Enviar">↑</button>
      </form>
    </section>
  `;
  document.body.appendChild(root);

  const panel = root.querySelector('.aisa-ai-panel');
  const launcher = root.querySelector('.aisa-ai-launcher');
  const messages = root.querySelector('.aisa-ai-messages');
  const form = root.querySelector('.aisa-ai-form');
  const input = form.querySelector('input');
  const history = [];

  const setOpen = (open) => {
    panel.classList.toggle('is-open', open);
    panel.setAttribute('aria-hidden', String(!open));
    launcher.setAttribute('aria-expanded', String(open));
    if (open) setTimeout(() => input.focus(), 180);
  };

  const addMessage = (text, role) => {
    const message = document.createElement('div');
    message.className = `aisa-ai-message aisa-ai-message--${role}`;
    message.textContent = text;
    messages.appendChild(message);
    messages.scrollTop = messages.scrollHeight;
    return message;
  };

  const sendMessage = async (text) => {
    const cleanText = text.trim();
    if (!cleanText) return;

    addMessage(cleanText, 'user');
    history.push({ role: 'user', content: cleanText });
    const pending = addMessage('Buscando opciones...', 'bot');
    input.value = '';

    try {
      const response = await fetch(`${API_BASE}/ai/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: cleanText, history: history.slice(-6) })
      });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.message || 'No pude responder.');

      pending.textContent = data.answer;
      history.push({ role: 'assistant', content: data.answer });

      if (Array.isArray(data.properties) && data.properties.length) {
        const cards = document.createElement('div');
        cards.className = 'aisa-ai-property-list';
        data.properties.forEach((property) => {
          const link = document.createElement('a');
          link.href = `propiedad.html?slug=${encodeURIComponent(property.slug || property.id || '')}`;
          const title = document.createElement('strong');
          title.textContent = property.title || 'Propiedad';
          const details = document.createElement('span');
          details.textContent = [property.location, property.price].filter(Boolean).join(' · ');
          link.append(title, details);
          cards.appendChild(link);
        });
        messages.appendChild(cards);
      }
    } catch (error) {
      pending.textContent = error.message || 'No pude completar la consulta. Intenta de nuevo.';
    }
    messages.scrollTop = messages.scrollHeight;
  };

  launcher.addEventListener('click', () => setOpen(!panel.classList.contains('is-open')));
  root.querySelector('.aisa-ai-close').addEventListener('click', () => setOpen(false));
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    sendMessage(input.value);
  });
  root.querySelectorAll('[data-message]').forEach((button) => {
    button.addEventListener('click', () => sendMessage(button.dataset.message));
  });
})();
