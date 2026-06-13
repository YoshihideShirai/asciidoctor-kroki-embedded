import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import asciidoctorFactory from '@asciidoctor/core'
import krokiEmbedded from '../src/index.js'

function convert(input, options = {}) {
  const asciidoctor = asciidoctorFactory()
  const registry = asciidoctor.Extensions.create()
  krokiEmbedded.register(registry, options.extensionOptions)

  return String(asciidoctor.convert(input, {
    safe: 'safe',
    backend: 'html5',
    standalone: false,
    extension_registry: registry,
    ...options.convertOptions,
  }))
}

test('converts a Kroki-compatible listing block to an embedded target', () => {
  const html = convert(`
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

test('converts a Kroki-compatible block macro from a local file', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'kroki-embedded-asciidoctor-'))
  fs.writeFileSync(path.join(tmpDir, 'diagram.mmd'), 'graph TD\n  A --> B\n')

  const html = convert('mermaid::diagram.mmd[]', {
    convertOptions: {
      base_dir: tmpDir,
    },
  })

  assert.match(html, /data-diagram-type="mermaid"/)
  assert.match(html, /A --&gt; B/)
})

test('renders a local file boundary error for unsafe block macro targets', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'kroki-embedded-asciidoctor-'))

  const html = convert('plantuml::../outside.puml[]', {
    convertOptions: {
      base_dir: tmpDir,
    },
  })

  assert.match(html, /kroki-embedded-error/)
  assert.match(html, /outside the document directory/)
})
