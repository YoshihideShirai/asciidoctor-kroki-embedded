export const samples = [
  { type: 'mermaid', title: 'Mermaid シーケンス', description: '登場人物の会話や処理の順序を、レビューで追いやすい図にします。', source: `sequenceDiagram
  actor User
  participant Doc as AsciiDoc
  participant Renderer as Local renderer
  User->>Doc: write diagram block
  Doc->>Renderer: embedded target
  Renderer-->>User: SVG preview` },
  { type: 'mermaid', title: 'Mermaid ユースケース', description: '利用者とシステムの境界、主要な機能、外部サービスとの関係を整理できます。', source: `flowchart LR
  Author([Author])
  Reviewer([Reviewer])
  subgraph Site[Documentation site]
    Write([Write AsciiDoc])
    Preview([Preview diagrams])
    Publish([Publish pages])
  end
  Author --> Write
  Author --> Preview
  Reviewer --> Preview
  Preview -. approve .-> Publish` },
  { type: 'mermaid', title: 'Mermaid クラス', description: 'クラスやインターフェイスの責務、属性、メソッド、関連を設計メモに残せます。', source: `classDiagram
  class DiagramRenderer {
    +render(source)
  }
  class MermaidRenderer {
    +render(source)
  }
  class GalleryCard {
    +type
    +source
    +hydrate()
  }
  DiagramRenderer <|.. MermaidRenderer
  GalleryCard --> DiagramRenderer` },
  { type: 'mermaid', title: 'Mermaid アクティビティ', description: '処理手順、分岐、並列作業をフローチャートとして表現できます。', source: `flowchart TD
  Start([Start]) --> Load[Load AsciiDoc block]
  Load --> Supported{diagram type supported?}
  Supported -->|yes| Render[Render SVG locally]
  Render --> Insert[Insert preview]
  Supported -->|no| Error[Show readable error]
  Insert --> Stop([Stop])
  Error --> Stop` },
  { type: 'mermaid', title: 'Mermaid 状態遷移', description: '画面、ジョブ、接続などの状態とイベントによる遷移を確認できます。', source: `stateDiagram-v2
  [*] --> Editing
  Editing --> Previewing: save
  Previewing --> Editing: fix source
  Previewing --> Published: approve
  Published --> Editing: revise
  Published --> [*]` },
  { type: 'mermaid', title: 'Mermaid コンポーネント', description: 'モジュール間の依存や提供インターフェイスを俯瞰できます。', source: `flowchart LR
  subgraph BrowserPreview[Browser preview]
    Parser[AsciiDoc parser] --> Embedded[Embedded diagram]
    Embedded --> Hydrator[Hydrator]
    Hydrator --> Renderer[Local renderer]
  end
  Renderer --> Svg[SVG output]` },
  { type: 'mermaid', title: 'Mermaid 配置', description: 'ノード、実行環境、成果物の配置関係をインフラ説明に使えます。', source: `flowchart LR
  subgraph Browser["Developer browser"]
    Page[gallery page]
    Renderer[local renderer]
  end
  subgraph Pages["GitHub Pages"]
    Assets[static assets]
  end
  Page --> Renderer
  Assets --> Page` },
  { type: 'mermaid', title: 'Mermaid マインドマップ', description: 'アイデア、要件、章立てをツリー状に広げて整理できます。', source: `mindmap
  root((Mermaid))
    UML
      Sequence
      Class
      State
    Planning
      Mind map
      Gantt
    Operations
      Deployment
      Component` },
  { type: 'mermaid', title: 'Mermaid ガントチャート', description: 'リリース作業やレビュー工程の日程、依存関係を簡潔に示せます。', source: `gantt
  title Gallery release plan
  dateFormat  YYYY-MM-DD
  section Release
  Collect examples :done, collect, 2026-06-01, 3d
  Render gallery   :active, render, after collect, 4d
  Review diagrams  :review, after render, 2d
  Publish          :milestone, after review, 0d` },
  { type: 'mermaid', title: 'Mermaid フロー', description: '分岐、パイプライン、状態の流れを短い記法で表現できます。', source: `flowchart LR
  Idea[Idea] --> Draft[AsciiDoc]
  Draft --> Preview{Preview OK?}
  Preview -->|yes| Publish[GitHub Pages]
  Preview -->|no| Edit[Edit locally]
  Edit --> Draft` },
  { type: 'plantuml', title: 'PlantUML シーケンス', description: 'サービス間の要求と応答を、PlantUML のシーケンス図で順序立てて表現できます。', source: `@startuml
actor User
participant "Docs site" as Site
participant "Local renderer" as Renderer
User -> Site: open gallery
Site -> Renderer: hydrate PlantUML block
Renderer --> Site: SVG diagram
Site --> User: rendered preview
@enduml` },
  { type: 'plantuml', title: 'PlantUML ユースケース', description: '利用者、システム境界、主要な操作を PlantUML のユースケース図で整理できます。', source: `@startuml
left to right direction
actor Author
actor Reviewer
rectangle "Documentation site" {
  usecase "Write AsciiDoc" as Write
  usecase "Preview diagrams" as Preview
  usecase "Publish pages" as Publish
}
Author --> Write
Author --> Preview
Reviewer --> Preview
Preview --> Publish
@enduml` },
  { type: 'plantuml', title: 'PlantUML クラス', description: 'クラス、インターフェイス、継承、依存関係を PlantUML のクラス図として残せます。', source: `@startuml
interface DiagramRenderer {
  +render(source)
}
class PlantUmlRenderer {
  +render(source)
}
class GalleryCard {
  +type
  +source
  +hydrate()
}
DiagramRenderer <|.. PlantUmlRenderer
GalleryCard --> DiagramRenderer
@enduml` },
  { type: 'plantuml', title: 'PlantUML アクティビティ', description: '処理手順、条件分岐、終了条件を PlantUML のアクティビティ図で表現できます。', source: `@startuml
start
:Load AsciiDoc block;
if (diagram type supported?) then (yes)
  :Render SVG locally;
  :Insert preview;
else (no)
  :Show readable error;
endif
stop
@enduml` },
  { type: 'plantuml', title: 'PlantUML 状態遷移', description: '画面やジョブの状態とイベントによる遷移を PlantUML の状態図で確認できます。', source: `@startuml
[*] --> Editing
Editing --> Previewing : save
Previewing --> Editing : fix source
Previewing --> Published : approve
Published --> Editing : revise
Published --> [*]
@enduml` },
  { type: 'plantuml', title: 'PlantUML コンポーネント', description: 'モジュール、提供インターフェイス、依存方向を PlantUML のコンポーネント図で俯瞰できます。', source: `@startuml
component "AsciiDoc parser" as Parser
component "Embedded diagram" as Embedded
component "Hydrator" as Hydrator
component "Local renderer" as Renderer
interface "SVG output" as Svg
Parser --> Embedded
Embedded --> Hydrator
Hydrator --> Renderer
Renderer --> Svg
@enduml` },
  { type: 'plantuml', title: 'PlantUML 配置', description: 'ノード、実行環境、静的アセットの配置を PlantUML の配置図で説明できます。', source: `@startuml
node "Developer browser" {
  artifact "gallery page" as Page
  component "local renderer" as Renderer
}
node "GitHub Pages" {
  artifact "static assets" as Assets
}
Page --> Renderer
Assets --> Page
@enduml` },
  { type: 'plantuml', title: 'PlantUML オブジェクト', description: '実行時のインスタンス、値、参照関係を PlantUML のオブジェクト図でスナップショット化できます。', source: `@startuml
object galleryPage {
  lang = "ja"
  status = "rendered"
}
object plantumlSample {
  type = "plantuml"
  format = "svg"
}
galleryPage --> plantumlSample : contains
@enduml` },
  { type: 'plantuml', title: 'PlantUML マインドマップ', description: '要件や章立てを PlantUML のマインドマップで階層的に広げられます。', source: `@startmindmap
* PlantUML
** UML
*** Sequence
*** Class
*** State
** Planning
*** Mind map
*** Gantt
** Operations
*** Deployment
*** Component
@endmindmap` },
  { type: 'plantuml', title: 'PlantUML ガントチャート', description: 'リリース作業、レビュー、公開マイルストーンを PlantUML のガントチャートで示せます。', source: `@startgantt
Project starts 2026-06-01
[Collect examples] lasts 3 days
[Render gallery] starts at [Collect examples]'s end and lasts 4 days
[Review diagrams] starts at [Render gallery]'s end and lasts 2 days
[Publish] happens at [Review diagrams]'s end
@endgantt` },
  { type: 'd2', title: 'D2 サービス構成', description: 'サービスや利用者の関係を、読みやすい宣言的な記法で表現できます。', source: `direction: right
user: Developer
docs: AsciiDoc
renderer: Local renderer
svg: SVG preview

user -> docs: writes diagram block
docs -> renderer: hydrate locally
renderer -> svg: render
svg -> user: review` },
  { type: 'graphviz', title: 'Graphviz 依存関係', description: 'ノード間の関係や依存方向を、DOT のレイアウトエンジンで整えます。', source: `digraph G {
  rankdir=LR
  node [shape=box, style="rounded,filled", fillcolor="#ecfeff"]
  README -> AsciiDoc
  AsciiDoc -> EmbeddedHTML
  EmbeddedHTML -> BrowserHydrator
  BrowserHydrator -> SVG
}` },
  { type: 'vegalite', title: 'Vega-Lite 小さなチャート', description: '文書中のメトリクスや比較を、宣言的な JSON で可視化します。', source: `{
  "$schema": "https://vega.github.io/schema/vega-lite/v6.json",
  "data": { "values": [
    { "diagram": "Mermaid", "uses": 8 },
    { "diagram": "PlantUML", "uses": 7 },
    { "diagram": "Vega-Lite", "uses": 5 }
  ] },
  "mark": { "type": "bar", "cornerRadiusEnd": 4 },
  "encoding": {
    "x": { "field": "uses", "type": "quantitative" },
    "y": { "field": "diagram", "type": "nominal", "sort": "-x" },
    "color": { "value": "#0f766e" }
  }
}` },
  { type: 'wavedrom', title: 'WaveDrom タイミング', description: 'ハードウェアやプロトコルの信号タイミングをコンパクトに描けます。', source: `{ signal: [
  { name: "clk", wave: "p....." },
  { name: "req", wave: "01.0.." },
  { name: "ack", wave: "0.10.." },
  { name: "data", wave: "x.345x", data: ["A", "B", "C"] }
]}` },
  { type: 'bytefield', title: 'Bytefield ビットフィールド', description: 'レジスタやパケットフォーマットを、仕様書向けの見た目で示します。', source: `{
  reg: [
    { bits: 4, name: "version" },
    { bits: 4, name: "flags" },
    { bits: 8, name: "type" },
    { bits: 16, name: "length" }
  ]
}` },
  { type: 'nomnoml', title: 'Nomnoml クラス図', description: '軽量なテキストで概念モデルや責務の境界をスケッチできます。', source: `[Document] -> [Embedded target]
[Embedded target] -> [Hydrator]
[Hydrator] -> [SVG]
[Host policy] -> [Hydrator]` },
  { type: 'pikchr', title: 'Pikchr ブロック図', description: 'README に置きやすい、シンプルな箱と矢印の図を作れます。', source: `box "AsciiDoc" fit
arrow
box "Embedded" fit
arrow
box "Local SVG" fit` },
  { type: 'svgbob', title: 'SvgBob ASCII アート', description: '既存のテキスト図を、HTML 上で見やすい SVG として表示できます。', source: `       .------.
Input -->|local| Render
       '------'` },
  { type: 'excalidraw', title: 'Excalidraw 手描き風スケッチ', description: '手描き風のボックスや矢印で、初期アイデアやレビュー用のラフな流れを共有できます。', source: `{
  "type": "excalidraw",
  "version": 2,
  "elements": [
    { "id": "doc", "type": "rectangle", "x": 20, "y": 30, "width": 130, "height": 60, "strokeColor": "#0f766e", "backgroundColor": "#ccfbf1" },
    { "id": "renderer", "type": "rectangle", "x": 220, "y": 30, "width": 150, "height": 60, "strokeColor": "#1d4ed8", "backgroundColor": "#dbeafe" },
    { "id": "svg", "type": "rectangle", "x": 450, "y": 30, "width": 100, "height": 60, "strokeColor": "#7c3aed", "backgroundColor": "#ede9fe" },
    { "id": "label-doc", "type": "text", "x": 50, "y": 52, "text": "AsciiDoc", "fontSize": 18, "strokeColor": "#134e4a" },
    { "id": "label-renderer", "type": "text", "x": 250, "y": 52, "text": "Local renderer", "fontSize": 18, "strokeColor": "#1e3a8a" },
    { "id": "label-svg", "type": "text", "x": 480, "y": 52, "text": "SVG", "fontSize": 18, "strokeColor": "#581c87" },
    { "id": "arrow-1", "type": "arrow", "x": 160, "y": 60, "width": 50, "height": 0, "strokeColor": "#334155" },
    { "id": "arrow-2", "type": "arrow", "x": 385, "y": 60, "width": 50, "height": 0, "strokeColor": "#334155" }
  ],
  "appState": { "viewBackgroundColor": "#ffffff" },
  "files": {}
}` },
  { type: 'vega', title: 'Vega', description: 'より低レベルな指定が必要な可視化も、ローカルレンダラーで扱えます。', source: `{
  "$schema": "https://vega.github.io/schema/vega/v6.json",
  "width": 260,
  "height": 120,
  "padding": 8,
  "data": [{ "name": "table", "values": [
    { "x": 0, "y": 22 }, { "x": 1, "y": 58 }, { "x": 2, "y": 40 }, { "x": 3, "y": 82 }
  ] }],
  "scales": [
    { "name": "x", "type": "point", "domain": { "data": "table", "field": "x" }, "range": "width" },
    { "name": "y", "type": "linear", "domain": { "data": "table", "field": "y" }, "range": "height" }
  ],
  "marks": [{ "type": "line", "from": { "data": "table" }, "encode": { "enter": {
    "x": { "scale": "x", "field": "x" }, "y": { "scale": "y", "field": "y" }, "stroke": { "value": "#0f766e" }, "strokeWidth": { "value": 3 }
  } } }]
}` },
]
