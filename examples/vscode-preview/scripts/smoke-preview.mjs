import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { chromium } from 'playwright'

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const previewPath = path.join(rootDir, 'dist', 'standalone-preview.html')
const expectedByType = {
  mermaid: 2,
  plantuml: 2,
  nomnoml: 2,
  vega: 2,
  vegalite: 2,
  wavedrom: 2,
  bytefield: 2,
}
const expectedDiagramCount = Object.values(expectedByType).reduce((total, count) => total + count, 0)
const viewports = [
  {
    name: 'desktop',
    width: 1280,
    height: 1600,
  },
  {
    name: 'narrow',
    width: 390,
    height: 1400,
  },
]

if (!fs.existsSync(previewPath)) {
  throw new Error(`Preview HTML does not exist: ${previewPath}`)
}

const browser = await chromium.launch()
const results = []

try {
  for (const viewport of viewports) {
    results.push(await smokeViewport(browser, viewport))
  }
} finally {
  await browser.close()
}

console.log(JSON.stringify({
  viewports: results,
}, null, 2))

async function smokeViewport(browser, viewport) {
  const page = await browser.newPage({
    viewport: {
      width: viewport.width,
      height: viewport.height,
    },
  })
  const consoleMessages = []
  const pageErrors = []
  const remoteRequests = []
  const screenshotPath = path.join(rootDir, 'dist', `standalone-preview-${viewport.name}.png`)

  page.on('console', (message) => {
    if (message.type() === 'error' || message.type() === 'warning') {
      consoleMessages.push(`${message.type()}: ${message.text()}`)
    }
  })
  page.on('pageerror', (error) => {
    pageErrors.push(error.message)
  })
  page.on('request', (request) => {
    if (/^https?:/i.test(request.url())) {
      remoteRequests.push(request.url())
    }
  })

  await page.goto(pathToFileURL(previewPath).href)
  await page.waitForFunction((count) => {
    const diagrams = Array.from(document.querySelectorAll('.kroki-embedded[data-diagram-type]'))
    return diagrams.length === count && diagrams.every((diagram) =>
      diagram.dataset.rendered === 'true' || diagram.classList.contains('kroki-embedded-failed'))
  }, expectedDiagramCount, { timeout: 30000 })

  const result = await page.evaluate(() => {
    const diagrams = Array.from(document.querySelectorAll('.kroki-embedded[data-diagram-type]'))
    const images = Array.from(document.querySelectorAll('img'))
    const visualBoxes = diagrams.map((diagram) => {
      const rendered = diagram.querySelector('.kroki-embedded-output svg, .mermaid svg')
      const rect = rendered?.getBoundingClientRect()
      return {
        type: diagram.dataset.diagramType,
        width: rect?.width || 0,
        height: rect?.height || 0,
      }
    })
    return {
      summary: globalThis.__krokiEmbeddedPreviewResult || null,
      total: diagrams.length,
      rendered: diagrams.filter((diagram) => diagram.dataset.rendered === 'true').length,
      failed: diagrams
        .filter((diagram) => diagram.classList.contains('kroki-embedded-failed'))
        .map((diagram) => ({
          type: diagram.dataset.diagramType,
          message: diagram.querySelector('.kroki-embedded-output')?.textContent || '',
        })),
      svgCount: document.querySelectorAll('.kroki-embedded-output svg, .mermaid svg').length,
      visualBoxes,
      byType: diagrams.reduce((counts, diagram) => {
        counts[diagram.dataset.diagramType] = (counts[diagram.dataset.diagramType] || 0) + 1
        return counts
      }, {}),
      images: images.map((image) => ({
        src: image.getAttribute('src'),
        alt: image.getAttribute('alt'),
      })),
    }
  })

  await page.screenshot({ path: screenshotPath, fullPage: true })
  await page.close()

  assertViewportResult({
    viewport,
    result,
    consoleMessages,
    pageErrors,
    remoteRequests,
  })

  return {
    viewport,
    ...result,
    consoleMessages,
    remoteRequests,
    screenshotPath,
  }
}

function assertViewportResult({ viewport, result, pageErrors, remoteRequests }) {
  const prefix = `[${viewport.name}]`
  if (pageErrors.length > 0) {
    throw new Error(`${prefix} Page errors:\n${pageErrors.join('\n')}`)
  }
  if (remoteRequests.length > 0) {
    throw new Error(`${prefix} Remote network requests:\n${remoteRequests.join('\n')}`)
  }
  if (result.failed.length > 0) {
    throw new Error(`${prefix} Renderer failures:\n${JSON.stringify(result.failed, null, 2)}`)
  }
  if (!result.summary) {
    throw new Error(`${prefix} Missing webview render summary.`)
  }
  if (
    result.summary.total !== result.total ||
    result.summary.rendered !== result.rendered ||
    result.summary.svgCount !== result.svgCount ||
    result.summary.failed.length !== result.failed.length
  ) {
    throw new Error(`${prefix} Webview render summary does not match DOM result: ${JSON.stringify({
      summary: result.summary,
      result,
    })}`)
  }
  if (result.total !== expectedDiagramCount || result.rendered !== expectedDiagramCount || result.svgCount < expectedDiagramCount) {
    throw new Error(`${prefix} Unexpected render result: ${JSON.stringify(result)}`)
  }
  if (JSON.stringify(result.byType) !== JSON.stringify(expectedByType)) {
    throw new Error(`${prefix} Unexpected diagram type counts: ${JSON.stringify(result.byType)}`)
  }
  const emptyVisuals = result.visualBoxes.filter((box) => box.width < 1 || box.height < 1)
  if (emptyVisuals.length > 0) {
    throw new Error(`${prefix} Rendered diagrams have empty visual boxes: ${JSON.stringify(emptyVisuals)}`)
  }
  if (!result.images.some((image) => image.alt === 'Remote image should be blocked' && image.src.startsWith('data:image/gif;base64,'))) {
    throw new Error(`${prefix} Remote image was not rewritten: ${JSON.stringify(result.images)}`)
  }
}
