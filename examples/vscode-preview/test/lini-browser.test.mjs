import test from 'node:test'
import assert from 'node:assert/strict'
import { build } from 'esbuild'
import { chromium } from 'playwright'
import { fileURLToPath } from 'node:url'
import { networkGuardScript } from '../src/network-guard-html.js'

test('Lini WASM renders offline and rejects image nodes before DOM insertion', async (t) => {
  const bundle = await build({
    stdin: {
      contents: `export { hydrateEmbeddedDiagrams } from '../../src/browser.js';
        export { loadLini } from './src/load-lini.js';`,
      resolveDir: fileURLToPath(new URL('..', import.meta.url)),
    },
    bundle: true,
    platform: 'browser',
    format: 'iife',
    globalName: 'LiniTest',
    loader: { '.wasm': 'binary' },
    write: false,
  })
  const browser = await chromium.launch()
  t.after(() => browser.close())
  const page = await browser.newPage()
  const remoteRequests = []
  page.on('request', request => {
    if (/^https?:/.test(request.url())) remoteRequests.push(request.url())
  })
  await page.route(/^https?:/, route => route.abort())
  await page.setContent('<main></main>')
  await page.addScriptTag({ content: networkGuardScript })
  await page.addScriptTag({ content: bundle.outputFiles[0].text })
  const result = await page.evaluate(async () => {
    const root = document.querySelector('main')
    for (const [source, options] of [
      ['|box| "Offline WASM"', {}],
      ['|box| "Static SVG"', { static: 'true' }],
      ['|image| { src: "https://example.invalid/image.png"; width: 100; height: 100; }', {}],
      ['|image| { src: "data:image/svg+xml,%3Csvg%3E%3C/svg%3E"; width: 100; height: 100; }', {}],
    ]) {
      const figure = document.createElement('figure')
      figure.className = 'kroki-embedded'
      figure.dataset.diagramType = 'lini'
      figure.dataset.diagramOptions = JSON.stringify(options)
      figure.innerHTML = '<pre class="kroki-embedded-source"></pre><div class="kroki-embedded-output"></div>'
      figure.querySelector('pre').textContent = source
      root.appendChild(figure)
    }
    const results = await LiniTest.hydrateEmbeddedDiagrams(root, { libraries: { loadLini: LiniTest.loadLini } })
    return {
      ok: results.map(result => result.ok),
      errors: results.filter(result => !result.ok).map(result => result.error.message),
      svgCount: root.querySelectorAll('svg').length,
      imageCount: root.querySelectorAll('image').length,
      sizes: Array.from(root.querySelectorAll('svg'), svg => ({
        width: svg.getBoundingClientRect().width,
        height: svg.getBoundingClientRect().height,
      })),
    }
  })
  assert.deepEqual(result.ok, [true, true, false, false])
  for (const error of result.errors) assert.match(error, /image nodes are not supported/)
  assert.equal(result.svgCount, 2)
  assert.equal(result.imageCount, 0)
  assert.ok(result.sizes.every(size => size.width > 0 && size.height > 0))
  assert.deepEqual(remoteRequests, [])
})
