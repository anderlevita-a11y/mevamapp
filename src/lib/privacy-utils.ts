/**
 * Privacy Utility for PII Sanitation
 * Ensures sensitive data is masked before being sent to third-party logs
 */

const SENSITIVE_FIELDS = ['email', 'password', 'cpf', 'phone', 'telefone', 'address', 'endereco', 'full_name', 'name'];

export const sanitizePII = (data: any): any => {
  if (!data) return data;
  
  if (typeof data === 'string') {
    // Basic regex for email masking: user@domain.com -> u***@domain.com
    if (data.includes('@') && data.includes('.')) {
      const [user, domain] = data.split('@');
      return `${user.charAt(0)}***@${domain}`;
    }
    // Mask numbers (CPF, Phone) but keep length context
    if (/^\d+$/.test(data.replace(/\D/g, '')) && data.length > 5) {
      return data.slice(0, 3) + '***' + data.slice(-2);
    }
    return data;
  }

  if (Array.isArray(data)) {
    return data.map(item => sanitizePII(item));
  }

  if (typeof data === 'object') {
    const sanitized: any = {};
    for (const key in data) {
      if (SENSITIVE_FIELDS.some(field => key.toLowerCase().includes(field))) {
        sanitized[key] = '[REDACTED]';
      } else {
        sanitized[key] = sanitizePII(data[key]);
      }
    }
    return sanitized;
  }

  return data;
};

/**
 * Anonymize IP address by zeroing out the last octet
 */
export const anonymizeIP = (ip: string): string => {
  if (!ip) return '0.0.0.0';
  if (ip.includes('.')) {
    const parts = ip.split('.');
    parts[3] = '0';
    return parts.join('.');
  }
  if (ip.includes(':')) { // IPv6
    const parts = ip.split(':');
    parts[parts.length - 1] = '0000';
    return parts.join(':');
  }
  return ip;
};

/**
 * Custom error for rate limiting
 */
export class RateLimitError extends Error {
  constructor(message: string = 'Muitas requisições. Por favor, aguarde um momento.') {
    super(message);
    this.name = 'RateLimitError';
  }
}
