export function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export function normalizePlantUmlSource(diagramType, source) {
  if (diagramType !== 'plantuml' && diagramType !== 'c4plantuml') {
    return source
  }
  const trimmed = source.trim()
  if (/^@start\w*/i.test(trimmed)) {
    return source
  }
  return `@startuml\n${source}\n@enduml`
}

export function defaultRenderer({ diagramType, source, attrs }) {
  const format = attrs.format || 'svg'
  const target = attrs.target ? ` data-target="${escapeHtml(attrs.target)}"` : ''
  const title = attrs.title
    ? `<figcaption>${escapeHtml(attrs.title)}</figcaption>`
    : ''
  const className = `kroki-embedded kroki-embedded-${diagramType} kroki-format-${format}`
  const normalizedSource = normalizePlantUmlSource(diagramType, source)

  return `<figure class="${escapeHtml(className)}" data-diagram-type="${escapeHtml(diagramType)}" data-diagram-format="${escapeHtml(format)}"${target}><pre class="kroki-embedded-source">${escapeHtml(normalizedSource)}</pre><div class="kroki-embedded-output"></div>${title}</figure>`
}

export function errorRenderer({ diagramType, message }) {
  return `<pre class="kroki-embedded-error" data-diagram-type="${escapeHtml(diagramType)}">${escapeHtml(message)}</pre>`
}
