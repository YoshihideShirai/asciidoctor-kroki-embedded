import { DEFAULT_DIAGRAM_NAMES } from '../../src/diagram-names.js'
import { defaultRenderer } from '../../src/html.js'

function applySubs(parent, value, subs) {
  if (!subs || typeof parent.applySubs !== 'function') {
    return value
  }
  return parent.applySubs(value, parent.resolveSubs(subs))
}

async function renderPass(processor, parent, diagramType, source, attrs, renderer, options) {
  const html = await renderer({
    diagramType,
    source: await applySubs(parent, source, attrs.subs),
    attrs,
    document: parent.getDocument(),
    options,
  })
  return processor.createBlock(parent, 'pass', html, attrs)
}

function registerDiagramBlock(registry, diagramType, renderer, options) {
  registry.block(diagramType, function () {
    this.onContext(['listing', 'literal'])
    this.positionalAttributes(['target', 'format'])
    this.process(async function (parent, reader, attrs) {
      return renderPass(this, parent, diagramType, await reader.read(), attrs, renderer, options)
    })
  })
}

export function registerBrowserDiagrams(registry, options = {}) {
  const diagramNames = options.diagramNames || DEFAULT_DIAGRAM_NAMES
  const renderer = options.renderer || defaultRenderer

  for (const diagramType of diagramNames) {
    registerDiagramBlock(registry, diagramType, renderer, options)
  }

  return registry
}
