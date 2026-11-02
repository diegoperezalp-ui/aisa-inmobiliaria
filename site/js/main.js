/**
 * ========================================================
 * AISA INMOBILIARIA - LÓGICA Y FUNCIONALIDADES JS
 * "Tu proyecto nuestro compromiso"
 * ========================================================
 */

document.addEventListener('DOMContentLoaded', () => {

  // ========================================================
  // 1. NAVEGACIÓN ACTIVA Y SOMBRA EN SCROLL
  // ========================================================
  const header = document.querySelector('.main-header');
  if (header) {
    window.addEventListener('scroll', () => {
      if (window.scrollY > 20) {
        header.style.boxShadow = '0 6px 22px rgba(22, 34, 8, 0.08)';
      } else {
        header.style.boxShadow = 'none';
      }
    });
  }

  // Marcar enlace activo según la página actual (Desktop y Móvil)
  const currentPage = window.location.pathname.split('/').pop() || 'index.html';
  const navLinks = document.querySelectorAll('.nav-links a, .mobile-drawer a');
  navLinks.forEach(link => {
    const href = link.getAttribute('href');
    if (href === currentPage || (currentPage === '' && href === 'index.html')) {
      link.classList.add('active');
    }
  });

  // Control del Menú Móvil Hamburguesa
  const mobileToggle = document.getElementById('mobile-toggle');
  const mobileDrawer = document.getElementById('mobile-drawer');

  if (mobileToggle && mobileDrawer) {
    mobileToggle.addEventListener('click', (e) => {
      e.stopPropagation();
      mobileDrawer.classList.toggle('open');
      const isOpen = mobileDrawer.classList.contains('open');
      mobileToggle.innerHTML = isOpen ? '&times;' : '&#9776;';
    });

    // Cerrar menú al hacer clic en un enlace del drawer
    mobileDrawer.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        mobileDrawer.classList.remove('open');
        mobileToggle.innerHTML = '&#9776;';
      });
    });

    // Cerrar menú al hacer clic fuera del header
    document.addEventListener('click', (e) => {
      if (!mobileDrawer.contains(e.target) && e.target !== mobileToggle) {
        mobileDrawer.classList.remove('open');
        mobileToggle.innerHTML = '&#9776;';
      }
    });
  }


  // ========================================================
  // 2. FILTRO DE PROPIEDADES EN TIEMPO REAL (COMPRA Y RENTA)
  // ========================================================
  const filterBtn = document.getElementById('btn-filter');
  if (filterBtn) {
    filterBtn.addEventListener('click', filterProperties);
  }

  function filterProperties() {
    const typeSelect = document.getElementById('filter-type');
    const citySelect = document.getElementById('filter-city');
    const priceSelect = document.getElementById('filter-price');

    const selectedType = typeSelect ? typeSelect.value.toLowerCase() : 'all';
    const selectedCity = citySelect ? citySelect.value.toLowerCase() : 'all';
    const selectedPrice = priceSelect ? priceSelect.value : 'all';

    const cards = document.querySelectorAll('.property-card');
    let visibleCount = 0;

    cards.forEach(card => {
      const cardType = (card.getAttribute('data-type') || '').toLowerCase();
      const cardCity = (card.getAttribute('data-city') || '').toLowerCase();
      const cardPrice = parseFloat(card.getAttribute('data-price') || '0');

      let matchesType = (selectedType === 'all' || cardType === selectedType);
      let matchesCity = (selectedCity === 'all' || cardCity.includes(selectedCity));
      let matchesPrice = true;

      if (selectedPrice !== 'all') {
        const [min, max] = selectedPrice.split('-').map(Number);
        if (max) {
          matchesPrice = (cardPrice >= min && cardPrice <= max);
        } else {
          matchesPrice = (cardPrice >= min);
        }
      }

      if (matchesType && matchesCity && matchesPrice) {
        card.style.display = 'flex';
        visibleCount++;
      } else {
        card.style.display = 'none';
      }
    });

    const noResults = document.getElementById('no-results-msg');
    if (noResults) {
      noResults.style.display = (visibleCount === 0) ? 'block' : 'none';
    }
  }


  // ========================================================
  // 3. CALCULADORA HIPOTECARIA INTERACTIVA (COMPRA.HTML)
  // ========================================================
  const propertyValueInput = document.getElementById('calc-price');
  const downPaymentPercentInput = document.getElementById('calc-down-percent');
  const loanTermInput = document.getElementById('calc-term');
  const interestRateInput = document.getElementById('calc-rate');

  if (propertyValueInput && downPaymentPercentInput) {
    const updateMortgage = () => {
      const price = parseFloat(propertyValueInput.value) || 0;
      const downPercent = parseFloat(downPaymentPercentInput.value) || 10;
      const years = parseInt(loanTermInput ? loanTermInput.value : 20);
      const annualRate = parseFloat(interestRateInput ? interestRateInput.value : 10.5) / 100;

      // Actualizar etiquetas de rangos
      const priceLabel = document.getElementById('calc-price-val');
      const downLabel = document.getElementById('calc-down-val');
      if (priceLabel) priceLabel.textContent = formatCurrency(price);
      if (downLabel) downLabel.textContent = `${downPercent}% (${formatCurrency(price * (downPercent / 100))})`;

      // Cálculos
      const downPaymentAmount = price * (downPercent / 100);
      const loanAmount = price - downPaymentAmount;
      const monthlyRate = annualRate / 12;
      const totalMonths = years * 12;

      let monthlyPayment = 0;
      if (loanAmount > 0 && monthlyRate > 0) {
        monthlyPayment = loanAmount * (monthlyRate * Math.pow(1 + monthlyRate, totalMonths)) / (Math.pow(1 + monthlyRate, totalMonths) - 1);
      }

      const totalPaid = (monthlyPayment * totalMonths) + downPaymentAmount;

      // Renderizar resultados
      const displayMonthly = document.getElementById('calc-result-monthly');
      const displayLoan = document.getElementById('calc-result-loan');
      const displayDown = document.getElementById('calc-result-down');
      const displayTotal = document.getElementById('calc-result-total');

      if (displayMonthly) displayMonthly.textContent = formatCurrency(Math.round(monthlyPayment));
      if (displayLoan) displayLoan.textContent = formatCurrency(Math.round(loanAmount));
      if (displayDown) displayDown.textContent = formatCurrency(Math.round(downPaymentAmount));
      if (displayTotal) displayTotal.textContent = formatCurrency(Math.round(totalPaid));
    };

    propertyValueInput.addEventListener('input', updateMortgage);
    downPaymentPercentInput.addEventListener('input', updateMortgage);
    if (loanTermInput) loanTermInput.addEventListener('change', updateMortgage);
    if (interestRateInput) interestRateInput.addEventListener('input', updateMortgage);

    // Inicializar
    updateMortgage();
  }


  // ========================================================
  // 4. ESTIMADOR DE VALOR COMERCIAL DE PROPIEDAD (VENTA.HTML)
  // ========================================================
  const valType = document.getElementById('val-type');
  const valM2 = document.getElementById('val-m2');
  const valZone = document.getElementById('val-zone');
  const valCondition = document.getElementById('val-condition');
  const btnEstimate = document.getElementById('btn-estimate');

  if (btnEstimate && valM2) {
    btnEstimate.addEventListener('click', () => {
      const m2 = parseFloat(valM2.value) || 120;
      const type = valType ? valType.value : 'casa';
      const zoneMultiplier = parseFloat(valZone ? valZone.value : 1.0);
      const conditionMultiplier = parseFloat(valCondition ? valCondition.value : 1.0);

      // Precios base estimados por m2
      let baseM2Price = 22000; // Casa estándar
      if (type === 'departamento') baseM2Price = 28000;
      if (type === 'terreno') baseM2Price = 11000;
      if (type === 'comercial') baseM2Price = 32000;

      const estimatedCenter = m2 * baseM2Price * zoneMultiplier * conditionMultiplier;
      const minEst = Math.round((estimatedCenter * 0.92) / 10000) * 10000;
      const maxEst = Math.round((estimatedCenter * 1.08) / 10000) * 10000;

      const displayRange = document.getElementById('val-result-range');
      const displayM2 = document.getElementById('val-result-m2');
      if (displayRange) displayRange.textContent = `${formatCurrency(minEst)} - ${formatCurrency(maxEst)}`;
      if (displayM2) displayM2.textContent = `${formatCurrency(Math.round(estimatedCenter / m2))} / m² aprox.`;

      // Efecto visual
      const resultCard = document.querySelector('.valuation-estimate-card');
      if (resultCard) {
        resultCard.style.transform = 'scale(1.02)';
        setTimeout(() => resultCard.style.transform = 'scale(1)', 250);
      }
    });
  }


  // ========================================================
  // 5. EVALUADOR DE INGRESOS PARA RENTA (RENTA.HTML)
  // ========================================================
  const rentPriceInput = document.getElementById('rent-check-price');
  const tenantIncomeInput = document.getElementById('rent-check-income');
  const btnCheckRent = document.getElementById('btn-check-rent');

  if (btnCheckRent && rentPriceInput && tenantIncomeInput) {
    btnCheckRent.addEventListener('click', () => {
      const rent = parseFloat(rentPriceInput.value) || 0;
      const income = parseFloat(tenantIncomeInput.value) || 0;
      const resultBox = document.getElementById('rent-check-result');

      if (!resultBox) return;

      const requiredIncome = rent * 3;
      resultBox.style.display = 'block';

      if (income >= requiredIncome) {
        resultBox.className = 'rent-status-box rent-ok';
        resultBox.innerHTML = `
          <strong>¡Excelente perfil financiero!</strong><br>
          Tus ingresos de ${formatCurrency(income)} cubren holgadamente el criterio estándar (se requiere mínimo ${formatCurrency(requiredIncome)}, 3 veces la renta). Calificas con trámite ágil.
        `;
      } else {
        resultBox.className = 'rent-status-box rent-warn';
        resultBox.innerHTML = `
          <strong>Opción con Co-obligado o Aval</strong><br>
          Para una renta de ${formatCurrency(rent)} el ingreso recomendado es de ${formatCurrency(requiredIncome)}. Si tus ingresos personales son menores, en Aisa Inmobiliaria puedes sumar ingresos con un co-arrendatario o presentar un aval con bien raíz.
        `;
      }
    });
  }


  // ========================================================
  // 6. MODAL PARA AGENDAR VISITA A PROPIEDAD
  // ========================================================
  const modalOverlay = document.getElementById('modal-visit');
  const modalCloseBtn = document.getElementById('modal-close-btn');
  const modalPropertyName = document.getElementById('modal-property-name');
  const visitForm = document.getElementById('form-schedule-visit');

  // Botones para abrir el modal desde las tarjetas
  const visitBtns = document.querySelectorAll('.btn-open-visit');
  visitBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const propTitle = btn.getAttribute('data-property') || 'Propiedad de Aisa Inmobiliaria';
      if (modalPropertyName) modalPropertyName.textContent = propTitle;
      if (modalOverlay) modalOverlay.classList.add('open');
    });
  });

  if (modalCloseBtn && modalOverlay) {
    modalCloseBtn.addEventListener('click', () => modalOverlay.classList.remove('open'));
    modalOverlay.addEventListener('click', (e) => {
      if (e.target === modalOverlay) modalOverlay.classList.remove('open');
    });
  }

  // Enviar cita por WhatsApp directo
  if (visitForm) {
    visitForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = document.getElementById('visit-name')?.value || 'Interesado';
      const phone = document.getElementById('visit-phone')?.value || '';
      const date = document.getElementById('visit-date')?.value || 'Próximamente';
      const time = document.getElementById('visit-time')?.value || 'Por definir';
      const prop = modalPropertyName ? modalPropertyName.textContent : 'Propiedad';

      const message = `Hola Aisa Inmobiliaria! Quisiera agendar una visita.%0A%0A*Propiedad:* ${prop}%0A*Nombre:* ${name}%0A*Teléfono:* ${phone}%0A*Fecha deseada:* ${date}%0A*Horario preferido:* ${time}%0A%0AQuedo atento a su confirmación.`;
      
      const whatsappUrl = `https://wa.me/525512345678?text=${message}`;
      window.open(whatsappUrl, '_blank');
      if (modalOverlay) modalOverlay.classList.remove('open');
    });
  }


  // ========================================================
  // 7. FORMULARIO DE CONSIGNACIÓN / VENTA
  // ========================================================
  const formListing = document.getElementById('form-seller-listing');
  if (formListing) {
    formListing.addEventListener('submit', (e) => {
      e.preventDefault();
      const owner = document.getElementById('seller-name')?.value || '';
      const phone = document.getElementById('seller-phone')?.value || '';
      const type = document.getElementById('seller-type')?.value || '';
      const zone = document.getElementById('seller-zone')?.value || '';
      const expectedPrice = document.getElementById('seller-price')?.value || '';

      const msg = `Hola Aisa Inmobiliaria, deseo consignar mi propiedad para venta:%0A%0A*Propietario:* ${owner}%0A*Teléfono:* ${phone}%0A*Tipo de inmueble:* ${type}%0A*Ubicación:* ${zone}%0A*Precio pretendido:* ${expectedPrice}%0A%0ASolicito una asesoría y valuación sin costo.`;

      const whatsappUrl = `https://wa.me/525512345678?text=${msg}`;
      window.open(whatsappUrl, '_blank');
      alert("¡Gracias! Te redirigiremos a WhatsApp para completar el envío de los datos de tu inmueble con tu asesor asignado.");
      formListing.reset();
    });
  }


  // ========================================================
  // 8. PREGUNTAS FRECUENTES (FAQ ACORDEÓN)
  // ========================================================
  const faqItems = document.querySelectorAll('.faq-item');
  faqItems.forEach(item => {
    const questionBtn = item.querySelector('.faq-question');
    if (questionBtn) {
      questionBtn.addEventListener('click', () => {
        const isActive = item.classList.contains('active');
        // Cerrar otros
        faqItems.forEach(other => other.classList.remove('active'));
        // Alternar el actual
        if (!isActive) {
          item.classList.add('active');
        }
      });
    }
  });


  // ========================================================
  // 9. FUNCIÓN AUXILIAR DE MONEDA MEXICANA (MXN)
  // ========================================================
  function formatCurrency(amount) {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
      maximumFractionDigits: 0
    }).format(amount);
  }

});
