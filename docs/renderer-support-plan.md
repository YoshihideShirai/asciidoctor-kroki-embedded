# Renderer support plan

このメモは、Excalidraw を built-in hydration に追加する前の調査結果と判断材料を残すためのものです。

## Excalidraw built-in hydration 調査メモ

### 結論

現時点では、Excalidraw は built-in hydration に直ちに追加せず、custom renderer のサンプルとして扱うのが安全です。Kroki の `excalidraw` は `.excalidraw` と同じ plaintext JSON scene を入力として扱い、ブラウザー側の Excalidraw export API も同じ scene 構造を受け取れます。ただし、React 依存、フォント/CSS/assets の管理、画像ファイルの data URL 検証、SVG の安定性、`installNetworkGuards` 下での完全な無通信検証が未完了です。

### 1. Kroki の `excalidraw` 入力形式とブラウザー側 JSON 形式

- Kroki は Excalidraw を diagram type として公開しており、出力形式は SVG のみです。
- Kroki API の `diagram_source` は diagram type ごとのソース文字列を受け取るため、`excalidraw` では `.excalidraw` ファイル相当の JSON 文字列を渡す前提になります。
- Excalidraw の保存形式は plaintext JSON で、主なトップレベル属性は `type: "excalidraw"`, `version`, `source`, `elements`, `appState`, `files` です。
- したがって、入力形式は概ね一致します。hydration 実装では `JSON.parse(source)` 後、`elements`, `appState`, `files` を `exportToSvg` に渡す形にできます。
- 互換性リスク: Kroki 側が内部で許容している古い scene version、欠落 `appState`、または clipboard 形式 `type: "excalidraw/clipboard"` をどこまで受けるかは、ローカル renderer 側で明示的に検証する必要があります。

### 2. SVG 出力 API

- `@excalidraw/excalidraw` は `exportToSvg({ elements, appState, exportPadding, metadata, files })` を公開しています。
- この API は Promise で SVG を返すため、既存の built-in hydration と同じく `output.innerHTML` へ SVG 文字列または `SVGElement` を挿入する実装にできます。
- ただし、パッケージは React/React DOM と CSS を前提にした統合が中心です。export utility だけをブラウザー bundle に安全に切り出せるか、bundle サイズと副作用を確認する必要があります。

### 3. 画像 assets / fonts / theme / background の扱い

- 画像は Excalidraw scene の `files` オブジェクトに file id ごとの `mimeType`, `id`, `dataURL`, `created`, `lastRetrieved` として入ります。built-in hydration に入れるなら、`dataURL` のみ許容し、外部 URL 参照は拒否または無視する方針にします。
- `exportToSvg` の `files` オプションに scene の `files` を渡さないと、image element を含む scene が欠落する可能性があります。
- 背景とテーマは `appState` の export 用属性で制御します。重要な属性は `exportBackground`, `viewBackgroundColor`, `exportWithDarkMode`, `exportEmbedScene` です。
- 既定値候補:
  - `exportBackground`: scene の値を尊重し、未指定なら `true`。
  - `viewBackgroundColor`: scene の値を尊重し、未指定なら `#fff`。
  - `exportWithDarkMode`: scene の値を尊重し、未指定なら `false`。
  - `exportEmbedScene`: hydration 出力では不要なため未指定または `false`。
- フォントは最大の未解決点です。Excalidraw の見た目は Virgil などのフォントに依存するため、ホストがローカルフォントと CSS を同梱するか、フォールバックを許容するかを決める必要があります。built-in hydration に入れる場合、このパッケージ自体は renderer library や font asset を同梱しないという既存方針を維持し、ホスト提供を必須にします。

### 4. ネットワークアクセスなしで完結できるか

- Scene JSON と `files` が data URL のみで完結し、Excalidraw export utility、CSS、フォントがすべてホストにローカル同梱されていれば、レンダリング自体はネットワークなしで完結できる見込みです。
- 未検証リスク:
  - Excalidraw package または関連 CSS が font/image asset を相対 URL で解決しようとしないか。
  - 画像 element の `dataURL` 以外の入力を export utility が fetch しようとしないか。
  - SVG に外部参照が残らないか。
- built-in に入れる前に、fixture に画像入り Excalidraw、背景あり/なし、dark mode、フォント未ロードのケースを追加し、Playwright の request 監視で `http`/`https` が発生しないことを確認します。

### 5. `installNetworkGuards` との併用

- `installNetworkGuards` は `fetch`, `XMLHttpRequest`, `WebSocket`, `EventSource`, `sendBeacon` をブロックします。
- Excalidraw hydration が純粋に scene JSON、data URL、ローカル bundle、ローカル CSS/font だけを使うなら併用可能なはずです。
- 逆に、export utility が runtime に asset を取得する実装であれば、built-in hydration としては不適合です。候補実装は guard を先に有効化した状態でロード・描画するテストを必須にします。

### 6. built-in hydration に入れるか、custom renderer サンプルに留めるか

推奨は段階的対応です。

1. まず custom renderer サンプルとして追加する。
   - ホストが `@excalidraw/excalidraw`、React 依存、CSS、フォント、画像 policy を自分で管理できる。
   - このパッケージの「renderer library は同梱しない」「ネットワークへフォールバックしない」という境界を維持しやすい。
2. built-in hydration へ昇格する条件を満たしたら追加する。
   - `libraries.excalidraw.exportToSvg` または `libraries.loadExcalidraw` のような注入 API に限定する。
   - `JSON.parse(source)` の schema validation を行い、`elements` 配列以外はエラーにする。
   - `files` は data URL のみ許可する。
   - `installNetworkGuards(globalThis)` を先に入れた harness で画像/assets/fonts/theme/background を含む fixture が無通信で成功する。
   - SVG 文字列または `SVGElement` だけを受け入れ、外部 URL を含む出力は拒否する。

### 参考情報

- Kroki は Excalidraw を diagram type として公開し、SVG 出力に対応している: <https://kroki.io/>
- Kroki API は diagram source を plain text または JSON wrapper の `diagram_source` として受け取る: <https://kroki.io/>
- Excalidraw scene の保存形式は plaintext JSON で、`elements`, `appState`, `files` を含む: <https://docs.excalidraw.com/docs/codebase/json-schema>
- Excalidraw は `exportToSvg` と export 用 `appState` 属性を公開している: <https://docs.excalidraw.com/docs/%40excalidraw/excalidraw/api/utils/export>
