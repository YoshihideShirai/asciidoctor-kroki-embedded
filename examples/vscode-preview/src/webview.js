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

hydrateEmbeddedDiagrams(document, {
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
