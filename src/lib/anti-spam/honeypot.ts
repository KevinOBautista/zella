/** A filled honeypot field means a bot filled in every input it could find. */
export function isHoneypotTriggered(value: unknown): boolean {
  return typeof value === "string" && value.trim().length > 0;
}
