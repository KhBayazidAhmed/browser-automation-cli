export const INJECTED_SELECTOR_ENGINE_SRC = `
  function isDynamicId(id) {
    if (!id || typeof id !== 'string') return true;
    const clean = id.trim();
    if (!clean) return true;
    if (/^:r[0-9a-z_]+:$/i.test(clean)) return true;
    if (/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}/i.test(clean)) return true;
    if (/\\d{4,}/.test(clean)) return true;
    if (/^[0-9]+$/.test(clean)) return true;
    if (/^(ember|mat-|react-|yui_|_ngcontent|chakra-|radix-|headlessui-|mantine-|__BVID__|ember\\d+)/i.test(clean)) return true;
    if (/[a-z0-9_-]+[a-z0-9]{8,}$/i.test(clean) && /\\d/.test(clean)) return true;
    return false;
  }

  function filterStableClasses(clsStr) {
    if (!clsStr || typeof clsStr !== 'string') return [];
    const tailwindPrefixes = [
      'p-', 'px-', 'py-', 'pt-', 'pb-', 'pl-', 'pr-', 'm-', 'mx-', 'my-', 'mt-', 'mb-', 'ml-', 'mr-',
      'w-', 'h-', 'min-w-', 'max-w-', 'min-h-', 'max-h-', 'bg-', 'text-', 'border', 'rounded',
      'flex', 'grid', 'items-', 'justify-', 'content-', 'gap-', 'col-', 'row-', 'shadow', 'opacity-',
      'cursor-', 'z-', 'relative', 'absolute', 'fixed', 'sticky', 'static', 'block', 'inline',
      'hidden', 'overflow-', 'transition', 'duration-', 'ease-', 'font-', 'leading-', 'tracking-',
      'hover:', 'focus:', 'active:', 'group-', 'peer-', 'dark:', 'sm:', 'md:', 'lg:', 'xl:', '2xl:'
    ];
    const stateClasses = new Set(['active', 'hover', 'focus', 'selected', 'disabled', 'open', 'hidden', 'collapsed', 'valid', 'invalid', 'loading', 'current', 'pending', 'show', 'hide', 'on', 'off', 'expanded', 'checked']);

    return clsStr.trim().split(/\\s+/).filter(c => {
      if (!c || c.length < 2 || c.includes(':') || c.includes('/')) return false;
      if (stateClasses.has(c.toLowerCase())) return false;
      if (tailwindPrefixes.some(p => c === p || c.startsWith(p))) return false;
      if (/^(_|css-|sc-|style-|styled-)[a-z0-9]{4,}/i.test(c)) return false;
      if (/[0-9a-f]{6,}/i.test(c)) return false;
      return true;
    });
  }

  function getIframeContextInfo() {
    if (window === window.top) {
      return { isIframe: false };
    }
    let frameName = (window.name || '').trim();
    let frameUrl = '';
    try { frameUrl = window.location.href; } catch {}
    let frameSelector = '';
    try {
      if (window.frameElement) {
        const fe = window.frameElement;
        if (fe.id && !isDynamicId(fe.id)) frameSelector = '#' + CSS.escape(fe.id);
        else if (fe.name) frameSelector = 'iframe[name="' + fe.name.replace(/"/g, '\\\\"') + '"]';
        else if (fe.getAttribute('data-testid')) frameSelector = 'iframe[data-testid="' + fe.getAttribute('data-testid').replace(/"/g, '\\\\"') + '"]';
        else if (fe.src) {
          try {
            const u = new URL(fe.src, window.location.href);
            frameSelector = 'iframe[src*="' + u.pathname.slice(0, 30).replace(/"/g, '\\\\"') + '"]';
          } catch {}
        }
      }
    } catch {}
    const frameIdentifier = frameName || frameSelector || (window.location.host ? (window.location.host + window.location.pathname) : frameUrl);
    return {
      isIframe: true,
      frameIdentifier: frameIdentifier || undefined,
      frameName: frameName || undefined,
      frameUrl: frameUrl || undefined,
      frameSelector: frameSelector || undefined
    };
  }

  function generateSelectorCandidates(el) {
    if (!el || el === document.body || el === document.documentElement) {
      return {
        recommended: 'body',
        candidates: [{ type: 'tag', selector: 'body', label: 'Body Tag', description: 'Root body element', score: 10 }],
        text: '',
        tagName: 'body',
        isInteractive: false
      };
    }

    const tag = el.tagName.toLowerCase();
    const isInteractive = Boolean(el.closest && el.closest("button, a, input, textarea, select, [role='button'], [tabindex]"));
    const rawText = (el.innerText?.trim() || el.textContent?.trim() || ('value' in el ? String(el.value).trim() : '') || '').replace(/\\s+/g, ' ');
    const textSnippet = rawText.length > 50 ? rawText.slice(0, 50) + '...' : rawText;

    const candidates = [];
    const pushCandidate = (type, selector, label, description, score) => {
      if (!selector || candidates.some(c => c.selector === selector)) return;
      candidates.push({ type, selector, label, description, score });
    };

    // 1. Dedicated Test / QA ID attributes
    const testAttrs = ['data-testid', 'data-qa', 'data-cy', 'data-test', 'data-id', 'data-automation-id', 'data-action', 'data-component'];
    for (const attr of testAttrs) {
      const val = el.getAttribute(attr);
      if (val && !isDynamicId(val)) {
        pushCandidate('testid', \`[\${attr}="\${val.replace(/"/g, '\\\\"') }"]\`, \`⭐ Test ID (\${attr})\`, \`Target by automated test identifier "\${val}"\`, 100);
      }
    }

    // 2. Stable Element ID
    if (el.id && !isDynamicId(el.id)) {
      pushCandidate('id', '#' + CSS.escape(el.id), 'Stable ID', \`Unique element id "#\${el.id}"\`, 90);
    }

    // 3. Accessible Roles & Names
    const role = el.getAttribute('role');
    const ariaLabel = el.getAttribute('aria-label');
    if (ariaLabel) {
      const rolePrefix = role ? \`[role="\${role.replace(/"/g, '\\\\"') }"]\` : tag;
      pushCandidate('aria', \`\${rolePrefix}[aria-label="\${ariaLabel.replace(/"/g, '\\\\"') }"]\`, '🏷️ Aria Label', \`Accessible label "\${ariaLabel}"\`, 85);
    }
    if (el.name && !isDynamicId(el.name)) {
      pushCandidate('name', \`\${tag}[name="\${el.name.replace(/"/g, '\\\\"') }"]\`, 'Form Name', \`Form input name "\${el.name}"\`, 80);
    }
    const placeholder = el.getAttribute('placeholder');
    if (placeholder) {
      pushCandidate('placeholder', \`\${tag}[placeholder="\${placeholder.replace(/"/g, '\\\\"') }"]\`, 'Placeholder', \`Input placeholder "\${placeholder}"\`, 75);
    }

    // 4. Semantic Text Locators (if clean and concise)
    if (rawText && rawText.length >= 2 && rawText.length <= 40 && !rawText.includes('\\n')) {
      if (['button', 'a', 'span', 'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'label'].includes(tag) || role === 'button') {
        const textTag = (role === 'button' && tag !== 'button') ? \`[role="button"]\` : tag;
        pushCandidate('text-is', \`\${textTag}:text-is("\${rawText.replace(/"/g, '\\\\"')}")\`, '🔤 Exact Text', \`Strict text matching "\${rawText}"\`, 70);
      }
    }

    // 5. Stable Class Selector
    const stableClasses = filterStableClasses(el.className);
    if (stableClasses.length > 0) {
      pushCandidate('class', \`\${tag}.\${CSS.escape(stableClasses[0])}\`, 'CSS Class', \`Semantic class ".\${stableClasses[0]}"\`, 60);
      if (stableClasses.length > 1) {
        pushCandidate('multiclass', \`\${tag}.\${CSS.escape(stableClasses[0])}.\${CSS.escape(stableClasses[1])}\`, 'Combined Classes', \`Classes ".\${stableClasses[0]}.\${stableClasses[1]}"\`, 55);
      }
    }

    // 6. Relative Ancestor Hierarchy
    let parent = el.parentElement;
    let depth = 0;
    while (parent && parent !== document.body && depth < 4) {
      depth++;
      if (parent.id && !isDynamicId(parent.id)) {
        pushCandidate('ancestor', \`#\${CSS.escape(parent.id)} \${tag}\`, 'Ancestor Context', \`Inside stable container "#\${parent.id}"\`, 50);
        break;
      }
      for (const attr of testAttrs) {
        const pVal = parent.getAttribute(attr);
        if (pVal && !isDynamicId(pVal)) {
          pushCandidate('ancestor-test', \`[\${attr}="\${pVal.replace(/"/g, '\\\\"') }"] \${tag}\`, 'Ancestor Test ID', \`Inside container [\${attr}="\${pVal}"]\`, 52);
          break;
        }
      }
      parent = parent.parentElement;
    }

    // 7. Structural CSS Path
    const path = [];
    let curr = el;
    let pathDepth = 0;
    while (curr && curr !== document.body && curr !== document.documentElement && pathDepth < 5) {
      pathDepth++;
      if (curr.id && !isDynamicId(curr.id)) {
        path.unshift('#' + CSS.escape(curr.id));
        break;
      }
      let sib = curr, nth = 1;
      while (sib.previousElementSibling) {
        sib = sib.previousElementSibling;
        if (sib.tagName === curr.tagName) nth++;
      }
      path.unshift(curr.tagName.toLowerCase() + (nth > 1 ? \`:nth-of-type(\${nth})\` : ''));
      curr = curr.parentElement;
    }
    if (path.length > 0) {
      pushCandidate('path', path.join(' > '), '📐 Structural CSS Path', 'Full DOM hierarchy path', 40);
    }

    // 8. Robust XPath
    if (rawText && rawText.length <= 30 && !rawText.includes('\\n') && !rawText.includes('"')) {
      pushCandidate('xpath-text', \`//\${tag}[normalize-space()="\${rawText}"]\`, '🌐 XPath (Text)', 'Normalized XPath text expression', 35);
    } else if (el.id && !isDynamicId(el.id)) {
      pushCandidate('xpath-id', \`//\${tag}[@id="\${el.id}"]\`, '🌐 XPath (ID)', 'XPath by element ID', 35);
    }

    candidates.sort((a, b) => b.score - a.score);
    const recommended = candidates[0]?.selector || tag;

    return {
      recommended,
      candidates,
      text: rawText,
      textSnippet,
      tagName: tag,
      isInteractive
    };
  }

  window.__cdpGenerateSelectorCandidates = generateSelectorCandidates;
`;
