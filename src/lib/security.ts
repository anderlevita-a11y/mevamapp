
/**
 * Security utilities for input validation and sanitization
 */

/**
 * Basic XSS Sanitization
 * Removes script tags and other dangerous HTML patterns
 */
export const sanitizeHTML = (str: string): string => {
  if (typeof str !== 'string') return str;
  return str
    .replace(/<script\b[^>]*>([\s\S]*?)<\/script>/gim, '')
    .replace(/on\w+="[^"]*"/gim, '')
    .replace(/on\w+='[^']*'/gim, '')
    .replace(/javascript:[^"']*/gim, '')
    .replace(/<iframe\b[^>]*>([\s\S]*?)<\/iframe>/gim, '');
};

/**
 * Escapes common HTML characters to prevent XSS when rendering
 */
export const escapeHTML = (str: string): string => {
  if (typeof str !== 'string') return str;
  const matchHtmlRegExp = /["'&<>]/;
  const match = matchHtmlRegExp.exec(str);

  if (!match) {
    return str;
  }

  let escape;
  let html = '';
  let index = 0;
  let lastIndex = 0;

  for (index = match.index; index < str.length; index++) {
    switch (str.charCodeAt(index)) {
      case 34: // "
        escape = '&quot;';
        break;
      case 38: // &
        escape = '&amp;';
        break;
      case 39: // '
        escape = '&#39;';
        break;
      case 60: // <
        escape = '&lt;';
        break;
      case 62: // >
        escape = '&gt;';
        break;
      default:
        continue;
    }

    if (lastIndex !== index) {
      html += str.substring(lastIndex, index);
    }

    lastIndex = index + 1;
    html += escape;
  }

  return lastIndex !== index
    ? html + str.substring(lastIndex)
    : html;
};

/**
 * Checks for common SQL Injection patterns
 * While parameterized queries protect us, this adds a layer of defense
 */
export const detectsSQLInjection = (str: string): boolean => {
  if (typeof str !== 'string') return false;
  const sqlPatterns = [
    /(\%27)|(\')|(\-\-)|(\%23)|(#)/i,
    /((\%3D)|(=))[^\n]*((\%27)|(\')|(\-\-)|(\%3B)|(;))/i,
    /\w*((\%27)|(\'))((\%6F)|o|(\%4F))((\%72)|r|(\%52))/i,
    /delete\s+from|drop\s+table|update\s+set|insert\s+into|truncate\s+table/i
  ];
  return sqlPatterns.some(pattern => pattern.test(str));
};

/**
 * Validates generic text input
 */
export const validateTextInput = (text: string, maxLength: number = 2000): { isValid: boolean; error?: string } => {
  if (!text || text.trim().length === 0) {
    return { isValid: false, error: 'O campo não pode estar vazio.' };
  }
  if (text.length > maxLength) {
    return { isValid: false, error: `O texto excede o limite de ${maxLength} caracteres.` };
  }
  if (detectsSQLInjection(text)) {
    return { isValid: false, error: 'Caracteres ou padrões suspeitos detectados no input.' };
  }
  return { isValid: true };
};

/**
 * Sanitizes an object of inputs recursively
 */
export const sanitizeInputObject = (obj: any): any => {
  if (!obj) return obj;
  if (typeof obj === 'string') return sanitizeHTML(obj);
  if (Array.isArray(obj)) return obj.map(item => sanitizeInputObject(item));
  if (typeof obj === 'object') {
    const sanitized: any = {};
    for (const key in obj) {
      sanitized[key] = sanitizeInputObject(obj[key]);
    }
    return sanitized;
  }
  return obj;
};
