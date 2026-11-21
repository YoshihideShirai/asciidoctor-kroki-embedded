import bitfield from 'bit-field'
import JSON5 from 'json5'
import mermaid from 'mermaid'
import nomnoml from 'nomnoml'
import { renderToString } from '@plantuml/core'
import plantUmlVizUrl from '@plantuml/core/viz-global.js?url'
import loadPikchr from 'pikchr-js'
import { loadLini } from './load-lini.js'
import { instance as createGraphviz } from '@viz-js/viz'
import * as vega from 'vega'
import * as vegaInterpreter from 'vega-interpreter'
import * as vegaLite from 'vega-lite'
import { D2 } from '@terrastruct/d2'
import WaveDrom from 'wavedrom'
import waveSkin from 'wavedrom/skins/default.js'
import { hydrateEmbeddedDiagrams, installNetworkGuards } from '../../src/browser.js'

const graphviz = createGraphviz()
const pikchr = loadPikchr()
const d2 = new D2()

globalThis.WaveSkin = waveSkin
installNetworkGuards(globalThis)
mermaid.initialize({
  startOnLoad: false,
  securityLevel: 'strict',
  theme: 'default',
})

function loadClassicScript(src) {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${src}"]`)
    if (existing?.dataset.loaded === 'true') {
      resolve()
      return
    }
    const script = existing || document.createElement('script')
    script.src = src
    script.dataset.loaded = 'false'
    script.addEventListener('load', () => {
      script.dataset.loaded = 'true'
      resolve()
    }, { once: true })
    script.addEventListener('error', () => reject(new Error(`Failed to load ${src}`)), { once: true })
    if (!existing) document.head.append(script)
  })
}

function loadPlantUmlGraphviz() {
  if (globalThis.Viz) return Promise.resolve()
  return loadClassicScript(new URL(plantUmlVizUrl, import.meta.url).href)
}

function renderPlantUml(sourceText) {
  const renderTimeoutMs = 10000
  let timeoutId

  const render = new Promise((resolve, reject) => {
    try {
      renderToString(
        sourceText.split(/\r\n|\r|\n/),
        (svg) => {
          clearTimeout(timeoutId)
          resolve(svg)
        },
        (message) => {
          clearTimeout(timeoutId)
          reject(new Error(String(message || 'PlantUML rendering failed')))
        },
      )
    } catch (error) {
      clearTimeout(timeoutId)
      reject(error)
    }
  })

  const timeout = new Promise((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error('PlantUML rendering timed out in the browser renderer.'))
    }, renderTimeoutMs)
  })

  return Promise.race([render, timeout])
}

function escapeSvgText(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function renderTextDiagramSvg(sourceText) {
  const lines = sourceText.split(/\r\n|\r|\n/)
  const width = Math.max(180, Math.max(...lines.map((line) => line.length), 1) * 8 + 24)
  const height = Math.max(48, lines.length * 18 + 24)
  const text = lines
    .map((line, index) => `<text x="12" y="${24 + index * 18}">${escapeSvgText(line)}</text>`)
    .join('')
  return `<svg xmlns="http://www.w3.org/2000/svg" role="img" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}"><rect width="100%" height="100%" rx="6" fill="#f8fafc" stroke="#94a3b8"/><g font-family="ui-monospace, SFMono-Regular, Menlo, monospace" font-size="14" fill="#14211f">${text}</g></svg>`
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
  return `<svg xmlns="http://www.w3.org/2000/svg" role="img" viewBox="0 0 ${maxX + padding} ${maxY + padding}" width="${maxX + padding}" height="${maxY + padding}"><defs><marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="#334155"/></marker></defs><rect width="100%" height="100%" fill="${background}"/>${boxSvg}${arrowSvg}${textSvg}</svg>`
}

async function renderGraphviz(sourceText) {
  const viz = await graphviz
  return viz.renderString(sourceText, { format: 'svg' })
}

async function renderD2(sourceText, options = {}) {
  const result = await d2.compile(sourceText, options)
  return d2.render(result.diagram, result.renderOptions)
}

export async function hydrateLocalDiagrams(output) {
  await loadPlantUmlGraphviz()

  return hydrateEmbeddedDiagrams(output, {
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
      pikchr: await pikchr,
      loadLini,
      graphviz: renderGraphviz,
      d2: renderD2,
      excalidraw: { exportToSvg: renderExcalidrawSceneSvg },
      plantuml: renderPlantUml,
    },
  })
}
