import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import * as asciidoctor from '@asciidoctor/core'
import krokiEmbedded from '../src/index.js'

async function convert(input, options = {}) {
  const registry = asciidoctor.Extensions.create()
  krokiEmbedded.register(registry, options.extensionOptions)

  return String(await asciidoctor.convert(input, {
    safe: 'safe',
    backend: 'html5',
    standalone: false,
    to_file: false,
    extension_registry: registry,
    ...options.convertOptions,
  }))
}

test('converts a Kroki-compatible listing block to an embedded target', async () => {
  const html = await convert(`
[mermaid]
----
graph TD
  A --> B
----
`)

  assert.match(html, /class="kroki-embedded kroki-embedded-mermaid kroki-format-svg"/)
  assert.match(html, /data-diagram-type="mermaid"/)
  assert.match(html, /graph TD/)
  assert.match(html, /A --&gt; B/)
  assert.doesNotMatch(html, /kroki\.io/)
})

test('converts a Kroki-compatible literal block to an embedded target', async () => {
  const html = await convert(`
[plantuml]
....
Alice -> Bob
....
`)

  assert.match(html, /data-diagram-type="plantuml"/)
  assert.match(html, /@startuml/)
  assert.match(html, /Alice -&gt; Bob/)
})

test('uses kroki-default-format document attribute', async () => {
  const html = await convert(`
:kroki-default-format: png

[mermaid]
----
graph TD
  A --> B
----
`)

  assert.match(html, /data-diagram-format="png"/)
  assert.match(html, /kroki-format-png/)
})

test('uses extension defaultFormat when no document attribute is set', async () => {
  const html = await convert(`
[mermaid]
----
graph TD
  A --> B
----
`, {
    extensionOptions: {
      defaultFormat: 'png',
    },
  })

  assert.match(html, /data-diagram-format="png"/)
  assert.match(html, /kroki-format-png/)
})

test('converts a Kroki-compatible block macro from a local file', async () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'kroki-embedded-asciidoctor-'))
  fs.writeFileSync(path.join(tmpDir, 'diagram.mmd'), 'graph TD\n  A --> B\n')

  const html = await convert('mermaid::diagram.mmd[]', {
    convertOptions: {
      base_dir: tmpDir,
    },
  })

  assert.match(html, /data-diagram-type="mermaid"/)
  assert.match(html, /A --&gt; B/)
})

test('converts multiple Kroki-compatible block macros from local files', async () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'kroki-embedded-asciidoctor-'))
  fs.mkdirSync(path.join(tmpDir, 'diagrams'))
  fs.writeFileSync(path.join(tmpDir, 'diagrams', 'sequence.puml'), 'Alice -> Bob\n')
  fs.writeFileSync(path.join(tmpDir, 'diagrams', 'model.nomnoml'), '[A] -> [B]\n')
  fs.writeFileSync(path.join(tmpDir, 'diagrams', 'chart.vega'), '{"width":100,"height":40,"marks":[]}\n')
  fs.writeFileSync(path.join(tmpDir, 'diagrams', 'chart.vegalite'), '{"mark":"bar","data":{"values":[]},"encoding":{}}\n')
  fs.writeFileSync(path.join(tmpDir, 'diagrams', 'timing.wavedrom'), '{ signal: [{ name: "clk", wave: "p." }] }\n')
  fs.writeFileSync(path.join(tmpDir, 'diagrams', 'register.bytefield'), '{ reg: [{ bits: 8, name: "opcode" }] }\n')

  const html = await convert(`
plantuml::diagrams/sequence.puml[]

nomnoml::diagrams/model.nomnoml[]

vega::diagrams/chart.vega[]

vegalite::diagrams/chart.vegalite[]

wavedrom::diagrams/timing.wavedrom[]

bytefield::diagrams/register.bytefield[]
`, {
    convertOptions: {
      base_dir: tmpDir,
    },
  })

  assert.match(html, /data-diagram-type="plantuml"/)
  assert.match(html, /data-diagram-type="nomnoml"/)
  assert.match(html, /data-diagram-type="vega"/)
  assert.match(html, /data-diagram-type="vegalite"/)
  assert.match(html, /data-diagram-type="wavedrom"/)
  assert.match(html, /data-diagram-type="bytefield"/)
  assert.match(html, /Alice -&gt; Bob/)
  assert.match(html, /\[A\] -&gt; \[B\]/)
  assert.match(html, /&quot;width&quot;:100/)
  assert.match(html, /clk/)
  assert.match(html, /opcode/)
})

test('renders a local file boundary error for unsafe block macro targets', async () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'kroki-embedded-asciidoctor-'))

  const html = await convert('plantuml::../outside.puml[]', {
    convertOptions: {
      base_dir: tmpDir,
    },
  })

  assert.match(html, /kroki-embedded-error/)
  assert.match(html, /outside the document directory/)
})
