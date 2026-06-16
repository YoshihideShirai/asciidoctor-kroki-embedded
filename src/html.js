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

function getDocumentAttribute(document, name) {
  return document && typeof document.getAttribute === 'function'
    ? document.getAttribute(name)
    : undefined
}

function stableStringify(value) {
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(',')}]`
  }
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((key) => (
      `${JSON.stringify(key)}:${stableStringify(value[key])}`
    )).join(',')}}`
  }
  return JSON.stringify(value)
}

function fnv1a64(value) {
  let hash = 0xcbf29ce484222325n
  const prime = 0x100000001b3n

  for (let index = 0; index < value.length; index += 1) {
    hash ^= BigInt(value.charCodeAt(index))
    hash = BigInt.asUintN(64, hash * prime)
  }

  return hash.toString(16).padStart(16, '0')
}

export function createDiagramCacheKey({
  diagramType,
  source,
  format,
  diagramOptions = {},
  rendererVersion = 'asciidoctor-kroki-embedded-cache-v1',
}) {
  return fnv1a64(
    stableStringify({
      diagramType,
      source,
      format,
      diagramOptions,
      rendererVersion,
    }),
  )
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

export function defaultRenderer({ diagramType, source, attrs, document, options = {} }) {
  const format =
    attrs.format ||
    getDocumentAttribute(document, 'kroki-default-format') ||
    options.defaultFormat ||
    'svg'
  const diagramOptions = collectDiagramOptions(attrs)
  const optionsJson = Object.keys(diagramOptions).length > 0
    ? JSON.stringify(diagramOptions)
    : undefined
  const title = attrs.title
    ? `<figcaption>${escapeHtml(attrs.title)}</figcaption>`
    : ''
  const role = attrs.role ? ` ${attrs.role}` : ''
  const className = `kroki-embedded kroki-embedded-${diagramType} kroki-format-${format}${role}`
  const normalizedSource = normalizePlantUmlSource(diagramType, source)
  const cache = options.diagramCache
  const rendererVersion = cache?.rendererVersion || options.rendererVersion
  const cacheKey = cache && format === 'svg'
    ? createDiagramCacheKey({
        diagramType,
        source: normalizedSource,
        format,
        diagramOptions,
        rendererVersion,
      })
    : undefined
  const cachedUri = cacheKey && typeof cache.getCachedUri === 'function'
    ? cache.getCachedUri({ diagramType, format, cacheKey })
    : undefined
  const cacheAttributes = cacheKey
    ? `${dataAttribute('data-cache-key', cacheKey)}${dataAttribute('data-cache-format', format)}`
    : ''
  const output = cachedUri
    ? `<div class="kroki-embedded-output"><img class="kroki-embedded-cached-image" src="${escapeHtml(cachedUri)}" alt="${escapeHtml(attrs.title || `${diagramType} diagram`)}"></div>`
    : '<div class="kroki-embedded-output"></div>'
  const renderedAttribute = cachedUri ? ' data-rendered="true" data-cache-hit="true"' : ''

  return `<figure${dataAttribute('id', attrs.id)} class="${escapeHtml(className)}"${renderedAttribute} data-diagram-type="${escapeHtml(diagramType)}" data-diagram-format="${escapeHtml(format)}"${dataAttribute('data-target', attrs.target)}${dataAttribute('data-width', attrs.width)}${dataAttribute('data-height', attrs.height)}${dataAttribute('data-diagram-options', optionsJson)}${cacheAttributes}><pre class="kroki-embedded-source">${escapeHtml(normalizedSource)}</pre>${output}${title}</figure>`
}

export function errorRenderer({ diagramType, message }) {
  return `<pre class="kroki-embedded-error" data-diagram-type="${escapeHtml(diagramType)}">${escapeHtml(message)}</pre>`
}
