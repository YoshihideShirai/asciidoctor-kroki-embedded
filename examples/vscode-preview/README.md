# VS Code Preview Harness

This directory is a local validation harness for `asciidoctor-kroki-embedded`.

It opens an AsciiDoc document in a VS Code Webview, converts Kroki-compatible diagram blocks with the package under test, and hydrates them with bundled local renderers.

## Run

```sh
cd examples/vscode-preview
npm install
npm run build
code .
```

Use the `Run Kroki Embedded Preview` launch configuration. It builds the harness and opens an Extension Development Host with `fixtures/sample.adoc`.

In the Extension Development Host, run:

```text
AsciiDoc: Open Kroki Embedded Preview
```

The preview should render Mermaid, PlantUML, Nomnoml, Vega, Vega-Lite, WaveDrom, and Bytefield without using a Kroki server. The fixture covers both inline diagram blocks, local diagram macros such as `mermaid::diagrams/macro.mmd[]`, and local/remote image boundaries. Edits to the active fixture refresh the preview automatically; `AsciiDoc: Refresh Kroki Embedded Preview` forces a redraw.

Remote images are blocked by default and replaced with an empty local data image before the Webview renders. To allow specific remote image hosts while testing the Webview CSP path, set:

```json
{
  "asciidoctor-kroki-embedded.allowedPreviewHosts": [
    "example.com",
    "https://images.example.org"
  ]
}
```

Host-only entries allow both `https` and `http` images for that exact host. Scheme-qualified entries allow only that scheme. Paths, wildcards, credentials, queries, and fragments are ignored as invalid entries.

For an automated browser smoke check of the same Webview bundle:

```sh
npm run verify
```

The verify command first runs a no-network audit over the harness source and manifest, then writes `dist/standalone-preview.html` plus desktop/narrow screenshots, opens the preview in Playwright Chromium, and fails if the Webview render summary is missing, any diagram reports a renderer error, any diagram renders with an empty visual box, any browser warning/error is logged, or any `http`/`https` request is observed.
