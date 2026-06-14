import test from 'node:test'
import assert from 'node:assert/strict'
import { samples } from '../site/lib/gallery-samples.js'

test('gallery samples avoid PlantUML browser renderer paths', () => {
  assert(samples.length > 0)
  assert.equal(samples.some((sample) => sample.type === 'plantuml'), false)
  for (const sample of samples) {
    assert.doesNotMatch(sample.source, /@start(?:uml|mindmap|gantt)/i)
  }
})
