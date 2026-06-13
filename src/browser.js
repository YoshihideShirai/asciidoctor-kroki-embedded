const DEFAULT_SELECTOR = '.kroki-embedded[data-diagram-type]'
const NETWORK_API_NAMES = ['fetch', 'XMLHttpRequest', 'WebSocket', 'EventSource']

function getGlobal(name) {
  return typeof globalThis !== 'undefined' ? globalThis[name] : undefined
}

function getTextContent(diagram) {
  const source = diagram.querySelector('.kroki-embedded-source')
  return source ? source.textContent || '' : ''
}

function getOutputElement(diagram) {
  return diagram.querySelector('.kroki-embedded-output')
}

function getDiagramType(diagram) {
  return diagram.dataset?.diagramType || diagram.getAttribute('data-diagram-type')
}

function getDiagramOptions(diagram) {
  const value = diagram.dataset?.diagramOptions || diagram.getAttribute('data-diagram-options')
  if (!value) {
    return {}
  }

  return JSON.parse(value)
}

function markRendered(diagram) {
  if (diagram.dataset) {
    diagram.dataset.rendered = 'true'
  } else {
    diagram.setAttribute('data-rendered', 'true')
  }
}

function markError(diagram, output, error) {
  const message = error instanceof Error ? error.message : String(error)
  diagram.classList?.add('kroki-embedded-failed')
  output.classList?.add('kroki-embedded-error')
  output.textContent = message
}

function blockedNetworkApi(name) {
  return () => {
    throw new Error(`${name} is disabled for local Kroki embedded rendering.`)
  }
}

export function installNetworkGuards(target = globalThis) {
  if (!target || typeof target !== 'object') {
    throw new Error('A global object is required.')
  }

  for (const name of NETWORK_API_NAMES) {
    try {
      Object.defineProperty(target, name, {
        value: blockedNetworkApi(name),
        configurable: false,
        writable: false,
      })
    } catch {
      target[name] = blockedNetworkApi(name)
    }
  }

  const navigator = target.navigator
  if (navigator && typeof navigator === 'object') {
    try {
      Object.defineProperty(navigator, 'sendBeacon', {
        value: blockedNetworkApi('sendBeacon'),
        configurable: false,
        writable: false,
      })
    } catch {
      navigator.sendBeacon = blockedNetworkApi('sendBeacon')
    }
  }
}

function parseLooseJson(value, json5 = getGlobal('JSON5')) {
  return json5 && typeof json5.parse === 'function'
    ? json5.parse(value)
    : JSON.parse(value)
}

function createSvgNode(document, jsonMl) {
  if (
    typeof jsonMl === 'string' ||
    typeof jsonMl === 'number' ||
    typeof jsonMl === 'boolean'
  ) {
    return document.createTextNode(String(jsonMl))
  }

  const [tagName, maybeAttrs, ...rest] = jsonMl
  const hasAttrs =
    maybeAttrs &&
    typeof maybeAttrs === 'object' &&
    !Array.isArray(maybeAttrs)
  const attrs = hasAttrs ? maybeAttrs : {}
  const children = hasAttrs ? rest : [maybeAttrs, ...rest]
  const node = document.createElementNS('http://www.w3.org/2000/svg', tagName)

  for (const [name, value] of Object.entries(attrs)) {
    if (value !== undefined && value !== null) {
      node.setAttribute(name, String(value))
    }
  }

  for (const child of children) {
    if (child !== undefined && child !== null) {
      node.appendChild(createSvgNode(document, child))
    }
  }

  return node
}

async function renderMermaid({ source, output, libraries }) {
  const mermaid = libraries.mermaid || getGlobal('mermaid')
  if (!mermaid) throw new Error('Mermaid renderer is not available.')

  output.textContent = ''
  const container = output.ownerDocument.createElement('pre')
  container.className = 'mermaid'
  container.textContent = source
  output.appendChild(container)

  if (typeof mermaid.run === 'function') {
    await mermaid.run({ nodes: [container] })
  } else if (typeof mermaid.init === 'function') {
    await mermaid.init(undefined, container)
  } else {
    throw new Error('Mermaid renderer does not expose run or init.')
  }
}

async function renderPlantUml({ source, output, libraries }) {
  const renderer =
    libraries.plantuml ||
    libraries.renderPlantUml ||
    getGlobal('renderPlantUml') ||
    getGlobal('renderPlantUML')
  if (!renderer) throw new Error('PlantUML renderer is not available.')

  const result = await renderer(source)
  output.innerHTML = result
}

function renderNomnoml({ source, output, libraries }) {
  const nomnoml = libraries.nomnoml || getGlobal('nomnoml')
  if (!nomnoml || typeof nomnoml.renderSvg !== 'function') {
    throw new Error('Nomnoml renderer is not available.')
  }
  output.innerHTML = nomnoml.renderSvg(source)
}

async function renderVega({ diagramType, source, output, libraries }) {
  const vega = libraries.vega || getGlobal('vega')
  const vegaLite = libraries.vegaLite || getGlobal('vegaLite')
  const interpreter = libraries.vegaInterpreter || getGlobal('vegaInterpreter')
  if (!vega || !interpreter) throw new Error('Vega renderer is not available.')
  if (diagramType === 'vegalite' && !vegaLite) {
    throw new Error('Vega-Lite compiler is not available.')
  }

  const spec = JSON.parse(source)
  const vegaSpec = diagramType === 'vegalite' ? vegaLite.compile(spec).spec : spec
  const runtime = vega.parse(vegaSpec, null, { ast: true })
  const view = new vega.View(runtime, {
    expr: interpreter.expressionInterpreter,
    renderer: 'svg',
  }).initialize(output)

  if (typeof view.hover === 'function') view.hover()
  await view.runAsync()
}

function renderWaveDrom({ source, output, libraries, index }) {
  const waveDrom = libraries.WaveDrom || getGlobal('WaveDrom')
  const renderWaveForm = waveDrom?.RenderWaveForm || waveDrom?.renderWaveForm
  if (typeof renderWaveForm !== 'function') {
    throw new Error('WaveDrom renderer is not available.')
  }

  const spec = parseLooseJson(source, libraries.JSON5)
  const prefix = 'WaveDrom_Display_'
  output.id = `${prefix}${index}`
  renderWaveForm(index, spec, prefix, false)
}

function renderBytefield({ source, output, libraries }) {
  const bitfield = libraries.bitfield || getGlobal('bitfield')
  if (!bitfield || typeof bitfield.render !== 'function') {
    throw new Error('Bytefield renderer is not available.')
  }

  const spec = parseLooseJson(source, libraries.JSON5)
  const fields = Array.isArray(spec) ? spec : spec.reg || spec.fields
  const options = Array.isArray(spec) ? {} : spec.options || {}
  if (!Array.isArray(fields)) {
    throw new Error('Bytefield source must be an array, or an object with a reg or fields array.')
  }

  output.replaceChildren(createSvgNode(output.ownerDocument, bitfield.render(fields, options)))
}

function getSvgString(result, rendererName) {
  if (typeof result === 'string') {
    return result
  }
  if (result && typeof result.svg === 'string') {
    return result.svg
  }
  throw new Error(`${rendererName} renderer did not return SVG output.`)
}

async function renderSvgBob({ source, output, libraries }) {
  const svgBob = libraries.svgbob || libraries.svgBob || getGlobal('svgbob') || getGlobal('svgBob')
  const render = typeof svgBob === 'function' ? svgBob : svgBob?.render
  if (typeof render !== 'function') {
    throw new Error('SvgBob renderer is not available.')
  }

  output.innerHTML = getSvgString(await render(source), 'SvgBob')
}

async function renderPikchr({ source, output, libraries }) {
  let pikchr =
    libraries.pikchr ||
    libraries.Pikchr ||
    getGlobal('pikchr') ||
    getGlobal('Pikchr')
  const loadPikchr = libraries.loadPikchr || getGlobal('loadPikchr')

  if (!pikchr && typeof loadPikchr === 'function') {
    pikchr = await loadPikchr()
  }

  const render = typeof pikchr === 'function' ? pikchr : pikchr?.render
  if (typeof render !== 'function') {
    throw new Error('Pikchr renderer is not available.')
  }

  output.innerHTML = getSvgString(await render(source), 'Pikchr')
}

async function renderGraphviz({ source, output, libraries }) {
  const graphviz =
    libraries.graphviz ||
    libraries.Graphviz ||
    libraries.viz ||
    libraries.Viz ||
    getGlobal('graphviz') ||
    getGlobal('Graphviz') ||
    getGlobal('viz') ||
    getGlobal('Viz')
  const render =
    typeof graphviz === 'function'
      ? graphviz
      : graphviz?.renderString || graphviz?.renderSvg || graphviz?.renderSVG
  if (typeof render !== 'function') {
    throw new Error('GraphViz renderer is not available.')
  }

  output.innerHTML = getSvgString(await render.call(graphviz, source, { format: 'svg' }), 'GraphViz')
}

const DEFAULT_RENDERERS = {
  mermaid: renderMermaid,
  plantuml: renderPlantUml,
  c4plantuml: renderPlantUml,
  nomnoml: renderNomnoml,
  vega: renderVega,
  vegalite: renderVega,
  wavedrom: renderWaveDrom,
  bytefield: renderBytefield,
  svgbob: renderSvgBob,
  pikchr: renderPikchr,
  graphviz: renderGraphviz,
}

export async function hydrateEmbeddedDiagrams(root = globalThis.document, options = {}) {
  if (!root || typeof root.querySelectorAll !== 'function') {
    throw new Error('A document or root element with querySelectorAll is required.')
  }

  const selector = options.selector || DEFAULT_SELECTOR
  const diagrams = Array.from(root.querySelectorAll(selector))
  const libraries = options.libraries || {}
  const renderers = { ...DEFAULT_RENDERERS, ...(options.renderers || {}) }
  const results = []

  for (const [index, diagram] of diagrams.entries()) {
    const diagramType = getDiagramType(diagram)
    const output = getOutputElement(diagram)
    const renderer = renderers[diagramType]

    if (!diagramType || !output || !renderer) {
      continue
    }

    try {
      await renderer({
        diagram,
        diagramType,
        diagramOptions: getDiagramOptions(diagram),
        source: getTextContent(diagram),
        output,
        libraries,
        index,
      })
      markRendered(diagram)
      results.push({ diagram, diagramType, ok: true })
    } catch (error) {
      markError(diagram, output, error)
      results.push({ diagram, diagramType, ok: false, error })
    }
  }

  return results
}

export { DEFAULT_RENDERERS, createSvgNode }
