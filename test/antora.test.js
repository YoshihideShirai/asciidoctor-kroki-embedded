import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { createAntoraDiagramCache, createAntoraExtension, createDiagramCacheFilename } from '../src/antora.js'
import { createDiagramCacheKey, defaultRenderer } from '../src/html.js'

test('createAntoraDiagramCache returns a public URI for existing cached SVGs', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'kroki-antora-cache-'))
  const rendererVersion = 'antora-test-v1'
  const source = 'graph TD\nA --> B'
  const cacheKey = createDiagramCacheKey({
    diagramType: 'mermaid',
    source,
    format: 'svg',
    diagramOptions: {},
    rendererVersion,
  })
  const filename = createDiagramCacheFilename({ diagramType: 'mermaid', format: 'svg', cacheKey })
  fs.writeFileSync(path.join(tmpDir, filename), '<svg></svg>')

  const html = defaultRenderer({
    diagramType: 'mermaid',
    source,
    attrs: { format: 'svg' },
    options: {
      diagramCache: createAntoraDiagramCache({
        cacheDir: tmpDir,
        publicPath: '_/diagram-cache',
        rendererVersion,
      }),
    },
  })

  assert.match(html, /data-cache-hit="true"/)
  assert.match(html, new RegExp(`src="_/diagram-cache/${filename}"`))
})

test('createAntoraDiagramCache supports a custom cached URI resolver', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'kroki-antora-cache-'))
  const cacheEntry = { diagramType: 'plantuml', format: 'svg', cacheKey: 'abc123' }
  const filename = createDiagramCacheFilename(cacheEntry)
  fs.writeFileSync(path.join(tmpDir, filename), '<svg></svg>')
  const cache = createAntoraDiagramCache({
    cacheDir: tmpDir,
    resolveCachedUri({ cachePath }) {
      assert.equal(cachePath, path.join(tmpDir, filename))
      return `xref:${filename}`
    },
  })

  assert.equal(cache.getCachedUri(cacheEntry), `xref:${filename}`)
})

test('createAntoraExtension registers kroki embedded with an Antora-style extension object', () => {
  const registry = {
    blocks: [],
    macros: [],
    block(name) {
      this.blocks.push(name)
    },
    blockMacro(name) {
      this.macros.push(name)
    },
  }

  createAntoraExtension({ diagramNames: ['mermaid'] }).register(registry, {
    file: { src: { relative: 'modules/ROOT/pages/index.adoc' } },
  })

  assert.deepEqual(registry.blocks, ['mermaid'])
  assert.deepEqual(registry.macros, ['mermaid'])
})
