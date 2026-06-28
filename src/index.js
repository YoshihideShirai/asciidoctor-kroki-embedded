import fs from 'node:fs'
import path from 'node:path'
import { DEFAULT_DIAGRAM_NAMES } from './diagram-names.js'
import { defaultRenderer, errorRenderer } from './html.js'

function isPromiseLike(value) {
  return value && typeof value.then === 'function'
}

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
  if (isPromiseLike(substituted)) {
    return substituted.then((resolved) => normalizeSubstitutedMacroTarget(parent, resolved))
  }
  return normalizeSubstitutedMacroTarget(parent, substituted)
}

function normalizeSubstitutedMacroTarget(parent, substituted) {
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

function createPassBlock(processor, parent, html, attrs) {
  return processor.createBlock(parent, 'pass', html, attrs)
}

function renderPass(processor, parent, diagramType, source, attrs, renderer, options) {
  const render = (resolvedSource) => renderer({
    diagramType,
    source: resolvedSource,
    attrs,
    document: parent.getDocument(),
    options,
  })
  const substitutedSource = applySubs(parent, source, attrs.subs)
  if (isPromiseLike(substitutedSource)) {
    return substitutedSource
      .then(render)
      .then((html) => createPassBlock(processor, parent, html, attrs))
  }
  const html = render(substitutedSource)
  if (isPromiseLike(html)) {
    return html.then((resolvedHtml) => createPassBlock(processor, parent, resolvedHtml, attrs))
  }
  return createPassBlock(processor, parent, html, attrs)
}

function registerDiagramBlock(registry, diagramType, renderer, options) {
  registry.block(diagramType, function () {
    this.onContext(['listing', 'literal'])
    this.positionalAttributes(['target', 'format'])
    this.process(function (parent, reader, attrs) {
      const source = reader.read()
      if (isPromiseLike(source)) {
        return source.then((resolvedSource) => renderPass(this, parent, diagramType, resolvedSource, attrs, renderer, options))
      }
      return renderPass(this, parent, diagramType, source, attrs, renderer, options)
    })
  })
}

function registerDiagramMacro(registry, diagramType, renderer, options) {
  registry.blockMacro(diagramType, function () {
    this.positionalAttributes(['format'])
    this.process(function (parent, target, attrs) {
      try {
        const normalizedTarget = normalizeMacroTarget(parent, target)
        if (isPromiseLike(normalizedTarget)) {
          return normalizedTarget
            .then((resolvedTarget) => fs.readFileSync(resolvedTarget, 'utf8'))
            .then((source) => renderPass(this, parent, diagramType, source, attrs, renderer, options))
            .catch((error) => {
              const message = error instanceof Error ? error.message : String(error)
              return this.createBlock(
                parent,
                'pass',
                errorRenderer({ diagramType, message }),
                attrs,
              )
            })
        }
        const source = fs.readFileSync(normalizedTarget, 'utf8')
        return renderPass(this, parent, diagramType, source, attrs, renderer, options)
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
    registerDiagramBlock(registry, diagramType, renderer, options)
    registerDiagramMacro(registry, diagramType, renderer, options)
  }

  return registry
}

export { DEFAULT_DIAGRAM_NAMES, defaultRenderer, errorRenderer }
export { createDiagramCacheKey } from './html.js'

export default { register }
