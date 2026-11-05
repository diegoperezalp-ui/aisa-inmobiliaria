(() => {
  const selectors = '.filter-select';

  function closeAll(except = null) {
    document.querySelectorAll('.custom-filter-select.is-open').forEach(container => {
      if (container === except) return;
      container.classList.remove('is-open');
      container.querySelector('.custom-filter-trigger')?.setAttribute('aria-expanded', 'false');
    });
  }

  function syncCustomSelect(container, select, trigger, options) {
    const selectedOption = select.options[select.selectedIndex];
    trigger.firstChild.textContent = selectedOption?.textContent?.trim() || '';
    options.forEach((option, index) => {
      const selected = index === select.selectedIndex;
      option.classList.toggle('is-selected', selected);
      option.setAttribute('aria-selected', String(selected));
    });
    container.classList.toggle('has-selection', select.value !== (select.id === 'sort-order' ? 'recommended' : 'all'));
  }

  function initializeCustomSelect(select) {
    if (select.dataset.customFilterReady === 'true' || select.disabled) return;

    select.dataset.customFilterReady = 'true';
    select.classList.add('is-custom-select-native');

    const container = document.createElement('div');
    container.className = 'custom-filter-select';
    select.parentNode.insertBefore(container, select);
    container.appendChild(select);

    const trigger = document.createElement('button');
    trigger.className = 'custom-filter-trigger';
    trigger.type = 'button';
    trigger.setAttribute('aria-haspopup', 'listbox');
    trigger.setAttribute('aria-expanded', 'false');
    trigger.appendChild(document.createTextNode(''));

    const menu = document.createElement('ul');
    menu.className = 'custom-filter-menu';
    menu.setAttribute('role', 'listbox');
    menu.id = `${select.id || 'filter'}-custom-options`;

    const options = Array.from(select.options).map((nativeOption, index) => {
      const option = document.createElement('li');
      option.className = 'custom-filter-option';
      option.textContent = nativeOption.textContent;
      option.dataset.value = nativeOption.value;
      option.id = `${menu.id}-${index}`;
      option.setAttribute('role', 'option');
      option.setAttribute('aria-selected', 'false');
      option.tabIndex = -1;

      option.addEventListener('mousemove', () => {
        menu.querySelectorAll('.custom-filter-option').forEach(item => item.classList.remove('is-highlighted'));
        option.classList.add('is-highlighted');
      });

      option.addEventListener('click', () => {
        select.value = nativeOption.value;
        select.dispatchEvent(new Event('change', { bubbles: true }));
        syncCustomSelect(container, select, trigger, customOptions);
        closeAll();
        trigger.focus();
      });

      menu.appendChild(option);
      return option;
    });
    const customOptions = options;

    trigger.addEventListener('click', () => {
      const willOpen = !container.classList.contains('is-open');
      closeAll(container);
      container.classList.toggle('is-open', willOpen);
      trigger.setAttribute('aria-expanded', String(willOpen));
      if (willOpen) {
        const selected = customOptions[select.selectedIndex];
        selected?.focus({ preventScroll: true });
      }
    });

    container.appendChild(trigger);
    container.appendChild(menu);
    syncCustomSelect(container, select, trigger, customOptions);

    select.addEventListener('change', () => {
      syncCustomSelect(container, select, trigger, customOptions);
    });
  }

  document.addEventListener('click', event => {
    if (!event.target.closest('.custom-filter-select')) closeAll();
  });

  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') {
      closeAll();
      document.querySelector('.custom-filter-trigger[aria-expanded="true"]')?.focus();
    }
  });

  document.querySelectorAll(selectors).forEach(initializeCustomSelect);
})();
