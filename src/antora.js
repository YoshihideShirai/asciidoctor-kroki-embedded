import fs from 'node:fs'
import path from 'node:path'
import { register as registerKrokiEmbedded } from './index.js'

const DEFAULT_CACHE_DIR = '.asciidoc-local-preview-cache/diagrams'
const DEFAULT_PUBLIC_PATH = '.asciidoc-local-preview-cache/diagrams'
const DEFAULT_RENDERER_VERSION = 'antora-local-svg-v1'

function normalizePublicPath(value) {
  return String(value || '')
    .replace(/\\/g, '/')
    .replace(/\/+$/, '')
}

export function createDiagramCacheFilename({ diagramType, format, cacheKey }) {
  const safeType = String(diagramType || 'diagram').replace(/[^a-z0-9_-]/gi, '-').toLowerCase()
  return `${safeType}-${cacheKey}.${format}`
}

export function createAntoraDiagramCache({
  cacheDir = DEFAULT_CACHE_DIR,
  publicPath = DEFAULT_PUBLIC_PATH,
  rendererVersion = DEFAULT_RENDERER_VERSION,
  resolveCachedUri,
} = {}) {
  const resolvedCacheDir = path.resolve(cacheDir)
  const normalizedPublicPath = normalizePublicPath(publicPath)

  return {
    rendererVersion,
    getCachedUri(cacheEntry) {
      const filename = createDiagramCacheFilename(cacheEntry)
      const cachePath = path.join(resolvedCacheDir, filename)
      if (!fs.existsSync(cachePath)) {
        return undefined
      }

      if (typeof resolveCachedUri === 'function') {
        return resolveCachedUri({ ...cacheEntry, cacheDir: resolvedCacheDir, cachePath, filename })
      }

      return normalizedPublicPath ? `${normalizedPublicPath}/${filename}` : filename
    },
  }
}

export function createAntoraExtension(options = {}) {
  return {
    register(registry, context = {}) {
      const cache = options.diagramCache || createAntoraDiagramCache({
        cacheDir: options.cacheDir,
        publicPath: options.publicPath,
        rendererVersion: options.rendererVersion,
        resolveCachedUri: options.resolveCachedUri,
        context,
      })

      registerKrokiEmbedded(registry, {
        ...options,
        diagramCache: cache,
      })
    },
  }
}

export default { createAntoraDiagramCache, createAntoraExtension, createDiagramCacheFilename }
