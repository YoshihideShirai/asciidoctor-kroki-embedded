import test from 'node:test'
import assert from 'node:assert/strict'
import * as asciidoctor from '@asciidoctor/core'
import { registerBrowserDiagrams } from '../site/lib/browser-kroki.js'
import { buildGalleryAsciidoc } from '../site/lib/gallery-asciidoc.js'
import { samples } from '../site/lib/gallery-samples.js'

test('browser extension converts all gallery samples with their source intact', async () => {
  const registry = asciidoctor.Extensions.create()
  const sources = []
  registerBrowserDiagrams(registry, {
    renderer({ source }) {
      assert.equal(typeof source, 'string')
      sources.push(source)
      return '<div class="diagram"></div>'
    },
  })
  await asciidoctor.convert(buildGalleryAsciidoc(samples, {
    title: 'Gallery', intro: 'Diagram samples',
  }), { extension_registry: registry })
  assert.deepEqual(sources, samples.map((sample) => sample.source))
})

test('browser extension resolves substitutions before rendering PlantUML', async () => {
  const registry = asciidoctor.Extensions.create()
  registerBrowserDiagrams(registry)
  const html = await asciidoctor.convert(`:actor: Alice

[plantuml,subs=attributes]
----
{actor} -> Bob
----`, { extension_registry: registry })
  assert.match(html, /data-diagram-type="plantuml"/)
  assert.match(html, /@startuml/)
  assert.match(html, /Alice -&gt; Bob/)
  assert.doesNotMatch(html, /\[object Promise\]/)
})
