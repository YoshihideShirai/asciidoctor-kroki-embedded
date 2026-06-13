import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { chromium } from 'playwright'

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const previewPath = path.join(rootDir, 'dist', 'standalone-preview.html')
const screenshotPath = path.join(rootDir, 'dist', 'standalone-preview.png')
const expectedDiagramCount = 11

if (!fs.existsSync(previewPath)) {
  throw new Error(`Preview HTML does not exist: ${previewPath}`)
}

const browser = await chromium.launch()
const page = await browser.newPage({
  viewport: {
    width: 1280,
    height: 1600,
  },
})
const consoleMessages = []
const pageErrors = []
const remoteRequests = []

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
await browser.close()

if (pageErrors.length > 0) {
  throw new Error(`Page errors:\n${pageErrors.join('\n')}`)
}
if (remoteRequests.length > 0) {
  throw new Error(`Remote network requests:\n${remoteRequests.join('\n')}`)
}
if (result.failed.length > 0) {
  throw new Error(`Renderer failures:\n${JSON.stringify(result.failed, null, 2)}`)
}
if (result.total !== expectedDiagramCount || result.rendered !== expectedDiagramCount || result.svgCount < expectedDiagramCount) {
  throw new Error(`Unexpected render result: ${JSON.stringify(result)}`)
}
const emptyVisuals = result.visualBoxes.filter((box) => box.width < 1 || box.height < 1)
if (emptyVisuals.length > 0) {
  throw new Error(`Rendered diagrams have empty visual boxes: ${JSON.stringify(emptyVisuals)}`)
}
if (!result.images.some((image) => image.alt === 'Remote image should be blocked' && image.src.startsWith('data:image/gif;base64,'))) {
  throw new Error(`Remote image was not rewritten: ${JSON.stringify(result.images)}`)
}

console.log(JSON.stringify({
  ...result,
  consoleMessages,
  remoteRequests,
  screenshotPath,
}, null, 2))
