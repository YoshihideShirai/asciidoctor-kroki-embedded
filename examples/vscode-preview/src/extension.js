import path from 'node:path'
import * as vscode from 'vscode'
import * as asciidoctor from '@asciidoctor/core'
import krokiEmbedded from 'asciidoctor-kroki-embedded'
import { networkGuardScript } from './network-guard-html.js'
import {
  getPreviewImageCspSources,
  rewriteLocalImageSrc,
  rewritePreviewImages,
} from './preview-html.js'

let panel
let activeDocument
let outputChannel
let pendingUpdate
const livePreviewDelayMs = 150
const configurationSection = 'asciidoctor-kroki-embedded'
const allowedPreviewHostsSetting = 'allowedPreviewHosts'

export function activate(context) {
  outputChannel = vscode.window.createOutputChannel('Kroki Embedded Preview')
  context.subscriptions.push(
    outputChannel,
    vscode.commands.registerCommand('asciidoctor-kroki-embedded.preview', () => openPreview(context)),
    vscode.commands.registerCommand('asciidoctor-kroki-embedded.refresh', () => refreshPreview(context)),
    vscode.workspace.onDidChangeTextDocument((event) => {
      if (!activeDocument || event.document.uri.toString() !== activeDocument.uri.toString()) {
        return
      }
      schedulePreviewUpdate(context, event.document)
    }),
  )
}

export function deactivate() {
  clearPendingUpdate()
  panel?.dispose()
  panel = undefined
  activeDocument = undefined
}

function openPreview(context) {
  const editor = vscode.window.activeTextEditor
  if (!editor || !isAsciiDoc(editor.document)) {
    vscode.window.showWarningMessage('Open an AsciiDoc file before starting the Kroki Embedded preview.')
    return
  }

  if (!panel) {
    panel = vscode.window.createWebviewPanel(
      'asciidoctorKrokiEmbeddedPreview',
      'Kroki Embedded Preview',
      vscode.ViewColumn.Beside,
      {
        enableScripts: true,
        localResourceRoots: getLocalResourceRoots(context.extensionUri, editor.document),
        retainContextWhenHidden: true,
      },
    )
    panel.webview.onDidReceiveMessage((message) => {
      if (message?.type === 'render-result') {
        outputChannel?.appendLine(`[${new Date().toISOString()}] render-result ${JSON.stringify(message.result)}`)
        writeDiagramCacheEntries(activeDocument, message.result?.diagrams).catch((error) => {
          outputChannel?.appendLine(`[${new Date().toISOString()}] cache-write-error ${formatError(error)}`)
        })
      }
    })
    panel.onDidDispose(() => {
      clearPendingUpdate()
      panel = undefined
      activeDocument = undefined
    })
  }

  updatePreview(context, editor.document).catch((error) => {
    outputChannel?.appendLine(`[${new Date().toISOString()}] preview-error ${formatError(error)}`)
  })
  panel.reveal(vscode.ViewColumn.Beside)
}

function refreshPreview(context) {
  if (activeDocument) {
    updatePreview(context, activeDocument).catch((error) => {
      outputChannel?.appendLine(`[${new Date().toISOString()}] preview-error ${formatError(error)}`)
    })
    return
  }
  openPreview(context)
}

function schedulePreviewUpdate(context, document) {
  activeDocument = document
  clearPendingUpdate()
  pendingUpdate = setTimeout(() => {
    pendingUpdate = undefined
    updatePreview(context, document).catch((error) => {
      outputChannel?.appendLine(`[${new Date().toISOString()}] preview-error ${formatError(error)}`)
    })
  }, livePreviewDelayMs)
}

async function updatePreview(context, document) {
  if (!panel) {
    return
  }

  activeDocument = document
  panel.title = `Preview: ${path.basename(document.fileName)}`
  panel.webview.html = await renderPreview(context, panel.webview, document)
}

function clearPendingUpdate() {
  if (pendingUpdate) {
    clearTimeout(pendingUpdate)
    pendingUpdate = undefined
  }
}

function isAsciiDoc(document) {
  return document.languageId === 'asciidoc' || /\.(?:adoc|asciidoc|asc)$/i.test(document.fileName)
}

async function renderPreview(context, webview, document) {
  const nonce = createNonce()
  const allowedPreviewHosts = getAllowedPreviewHosts()
  const baseDir = getBaseDir(document)
  const cacheEntries = await readDiagramCacheEntries(document)
  const html = rewritePreviewImages(await convertAsciiDoc(document, cacheEntries), {
    allowedPreviewHosts,
    localImageResolver: baseDir ? (src) => rewriteLocalImageSrc(src, baseDir, (imagePath, rootDir) => {
      const decodedPath = decodeURIComponent(imagePath)
      return webview.asWebviewUri(vscode.Uri.file(path.resolve(rootDir, decodedPath))).toString()
    }) : undefined,
  })
  const webviewScript = webview.asWebviewUri(vscode.Uri.joinPath(context.extensionUri, 'dist', 'webview.js'))
  const cspSource = webview.cspSource
  const imageSources = getPreviewImageCspSources(cspSource, allowedPreviewHosts).join(' ')

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src ${imageSources}; style-src ${cspSource} 'unsafe-inline'; script-src ${cspSource} 'nonce-${nonce}' 'wasm-unsafe-eval';">
  <title>${escapeHtml(path.basename(document.fileName))}</title>
  <style>
    body {
      box-sizing: border-box;
      max-width: 980px;
      margin: 0 auto;
      padding: 24px;
      color: var(--vscode-editor-foreground);
      background: var(--vscode-editor-background);
      font-family: var(--vscode-font-family);
      line-height: 1.55;
    }

    pre {
      white-space: pre-wrap;
    }

    .kroki-embedded {
      margin: 1rem 0 1.5rem;
      padding: 16px;
      border: 1px solid var(--vscode-panel-border);
      border-radius: 6px;
      background: var(--vscode-editorWidget-background);
    }

    .kroki-embedded-source {
      display: none;
    }

    .kroki-embedded-output {
      overflow: auto;
    }

    .kroki-embedded-output svg,
    .mermaid svg {
      display: block;
      max-width: 100%;
      height: auto;
      margin: 0 auto;
    }

    .kroki-embedded > figcaption {
      margin-top: 0.5rem;
      text-align: center;
    }

    .kroki-embedded-error,
    .kroki-embedded-failed .kroki-embedded-output {
      color: var(--vscode-errorForeground);
      white-space: pre-wrap;
    }
  </style>
</head>
<body>
  <main>${html}</main>
  <script nonce="${nonce}">${networkGuardScript}</script>
  <script nonce="${nonce}" src="${webviewScript}"></script>
</body>
</html>`
}

function getAllowedPreviewHosts() {
  return vscode.workspace
    .getConfiguration(configurationSection)
    .get(allowedPreviewHostsSetting, [])
}

function getBaseDir(document) {
  if (document.uri.scheme !== 'file') {
    return undefined
  }

  return path.dirname(document.uri.fsPath)
}

function getLocalResourceRoots(extensionUri, document) {
  const roots = [
    extensionUri,
    ...(vscode.workspace.workspaceFolders?.map((folder) => folder.uri) || []),
  ]

  const baseDir = getBaseDir(document)
  if (baseDir) {
    roots.push(vscode.Uri.file(baseDir))
  }
  const cacheDir = getPreviewCacheDir(document)
  if (cacheDir) {
    roots.push(cacheDir)
  }

  return uniqueUris(roots)
}

function uniqueUris(uris) {
  const seen = new Set()
  return uris.filter((uri) => {
    const key = uri.toString()
    if (seen.has(key)) {
      return false
    }

    seen.add(key)
    return true
  })
}

async function convertAsciiDoc(document, cacheEntries) {
  const registry = asciidoctor.Extensions.create()
  krokiEmbedded.register(registry, {
    defaultFormat: 'svg',
    diagramCache: createDiagramCache(document, cacheEntries),
    diagramNames: [
      'mermaid',
      'plantuml',
      'nomnoml',
      'vega',
      'vegalite',
      'wavedrom',
      'bytefield',
      'svgbob',
      'pikchr',
      'graphviz',
      'd2',
    ],
  })

  return String(await asciidoctor.convert(document.getText(), {
    safe: 'safe',
    backend: 'html5',
    standalone: false,
    to_file: false,
    base_dir: getBaseDir(document),
    attributes: {
      'allow-uri-read': false,
      showtitle: true,
    },
    extension_registry: registry,
  }))
}

function createDiagramCache(document, cacheEntries = new Set()) {
  const cacheDir = getPreviewCacheDir(document)
  if (!cacheDir) {
    return undefined
  }

  return {
    rendererVersion: 'vscode-preview-local-svg-v1',
    getCachedUri({ diagramType, format, cacheKey }) {
      const cacheUri = getDiagramCacheUri(cacheDir, diagramType, format, cacheKey)
      if (!cacheEntries.has(cacheUri.toString())) {
        return undefined
      }

      return panel?.webview.asWebviewUri(cacheUri).toString()
    },
  }
}

async function writeDiagramCacheEntries(document, diagrams = []) {
  const cacheDir = getPreviewCacheDir(document)
  if (!cacheDir || !Array.isArray(diagrams)) {
    return
  }

  for (const diagram of diagrams) {
    if (
      !diagram?.cacheKey ||
      diagram.format !== 'svg' ||
      typeof diagram.outputHtml !== 'string' ||
      !diagram.outputHtml.trim().startsWith('<svg')
    ) {
      continue
    }

    const cacheUri = getDiagramCacheUri(cacheDir, diagram.type, diagram.format, diagram.cacheKey)
    await vscode.workspace.fs.createDirectory(cacheDir)
    await vscode.workspace.fs.writeFile(cacheUri, new TextEncoder().encode(diagram.outputHtml))
  }
}

async function readDiagramCacheEntries(document) {
  const cacheDir = getPreviewCacheDir(document)
  if (!cacheDir) {
    return new Set()
  }

  try {
    const entries = await vscode.workspace.fs.readDirectory(cacheDir)
    return new Set(entries.map(([name]) => vscode.Uri.joinPath(cacheDir, name).toString()))
  } catch {
    return new Set()
  }
}

function getPreviewCacheDir(document) {
  if (!document || document.uri.scheme !== 'file') {
    return undefined
  }

  const workspaceFolder = vscode.workspace.getWorkspaceFolder(document.uri)
  const rootUri = workspaceFolder?.uri || vscode.Uri.file(getBaseDir(document))
  return vscode.Uri.joinPath(rootUri, '.asciidoc-local-preview-cache', 'diagrams')
}

function getDiagramCacheUri(cacheDir, diagramType, format, cacheKey) {
  const safeType = String(diagramType || 'diagram').replace(/[^a-z0-9_-]/gi, '-').toLowerCase()
  return vscode.Uri.joinPath(cacheDir, `${safeType}-${cacheKey}.${format}`)
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function createNonce() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let value = ''
  for (let index = 0; index < 32; index += 1) {
    value += chars[Math.floor(Math.random() * chars.length)]
  }
  return value
}

function formatError(error) {
  return error instanceof Error ? error.message : String(error)
}
