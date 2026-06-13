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
krokiEmbedded.register(registry, {
  defaultFormat: 'svg',
})

const html = asciidoctor.convert(`
:kroki-default-format: svg

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

## Browser Hydration

The package also exposes a browser-side helper that renders generated diagram targets with locally loaded libraries.

```js
import { hydrateEmbeddedDiagrams } from 'asciidoctor-kroki-embedded/browser'

await hydrateEmbeddedDiagrams(document, {
  libraries: {
    mermaid: window.mermaid,
    nomnoml: window.nomnoml,
    vega: window.vega,
    vegaLite: window.vegaLite,
    vegaInterpreter: window.vegaInterpreter,
    WaveDrom: window.WaveDrom,
    bitfield: window.bitfield,
    JSON5: window.JSON5,
  },
  renderers: {
    async plantuml({ source, output }) {
      output.innerHTML = await renderPlantUmlToSvg(source)
    },
  },
})
```

Built-in hydration support covers Mermaid, Nomnoml, Vega, Vega-Lite, WaveDrom, and Bytefield when those libraries are already loaded by the host page. PlantUML and C4PlantUML use an injected renderer because browser PlantUML implementations expose different APIs.

The package includes a small optional stylesheet:

```js
import 'asciidoctor-kroki-embedded/style.css'
```

Use it as a starting point for hiding source payloads, sizing SVG output, and presenting renderer errors.

## VS Code Validation Harness

This repository includes a sample VS Code extension under `examples/vscode-preview`.
It converts `fixtures/sample.adoc` with this package and hydrates Mermaid, PlantUML, Nomnoml, Vega, Vega-Lite, WaveDrom, and Bytefield diagrams in a Webview using bundled local libraries.

```sh
cd examples/vscode-preview
npm install
npm run build
code .
```

Then launch the extension development host, open `fixtures/sample.adoc`, and run `AsciiDoc: Open Kroki Embedded Preview`.

## Security Boundary

Block macros such as `plantuml::diagram.puml[]` read local relative files under the AsciiDoc document base directory. Remote URLs, absolute paths, and path traversal outside the document directory are rejected.

The extension itself does not include browser renderer libraries and does not use `fetch`, `http`, `https`, or a Kroki server. Rendering is deliberately left to the embedding application so it can enforce its own CSP and local-resource policy.
