# Renderer support plan

このメモは、Excalidraw を built-in hydration に追加する前の実調査結果と判断材料を残すためのものです。

## Excalidraw built-in hydration 調査メモ

### 実調査サマリー

2026-06-14 に以下を確認しました。

- Kroki 公式ドキュメントと README で、Excalidraw が Kroki の diagram type として公開されていることを確認した。
- Kroki の公開 API `https://kroki.io/excalidraw/svg` に最小 `.excalidraw` JSON を `Content-Type: text/plain` で POST し、`200 OK` / `image/svg+xml` と SVG 本文を返すことを確認した。
- `npm view @excalidraw/excalidraw@latest` で最新版が `0.18.1`、peer dependency が `react` / `react-dom` であること、package export は root と `index.css` であることを確認した。
- `npm pack @excalidraw/excalidraw@latest` で tarball を展開し、型定義上 `exportToSvg` が公開され、`files`, `skipInliningFonts`, `reuseImages` などの引数を取ることを確認した。
- Node.js で `@excalidraw/excalidraw` を直接 dynamic import すると、依存の `open-color/open-color.json` に import attribute が必要で失敗した。これはブラウザー bundler では解決される可能性があるが、このパッケージの built-in hydration が「ホスト提供ライブラリを呼ぶだけ」に留めるべき理由になる。

### 結論

現時点では、Excalidraw は built-in hydration に直ちに追加せず、まず custom renderer のサンプルに留めるのが安全です。Kroki の `excalidraw` 入力は実際に `.excalidraw` と同じ plaintext JSON scene で SVG 化でき、ブラウザー側 Excalidraw API も scene の `elements`, `appState`, `files` を受け取る SVG export API を公開しています。一方で、パッケージの React 依存、CSS/font assets、画像 files の data URL 制約、Node 直 import の失敗、`installNetworkGuards` 下での browser-bundle 実行検証が未完了です。

### 1. Kroki の `excalidraw` 入力形式とブラウザー側 JSON 形式

- Kroki は Excalidraw を diagram type として公開している。
- 実際に以下の最小 JSON を Kroki の SVG endpoint へ POST したところ SVG が返ったため、Kroki の `excalidraw` 入力は plaintext の `.excalidraw` JSON とみなせる。

```json
{
  "type": "excalidraw",
  "version": 2,
  "source": "https://excalidraw.com",
  "elements": [
    {
      "id": "rect1",
      "type": "rectangle",
      "x": 10,
      "y": 10,
      "width": 100,
      "height": 60,
      "angle": 0,
      "strokeColor": "#1e1e1e",
      "backgroundColor": "transparent",
      "fillStyle": "solid",
      "strokeWidth": 2,
      "strokeStyle": "solid",
      "roughness": 1,
      "opacity": 100,
      "groupIds": [],
      "frameId": null,
      "roundness": null,
      "seed": 1,
      "version": 1,
      "versionNonce": 1,
      "isDeleted": false,
      "boundElements": null,
      "updated": 1,
      "link": null,
      "locked": false
    }
  ],
  "appState": { "viewBackgroundColor": "#ffffff" },
  "files": {}
}
```

- Kroki から返った SVG には `<!-- svg-source:excalidraw -->` が含まれ、`viewBox="0 0 120 80"` の SVG として出力された。
- Excalidraw 公式の JSON schema documentation も `.excalidraw` file format のトップレベル属性として `type`, `version`, `source`, `elements`, `appState`, `files` を示している。
- したがって、形式は実用上一致している。hydration 実装候補は `JSON.parse(source)` 後に `elements`, `appState`, `files` を `exportToSvg` へ渡す形になる。
- ただし、Kroki がどこまで古い scene version や clipboard 形式 `type: "excalidraw/clipboard"` を許容するかは未確認。built-in 化するなら、このパッケージ側では `.excalidraw` file format のみを受け、clipboard 形式は明示的に custom renderer 側へ逃がす方が安全です。

### 2. SVG 出力 API

- `@excalidraw/excalidraw@0.18.1` の型定義で、root export に `exportToSvg` が含まれることを確認した。
- 型定義上の signature は概ね `exportToSvg({ elements, appState, files, exportPadding, renderEmbeddables, exportingFrame, skipInliningFonts, reuseImages })` です。
- 公式 docs の Export Utilities も `exportToCanvas` / `exportToSvg` 系の utility が `elements`, `appState`, `files` を入力にすることを示している。
- 注意点: Node.js で root module を直接 import すると JSON import attribute エラーで失敗した。built-in hydration が package を直接 import する設計ではなく、既存 renderer と同じく `libraries.excalidraw` または `loadExcalidraw` としてホストが bundling 済み export utility を渡す設計にする必要があります。

### 3. 画像 assets / fonts / theme / background の扱い

- 画像は Excalidraw scene の `files` に入り、型定義では `BinaryFiles = Record<ExcalidrawElement["id"], BinaryFileData>`、`BinaryFileData` は `id`, `mimeType`, `dataURL`, `created`, `lastRetrieved` を持つ。
- 公式 JSON schema documentation でも `files` は image element 用の data object とされ、例では `data:image/png;base64,...` の `dataURL` が使われている。
- built-in hydration に入れる場合、`files` は `data:` URL のみ許可する。`http:`, `https:`, `file:`, protocol-relative URL は拒否する。
- `exportToSvg` の型定義には `skipInliningFonts` があるため、フォントの埋め込み挙動を制御できる可能性がある。ただし、Excalidraw は Virgil などのフォントに依存し、型定義には font face の fetch API も存在する。ホストがローカル font/CSS を確実に同梱するまでは built-in には入れない。
- theme/background は scene の `appState` を尊重する。最低限確認すべき属性は `exportBackground`, `viewBackgroundColor`, `exportWithDarkMode`, `exportEmbedScene`。
- `exportEmbedScene` は出力 SVG に scene metadata を埋め込む機能に関わるため、hydration の表示用途では既定で `false` 相当を推奨する。将来 custom renderer サンプルではホストが明示的に選べるようにする。

### 4. ネットワークアクセスなしで完結できるか

- Kroki API での検証はネットワーク越しのサーバーレンダリング確認に過ぎず、ローカル hydration の無通信性を保証しない。
- ローカルで完結できる条件は、scene JSON、`files` の `data:` URL、Excalidraw export utility bundle、CSS、font assets がすべてホストに同梱されていること。
- `npm pack` した package の型定義から、フォント取得用の `fetchFont(url: URL | DataURL)` が存在することを確認した。URL font を使う経路があるなら `installNetworkGuards` と衝突するため、built-in 化前に browser harness で検証が必要です。
- SVG 出力後も `<image href="http...">`, `<use href="http...">`, CSS `url(http...)` のような外部参照が残っていないことを検査する必要があります。

### 5. `installNetworkGuards` との併用

- 既存の `installNetworkGuards` は `fetch`, `XMLHttpRequest`, `WebSocket`, `EventSource`, `navigator.sendBeacon` を禁止する。
- Excalidraw export が `data:` URL と既にロード済み font/CSS だけを使うなら併用可能なはずだが、型定義上 font fetch 経路が存在するため未検証です。
- built-in hydration 昇格条件として、`installNetworkGuards(globalThis)` を renderer bundle より先に有効化した状態で、以下を含む fixture が成功することを必須にする。
  - basic shape
  - text / font fallback
  - image element with `files` data URL
  - `exportBackground: true/false`
  - `exportWithDarkMode: true/false`
  - `exportEmbedScene: false`

### 6. built-in hydration に入れるか、custom renderer のサンプルに留めるか

推奨は custom renderer サンプルから始める段階的対応です。

1. まず custom renderer サンプルとして追加する。
   - ホストが `@excalidraw/excalidraw`、React peer dependency、bundler 設定、CSS、フォント、画像 policy を自分で管理できる。
   - Node 直 import が失敗することを考えると、このパッケージが Excalidraw package を直接 import する built-in 実装は避ける。
   - このパッケージの「renderer library は同梱しない」「ネットワークへフォールバックしない」という境界を維持しやすい。
2. built-in hydration へ昇格する場合も、実装はホスト注入 API に限定する。
   - `libraries.excalidraw.exportToSvg` または `libraries.loadExcalidraw()` を受ける。
   - `JSON.parse(source)` 後、`type === "excalidraw"`、`Array.isArray(elements)`、`appState` と `files` が object または未指定であることを検証する。
   - `files[*].dataURL` は `data:` URL のみ許可する。
   - renderer bundle をホストがローカル同梱し、`installNetworkGuards` 有効下の Playwright request 監視で `http`/`https` が発生しないことを確認する。
   - `exportToSvg` の戻り値は `SVGElement` または SVG 文字列に限定し、挿入前に外部 URL 参照を拒否する。

### 調査コマンド

```sh
curl -L --silent https://docs.kroki.io/kroki/diagram-types/ | rg -n -i "excalidraw|Diagram Type|Output formats" -C 3
curl -L --silent https://raw.githubusercontent.com/yuzutech/kroki/main/README.adoc | rg -n -i "excalidraw" -C 3
curl -sS -D /tmp/kroki.headers -o /tmp/kroki.svg -X POST -H 'Content-Type: text/plain' --data-binary @/tmp/min.excalidraw https://kroki.io/excalidraw/svg
npm view @excalidraw/excalidraw@latest version peerDependencies dependencies exports --json
npm pack @excalidraw/excalidraw@latest
rg -n "exportToSvg|ExportOpts|BinaryFiles|BinaryFileData|DataURL|fetchFont" package/dist/types -S
node --input-type=module -e "await import('@excalidraw/excalidraw')"
```

### 参考情報

- Kroki diagram types: <https://docs.kroki.io/kroki/diagram-types/>
- Kroki README / companion server information: <https://github.com/yuzutech/kroki>
- Kroki live endpoint used for verification: <https://kroki.io/excalidraw/svg>
- Excalidraw JSON schema documentation: <https://docs.excalidraw.com/docs/codebase/json-schema>
- Excalidraw Export Utilities documentation: <https://docs.excalidraw.com/docs/%40excalidraw/excalidraw/api/utils/export>
- npm package inspected: `@excalidraw/excalidraw@0.18.1`

## 未対応 diagram type ごとの実現性表

対象は `src/diagram-names.js` の `DEFAULT_DIAGRAM_NAMES` に含まれる一方で、`src/browser.js` の `DEFAULT_RENDERERS` に未登録の diagram type です。優先度は、このパッケージの built-in hydration が「ネットワークへフォールバックせず、ホストが提供したブラウザー実行可能な renderer を呼ぶ」前提で、実装容易性・bundle 影響・SVG 出力の確実性をもとに A/B/C で付けています。

| diagram type | 候補 npm/browser ライブラリ | ネットワーク不要で動くか | Web Worker / WASM / large bundle の有無 | SVG 出力できるか | built-in hydration / injected renderer 判断 | 優先度 |
| --- | --- | --- | --- | --- | --- | --- |
| `actdiag` | `blockdiagjs` 系、または Python `actdiag` を事前変換したホスト提供 renderer | ブラウザー単体で保守された実装が乏しく、純 JS renderer を同梱できる場合のみ可 | 大きな依存は少ない想定だが、実用実装は未成熟 | Kroki / Python 実装は SVG 可。ブラウザー候補は要検証 | injected renderer 推奨。built-in は安定した browser package 確認後 | C |
| `blockdiag` | `blockdiagjs` 系、または Python `blockdiag` を事前変換したホスト提供 renderer | 同梱 renderer があれば可。ただし browser-ready package の保守状況に注意 | 大きな依存は少ない想定だが、レイアウト品質と互換性は要検証 | SVG 可の実装はあるが、Kroki 互換性は要検証 | injected renderer 推奨 | C |
| `bpmn` | `bpmn-js`, `bpmn-js/lib/Viewer` | ライブラリ・CSS・font をローカル同梱すれば可 | large bundle 寄り。worker/WASM は通常不要 | DOM/SVG viewer として表示可。SVG 文字列 export は別途 serializer が必要 | injected renderer 推奨。built-in は viewer 初期化や CSS 依存が重い | B |
| `dbml` | `@dbml/core` + `@softwaretechnik/dbml-renderer` 相当、または DBML parser + custom SVG renderer | parser はオフライン可。ブラウザー SVG renderer は候補精査が必要 | parser/renderer bundle は中程度。worker/WASM は通常不要 | 既製 browser SVG renderer は限定的。ER 図 SVG 生成は自前実装になりがち | injected renderer 推奨 | C |
| `ditaa` | `ditaa` Java 実装の WASM/サービス wrapper、または ASCII art to SVG custom renderer | Java 版そのものはブラウザー不可。WASM 化や独自 renderer なら可 | WASM または large bundle になりやすい | Kroki は SVG 可。browser 候補は要検証 | injected renderer 推奨 | C |
| `erd` | `erd` / `erdjs` 系、Graphviz DOT へ変換して既存 `graphviz` renderer に渡す adapter | parser と Graphviz WASM を同梱すれば可 | Graphviz 経由なら WASM/large bundle | Graphviz 経由で SVG 可 | injected renderer 推奨。既存 `graphviz` 連携 adapter なら built-in 候補 | B |
| `excalidraw` | `@excalidraw/excalidraw` の `exportToSvg` | scene JSON、`files` の `data:` URL、CSS/font assets を同梱すれば可 | React peer dependency と CSS/font assets が重い。worker/WASM は通常不要 | `exportToSvg` で可 | injected renderer から開始。built-in 昇格は `installNetworkGuards` 下の検証後 | B |
| `nwdiag` | `blockdiagjs` 系、または Python `nwdiag` を事前変換したホスト提供 renderer | 同梱 renderer があれば可。ただし browser-ready package の保守状況に注意 | 大きな依存は少ない想定だが、実用実装は未成熟 | SVG 可の実装はあるが、Kroki 互換性は要検証 | injected renderer 推奨 | C |
| `packetdiag` | `blockdiagjs` 系、または Python `packetdiag` を事前変換したホスト提供 renderer | 同梱 renderer があれば可。ただし browser-ready package の保守状況に注意 | 大きな依存は少ない想定だが、実用実装は未成熟 | SVG 可の実装はあるが、Kroki 互換性は要検証 | injected renderer 推奨 | C |
| `rackdiag` | `blockdiagjs` 系、または Python `rackdiag` を事前変換したホスト提供 renderer | 同梱 renderer があれば可。ただし browser-ready package の保守状況に注意 | 大きな依存は少ない想定だが、実用実装は未成熟 | SVG 可の実装はあるが、Kroki 互換性は要検証 | injected renderer 推奨 | C |
| `seqdiag` | `blockdiagjs` 系、または Python `seqdiag` を事前変換したホスト提供 renderer | 同梱 renderer があれば可。ただし browser-ready package の保守状況に注意 | 大きな依存は少ない想定だが、実用実装は未成熟 | SVG 可の実装はあるが、Kroki 互換性は要検証 | injected renderer 推奨 | C |
| `symbolator` | VHDL/SystemVerilog parser + custom SVG renderer、または server-side Symbolator の事前変換 | ブラウザー向け既製 renderer が乏しく、完全オフラインは自前実装前提 | HDL parser が large bundle 化する可能性。worker 推奨 | Kroki / Symbolator は SVG 可。browser 自前実装なら可 | injected renderer 推奨 | C |
| `tikz` | `@mdit/plugin-tex` 系では不足。実用は `latex.js`, `texlive.js`, `tectonic` WASM など | 完全同梱すれば可だが、TeX package/fonts まで含める必要がある | WASM + very large bundle。worker 推奨 | TeX → DVI/PDF/SVG 変換経路で可だが重い | injected renderer 必須。built-in 不向き | C |
| `umlet` | `umletino` / UMLet XML parser + custom SVG renderer | ライブラリを同梱すれば可。ただし browser API と互換性は要検証 | 中程度。worker/WASM は通常不要 | SVG export 可能な実装はあるが、Kroki 互換性は要検証 | injected renderer 推奨 | C |
| `structurizr` | `@structurizr/dsl` parser 相当 + Structurizr renderer、または DSL to Mermaid/PlantUML adapter | parser/adapter を同梱すれば可。外部 workspace 解決は禁止する必要あり | parser/renderer は中〜大。worker は複雑な workspace で有効 | 直接 SVG renderer は限定的。Mermaid/PlantUML 変換経由なら可 | injected renderer 推奨。変換 adapter は built-in 候補になり得る | B |
| `diagramsnet` | `@jgraph/drawio` / diagrams.net viewer assets、mxGraph XML renderer | assets をすべて同梱すれば可。外部 shape/icon URL は拒否が必要 | very large bundle/assets。worker は通常不要だが sandbox iframe 検討 | SVG export は可能だが、viewer 初期化や外部参照処理が重い | injected renderer 必須。built-in 不向き | C |
| `wireviz` | YAML parser + Graphviz adapter、または server-side WireViz の事前変換 | YAML parser と Graphviz renderer を同梱すれば可 | Graphviz 経由なら WASM/large bundle | Graphviz 経由で SVG 可 | injected renderer 推奨。既存 `graphviz` 連携 adapter なら built-in 候補 | B |

### 優先度の読み方

- A: 既存の built-in renderer と同程度の薄い adapter で追加でき、ネットワーク不要・SVG 出力・bundle 影響が明確なもの。現時点の未対応 type には該当なし。
- B: ホスト注入を前提にすれば実用化しやすいが、CSS/assets、WASM、既存 renderer への adapter、または sandbox 検証が必要なもの。
- C: ブラウザー向けの保守された renderer が乏しい、bundle が非常に重い、または Kroki 互換の SVG 出力を実装するには個別調査が大きいもの。
