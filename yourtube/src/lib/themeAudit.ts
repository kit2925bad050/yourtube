const auditPatterns = [
  { pattern: /^text-gray-(?:200|300|400|500|600|700)$/i, label: "muted gray text classes" },
  { pattern: /^bg-gray-(?:100|200)$/i, label: "gray surface background classes" },
  { pattern: /^bg-slate-(?:700|800)$/i, label: "slate background classes" },
  { pattern: /^border-slate-(?:600|700)$/i, label: "slate border classes" },
  { pattern: /^text-black$/i, label: "hard black text" },
  { pattern: /^bg-white(?:\/80)?$/i, label: "white surface classes" },
];

export function runThemeAudit() {
  if (typeof document === "undefined") {
    return;
  }

  const findings: Map<string, number> = new Map();
  const elements = Array.from(document.querySelectorAll<HTMLElement>("*"));

  elements.forEach((element) => {
    element.classList.forEach((className) => {
      const match = auditPatterns.find((rule) => rule.pattern.test(className));
      if (match) {
        findings.set(match.label, (findings.get(match.label) ?? 0) + 1);
      }
    });
  });

  if (findings.size === 0) {
    return;
  }

  console.groupCollapsed("[ThemeAudit] Suspicious theme-sensitive class usage detected")
  findings.forEach((count, label) => {
    console.warn(`- ${label}: ${count} occurrence${count === 1 ? "" : "s"}`);
  });
  console.info(
    "Use semantic theme utilities (e.g. bg-card, text-muted-foreground, border-border) instead of raw gray/slate/white classes for better light/dark contrast."
  );
  console.groupEnd();
}
