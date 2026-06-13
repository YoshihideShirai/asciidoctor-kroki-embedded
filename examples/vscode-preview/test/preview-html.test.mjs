import test from 'node:test'
import assert from 'node:assert/strict'
import {
  blockedImageUri,
  getPreviewImageCspSources,
  normalizeAllowedPreviewHosts,
  rewriteLocalImageSrc,
  rewritePreviewImages,
  rewriteRemoteImages,
} from '../src/preview-html.js'

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

test('rewritePreviewImages preserves allowlisted remote images and blocks other hosts', () => {
  assert.equal(
    rewritePreviewImages(
      '<img src="https://images.example.org/a.png"><img src="http://other.example/a.png">',
      { allowedPreviewHosts: ['https://images.example.org'] },
    ),
    `<img src="https://images.example.org/a.png"><img src="${blockedImageUri}">`,
  )
  assert.equal(
    rewritePreviewImages(
      '<img src="//assets.example.test/a.png">',
      { allowedPreviewHosts: ['assets.example.test'] },
    ),
    '<img src="https://assets.example.test/a.png">',
  )
})

test('normalizeAllowedPreviewHosts ignores invalid entries', () => {
  assert.deepEqual(
    normalizeAllowedPreviewHosts([
      'example.com',
      'http://example.org:8080',
      'ftp://example.net',
      'example.net/path',
      '*.example.test',
      'https://user@example.test',
      ' ',
    ]),
    [
      {
        host: 'example.com',
        hostname: 'example.com',
        port: '',
        schemes: ['https', 'http'],
      },
      {
        host: 'example.org:8080',
        hostname: 'example.org',
        port: '8080',
        schemes: ['http'],
      },
    ],
  )
})

test('getPreviewImageCspSources includes data and allowed remote image sources', () => {
  assert.deepEqual(
    getPreviewImageCspSources('vscode-resource:', ['example.com', 'https://images.example.org']),
    [
      'vscode-resource:',
      'data:',
      'https://example.com',
      'http://example.com',
      'https://images.example.org',
    ],
  )
})

test('rewritePreviewImages can rewrite local image sources through a resolver', () => {
  assert.equal(
    rewritePreviewImages(
      '<img src="images/local%20file.png?cache=1#diagram"><img src="#anchor">',
      {
        localImageResolver: (src) => rewriteLocalImageSrc(src, '/doc', (imagePath, baseDir) => (
          `webview:${baseDir}/${imagePath}`
        )),
      },
    ),
    '<img src="webview:/doc/images/local%20file.png?cache=1#diagram"><img src="#anchor">',
  )
})
