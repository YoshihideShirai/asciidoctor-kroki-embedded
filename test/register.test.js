import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { register } from '../src/index.js'

function createRegistry() {
  const blocks = new Map()
  const macros = new Map()

  return {
    blocks,
    macros,
    block(name, callback) {
      blocks.set(name, callback)
    },
    blockMacro(name, callback) {
      macros.set(name, callback)
    },
  }
}

function createProcessor() {
  return {
    onContext() {},
    positionalAttributes() {},
    process(callback) {
      this.callback = callback
    },
    createBlock(_parent, context, content, attrs) {
      return { context, content, attrs }
    },
  }
}

function createParent(baseDir) {
  return {
    applySubs(value) {
      return value
    },
    resolveSubs(subs) {
      return subs
    },
    getDocument() {
      return {
        getBaseDir() {
          return baseDir
        },
      }
    },
  }
}

test('register wires selected diagram blocks and macros', () => {
  const registry = createRegistry()

  register(registry, { diagramNames: ['mermaid', 'plantuml'] })

  assert.deepEqual([...registry.blocks.keys()], ['mermaid', 'plantuml'])
  assert.deepEqual([...registry.macros.keys()], ['mermaid', 'plantuml'])
})

test('block macro reads relative files under document base dir', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'kroki-embedded-'))
  fs.writeFileSync(path.join(tmpDir, 'diagram.mmd'), 'graph TD\nA --> B\n')
  const registry = createRegistry()
  register(registry, { diagramNames: ['mermaid'] })

  const processor = createProcessor()
  registry.macros.get('mermaid').call(processor)
  const block = processor.callback(createParent(tmpDir), 'diagram.mmd', {})

  assert.equal(block.context, 'pass')
  assert.match(block.content, /data-diagram-type="mermaid"/)
  assert.match(block.content, /A --&gt; B/)
})

test('block macro rejects traversal outside document base dir', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'kroki-embedded-'))
  const registry = createRegistry()
  register(registry, { diagramNames: ['plantuml'] })

  const processor = createProcessor()
  registry.macros.get('plantuml').call(processor)
  const block = processor.callback(createParent(tmpDir), '../outside.puml', {})

  assert.equal(block.context, 'pass')
  assert.match(block.content, /outside the document directory/)
})
