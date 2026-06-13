import test from 'node:test'
import assert from 'node:assert/strict'
import { defaultRenderer, normalizePlantUmlSource } from '../src/html.js'

test('default renderer emits escaped embedded diagram target', () => {
  const html = defaultRenderer({
    diagramType: 'mermaid',
    source: 'graph TD\n  A["<unsafe>"] --> B',
    attrs: { format: 'svg', title: 'Flow <One>' },
  })

  assert.match(html, /class="kroki-embedded kroki-embedded-mermaid kroki-format-svg"/)
  assert.match(html, /data-diagram-type="mermaid"/)
  assert.match(html, /A\[\&quot;\&lt;unsafe\&gt;\&quot;\]/)
  assert.match(html, /Flow &lt;One&gt;/)
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
