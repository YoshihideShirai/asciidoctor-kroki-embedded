export const samples = [
  { type: 'plantuml', title: 'シーケンス', description: '登場人物の会話や処理の順序を、レビューで追いやすい図にします。', source: `@startuml
skinparam backgroundColor transparent
actor User
participant "AsciiDoc" as Doc
participant "Local renderer" as Renderer
User -> Doc: write diagram block
Doc -> Renderer: embedded target
Renderer --> User: SVG preview
@enduml` },
  { type: 'plantuml', title: 'ユースケース', description: '利用者とシステムの境界、主要な機能、外部サービスとの関係を整理できます。', source: `@startuml
skinparam backgroundColor transparent
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
Preview ..> Publish : approve
@enduml` },
  { type: 'plantuml', title: 'クラス', description: 'クラスやインターフェイスの責務、属性、メソッド、関連を設計メモに残せます。', source: `@startuml
skinparam backgroundColor transparent
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
  { type: 'plantuml', title: 'アクティビティ', description: '処理手順、分岐、並列作業をフローチャートとして表現できます。', source: `@startuml
skinparam backgroundColor transparent
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
  { type: 'plantuml', title: '状態遷移', description: '画面、ジョブ、接続などの状態とイベントによる遷移を確認できます。', source: `@startuml
skinparam backgroundColor transparent
[*] --> Editing
Editing --> Previewing : save
Previewing --> Editing : fix source
Previewing --> Published : approve
Published --> Editing : revise
Published --> [*]
@enduml` },
  { type: 'plantuml', title: 'コンポーネント', description: 'モジュール間の依存や提供インターフェイスを俯瞰できます。', source: `@startuml
skinparam backgroundColor transparent
package "Browser preview" {
  [AsciiDoc parser] --> [Embedded diagram]
  [Embedded diagram] --> [Hydrator]
  [Hydrator] --> [PlantUML core]
}
[PlantUML core] --> [SVG output]
@enduml` },
  { type: 'plantuml', title: '配置', description: 'ノード、実行環境、成果物の配置関係をインフラ説明に使えます。', source: `@startuml
skinparam backgroundColor transparent
node "Developer browser" {
  artifact "gallery page"
  component "local renderer"
}
node "GitHub Pages" {
  artifact "static assets"
}
"gallery page" --> "local renderer"
"static assets" --> "gallery page"
@enduml` },
  { type: 'plantuml', title: 'マインドマップ', description: 'アイデア、要件、章立てをツリー状に広げて整理できます。', source: `@startmindmap
skinparam backgroundColor transparent
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
  { type: 'plantuml', title: 'ガントチャート', description: 'リリース作業やレビュー工程の日程、依存関係を簡潔に示せます。', source: `@startgantt
skinparam backgroundColor transparent
project starts 2026-06-01
[Collect examples] lasts 3 days
[Render gallery] starts at [Collect examples]'s end and lasts 4 days
[Review diagrams] starts at [Render gallery]'s end and lasts 2 days
[Publish] happens at [Review diagrams]'s end
@endgantt` },
  { type: 'mermaid', title: 'フロー', description: '分岐、パイプライン、状態の流れを短い記法で表現できます。', source: `flowchart LR
  Idea[Idea] --> Draft[AsciiDoc]
  Draft --> Preview{Preview OK?}
  Preview -->|yes| Publish[GitHub Pages]
  Preview -->|no| Edit[Edit locally]
  Edit --> Draft` },
  { type: 'graphviz', title: '依存関係', description: 'ノード間の関係や依存方向を、DOT のレイアウトエンジンで整えます。', source: `digraph G {
  rankdir=LR
  node [shape=box, style="rounded,filled", fillcolor="#ecfeff"]
  README -> AsciiDoc
  AsciiDoc -> EmbeddedHTML
  EmbeddedHTML -> BrowserHydrator
  BrowserHydrator -> SVG
}` },
  { type: 'vegalite', title: '小さなチャート', description: '文書中のメトリクスや比較を、宣言的な JSON で可視化します。', source: `{
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
  { type: 'wavedrom', title: 'タイミング', description: 'ハードウェアやプロトコルの信号タイミングをコンパクトに描けます。', source: `{ signal: [
  { name: "clk", wave: "p....." },
  { name: "req", wave: "01.0.." },
  { name: "ack", wave: "0.10.." },
  { name: "data", wave: "x.345x", data: ["A", "B", "C"] }
]}` },
  { type: 'bytefield', title: 'ビットフィールド', description: 'レジスタやパケットフォーマットを、仕様書向けの見た目で示します。', source: `{
  reg: [
    { bits: 4, name: "version" },
    { bits: 4, name: "flags" },
    { bits: 8, name: "type" },
    { bits: 16, name: "length" }
  ]
}` },
  { type: 'nomnoml', title: 'クラス図', description: '軽量なテキストで概念モデルや責務の境界をスケッチできます。', source: `[Document] -> [Embedded target]
[Embedded target] -> [Hydrator]
[Hydrator] -> [SVG]
[Host policy] -> [Hydrator]` },
  { type: 'pikchr', title: 'ブロック図', description: 'README に置きやすい、シンプルな箱と矢印の図を作れます。', source: `box "AsciiDoc" fit
arrow
box "Embedded" fit
arrow
box "Local SVG" fit` },
  { type: 'svgbob', title: 'ASCII アート', description: '既存のテキスト図を、HTML 上で見やすい SVG として表示できます。', source: `       .------.
Input -->|local| Render
       '------'` },
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
