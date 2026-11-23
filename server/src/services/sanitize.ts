/**
 * Input sanitization utilities.
 * All user-provided strings should be sanitized before processing.
 */

/**
 * Sanitize a general string: trim whitespace, remove control characters, truncate.
 * @param s - Input string
 * @param maxLen - Maximum allowed length after truncation
 * @returns Sanitized string
 */
export function sanitizeString(s: string, maxLen: number): string {
  // Remove control characters (except newline and tab)
  // eslint-disable-next-line no-control-regex
  const cleaned = s.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '').trim();
  return cleaned.slice(0, maxLen);
}

/**
 * Sanitize free-text user input: applies standard sanitization plus
 * removes patterns that look like prompt injection attempts.
 * @param s - User-provided free text
 * @returns Sanitized text safe for inclusion in LLM prompts
 */
export function sanitizeFreeText(s: string): string {
  let cleaned = sanitizeString(s, 200);

  // Remove common prompt injection patterns
  const injectionPatterns = [
    /ignore\s+(all\s+)?(previous|prior|above)\s+(instructions?|rules?|prompts?)/gi,
    /you\s+are\s+now/gi,
    /new\s+instructions?:/gi,
    /system\s*prompt/gi,
    /forget\s+(everything|all|your)/gi,
    /disregard\s+(all|previous|prior)/gi,
    /override\s+(all|previous|prior|system)/gi,
    /\bact\s+as\b/gi,
    /\brole\s*play\b/gi,
    /\bpretend\s+(you|to\s+be)\b/gi,
    /```[\s\S]*?```/g,
    /<\/?[a-z][\s\S]*?>/gi,
  ];

  for (const pattern of injectionPatterns) {
    cleaned = cleaned.replace(pattern, '');
  }

  return cleaned.trim();
}

/**
 * Remove all HTML tags and markdown formatting from a string.
 * Used to clean LLM output before returning to the client.
 * @param s - String potentially containing HTML or markdown
 * @returns Plain text string
 */
export function stripHtmlAndMarkdown(s: string): string {
  return s
    // Remove HTML tags
    .replace(/<\/?[a-z][^>]*>/gi, '')
    // Remove HTML entities
    .replace(/&[a-z]+;/gi, '')
    // Remove markdown bold/italic
    .replace(/\*{1,3}([^*]+)\*{1,3}/g, '$1')
    .replace(/_{1,3}([^_]+)_{1,3}/g, '$1')
    // Remove markdown links
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    // Remove markdown headers
    .replace(/^#{1,6}\s+/gm, '')
    // Remove markdown code blocks
    .replace(/```[\s\S]*?```/g, '')
    // Remove inline code
    .replace(/`([^`]+)`/g, '$1')
    // Remove markdown horizontal rules
    .replace(/^[-*_]{3,}\s*$/gm, '')
    // Collapse excess whitespace
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
