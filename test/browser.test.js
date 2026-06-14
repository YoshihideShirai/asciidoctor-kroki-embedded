import test from 'node:test'
import assert from 'node:assert/strict'
import { hydrateEmbeddedDiagrams, installNetworkGuards } from '../src/browser.js'

class FakeClassList {
  constructor() {
    this.names = new Set()
  }

  add(name) {
    this.names.add(name)
  }

  has(name) {
    return this.names.has(name)
  }
}

class FakeElement {
  constructor({ textContent = '', dataset = {}, ownerDocument } = {}) {
    this.children = []
    this.classList = new FakeClassList()
    this.dataset = dataset
    this.ownerDocument = ownerDocument || this
    this.textContent = textContent
    this.innerHTML = ''
    this.attributes = {}
    this.id = ''
  }

  appendChild(child) {
    this.children.push(child)
    return child
  }

  replaceChildren(...children) {
    this.children = children
  }

  setAttribute(name, value) {
    this.attributes[name] = value
  }

  getAttribute(name) {
    return this.attributes[name]
  }

  createElement(tagName) {
    return new FakeElement({ ownerDocument: this, dataset: { tagName } })
  }

  createElementNS(_namespace, tagName) {
    const element = new FakeElement({ ownerDocument: this })
    element.tagName = tagName
    return element
  }

  createTextNode(value) {
    return { textContent: value }
  }
}

function diagram(type, source) {
  const document = new FakeElement()
  const sourceElement = new FakeElement({ textContent: source, ownerDocument: document })
  const outputElement = new FakeElement({ ownerDocument: document })
  const element = new FakeElement({ dataset: { diagramType: type }, ownerDocument: document })

  element.querySelector = (selector) => {
    if (selector === '.kroki-embedded-source') return sourceElement
    if (selector === '.kroki-embedded-output') return outputElement
    return undefined
  }

  return { element, sourceElement, outputElement }
}

test('hydrateEmbeddedDiagrams runs an injected renderer', async () => {
  const mermaid = diagram('mermaid', 'graph TD\nA --> B')
  const root = {
    querySelectorAll(selector) {
      assert.equal(selector, '.kroki-embedded[data-diagram-type]')
      return [mermaid.element]
    },
  }

  const results = await hydrateEmbeddedDiagrams(root, {
    renderers: {
      mermaid({ source, output, diagramOptions }) {
        assert.deepEqual(diagramOptions, {})
        output.textContent = `rendered:${source}`
      },
    },
  })

  assert.equal(results.length, 1)
  assert.equal(results[0].ok, true)
  assert.equal(mermaid.outputElement.textContent, 'rendered:graph TD\nA --> B')
  assert.equal(mermaid.element.dataset.rendered, 'true')
})

test('hydrateEmbeddedDiagrams can use the built-in Mermaid renderer with a local library', async () => {
  const mermaid = diagram('mermaid', 'graph TD\nA --> B')
  const root = {
    querySelectorAll() {
      return [mermaid.element]
    },
  }
  const renderedNodes = []

  const results = await hydrateEmbeddedDiagrams(root, {
    libraries: {
      mermaid: {
        run({ nodes }) {
          renderedNodes.push(...nodes)
        },
      },
    },
  })

  assert.equal(results[0].ok, true)
  assert.equal(renderedNodes.length, 1)
  assert.equal(renderedNodes[0].className, 'mermaid')
  assert.equal(renderedNodes[0].textContent, 'graph TD\nA --> B')
})

test('hydrateEmbeddedDiagrams requires a DOM root', async () => {
  await assert.rejects(
    () => hydrateEmbeddedDiagrams(undefined),
    /querySelectorAll/,
  )
})

test('hydrateEmbeddedDiagrams passes parsed diagram options to renderers', async () => {
  const vega = diagram('vega', '{}')
  vega.element.dataset.diagramOptions = '{"renderer":"svg"}'
  const root = {
    querySelectorAll() {
      return [vega.element]
    },
  }

  const results = await hydrateEmbeddedDiagrams(root, {
    renderers: {
      vega({ diagramOptions, output }) {
        output.textContent = diagramOptions.renderer
      },
    },
  })

  assert.equal(results[0].ok, true)
  assert.equal(vega.outputElement.textContent, 'svg')
})

test('hydrateEmbeddedDiagrams supports npm WaveDrom renderWaveForm API', async () => {
  const wavedrom = diagram('wavedrom', '{ signal: [] }')
  const root = {
    querySelectorAll() {
      return [wavedrom.element]
    },
  }
  const calls = []

  const results = await hydrateEmbeddedDiagrams(root, {
    libraries: {
      JSON5: {
        parse() {
          return { signal: [] }
        },
      },
      WaveDrom: {
        renderWaveForm(...args) {
          calls.push(args)
        },
      },
    },
  })

  assert.equal(results[0].ok, true)
  assert.equal(calls.length, 1)
  assert.equal(calls[0][2], 'WaveDrom_Display_')
})

test('hydrateEmbeddedDiagrams supports SvgBob render API', async () => {
  const svgbob = diagram('svgbob', 'A -> B')
  const root = {
    querySelectorAll() {
      return [svgbob.element]
    },
  }

  const results = await hydrateEmbeddedDiagrams(root, {
    libraries: {
      svgbob: {
        render(source) {
          return `<svg data-source="${source}"></svg>`
        },
      },
    },
  })

  assert.equal(results[0].ok, true)
  assert.equal(svgbob.outputElement.innerHTML, '<svg data-source="A -> B"></svg>')
})

test('hydrateEmbeddedDiagrams supports Pikchr loaded function API', async () => {
  const pikchr = diagram('pikchr', 'box')
  const root = {
    querySelectorAll() {
      return [pikchr.element]
    },
  }

  const results = await hydrateEmbeddedDiagrams(root, {
    libraries: {
      loadPikchr() {
        return (source) => `<svg data-source="${source}"></svg>`
      },
    },
  })

  assert.equal(results[0].ok, true)
  assert.equal(pikchr.outputElement.innerHTML, '<svg data-source="box"></svg>')
})

test('hydrateEmbeddedDiagrams supports GraphViz renderString API', async () => {
  const graphviz = diagram('graphviz', 'digraph { A -> B }')
  const root = {
    querySelectorAll() {
      return [graphviz.element]
    },
  }

  const results = await hydrateEmbeddedDiagrams(root, {
    libraries: {
      graphviz: {
        renderString(source) {
          return `<svg data-source="${source}"></svg>`
        },
      },
    },
  })

  assert.equal(results[0].ok, true)
  assert.equal(graphviz.outputElement.innerHTML, '<svg data-source="digraph { A -> B }"></svg>')
})



test('hydrateEmbeddedDiagrams supports Excalidraw exportToSvg API with a local fake library', async () => {
  const excalidraw = diagram('excalidraw', JSON.stringify({
    elements: [{ id: 'shape-1', type: 'rectangle' }],
    appState: { viewBackgroundColor: '#ffffff' },
    files: {},
  }))
  excalidraw.element.dataset.diagramOptions = '{"appState":{"exportBackground":false}}'
  const root = {
    querySelectorAll() {
      return [excalidraw.element]
    },
  }
  const calls = []

  const results = await hydrateEmbeddedDiagrams(root, {
    libraries: {
      excalidraw: {
        exportToSvg(options) {
          calls.push(options)
          return { svg: `<svg data-elements="${options.elements.length}" data-background="${options.appState.exportBackground}"></svg>` }
        },
      },
    },
  })

  assert.equal(results[0].ok, true)
  assert.equal(calls.length, 1)
  assert.deepEqual(calls[0].elements, [{ id: 'shape-1', type: 'rectangle' }])
  assert.equal(calls[0].appState.viewBackgroundColor, '#ffffff')
  assert.equal(calls[0].appState.exportBackground, false)
  assert.equal(excalidraw.outputElement.innerHTML, '<svg data-elements="1" data-background="false"></svg>')
})

test('hydrateEmbeddedDiagrams supports D2 libraries.d2.render API', async () => {
  const d2 = diagram('d2', 'x -> y')
  d2.element.dataset.diagramOptions = '{"sketch":true}'
  const root = {
    querySelectorAll() {
      return [d2.element]
    },
  }
  const calls = []

  const results = await hydrateEmbeddedDiagrams(root, {
    libraries: {
      d2: {
        render(source, options) {
          calls.push({ source, options })
          return `<svg data-source="${source}" data-sketch="${options.sketch}"></svg>`
        },
      },
    },
  })

  assert.equal(results[0].ok, true)
  assert.deepEqual(calls, [{ source: 'x -> y', options: { sketch: true } }])
  assert.equal(d2.outputElement.innerHTML, '<svg data-source="x -> y" data-sketch="true"></svg>')
})

test('hydrateEmbeddedDiagrams supports D2 lazy loading with libraries.loadD2', async () => {
  const d2 = diagram('d2', 'a -> b')
  const root = {
    querySelectorAll() {
      return [d2.element]
    },
  }
  let loadCount = 0

  const results = await hydrateEmbeddedDiagrams(root, {
    libraries: {
      async loadD2() {
        loadCount += 1
        return (source, options) => {
          assert.deepEqual(options, {})
          return `<svg data-source="${source}"></svg>`
        }
      },
    },
  })

  assert.equal(results[0].ok, true)
  assert.equal(loadCount, 1)
  assert.equal(d2.outputElement.innerHTML, '<svg data-source="a -> b"></svg>')
})

test('hydrateEmbeddedDiagrams reports missing D2 renderer', async () => {
  const d2 = diagram('d2', 'x -> y')
  const root = {
    querySelectorAll() {
      return [d2.element]
    },
  }

  const results = await hydrateEmbeddedDiagrams(root)

  assert.equal(results[0].ok, false)
  assert.equal(d2.outputElement.textContent, 'D2 renderer is not available.')
})

test('hydrateEmbeddedDiagrams supports D2 object SVG return value', async () => {
  const d2 = diagram('d2', 'x -> y')
  const root = {
    querySelectorAll() {
      return [d2.element]
    },
  }

  const results = await hydrateEmbeddedDiagrams(root, {
    libraries: {
      d2: {
        render() {
          return { svg: '<svg data-renderer="d2"></svg>' }
        },
      },
    },
  })

  assert.equal(results[0].ok, true)
  assert.equal(d2.outputElement.innerHTML, '<svg data-renderer="d2"></svg>')
})

test('hydrateEmbeddedDiagrams reports renderer failures in the output node', async () => {
  const plantuml = diagram('plantuml', 'Alice -> Bob')
  const root = {
    querySelectorAll() {
      return [plantuml.element]
    },
  }

  const results = await hydrateEmbeddedDiagrams(root, {
    renderers: {
      plantuml() {
        throw new Error('renderer exploded')
      },
    },
  })

  assert.equal(results.length, 1)
  assert.equal(results[0].ok, false)
  assert.equal(plantuml.outputElement.textContent, 'renderer exploded')
  assert.equal(plantuml.element.classList.has('kroki-embedded-failed'), true)
})

test('hydrateEmbeddedDiagrams reports missing built-in renderer libraries', async () => {
  const diagrams = [
    diagram('svgbob', 'A -> B'),
    diagram('pikchr', 'box'),
    diagram('graphviz', 'digraph { A -> B }'),
  ]
  const root = {
    querySelectorAll() {
      return diagrams.map(({ element }) => element)
    },
  }

  const results = await hydrateEmbeddedDiagrams(root)

  assert.equal(results.length, 3)
  assert.deepEqual(results.map((result) => result.ok), [false, false, false])
  assert.match(diagrams[0].outputElement.textContent, /SvgBob renderer is not available/)
  assert.match(diagrams[1].outputElement.textContent, /Pikchr renderer is not available/)
  assert.match(diagrams[2].outputElement.textContent, /GraphViz renderer is not available/)
})

test('installNetworkGuards disables browser network APIs', () => {
  const target = {
    navigator: {},
  }

  installNetworkGuards(target)

  for (const name of ['fetch', 'XMLHttpRequest', 'WebSocket', 'EventSource']) {
    assert.throws(() => target[name](), /disabled/)
  }
  assert.throws(() => target.navigator.sendBeacon(), /disabled/)
})
