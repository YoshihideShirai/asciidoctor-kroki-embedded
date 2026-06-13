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
