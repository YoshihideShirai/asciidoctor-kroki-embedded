import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import asciidoctorFactory from '@asciidoctor/core'
import krokiEmbedded from 'asciidoctor-kroki-embedded'
import { rewriteLocalImageSrc, rewritePreviewImages } from '../src/preview-html.js'

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const repoRoot = path.resolve(rootDir, '..', '..')
const fixturePath = path.join(rootDir, 'fixtures', 'sample.adoc')
const distDir = path.join(rootDir, 'dist')
const outputPath = path.join(distDir, 'standalone-preview.html')

fs.mkdirSync(distDir, { recursive: true })

const asciidoctor = asciidoctorFactory()
const registry = asciidoctor.Extensions.create()
krokiEmbedded.register(registry, {
  defaultFormat: 'svg',
  diagramNames: ['mermaid', 'plantuml', 'nomnoml', 'vega', 'vegalite', 'wavedrom', 'bytefield'],
})

const body = rewritePreviewImages(String(asciidoctor.convert(fs.readFileSync(fixturePath, 'utf8'), {
  safe: 'safe',
  backend: 'html5',
  standalone: false,
  base_dir: path.dirname(fixturePath),
  attributes: {
    'allow-uri-read': false,
    showtitle: true,
  },
  extension_registry: registry,
})), {
  localImageResolver: (src) => rewriteLocalImageSrc(src, path.dirname(fixturePath), (imagePath, baseDir) => {
    const decodedPath = decodeURIComponent(imagePath)
    return pathToFileURL(path.resolve(baseDir, decodedPath)).href
  }),
})
const packageStyle = fs.readFileSync(path.join(repoRoot, 'src', 'style.css'), 'utf8')

fs.writeFileSync(outputPath, `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Kroki Embedded Standalone Preview</title>
  <style>
    body {
      box-sizing: border-box;
      max-width: 980px;
      margin: 0 auto;
      padding: 24px;
      font-family: system-ui, sans-serif;
      line-height: 1.55;
    }

    .kroki-embedded {
      padding: 16px;
      border: 1px solid #d0d7de;
      border-radius: 6px;
      background: #f6f8fa;
    }

    ${packageStyle}
  </style>
</head>
<body>
  <main>${body}</main>
  <script src="./webview.js"></script>
</body>
</html>
`)

console.log(outputPath)
