import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { instance as createViz } from '@viz-js/viz'
import * as vega from 'vega'
import * as vegaLite from 'vega-lite'
import { createDiagramCacheKey } from '../src/html.js'
import { createDiagramCacheFilename } from '../src/antora.js'

const repoRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)))
const demoRoot = path.join(repoRoot, 'examples/antora-demo')
const pagePath = path.join(demoRoot, 'docs/modules/ROOT/pages/index.adoc')
const cacheDir = path.join(demoRoot, 'supplemental-ui/diagram-cache')
const rendererVersion = 'antora-demo-cache-v1'
const supportedTypes = new Set(['mermaid', 'plantuml', 'graphviz', 'vegalite'])

function extractBlocks(source) {
  const lines = source.split(/\r?\n/)
  const blocks = []
  for (let i = 0; i < lines.length; i += 1) {
    const match = lines[i].match(/^\[([a-z0-9_-]+)\]$/i)
    if (!match || !supportedTypes.has(match[1])) continue
    if (lines[i + 1] !== '----') continue
    const body = []
    i += 2
    while (i < lines.length && lines[i] !== '----') {
      body.push(lines[i])
      i += 1
    }
    blocks.push({ diagramType: match[1], source: body.join('\n') })
  }
  return blocks
}

function normalizePlantUmlSource(diagramType, source) {
  if (diagramType !== 'plantuml' && diagramType !== 'c4plantuml') return source
  if (/^\s*@start/i.test(source) && /@end\w*\s*$/i.test(source)) return source
  return `@startuml\n${source}\n@enduml`
}

function escapeXml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function wrapSvg({ width, height, body }) {
  return `<svg xmlns="http://www.w3.org/2000/svg" role="img" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">${body}</svg>\n`
}

function renderFlowchart(source) {
  const labels = []
  for (const match of source.matchAll(/\b[A-Za-z0-9_]+\[([^\]\n]+)\]/g)) {
    const label = match[1].trim()
    if (label && !labels.includes(label)) labels.push(label)
  }
  const nodes = labels.length ? labels : ['Antora page', 'Asciidoctor.js', 'asciidoctor-kroki-embedded', 'Embedded diagram target']
  const width = 260 * nodes.length
  const height = 150
  const nodeBody = nodes.map((label, index) => {
    const x = 20 + index * 250
    const arrow = index < nodes.length - 1 ? `<path d="M${x + 205} 75 H${x + 240}" stroke="#46617a" stroke-width="2" marker-end="url(#arrow)"/>` : ''
    return `<rect x="${x}" y="40" width="190" height="70" rx="12" fill="#e8f3ff" stroke="#5a8bc4"/><text x="${x + 95}" y="78" text-anchor="middle" font-family="system-ui, sans-serif" font-size="15" fill="#17202a">${escapeXml(label)}</text>${arrow}`
  }).join('')
  return wrapSvg({
    width,
    height,
    body: `<defs><marker id="arrow" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto"><path d="M0,0 L0,6 L9,3 z" fill="#46617a"/></marker></defs>${nodeBody}`,
  })
}

function renderSequence(source) {
  const participants = Array.from(source.matchAll(/^(?:actor|participant)\s+"?([^"\n]+)"?(?:\s+as\s+([A-Za-z0-9_]+))?/gm)).map((m) => ({ name: m[1], alias: m[2] || m[1] }))
  const messages = Array.from(source.matchAll(/^\s*([A-Za-z0-9_]+)\s*-+>?\s*([A-Za-z0-9_]+)\s*:\s*(.+)$/gm)).map((m) => ({ from: m[1], to: m[2], text: m[3] }))
  const actors = participants.length ? participants : [{ name: 'Author', alias: 'Author' }, { name: 'Antora', alias: 'Antora' }, { name: 'Extension', alias: 'Extension' }, { name: 'Site', alias: 'Site' }]
  const width = Math.max(720, actors.length * 190)
  const height = 130 + Math.max(messages.length, 1) * 60
  const xFor = new Map(actors.map((actor, index) => [actor.alias, 90 + index * 180]))
  const heads = actors.map((actor) => `<rect x="${xFor.get(actor.alias) - 70}" y="20" width="140" height="38" rx="8" fill="#fff4d9" stroke="#c2902f"/><text x="${xFor.get(actor.alias)}" y="44" text-anchor="middle" font-family="system-ui, sans-serif" font-size="13">${escapeXml(actor.name)}</text><path d="M${xFor.get(actor.alias)} 58 V${height - 25}" stroke="#c9d2dc" stroke-dasharray="5 5"/>`).join('')
  const body = messages.map((message, index) => {
    const y = 95 + index * 55
    const from = xFor.get(message.from) ?? 90
    const to = xFor.get(message.to) ?? width - 90
    return `<path d="M${from} ${y} H${to}" stroke="#46617a" stroke-width="2" marker-end="url(#arrow)"/><text x="${(from + to) / 2}" y="${y - 8}" text-anchor="middle" font-family="system-ui, sans-serif" font-size="13">${escapeXml(message.text)}</text>`
  }).join('')
  return wrapSvg({ width, height, body: `<defs><marker id="arrow" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto"><path d="M0,0 L0,6 L9,3 z" fill="#46617a"/></marker></defs>${heads}${body}` })
}

async function renderGraphviz(source) {
  const viz = await createViz()
  return viz.renderString(source, { format: 'svg' })
}

function renderVegaLite(source) {
  const spec = JSON.parse(source)
  const compiled = vegaLite.compile(spec).spec
  const view = new vega.View(vega.parse(compiled), { renderer: 'none' })
  return view.toSVG()
}

async function renderDiagram({ diagramType, source }) {
  if (diagramType === 'mermaid') return renderFlowchart(source)
  if (diagramType === 'plantuml') return renderSequence(source)
  if (diagramType === 'graphviz') return renderGraphviz(source)
  if (diagramType === 'vegalite') return renderVegaLite(source)
  throw new Error(`Unsupported Antora demo diagram type: ${diagramType}`)
}

fs.rmSync(cacheDir, { force: true, recursive: true })
fs.mkdirSync(cacheDir, { recursive: true })

const page = fs.readFileSync(pagePath, 'utf8')
const blocks = extractBlocks(page)
for (const block of blocks) {
  const source = normalizePlantUmlSource(block.diagramType, block.source)
  const cacheKey = createDiagramCacheKey({ diagramType: block.diagramType, source, format: 'svg', diagramOptions: {}, rendererVersion })
  const filename = createDiagramCacheFilename({ diagramType: block.diagramType, format: 'svg', cacheKey })
  const svg = await renderDiagram({ diagramType: block.diagramType, source })
  fs.writeFileSync(path.join(cacheDir, filename), svg)
  console.log(`cached ${block.diagramType}: ${pathToFileURL(path.join(cacheDir, filename)).href}`)
}
