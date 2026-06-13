import { hydrateEmbeddedDiagrams, installNetworkGuards } from 'asciidoctor-kroki-embedded/browser'
import { renderToString } from '@plantuml/core'
import mermaid from 'mermaid'
import nomnoml from 'nomnoml'
import * as vega from 'vega'
import * as vegaLite from 'vega-lite'
import * as vegaInterpreter from 'vega-interpreter'
import JSON5 from 'json5'
import WaveDrom from 'wavedrom'
import waveSkin from 'wavedrom/skins/default.js'
import bitfield from 'bit-field'

globalThis.WaveSkin = waveSkin
installNetworkGuards(globalThis)

mermaid.initialize({
  startOnLoad: false,
  securityLevel: 'strict',
  theme: 'default',
})

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
    },
    renderers: {
      plantuml: async ({ source, output }) => {
        output.innerHTML = await renderPlantUml(source)
      },
      c4plantuml: async ({ source, output }) => {
        output.innerHTML = await renderPlantUml(source)
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
