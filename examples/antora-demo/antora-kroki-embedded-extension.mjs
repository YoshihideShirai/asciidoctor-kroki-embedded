import { createAntoraExtension } from '../../src/antora.js'

const extension = createAntoraExtension({
  defaultFormat: 'svg',
  diagramNames: ['mermaid', 'plantuml', 'graphviz', 'vegalite'],
  cacheDir: './supplemental-ui/diagram-cache',
  publicPath: '../_/diagram-cache',
  rendererVersion: 'antora-demo-cache-v1',
})

export function register(registry, context) {
  extension.register(registry, context)
}
