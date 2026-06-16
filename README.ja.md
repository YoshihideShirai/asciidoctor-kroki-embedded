# asciidoctor-kroki-embedded

[English](README.md)

`asciidoctor-kroki-embedded` は、Kroki 互換の図表記法を扱う Asciidoctor.js 拡張です。Kroki サーバーには接続しません。

`asciidoctor/asciidoctor-kroki` と同じ形で登録できますが、ブロックプロセッサーとブロックマクロプロセッサーはリモート画像 URL ではなく、埋め込み HTML ターゲットを出力します。ホストアプリケーションは、そのターゲットをローカルレンダラーでハイドレートできます。たとえば `YoshihideShirai/asciidoc-local-preview-vscode` の VS Code 拡張では、Mermaid、PlantUML、Nomnoml、Vega、Vega-Lite、WaveDrom、Bytefield をこの方法で扱います。

## インストール

```sh
npm install github:YoshihideShirai/asciidoctor-kroki-embedded @asciidoctor/core
```

## 使い方

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

生成される出力は、意図的に実行性を持たない HTML です。

```html
<figure class="kroki-embedded kroki-embedded-mermaid kroki-format-svg" data-diagram-type="mermaid" data-diagram-format="svg">
  <pre class="kroki-embedded-source">graph TD...</pre>
  <div class="kroki-embedded-output"></div>
</figure>
```

## カスタムレンダラー

ホストアプリケーションは、独自のローカルプレビューターゲットを生成するレンダラーを指定できます。

```js
import { escapeHtml } from 'asciidoctor-kroki-embedded/html'

krokiEmbedded.register(registry, {
  diagramNames: ['mermaid', 'plantuml'],
  renderer({ diagramType, source }) {
    return `<div data-local-diagram="${escapeHtml(diagramType)}"><pre>${escapeHtml(source)}</pre></div>`
  },
})
```

## ブラウザーでのハイドレーション

このパッケージは、生成された図ターゲットをローカルに読み込まれたライブラリでレンダリングする、ブラウザー側のヘルパーも提供します。

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
    JSON5: window.JSON5,
  },
  renderers: {
    async plantuml({ source, output }) {
      output.innerHTML = await renderPlantUmlToSvg(source)
    },
  },
})
```

組み込みのハイドレーションは、ホストページが対応するローカルレンダラーライブラリまたは lazy loader を提供している場合に、Mermaid、Nomnoml、Vega、Vega-Lite、WaveDrom、Bytefield、SvgBob、Pikchr、GraphViz、D2 をサポートします。PlantUML と C4PlantUML は、ブラウザー向け PlantUML 実装の API がそれぞれ異なるため、注入されたレンダラーを使用できます。

このパッケージには、小さな任意のスタイルシートも含まれています。

```js
import 'asciidoctor-kroki-embedded/style.css'
```

ソースペイロードの非表示、SVG 出力のサイズ調整、レンダラーエラーの表示の出発点として使えます。

## Antora キャッシュアダプター

Antora 拡張では、任意のキャッシュアダプターを使って、サイトローカルのキャッシュディレクトリに
すでに存在する SVG ファイルを再利用できます。

```js
// antora-kroki-embedded-extension.mjs
import { createAntoraExtension } from 'asciidoctor-kroki-embedded/antora'

export default createAntoraExtension({
  defaultFormat: 'svg',
  diagramNames: ['mermaid', 'plantuml', 'graphviz'],
  cacheDir: '.asciidoc-local-preview-cache/diagrams',
  publicPath: '.asciidoc-local-preview-cache/diagrams',
})
```

`cacheDir` は Antora の変換中に読むディレクトリです。`publicPath` は、一致するキャッシュ済み SVG
ファイルが存在した場合に生成 HTML へ出力する URI prefix です。Antora のパイプラインでキャッシュ図を
別の場所に公開する場合は、`resolveCachedUri` でキャッシュファイルから最終的なサイト URI へ変換できます。

## Kroki とのサポート比較

Kroki サーバーのサポート状況は、公式 Kroki プロジェクトの README とドキュメントを基にしています。

- <https://github.com/yuzutech/kroki>
- <https://docs.kroki.io/kroki/diagram-types/>

`asciidoctor-kroki-embedded` には 2 つのサポート段階があります。

- `Embedded target`: Asciidoctor.js 拡張が図ブロックまたはブロックマクロを認識し、ホストアプリケーションがローカルでレンダリングするための実行性を持たない HTML を出力します。
- `Built-in hydration`: ホストが対応するローカルレンダラーライブラリを読み込んでいる場合、ブラウザーヘルパーが埋め込みターゲットをレンダリングできます。PlantUML と C4PlantUML は注入されたレンダラーが必要です。

| Diagram type | Kroki server | Embedded target | Built-in hydration | VS Code harness verified |
| --- | --- | --- | --- | --- |
| ActDiag | Yes | Yes | No | No |
| BlockDiag | Yes | Yes | No | No |
| BPMN | Yes | Yes | No | No |
| Bytefield | Yes | Yes | Yes | Yes |
| C4PlantUML | Yes | Yes | Injected PlantUML renderer | No |
| D2 | Yes | Yes | Yes | No |
| DBML | Yes | Yes | No | No |
| diagrams.net | Yes | Yes | No | No |
| Ditaa | Yes | Yes | No | No |
| Erd | Yes | Yes | No | No |
| Excalidraw | Yes | Yes | No | No |
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

このパッケージは、ローカルレンダラーが未対応の場合でも Kroki サーバーへフォールバックしません。追加の図種別をローカルレンダリングしたいホストは、独自のレンダラーを読み込み、登録時のカスタム `renderer` またはハイドレーション時のカスタムブラウザーレンダラーとして渡してください。D2 のハイドレーションでは、ホストがローカルの `d2`/`D2` レンダラーまたは `loadD2` lazy loader を提供する必要があります。D2 レンダラーライブラリ自体はこのパッケージにはバンドルされません。

## VS Code 検証ハーネス

このリポジトリには、`examples/vscode-preview` 配下に VS Code 拡張のサンプルが含まれています。
このサンプルは `fixtures/sample.adoc` をこのパッケージで変換し、バンドルされたローカルライブラリを使って、Webview 内で Mermaid、PlantUML、Nomnoml、Vega、Vega-Lite、WaveDrom、Bytefield、SvgBob、Pikchr、GraphViz の図をハイドレートします。
フィクスチャは、バンドル済みレンダラーごとのインラインブロックとローカル図マクロに加え、D2 レンダラーを提供するホスト向けの D2 インラインサンプル、ローカル画像レンダリング、ブロックされたリモート画像をカバーしています。

```sh
cd examples/vscode-preview
npm install
npm run build
code .
```

その後、拡張機能開発ホストを起動し、`fixtures/sample.adoc` を開いて `AsciiDoc: Open Kroki Embedded Preview` を実行します。

VS Code を手動で開かずに再現可能な検証を行うには、次を実行します。

```sh
cd examples/vscode-preview
npm run verify
```

verify コマンドは、ソースのネットワーク不使用監査、拡張と Webview バンドルのビルド、スタンドアロンプレビューの生成を行い、Playwright Chromium でデスクトップ幅と狭い幅の viewport を開きます。レンダラーのサマリーが DOM と一致しない場合、いずれかの図が失敗するか空の視覚ボックスとしてレンダリングされる場合、ローカル画像がレンダリングされない場合、リモート画像がデータプレースホルダーへ置き換えられない場合、バンドル前のネットワークガードが無効な場合、ブラウザーの警告やエラーが記録される場合、または `http`/`https` リクエストが観測される場合は失敗します。

## セキュリティ境界

`plantuml::diagram.puml[]` のようなブロックマクロは、AsciiDoc 文書のベースディレクトリ配下にあるローカル相対ファイルを読み込みます。リモート URL、絶対パス、文書ディレクトリ外へのパストラバーサルは拒否されます。

このパッケージ自体はブラウザーレンダラーライブラリを含まず、`fetch`、`http`、`https`、Kroki サーバーを使用しません。レンダリングは意図的に埋め込み先アプリケーションへ委ねており、埋め込み先が独自の CSP とローカルリソースポリシーを適用できます。

VS Code 検証ハーネスは、そのようなホスト境界の一例を示しています。Asciidoctor 変換は `safe: 'safe'` と `'allow-uri-read': false` で実行されます。Webview CSP は `default-src 'none'` から始まります。レンダラーバンドルの読み込み前にブラウザーネットワーク API がガードされます。ローカルリソースルートは拡張、ワークスペースフォルダー、現在の文書ディレクトリに制限されます。リモートプレビュー画像は、正確なホストおよびスキームの allowlist エントリーが設定されていない限り、デフォルトで置き換えられます。
