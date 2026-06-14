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
