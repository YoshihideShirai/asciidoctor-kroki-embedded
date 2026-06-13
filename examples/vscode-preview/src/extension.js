import path from 'node:path'
import * as vscode from 'vscode'
import asciidoctorFactory from '@asciidoctor/core'
import krokiEmbedded from 'asciidoctor-kroki-embedded'

let panel

export function activate(context) {
  context.subscriptions.push(
    vscode.commands.registerCommand('asciidoctor-kroki-embedded.preview', () => openPreview(context)),
  )
}

export function deactivate() {
  panel?.dispose()
  panel = undefined
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
        localResourceRoots: [
          context.extensionUri,
          vscode.Uri.file(path.dirname(editor.document.uri.fsPath)),
        ],
        retainContextWhenHidden: true,
      },
    )
    panel.onDidDispose(() => {
      panel = undefined
    })
  }

  panel.title = `Preview: ${path.basename(editor.document.fileName)}`
  panel.webview.html = renderPreview(context, panel.webview, editor.document)
  panel.reveal(vscode.ViewColumn.Beside)
}

function isAsciiDoc(document) {
  return document.languageId === 'asciidoc' || /\.(?:adoc|asciidoc|asc)$/i.test(document.fileName)
}

function renderPreview(context, webview, document) {
  const nonce = createNonce()
  const html = convertAsciiDoc(document)
  const webviewScript = webview.asWebviewUri(vscode.Uri.joinPath(context.extensionUri, 'dist', 'webview.js'))
  const cspSource = webview.cspSource

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src ${cspSource} data:; style-src ${cspSource} 'unsafe-inline'; script-src ${cspSource} 'nonce-${nonce}' 'wasm-unsafe-eval';">
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
  <script nonce="${nonce}" src="${webviewScript}"></script>
</body>
</html>`
}

function convertAsciiDoc(document) {
  const asciidoctor = asciidoctorFactory()
  const registry = asciidoctor.Extensions.create()
  krokiEmbedded.register(registry, {
    defaultFormat: 'svg',
    diagramNames: ['mermaid', 'plantuml', 'nomnoml', 'vega', 'vegalite', 'wavedrom', 'bytefield'],
  })

  return String(asciidoctor.convert(document.getText(), {
    safe: 'safe',
    backend: 'html5',
    standalone: false,
    base_dir: path.dirname(document.fileName),
    attributes: {
      'allow-uri-read': false,
      showtitle: true,
    },
    extension_registry: registry,
  }))
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
