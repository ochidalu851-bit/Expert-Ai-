/* Keep the chat-header overflow menu attached to its own three-dot button. */
(() => {
  'use strict';

  if (document.documentElement.dataset.expertHeaderMenuPosition === 'ready') return;
  document.documentElement.dataset.expertHeaderMenuPosition = 'ready';

  const menuLabels = [
    'share', 'pin', 'lock chat', 'add to project', 'uploaded files',
    'find in chat', 'add to home', 'archive', 'delete'
  ];
  let lastTrigger = null;
  let observer = null;
  let retries = 0;

  function textOf(element) {
    return [
      element.getAttribute('aria-label') || '',
      element.getAttribute('title') || '',
      element.getAttribute('data-action') || '',
      typeof element.className === 'string' ? element.className : '',
      element.innerText || element.textContent || ''
    ].join(' ').toLowerCase();
  }

  function isHeaderOverflowButton(element) {
    if (!element || !element.isConnected) return false;
    if (element.closest('.expert-message-actions, .chat-thread, .chat-bubble')) return false;

    const rect = element.getBoundingClientRect();
    if (rect.width < 18 || rect.height < 18 || rect.top > 155 || rect.right < window.innerWidth * 0.68) {
      return false;
    }

    const description = textOf(element);
    const svg = element.querySelector('svg');
    const svgMarkup = svg ? svg.outerHTML.toLowerCase() : '';
    const hasThreeDots =
      /[⋮⋯…]/.test(description) ||
      (svg && svg.querySelectorAll('circle').length >= 3) ||
      /ellipsis|overflow|more-vertical|more-horizontal|three-dot/.test(description) ||
      /(?:cx=["']?12["']?[^>]*cy=["']?5|m12\s*5)[\s\S]*(?:cy=["']?12|m12\s*12)[\s\S]*(?:cy=["']?19|m12\s*19)/.test(svgMarkup);

    const hasMenuLabel = /more|options|chat menu|chat actions|conversation menu/.test(description);
    return hasThreeDots || hasMenuLabel;
  }

  function visible(element) {
    if (!element || !element.isConnected || element.hidden) return false;
    const style = window.getComputedStyle(element);
    if (style.display === 'none' || style.visibility === 'hidden' || Number(style.opacity) === 0) return false;
    const rect = element.getBoundingClientRect();
    return rect.width > 70 && rect.height > 70;
  }

  function scoreMenu(element) {
    const value = (element.innerText || element.textContent || '').toLowerCase().replace(/\s+/g, ' ');
    const found = menuLabels.filter(label => value.includes(label)).length;
    if (found < 4 || value.length > 900) return null;
    const style = window.getComputedStyle(element);
    const className = typeof element.className === 'string' ? element.className : '';
    const semantic = /menu|popover|dropdown|context|modal|popup|action/i.test(
      className + ' ' + (element.id || '') + ' ' + (element.getAttribute('role') || '')
    );
    const positioned = style.position === 'fixed' || style.position === 'absolute';
    const rect = element.getBoundingClientRect();
    return {
      element,
      found,
      semantic,
      positioned,
      length: value.length,
      area: rect.width * rect.height
    };
  }

  function findActionMenu() {
    const nodes = document.body.querySelectorAll(
      'div,section,ul,ol,nav,aside,[role="menu"],[role="dialog"],[data-menu]'
    );
    const candidates = [];
    nodes.forEach(node => {
      if (!visible(node)) return;
      const scored = scoreMenu(node);
      if (scored) candidates.push(scored);
    });

    candidates.sort((a, b) =>
      b.found - a.found ||
      Number(b.semantic) - Number(a.semantic) ||
      Number(b.positioned) - Number(a.positioned) ||
      a.length - b.length ||
      a.area - b.area
    );
    return candidates[0]?.element || null;
  }

  function placeMenuBesideTrigger(menu, trigger) {
    if (!menu || !trigger || !trigger.isConnected || !visible(menu)) return false;

    const triggerRect = trigger.getBoundingClientRect();
    const menuRect = menu.getBoundingClientRect();
    const width = Math.min(
      Math.max(menuRect.width || 224, 190),
      Math.max(190, window.innerWidth - 20)
    );
    const height = Math.min(menuRect.height || 420, window.innerHeight - 16);

    let left = triggerRect.left - width - 9;
    if (left < 8) left = triggerRect.right + 9;
    left = Math.max(8, Math.min(window.innerWidth - width - 8, left));

    let top = triggerRect.top + (triggerRect.height - height) / 2;
    top = Math.max(8, Math.min(window.innerHeight - height - 8, top));

    const important = (name, value) => menu.style.setProperty(name, value, 'important');
    important('position', 'fixed');
    important('inset', 'auto');
    important('left', left + 'px');
    important('top', top + 'px');
    important('right', 'auto');
    important('bottom', 'auto');
    important('transform', 'none');
    important('margin', '0');
    important('z-index', '300000');
    important('max-width', 'calc(100vw - 16px)');
    important('max-height', 'calc(100dvh - 16px)');
    important('overflow-y', 'auto');
    important('pointer-events', 'auto');
    menu.dataset.expertHeaderAnchored = 'true';
    return true;
  }

  function tryPosition() {
    if (!lastTrigger || !lastTrigger.isConnected) {
      if (observer) observer.disconnect();
      observer = null;
      return;
    }

    const menu = findActionMenu();
    if (menu && placeMenuBesideTrigger(menu, lastTrigger)) {
      if (observer) observer.disconnect();
      observer = null;
      return;
    }

    retries += 1;
    if (retries > 12 && observer) {
      observer.disconnect();
      observer = null;
    }
  }

  function watchForMenu(trigger) {
    lastTrigger = trigger;
    retries = 0;
    if (observer) observer.disconnect();

    [0, 35, 90, 170, 280, 450].forEach(delay => {
      window.setTimeout(tryPosition, delay);
    });

    observer = new MutationObserver(() => {
      if (lastTrigger) window.requestAnimationFrame(tryPosition);
    });
    observer.observe(document.body, { childList: true, subtree: true, attributes: true });
  }

  document.addEventListener('click', event => {
    const target = event.target;
    const trigger = target && target.closest
      ? target.closest('button,[role="button"],[data-action]')
      : null;
    if (!isHeaderOverflowButton(trigger)) return;
    watchForMenu(trigger);
  }, true);
})();