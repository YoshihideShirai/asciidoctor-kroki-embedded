import test from 'node:test'
import assert from 'node:assert/strict'
import { collectDiagramOptions, defaultRenderer, normalizePlantUmlSource } from '../src/html.js'

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
