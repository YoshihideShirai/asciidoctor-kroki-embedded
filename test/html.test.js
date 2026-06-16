import test from 'node:test'
import assert from 'node:assert/strict'
import { collectDiagramOptions, createDiagramCacheKey, defaultRenderer, normalizePlantUmlSource } from '../src/html.js'

test('default renderer emits escaped embedded diagram target', () => {
  const html = defaultRenderer({
    diagramType: 'mermaid',
    source: 'graph TD\n  A["<unsafe>"] --> B',
    attrs: {
      id: 'flow',
      format: 'svg',
      title: 'Flow <One>',
      role: 'wide',
      width: '640',
      theme: 'dark',
    },
  })

  assert.match(html, /id="flow"/)
  assert.match(html, /class="kroki-embedded kroki-embedded-mermaid kroki-format-svg wide"/)
  assert.match(html, /data-diagram-type="mermaid"/)
  assert.match(html, /data-width="640"/)
  assert.match(html, /data-diagram-options="\{&quot;theme&quot;:&quot;dark&quot;\}"/)
  assert.match(html, /A\[\&quot;\&lt;unsafe\&gt;\&quot;\]/)
  assert.match(html, /Flow &lt;One&gt;/)
})

test('collectDiagramOptions keeps Kroki options and maps view alias', () => {
  assert.deepEqual(
    collectDiagramOptions({
      format: 'svg',
      title: 'System',
      width: '640',
      view: 'SystemContext',
      theme: 'dark',
    }),
    {
      'view-key': 'SystemContext',
      theme: 'dark',
    },
  )
})

test('default renderer reads format from document attributes', () => {
  const html = defaultRenderer({
    diagramType: 'mermaid',
    source: 'graph TD\nA --> B',
    attrs: {},
    document: {
      getAttribute(name) {
        return name === 'kroki-default-format' ? 'png' : undefined
      },
    },
  })

  assert.match(html, /data-diagram-format="png"/)
  assert.match(html, /kroki-format-png/)
})

test('default renderer uses extension defaultFormat as fallback', () => {
  const html = defaultRenderer({
    diagramType: 'mermaid',
    source: 'graph TD\nA --> B',
    attrs: {},
    options: {
      defaultFormat: 'png',
    },
  })

  assert.match(html, /data-diagram-format="png"/)
  assert.match(html, /kroki-format-png/)
})

test('default renderer emits cached svg image when cache has a matching entry', () => {
  const source = 'graph TD\nA --> B'
  const cacheKey = createDiagramCacheKey({
    diagramType: 'mermaid',
    source,
    format: 'svg',
    diagramOptions: {},
    rendererVersion: 'test-renderer',
  })
  const html = defaultRenderer({
    diagramType: 'mermaid',
    source,
    attrs: { format: 'svg' },
    options: {
      diagramCache: {
        rendererVersion: 'test-renderer',
        getCachedUri({ cacheKey: key }) {
          return key === cacheKey ? 'vscode-resource:/cache/mermaid.svg' : undefined
        },
      },
    },
  })

  assert.match(html, new RegExp(`data-cache-key="${cacheKey}"`))
  assert.match(html, /data-rendered="true"/)
  assert.match(html, /data-cache-hit="true"/)
  assert.match(html, /<img class="kroki-embedded-cached-image" src="vscode-resource:\/cache\/mermaid.svg"/)
})

test('plantuml source is wrapped when start marker is missing', () => {
  assert.equal(
    normalizePlantUmlSource('plantuml', 'Alice -> Bob'),
    '@startuml\nAlice -> Bob\n@enduml',
  )
})

test('plantuml source is left untouched when start marker exists', () => {
  assert.equal(
    normalizePlantUmlSource('plantuml', '@startuml\nAlice -> Bob\n@enduml'),
    '@startuml\nAlice -> Bob\n@enduml',
  )
})
