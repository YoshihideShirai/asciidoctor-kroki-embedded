const BUILTIN_ATTRIBUTES = [
  'target',
  'width',
  'height',
  'format',
  'fallback',
  'link',
  'float',
  'align',
  'role',
  'title',
  'caption',
  'cloaked-context',
  '$positional',
  'subs',
  'opts',
  'id',
  'view',
]

export function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function isNumeric(value) {
  return /^\d+$/.test(value)
}

export function collectDiagramOptions(attrs = {}) {
  const options = Object.fromEntries(
    Object.entries(attrs).filter(([key]) =>
      !key.endsWith('-option') &&
      !BUILTIN_ATTRIBUTES.includes(key) &&
      !isNumeric(key),
    ),
  )

  if ('view' in attrs && !('view-key' in options)) {
    options['view-key'] = attrs.view
  }

  return options
}

function dataAttribute(name, value) {
  return value === undefined || value === null || value === ''
    ? ''
    : ` ${name}="${escapeHtml(value)}"`
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
  const options = collectDiagramOptions(attrs)
  const optionsJson = Object.keys(options).length > 0
    ? JSON.stringify(options)
    : undefined
  const title = attrs.title
    ? `<figcaption>${escapeHtml(attrs.title)}</figcaption>`
    : ''
  const role = attrs.role ? ` ${attrs.role}` : ''
  const className = `kroki-embedded kroki-embedded-${diagramType} kroki-format-${format}${role}`
  const normalizedSource = normalizePlantUmlSource(diagramType, source)

  return `<figure${dataAttribute('id', attrs.id)} class="${escapeHtml(className)}" data-diagram-type="${escapeHtml(diagramType)}" data-diagram-format="${escapeHtml(format)}"${dataAttribute('data-target', attrs.target)}${dataAttribute('data-width', attrs.width)}${dataAttribute('data-height', attrs.height)}${dataAttribute('data-diagram-options', optionsJson)}><pre class="kroki-embedded-source">${escapeHtml(normalizedSource)}</pre><div class="kroki-embedded-output"></div>${title}</figure>`
}

export function errorRenderer({ diagramType, message }) {
  return `<pre class="kroki-embedded-error" data-diagram-type="${escapeHtml(diagramType)}">${escapeHtml(message)}</pre>`
}
