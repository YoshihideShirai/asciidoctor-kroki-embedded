# asciidoctor-kroki-embedded

[日本語](README.ja.md)

`asciidoctor-kroki-embedded` is an Asciidoctor.js extension for Kroki-compatible diagram syntax that does not contact a Kroki server.

It follows the same registration shape as `asciidoctor/asciidoctor-kroki`, but block and block macro processors emit embedded HTML targets instead of remote image URLs. A host application can then hydrate those targets with local renderers, like the VS Code extension in `YoshihideShirai/asciidoc-local-preview-vscode` does for Mermaid, PlantUML, Nomnoml, Vega, Vega-Lite, WaveDrom, Bytefield, SvgBob, Pikchr, GraphViz, D2, and Excalidraw.

## Install

```sh
npm install github:YoshihideShirai/asciidoctor-kroki-embedded @asciidoctor/core
```

## Usage

```js
import * as asciidoctor from '@asciidoctor/core'
import krokiEmbedded from 'asciidoctor-kroki-embedded'

const registry = asciidoctor.Extensions.create()
krokiEmbedded.register(registry, {
  defaultFormat: 'svg',
})

const html = await asciidoctor.convert(`
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
  to_file: false,
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
import { installNetworkGuards } from 'asciidoctor-kroki-embedded/browser'

installNetworkGuards(globalThis)
await hydrateEmbeddedDiagrams(document, {
  libraries: {
    mermaid: window.mermaid,
    nomnoml: window.nomnoml,
    vega: window.vega,
    vegaLite: window.vegaLite,
    vegaInterpreter: window.vegaInterpreter,
    WaveDrom: window.WaveDrom,
    bitfield: window.bitfield,
    svgbob: window.svgbob,
    loadPikchr: window.loadPikchr,
    graphviz: window.graphviz,
    loadD2: window.loadD2,
    excalidraw: window.Excalidraw,
    JSON5: window.JSON5,
  },
  renderers: {
    async plantuml({ source, output }) {
      output.innerHTML = await renderPlantUmlToSvg(source)
    },
  },
})
```

Built-in hydration support covers Mermaid, Nomnoml, Vega, Vega-Lite, WaveDrom, Bytefield, SvgBob, Pikchr, GraphViz, D2, and Excalidraw when the host page provides the matching local libraries or lazy loaders. PlantUML and C4PlantUML can use an injected renderer because browser PlantUML implementations expose different APIs.

The package includes a small optional stylesheet:

```js
import 'asciidoctor-kroki-embedded/style.css'
```

Use it as a starting point for hiding source payloads, sizing SVG output, and presenting renderer errors.

## Antora Usage

Antora can load this package as an Asciidoctor extension through the playbook's `asciidoc.extensions` list.
Create an extension module next to your playbook and export the adapter returned by `createAntoraExtension`.

```js
// antora-kroki-embedded-extension.mjs
import { createAntoraExtension } from 'asciidoctor-kroki-embedded/antora'

const extension = createAntoraExtension({
  defaultFormat: 'svg',
  diagramNames: ['mermaid', 'plantuml', 'graphviz'],
  cacheDir: './supplemental-ui/diagram-cache',
  publicPath: '../_/diagram-cache',
})

export function register(registry, context) {
  extension.register(registry, context)
}
```

Register the module in `antora-playbook.yml`.

```yaml
asciidoc:
  extensions:
    - ./antora-kroki-embedded-extension.mjs
```

Then use Kroki-compatible diagram blocks in Antora pages as usual.

```asciidoc
[mermaid]
----
graph TD
  A[Antora page] --> B[asciidoctor-kroki-embedded]
----
```

The Antora adapter reuses SVG files that already exist in a site-local cache directory. `cacheDir` is the directory
Antora reads during conversion. `publicPath` is the URI prefix emitted into generated HTML when a matching cached SVG
file is present. If your Antora pipeline publishes cached diagrams somewhere else, provide `resolveCachedUri` to map
the cache file to the final site URI. See `examples/antora-demo` for a complete playbook and extension module.

## Support Compared With Kroki

Kroki server support is based on the official Kroki project README and documentation:

- <https://github.com/yuzutech/kroki>
- <https://docs.kroki.io/kroki/diagram-types/>

`asciidoctor-kroki-embedded` has two levels of support:

- `Embedded target`: the Asciidoctor.js extension recognizes the diagram block or block macro and emits inert HTML for a host application to render locally.
- `Built-in hydration`: the browser helper can render the embedded target when the host loads the matching local renderer libraries. PlantUML and C4PlantUML require an injected renderer.

| Diagram type | Kroki server | Embedded target | Built-in hydration | VS Code harness verified |
| --- | --- | --- | --- | --- |
| ActDiag | Yes | Yes | No | No |
| BlockDiag | Yes | Yes | No | No |
| BPMN | Yes | Yes | No | No |
| Bytefield | Yes | Yes | Yes | Yes |
| C4PlantUML | Yes | Yes | Injected PlantUML renderer | No |
| D2 | Yes | Yes | Yes | Yes |
| DBML | Yes | Yes | No | No |
| diagrams.net | Yes | Yes | No | No |
| Ditaa | Yes | Yes | No | No |
| Erd | Yes | Yes | No | No |
| Excalidraw | Yes | Yes | Yes | No |
| GoAT | Yes | No | No | No |
| GraphViz | Yes | Yes | Yes | Yes |
| Mermaid | Yes | Yes | Yes | Yes |
| Nomnoml | Yes | Yes | Yes | Yes |
| NwDiag | Yes | Yes | No | No |
| PacketDiag | Yes | Yes | No | No |
| Pikchr | Yes | Yes | Yes | Yes |
| PlantUML | Yes | Yes | Injected renderer | Yes |
| RackDiag | Yes | Yes | No | No |
| SeqDiag | Yes | Yes | No | No |
| Structurizr | Yes | Yes | No | No |
| SvgBob | Yes | Yes | Yes | Yes |
| Symbolator | Yes | Yes | No | No |
| TikZ | Yes | Yes | No | No |
| UMLet | Yes | Yes | No | No |
| Vega | Yes | Yes | Yes | Yes |
| Vega-Lite | Yes | Yes | Yes | Yes |
| WaveDrom | Yes | Yes | Yes | Yes |
| WireViz | Yes | Yes | No | No |

This package never falls back to the Kroki server for unsupported local renderers. Hosts that need local rendering for additional diagram types should load their own renderer and pass a custom `renderer` during registration or a custom browser renderer during hydration. D2 hydration expects the host to provide a local `d2`/`D2` renderer or a `loadD2` lazy loader; the VS Code validation harness bundles `@terrastruct/d2` as one example host renderer.

## VS Code Validation Harness

This repository includes a sample VS Code extension under `examples/vscode-preview`.
It converts `fixtures/sample.adoc` with this package and hydrates Mermaid, PlantUML, Nomnoml, Vega, Vega-Lite, WaveDrom, Bytefield, SvgBob, Pikchr, GraphViz, D2, and Excalidraw diagrams in a Webview using bundled local libraries.
The fixture covers inline blocks and local diagram macros for every bundled renderer, including D2, and covers local image rendering and blocked remote images.

```sh
cd examples/vscode-preview
npm install
npm run build
code .
```

Then launch the extension development host, open `fixtures/sample.adoc`, and run `AsciiDoc: Open Kroki Embedded Preview`.

For repeatable verification without opening VS Code manually:

```sh
cd examples/vscode-preview
npm run verify
```

The verify command runs a source no-network audit, builds the extension and Webview bundles, generates a standalone preview, and opens it in Playwright Chromium at desktop and narrow viewports. It fails if renderer summaries disagree with the DOM, any diagram fails or renders with an empty visual box, a local image fails to render, a remote image is not replaced with a data placeholder, the pre-bundle network guards are inactive, browser warnings/errors are logged, or any `http`/`https` request is observed.

## Security Boundary

Block macros such as `plantuml::diagram.puml[]` read local relative files under the AsciiDoc document base directory. Remote URLs, absolute paths, and path traversal outside the document directory are rejected.

The package itself does not include browser renderer libraries and does not use `fetch`, `http`, `https`, or a Kroki server. Rendering is deliberately left to the embedding application so it can enforce its own CSP and local-resource policy.

The VS Code validation harness demonstrates one such host boundary: Asciidoctor conversion runs with `safe: 'safe'` and `'allow-uri-read': false`, Webview CSP starts from `default-src 'none'`, browser network APIs are guarded before renderer bundles load, local resource roots are limited to the extension, workspace folders, and current document directory, and remote preview images are replaced by default unless an exact host/scheme allowlist entry is configured.
