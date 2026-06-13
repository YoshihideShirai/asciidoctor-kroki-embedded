export const blockedImageUri =
  'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw=='

export function rewriteRemoteImages(html) {
  return html.replace(/(<img\b[^>]*\bsrc=")([^"]+)(")/gi, (_match, before, src, after) => {
    if (/^(?:https?:|ftp:|\/\/)/i.test(src)) {
      return `${before}${blockedImageUri}${after}`
    }
    return `${before}${src}${after}`
  })
}
