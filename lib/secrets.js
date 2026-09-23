// Server-only: never import this module from public/.
export function redactSecrets(text) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return text;
  // Also handle escaped values in serialized JSON, including property names.
  for (const value of new Set([JSON.stringify(key).slice(1, -1), key])) {
    text = text.split(value).join('[REDACTED]');
  }
  return text;
}
