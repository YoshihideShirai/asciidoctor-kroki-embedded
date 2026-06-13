import fs from 'node:fs'
import path from 'node:path'
import { DEFAULT_DIAGRAM_NAMES } from './diagram-names.js'
import { defaultRenderer, errorRenderer } from './html.js'

function applySubs(parent, value, subs) {
  if (!subs || typeof parent.applySubs !== 'function') {
    return value
  }
  return parent.applySubs(value, parent.resolveSubs(subs))
}

export function normalizeMacroTarget(parent, target) {
  const substituted = typeof parent.applySubs === 'function'
    ? parent.applySubs(target, ['attributes'])
    : target
  if (/^(?:[a-z][a-z0-9+.-]*:|\/\/)/i.test(substituted)) {
    throw new Error(`Remote diagram macro targets are disabled: ${substituted}`)
  }
  if (path.isAbsolute(substituted)) {
    throw new Error(`Absolute diagram macro targets are disabled: ${substituted}`)
  }

  const doc = parent.getDocument()
  const baseDir = doc.getBaseDir() || process.cwd()
  const resolvedBaseDir = path.resolve(baseDir)
  const resolvedTarget = path.resolve(resolvedBaseDir, substituted)
  const relativeTarget = path.relative(resolvedBaseDir, resolvedTarget)

  if (relativeTarget.startsWith('..') || path.isAbsolute(relativeTarget)) {
    throw new Error(`Diagram macro target is outside the document directory: ${substituted}`)
  }

  return resolvedTarget
}

function renderPass(processor, parent, diagramType, source, attrs, renderer) {
  const html = renderer({
    diagramType,
    source: applySubs(parent, source, attrs.subs),
    attrs,
    document: parent.getDocument(),
  })
  return processor.createBlock(parent, 'pass', html, attrs)
}

function registerDiagramBlock(registry, diagramType, renderer) {
  registry.block(diagramType, function () {
    this.onContext(['listing', 'literal'])
    this.positionalAttributes(['target', 'format'])
    this.process(function (parent, reader, attrs) {
      return renderPass(this, parent, diagramType, reader.read(), attrs, renderer)
    })
  })
}

function registerDiagramMacro(registry, diagramType, renderer) {
  registry.blockMacro(diagramType, function () {
    this.positionalAttributes(['format'])
    this.process(function (parent, target, attrs) {
      try {
        const source = fs.readFileSync(normalizeMacroTarget(parent, target), 'utf8')
        return renderPass(this, parent, diagramType, source, attrs, renderer)
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        return this.createBlock(
          parent,
          'pass',
          errorRenderer({ diagramType, message }),
          attrs,
        )
      }
    })
  })
}

export function register(registry, options = {}) {
  const diagramNames = options.diagramNames || DEFAULT_DIAGRAM_NAMES
  const renderer = options.renderer || defaultRenderer

  for (const diagramType of diagramNames) {
    registerDiagramBlock(registry, diagramType, renderer)
    registerDiagramMacro(registry, diagramType, renderer)
  }

  return registry
}

export { DEFAULT_DIAGRAM_NAMES, defaultRenderer, errorRenderer }

export default { register }
