# asciidoctor-kroki-embedded

`asciidoctor-kroki-embedded` is an Asciidoctor.js extension for Kroki-compatible diagram syntax that does not contact a Kroki server.

It follows the same registration shape as `asciidoctor/asciidoctor-kroki`, but block and block macro processors emit embedded HTML targets instead of remote image URLs. A host application can then hydrate those targets with local renderers, like the VS Code extension in `YoshihideShirai/asciidoc-local-preview-vscode` does for Mermaid, PlantUML, Nomnoml, Vega, Vega-Lite, WaveDrom, and Bytefield.

## Install

```sh
npm install asciidoctor-kroki-embedded @asciidoctor/core
```

## Usage

```js
import asciidoctorFactory from '@asciidoctor/core'
import krokiEmbedded from 'asciidoctor-kroki-embedded'

const asciidoctor = asciidoctorFactory()
const registry = asciidoctor.Extensions.create()
krokiEmbedded.register(registry)

const html = asciidoctor.convert(`
[mermaid]
----
graph TD
  A --> B
----
`, {
  safe: 'safe',
  backend: 'html5',
  standalone: false,
  extension_registry: registry,
})
```

The generated output is intentionally inert HTML:

```html
<figure class="kroki-embedded kroki-embedded-mermaid kroki-format-svg" data-diagram-type="mermaid" data-diagram-format="svg">
  <pre class="kroki-embedded-source">graph TD...</pre>
  <div class="kroki-embedded-output"></div>
</figure>
```

## Custom Renderer

Host applications can provide a renderer to produce their own local preview target.

```js
import { escapeHtml } from 'asciidoctor-kroki-embedded/html'

krokiEmbedded.register(registry, {
  diagramNames: ['mermaid', 'plantuml'],
  renderer({ diagramType, source }) {
    return `<div data-local-diagram="${escapeHtml(diagramType)}"><pre>${escapeHtml(source)}</pre></div>`
  },
})
```

## Security Boundary

Block macros such as `plantuml::diagram.puml[]` read local relative files under the AsciiDoc document base directory. Remote URLs, absolute paths, and path traversal outside the document directory are rejected.

The extension itself does not include browser renderer libraries and does not use `fetch`, `http`, `https`, or a Kroki server. Rendering is deliberately left to the embedding application so it can enforce its own CSP and local-resource policy.
