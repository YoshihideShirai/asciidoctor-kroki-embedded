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

The preview should render Mermaid, PlantUML, Nomnoml, Vega, Vega-Lite, WaveDrom, and Bytefield without using a Kroki server. Edits to the active fixture refresh the preview automatically; `AsciiDoc: Refresh Kroki Embedded Preview` forces a redraw.

For an automated browser smoke check of the same Webview bundle:

```sh
npm run verify
```

The smoke check writes `dist/standalone-preview.html` and `dist/standalone-preview.png`, opens the preview in Playwright Chromium, and fails if any diagram reports a renderer error or any `http`/`https` request is observed.
