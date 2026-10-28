export function cn(...args) {
  const out = [];
  for (const arg of args) {
    if (!arg) continue;
    if (typeof arg === 'string') out.push(arg);
    else if (Array.isArray(arg)) out.push(cn(...arg));
    else if (typeof arg === 'object') {
      for (const [k, v] of Object.entries(arg)) if (v) out.push(k);
    }
  }
  return out.filter(Boolean).join(' ');
}