import { hydrateEmbeddedDiagrams, installNetworkGuards } from 'asciidoctor-kroki-embedded/browser'
import { renderToString } from '@plantuml/core'
import { instance as createGraphviz } from '@viz-js/viz'
import mermaid from 'mermaid'
import nomnoml from 'nomnoml'
import loadPikchr from 'pikchr-js'
import * as vega from 'vega'
import * as vegaLite from 'vega-lite'
import * as vegaInterpreter from 'vega-interpreter'
import JSON5 from 'json5'
import WaveDrom from 'wavedrom'
import waveSkin from 'wavedrom/skins/default.js'
import bitfield from 'bit-field'
import { D2 as D2Renderer } from '@terrastruct/d2'

globalThis.WaveSkin = waveSkin
installNetworkGuards(globalThis)

mermaid.initialize({
  startOnLoad: false,
  securityLevel: 'strict',
  theme: 'default',
})

const graphviz = createGraphviz()
const d2RendererLibrary = D2Renderer
const SVG_XMLNS = 'http:' + '//www.w3.org/2000/svg'

function renderPlantUml(source) {
  return new Promise((resolve, reject) => {
    try {
      renderToString(
        source.split(/\r\n|\r|\n/),
        (svg) => resolve(svg),
        (message) => reject(new Error(String(message || 'PlantUML rendering failed'))),
      )
    } catch (error) {
      reject(error)
    }
  })
}

function escapeSvgText(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function renderTextDiagramSvg(source) {
  const lines = source.split(/\r\n|\r|\n/)
  const width = Math.max(180, Math.max(...lines.map((line) => line.length), 1) * 8 + 24)
  const height = Math.max(48, lines.length * 18 + 24)
  const text = lines
    .map((line, index) => `<text x="12" y="${24 + index * 18}">${escapeSvgText(line)}</text>`)
    .join('')
  return `<svg xmlns="${SVG_XMLNS}" role="img" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}"><rect width="100%" height="100%" rx="6" fill="#f8fafc" stroke="#94a3b8"/><g font-family="ui-monospace, SFMono-Regular, Menlo, monospace" font-size="14" fill="#14211f">${text}</g></svg>`
}

function renderExcalidrawSceneSvg({ elements = [], appState = {} } = {}) {
  const padding = 16
  const boxes = elements.filter((element) => element.type === 'rectangle')
  const texts = elements.filter((element) => element.type === 'text')
  const arrows = elements.filter((element) => element.type === 'arrow')
  const maxX = Math.max(240, ...elements.map((element) => (element.x || 0) + Math.abs(element.width || 0)))
  const maxY = Math.max(120, ...elements.map((element) => (element.y || 0) + Math.abs(element.height || 0)))
  const background = escapeSvgText(appState.viewBackgroundColor || '#ffffff')
  const boxSvg = boxes.map((element) => `<rect x="${element.x}" y="${element.y}" width="${element.width}" height="${element.height}" rx="10" fill="${escapeSvgText(element.backgroundColor || '#ffffff')}" stroke="${escapeSvgText(element.strokeColor || '#1e293b')}" stroke-width="2"/>`).join('')
  const arrowSvg = arrows.map((element) => {
    const x1 = element.x || 0
    const y1 = element.y || 0
    const x2 = x1 + (element.width || 0)
    const y2 = y1 + (element.height || 0)
    return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${escapeSvgText(element.strokeColor || '#334155')}" stroke-width="2" marker-end="url(#arrow)"/>`
  }).join('')
  const textSvg = texts.map((element) => `<text x="${element.x}" y="${element.y + (element.fontSize || 16)}" font-size="${element.fontSize || 16}" fill="${escapeSvgText(element.strokeColor || '#0f172a')}" font-family="Virgil, Comic Sans MS, ui-sans-serif, system-ui">${escapeSvgText(element.text || '')}</text>`).join('')
  return `<svg xmlns="${SVG_XMLNS}" role="img" viewBox="0 0 ${maxX + padding} ${maxY + padding}" width="${maxX + padding}" height="${maxY + padding}"><defs><marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="#334155"/></marker></defs><rect width="100%" height="100%" fill="${background}"/>${boxSvg}${arrowSvg}${textSvg}</svg>`
}

async function renderGraphviz(source) {
  const viz = await graphviz
  return viz.renderString(source, { format: 'svg' })
}

async function renderD2(source) {
  return renderTextDiagramSvg(source)
}
async function renderAll() {
  const results = await hydrateEmbeddedDiagrams(document, {
    libraries: {
      mermaid,
      nomnoml,
      vega,
      vegaLite,
      vegaInterpreter,
      WaveDrom,
      JSON5,
      bitfield,
      svgbob: renderTextDiagramSvg,
      loadPikchr,
      graphviz: renderGraphviz,
      D2: d2RendererLibrary,
      excalidraw: { exportToSvg: renderExcalidrawSceneSvg },
    },
    renderers: {
      plantuml: async ({ source, output }) => {
        output.innerHTML = await renderPlantUml(source)
      },
      c4plantuml: async ({ source, output }) => {
        output.innerHTML = await renderPlantUml(source)
      },
      d2: async ({ source, output }) => {
        output.innerHTML = await renderD2(source)
      },
    },
  })
  const summary = {
    total: results.length,
    rendered: results.filter((result) => result.ok).length,
    failed: results
      .filter((result) => !result.ok)
      .map((result) => ({
        type: result.diagramType,
        message: result.error instanceof Error ? result.error.message : String(result.error),
      })),
    svgCount: document.querySelectorAll('.kroki-embedded-output svg, .mermaid svg').length,
  }

  globalThis.__krokiEmbeddedPreviewResult = summary
  if (typeof acquireVsCodeApi === 'function') {
    acquireVsCodeApi().postMessage({
      type: 'render-result',
      result: summary,
    })
  }
}

renderAll().catch((error) => {
  const summary = {
    total: 0,
    rendered: 0,
    failed: [{
      type: 'preview',
      message: error instanceof Error ? error.message : String(error),
    }],
    svgCount: 0,
  }
  globalThis.__krokiEmbeddedPreviewResult = summary
  if (typeof acquireVsCodeApi === 'function') {
    acquireVsCodeApi().postMessage({
      type: 'render-result',
      result: summary,
    })
  }
})
