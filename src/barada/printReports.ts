const escapeCell = (value: unknown): string => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char] ?? char));

/** Escape record values before composing the existing sanitized print document. */
export const reportTable = (headers: string[], rows: unknown[][]): string =>
  `<table><thead><tr>${headers.map(h => `<th>${escapeCell(h)}</th>`).join('')}</tr></thead><tbody>${rows.map(row => `<tr>${row.map(cell => `<td>${escapeCell(cell)}</td>`).join('')}</tr>`).join('')}</tbody></table>`;