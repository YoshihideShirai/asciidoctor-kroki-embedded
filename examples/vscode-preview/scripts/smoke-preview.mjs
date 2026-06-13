import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { chromium } from 'playwright'

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const previewPath = path.join(rootDir, 'dist', 'standalone-preview.html')
const screenshotPath = path.join(rootDir, 'dist', 'standalone-preview.png')

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

page.on('console', (message) => {
  if (message.type() === 'error' || message.type() === 'warning') {
    consoleMessages.push(`${message.type()}: ${message.text()}`)
  }
})
page.on('pageerror', (error) => {
  pageErrors.push(error.message)
})

await page.goto(pathToFileURL(previewPath).href)
await page.waitForFunction(() => {
  const diagrams = Array.from(document.querySelectorAll('.kroki-embedded[data-diagram-type]'))
  return diagrams.length === 7 && diagrams.every((diagram) =>
    diagram.dataset.rendered === 'true' || diagram.classList.contains('kroki-embedded-failed'))
}, { timeout: 30000 })

const result = await page.evaluate(() => {
  const diagrams = Array.from(document.querySelectorAll('.kroki-embedded[data-diagram-type]'))
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
  }
})

await page.screenshot({ path: screenshotPath, fullPage: true })
await browser.close()

if (pageErrors.length > 0) {
  throw new Error(`Page errors:\n${pageErrors.join('\n')}`)
}
if (result.failed.length > 0) {
  throw new Error(`Renderer failures:\n${JSON.stringify(result.failed, null, 2)}`)
}
if (result.total !== 7 || result.rendered !== 7 || result.svgCount < 7) {
  throw new Error(`Unexpected render result: ${JSON.stringify(result)}`)
}

console.log(JSON.stringify({
  ...result,
  consoleMessages,
  screenshotPath,
}, null, 2))
