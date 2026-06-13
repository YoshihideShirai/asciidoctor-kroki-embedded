import test from 'node:test'
import assert from 'node:assert/strict'
import { blockedImageUri, rewriteRemoteImages } from '../src/preview-html.js'

test('rewriteRemoteImages replaces remote image src values with a local data placeholder', () => {
  assert.equal(
    rewriteRemoteImages('<img src="https://example.com/diagram.png" alt="remote">'),
    `<img src="${blockedImageUri}" alt="remote">`,
  )
  assert.equal(
    rewriteRemoteImages('<img alt="remote" src="//example.com/diagram.png">'),
    `<img alt="remote" src="${blockedImageUri}">`,
  )
})

test('rewriteRemoteImages leaves local and data image src values untouched', () => {
  assert.equal(
    rewriteRemoteImages('<img src="images/local.png"><img src="data:image/png;base64,abc">'),
    '<img src="images/local.png"><img src="data:image/png;base64,abc">',
  )
})
