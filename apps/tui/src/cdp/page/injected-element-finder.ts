export const INJECTED_FIND_ELEMENT_SRC = `
function __cdpFindElement(sel, opts) {
  let s = sel ? String(sel).trim() : "";
  let targetText = opts ? opts.text : undefined;
  let isStrict = false;
  let ignoreCase = opts ? Boolean(opts.ignoreCase) : false;
  let regex = opts ? opts.regex : undefined;
  let regexFlags = (opts && opts.regexFlags) || "";
  let startsWith = opts ? opts.startsWith : undefined;
  let endsWith = opts ? opts.endsWith : undefined;
  const normalizeWhitespace = !opts || opts.normalizeWhitespace !== false;

  if (opts) {
    if (typeof opts.strictText === "string") {
      targetText = opts.strictText;
      isStrict = true;
    } else if (opts.strictText === true && targetText) {
      isStrict = true;
    } else if (opts.text && opts.strictText !== false) {
      isStrict = true;
    }
  }

  if (s) {
    const flaggedStrict = s.match(/^text\\/([a-z]+)\\s*=\\s*["']([^"']+)["']$/i);
    if (flaggedStrict) {
      targetText = flaggedStrict[2];
      isStrict = true;
      if (flaggedStrict[1].toLowerCase().includes("i")) ignoreCase = true;
      s = "";
    } else {
      const strictQuoted = s.match(/^text\\s*=\\s*["']([^"']+)["']$/i);
      if (strictQuoted) {
        targetText = strictQuoted[1];
        isStrict = true;
        s = "";
      } else {
        const regexMatch = s.match(/^text\\s*=\\s*\\/(.+)\\/([a-z]*)$/i);
        if (regexMatch) {
          regex = regexMatch[1];
          regexFlags = regexMatch[2];
          s = "";
        } else {
          const textMatch = s.match(/^text\\s*=\\s*(.+)$/i);
          if (textMatch) {
            targetText = textMatch[1].trim();
            isStrict = !opts || opts.strictText !== false;
            s = "";
          } else {
            const textIsMatch = s.match(/^(.*?):text-is\\s*\\(\\s*["']([^"']+)["'](?:\\s*,\\s*["']?([a-z]*)["']?)?\\s*\\)$/i);
            if (textIsMatch) {
              s = textIsMatch[1].trim();
              targetText = textIsMatch[2];
              isStrict = true;
              if (textIsMatch[3] && textIsMatch[3].toLowerCase().includes("i")) ignoreCase = true;
            } else {
              const startsWithMatch = s.match(/^(.*?):starts-with\\s*\\(\\s*["']([^"']+)["'](?:\\s*,\\s*["']?([a-z]*)["']?)?\\s*\\)$/i);
              if (startsWithMatch) {
                s = startsWithMatch[1].trim();
                startsWith = startsWithMatch[2];
                if (startsWithMatch[3] && startsWithMatch[3].toLowerCase().includes("i")) ignoreCase = true;
              } else {
                const endsWithMatch = s.match(/^(.*?):ends-with\\s*\\(\\s*["']([^"']+)["'](?:\\s*,\\s*["']?([a-z]*)["']?)?\\s*\\)$/i);
                if (endsWithMatch) {
                  s = endsWithMatch[1].trim();
                  endsWith = endsWithMatch[2];
                  if (endsWithMatch[3] && endsWithMatch[3].toLowerCase().includes("i")) ignoreCase = true;
                }
              }
            }
          }
        }
      }
    }
  }

  const normalize = (str) => {
    if (str === null || str === undefined) return "";
    let res = String(str);
    if (normalizeWhitespace) res = res.replace(/\\s+/g, " ");
    return res.trim();
  };

  const checkStringMatch = (actual) => {
    if (actual === null || actual === undefined) return false;
    const actNorm = normalize(actual);
    const actCased = ignoreCase ? actNorm.toLowerCase() : actNorm;

    if (regex) {
      const flags = regexFlags + (ignoreCase && !regexFlags.includes("i") ? "i" : "");
      return new RegExp(regex, flags).test(actual);
    }
    if (startsWith !== undefined) {
      const exp = ignoreCase ? normalize(startsWith).toLowerCase() : normalize(startsWith);
      return actCased.startsWith(exp);
    }
    if (endsWith !== undefined) {
      const exp = ignoreCase ? normalize(endsWith).toLowerCase() : normalize(endsWith);
      return actCased.endsWith(exp);
    }
    if (targetText !== undefined) {
      const exp = ignoreCase ? normalize(targetText).toLowerCase() : normalize(targetText);
      if (isStrict) return actCased === exp;
      return actCased.includes(exp);
    }
    return true;
  };

  const matchesText = (el) => {
    if (!targetText && !regex && !startsWith && !endsWith) return true;
    const candidates = [];
    if (el.innerText) candidates.push(el.innerText);
    if (el.textContent && el.textContent !== el.innerText) candidates.push(el.textContent);
    if (el.value !== undefined && typeof el.value === "string" && el.value.length > 0) candidates.push(el.value);
    const placeholder = el.getAttribute ? el.getAttribute("placeholder") : null;
    if (placeholder) candidates.push(placeholder);
    const ariaLabel = el.getAttribute ? el.getAttribute("aria-label") : null;
    if (ariaLabel) candidates.push(ariaLabel);
    const title = el.getAttribute ? el.getAttribute("title") : null;
    if (title) candidates.push(title);

    return candidates.some(checkStringMatch);
  };

  if (s) {
    try {
      const candidates = Array.from(document.querySelectorAll(s));
      if (!targetText && !regex && !startsWith && !endsWith) return candidates[0] || null;
      for (const el of candidates) {
        if (matchesText(el)) return el;
      }
    } catch {}
  }

  if (targetText || regex || startsWith || endsWith) {
    const all = Array.from(document.querySelectorAll("button, a, input, textarea, select, [role='button'], p, span, h1, h2, h3, h4, h5, h6, label, div, td, th, li"));
    for (const el of all) {
      if (matchesText(el)) return el;
    }
  }

  return null;
}
`;
