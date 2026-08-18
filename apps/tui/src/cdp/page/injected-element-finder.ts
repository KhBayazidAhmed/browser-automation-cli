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
    } else if (opts.strictText === true) {
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
                } else {
                  const hasTextMatch = s.match(/^(.*?):(has-text|contains)\\s*\\(\\s*["']([^"']+)["'](?:\\s*,\\s*["']?([a-z]*)["']?)?\\s*\\)$/i);
                  if (hasTextMatch) {
                    s = hasTextMatch[1].trim();
                    targetText = hasTextMatch[3];
                    isStrict = false;
                    if (hasTextMatch[4] && hasTextMatch[4].toLowerCase().includes("i")) ignoreCase = true;
                  }
                }
              }
            }
          }
        }
      }
    }
  }

  let candidates = [];
  if (s) {
    try {
      candidates = Array.from(document.querySelectorAll(s));
    } catch {
      if (!targetText && !regex && !startsWith && !endsWith) {
        targetText = s;
        isStrict = !opts || opts.strictText !== false;
      }
    }
  }

  const hasTextCheck = Boolean(targetText !== undefined && targetText !== "") || Boolean(regex) || Boolean(startsWith) || Boolean(endsWith);

  if (candidates.length === 0 && hasTextCheck) {
    candidates = Array.from(document.querySelectorAll("button, a, input, textarea, select, label, summary, [role='button'], [role='link'], [role='tab'], [role='menuitem'], [role='option'], [tabindex], h1, h2, h3, h4, h5, h6, p, span, div, li, td, th, *"));
  }

  const normalize = (str) => {
    if (str === null || str === undefined) return "";
    let res = String(str);
    if (normalizeWhitespace) res = res.replace(/\\s+/g, " ");
    return res.trim();
  };

  let regexObj = null;
  if (regex) {
    try {
      regexObj = new RegExp(regex, regexFlags || (ignoreCase ? "i" : ""));
    } catch {}
  }

  const targetNorm = normalize(targetText);
  const targetCased = ignoreCase ? targetNorm.toLowerCase() : targetNorm;
  const startsWithNorm = startsWith ? normalize(startsWith) : null;
  const startsWithCased = startsWithNorm && ignoreCase ? startsWithNorm.toLowerCase() : startsWithNorm;
  const endsWithNorm = endsWith ? normalize(endsWith) : null;
  const endsWithCased = endsWithNorm && ignoreCase ? endsWithNorm.toLowerCase() : endsWithNorm;

  if (!hasTextCheck) {
    for (const el of candidates) {
      if (!el.closest || !el.closest("#__cdp_recorder_hud__")) return el;
    }
    return candidates[0] || null;
  }

  const matched = [];
  for (const el of candidates) {
    if (el.closest && el.closest("#__cdp_recorder_hud__")) continue;
    const inner = normalize(el.innerText);
    const content = normalize(el.textContent);
    const val = "value" in el && typeof el.value === "string" ? normalize(el.value) : "";
    const aria = normalize(el.getAttribute("aria-label"));
    const placeholder = normalize(el.getAttribute("placeholder"));
    const title = normalize(el.getAttribute("title"));
    const alt = normalize(el.getAttribute("alt"));

    const values = [inner, content, val, aria, placeholder, title, alt].filter(Boolean);
    let isMatch = false;
    let isDirectMatch = false;

    for (const rawV of values) {
      const v = ignoreCase ? rawV.toLowerCase() : rawV;
      if (regexObj) {
        if (regexObj.test(rawV)) {
          isMatch = true;
          isDirectMatch = true;
          break;
        }
      } else if (startsWithCased !== null) {
        if (v.startsWith(startsWithCased)) {
          isMatch = true;
          if (v === startsWithCased) isDirectMatch = true;
          break;
        }
      } else if (endsWithCased !== null) {
        if (v.endsWith(endsWithCased)) {
          isMatch = true;
          if (v === endsWithCased) isDirectMatch = true;
          break;
        }
      } else if (targetNorm !== "") {
        if (isStrict) {
          if (v === targetCased) {
            isMatch = true;
            isDirectMatch = true;
            break;
          }
        } else if (v.includes(targetCased)) {
          isMatch = true;
          if (v === targetCased) isDirectMatch = true;
          break;
        }
      }
    }

    if (isMatch) {
      let depth = 0;
      let p = el;
      while (p) {
        depth++;
        p = p.parentElement;
      }
      const textLen = (content || inner || val).length;
      matched.push({ el, depth, textLen, isDirect: isDirectMatch });
    }
  }

  if (matched.length === 0) return null;
  matched.sort((a, b) => {
    if (a.isDirect !== b.isDirect) return a.isDirect ? -1 : 1;
    if (a.textLen !== b.textLen) return a.textLen - b.textLen;
    return b.depth - a.depth;
  });

  return matched[0].el;
}
`;
