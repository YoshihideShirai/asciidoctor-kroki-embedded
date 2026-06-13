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

In the Extension Development Host, open `fixtures/sample.adoc` and run:

```text
AsciiDoc: Open Kroki Embedded Preview
```

The preview should render Mermaid, PlantUML, Nomnoml, Vega, Vega-Lite, WaveDrom, and Bytefield without using a Kroki server.

For an automated browser smoke check of the same Webview bundle:

```sh
npm run verify
```

The smoke check writes `dist/standalone-preview.html` and `dist/standalone-preview.png`, opens the preview in Playwright Chromium, and fails if any diagram reports a renderer error or any `http`/`https` request is observed.
