export const blockedImageUri =
  'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw=='

export function rewritePreviewImages(html, options = {}) {
  const allowedHosts = normalizeAllowedPreviewHosts(options.allowedPreviewHosts || [])
  const localImageResolver = options.localImageResolver

  return html.replace(/(<img\b[^>]*\bsrc=")([^"]+)(")/gi, (_match, before, src, after) => {
    if (/^(?:https?:|ftp:|\/\/)/i.test(src)) {
      const allowedRemoteSrc = getAllowedRemoteImageSrc(src, allowedHosts)
      if (allowedRemoteSrc) {
        return `${before}${allowedRemoteSrc}${after}`
      }

      return `${before}${blockedImageUri}${after}`
    }

    if (/^(?:[a-z][a-z0-9+.-]*:|#)/i.test(src) || typeof localImageResolver !== 'function') {
      return `${before}${src}${after}`
    }

    return `${before}${localImageResolver(src)}${after}`
  })
}

export function rewriteRemoteImages(html, options = {}) {
  return rewritePreviewImages(html, options)
}

export function getPreviewImageCspSources(cspSource, allowedPreviewHosts = []) {
  return [
    cspSource,
    'data:',
    ...normalizeAllowedPreviewHosts(allowedPreviewHosts)
      .flatMap((host) => host.schemes.map((scheme) => `${scheme}://${host.host}`)),
  ]
}

export function getAllowedRemoteImageSrc(src, allowedHosts) {
  const normalizedSrc = src.startsWith('//') ? `https:${src}` : src
  let url

  try {
    url = new URL(normalizedSrc)
  } catch {
    return undefined
  }

  const scheme = url.protocol.slice(0, -1).toLowerCase()
  if (scheme !== 'http' && scheme !== 'https') {
    return undefined
  }

  const hostname = url.hostname.toLowerCase()
  const port = url.port

  for (const allowedHost of allowedHosts) {
    if (
      allowedHost.hostname === hostname &&
      allowedHost.port === port &&
      allowedHost.schemes.includes(scheme)
    ) {
      return normalizedSrc
    }
  }

  return undefined
}

export function normalizeAllowedPreviewHosts(values) {
  return values.flatMap((value) => {
    const host = parseAllowedPreviewHost(value)
    return host ? [host] : []
  }).filter((host, index, hosts) => (
    hosts.findIndex((other) => other.host === host.host && other.schemes.join(',') === host.schemes.join(',')) === index
  ))
}

export function parseAllowedPreviewHost(value) {
  const trimmed = String(value).trim()
  if (!trimmed || /[*\s]/.test(trimmed)) {
    return undefined
  }

  const hasScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed)
  const valueAsUrl = hasScheme ? trimmed : `https://${trimmed}`
  let url

  try {
    url = new URL(valueAsUrl)
  } catch {
    return undefined
  }

  const scheme = url.protocol.slice(0, -1).toLowerCase()
  if (
    (hasScheme && scheme !== 'http' && scheme !== 'https') ||
    url.username ||
    url.password ||
    url.pathname !== '/' ||
    url.search ||
    url.hash
  ) {
    return undefined
  }

  const hostname = url.hostname.toLowerCase()
  if (!hostname) {
    return undefined
  }

  const port = url.port
  const host = port ? `${hostname}:${port}` : hostname
  const schemes = hasScheme ? [scheme] : ['https', 'http']

  return { host, hostname, port, schemes }
}

export function splitUriSuffix(src) {
  const match = /^([^?#]*)(.*)$/.exec(src)
  return {
    path: match?.[1] || '',
    suffix: match?.[2] || '',
  }
}

export function rewriteLocalImageSrc(src, baseDir, toWebviewUri) {
  const parsed = splitUriSuffix(src)
  const imageUri = toWebviewUri(parsed.path, baseDir)
  return `${imageUri}${parsed.suffix}`
}
