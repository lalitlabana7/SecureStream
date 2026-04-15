/**
 * Sanitize a text string to prevent XSS attacks.
 * Strips HTML tags, normalizes whitespace, and limits length.
 */
const HTML_TAG_REGEX = /<[^>]*>/g;
const DANGEROUS_PROTOCOLS = /javascript:|data:text\/html|vbscript:/gi;

export function sanitizeText(text: string, maxLength: number = 500): string {
  // Strip HTML tags
  let sanitized = text.replace(HTML_TAG_REGEX, '');

  // Remove dangerous protocol patterns
  sanitized = sanitized.replace(DANGEROUS_PROTOCOLS, '');

  // Normalize whitespace (collapse multiple spaces/newlines)
  sanitized = sanitized.replace(/\s+/g, ' ').trim();

  // Limit length
  if (sanitized.length > maxLength) {
    sanitized = sanitized.slice(0, maxLength);
  }

  return sanitized;
}

/**
 * Sanitize a session ID / room ID to ensure it's a safe UUID format.
 */
export function sanitizeId(id: string): string {
  return id.replace(/[^a-zA-Z0-9\-_]/g, '').slice(0, 128);
}
