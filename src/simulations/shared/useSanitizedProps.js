import { useMemo, useRef } from 'react';
import { sanitizeSimProps } from './sanitizeProps';

// Sanitizes a bag of numeric props at component boundary. Memoized on the
// identity of the input object's numeric values. Warnings are logged once
// per change; callers can opt into a custom sink (e.g. toast) via `onWarn`.
export default function useSanitizedProps(rawProps, onWarn) {
  const lastWarnKeyRef = useRef('');
  return useMemo(() => {
    const warnings = [];
    const sanitized = sanitizeSimProps(rawProps, { warnings });
    if (warnings.length > 0) {
      const key = warnings.join('|');
      if (key !== lastWarnKeyRef.current) {
        lastWarnKeyRef.current = key;
        if (typeof onWarn === 'function') {
          try { onWarn(warnings); } catch (_) { /* ignore */ }
        } else if (typeof console !== 'undefined' && console.warn) {
          console.warn('[sim-sanitize]', warnings.join('; '));
        }
      }
    }
    return sanitized;
    // Stable re-key on a flattened signature of numeric entries
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature(rawProps)]);
}

function signature(obj) {
  if (!obj || typeof obj !== 'object') return '';
  const parts = [];
  const keys = Object.keys(obj).sort();
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === 'number' || typeof v === 'string' || typeof v === 'boolean') {
      parts.push(`${k}=${v}`);
    }
  }
  return parts.join('&');
}
