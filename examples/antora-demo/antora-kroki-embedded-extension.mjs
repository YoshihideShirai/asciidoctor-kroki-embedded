import { createAntoraExtension } from '../../src/antora.js'

const extension = createAntoraExtension({
  defaultFormat: 'svg',
  diagramNames: ['mermaid', 'plantuml', 'graphviz', 'vegalite'],
})

export function register(registry, context) {
  extension.register(registry, context)
}
