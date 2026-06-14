import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { samples } from '../site/lib/gallery-samples.js'
import { buildGalleryAsciidoc } from '../site/lib/gallery-asciidoc.js'

const englishLabels = [
  ['Sequence', 'Show conversations and processing order in a diagram that is easy to review.'],
  ['Use case', 'Map actors, system boundaries, core capabilities, and external services.'],
  ['Class', 'Document responsibilities, attributes, methods, and relationships for design notes.'],
  ['Activity', 'Show procedures, decisions, and work steps as a flowchart.'],
  ['State', 'Review states and event-driven transitions for screens, jobs, or connections.'],
  ['Component', 'Outline module dependencies and provided interfaces at a glance.'],
  ['Deployment', 'Explain where nodes, runtimes, and artifacts are placed.'],
  ['Mind map', 'Organize ideas, requirements, or document sections as an expanding tree.'],
  ['Gantt', 'Summarize release work, review steps, dates, and dependencies.'],
  ['Flow', 'Describe branches, pipelines, and state transitions with concise syntax.'],
  ['PlantUML sequence', 'Show service requests and responses in order with a PlantUML sequence diagram.'],
  ['PlantUML use case', 'Organize actors, system boundaries, and main actions with a PlantUML use case diagram.'],
  ['PlantUML class', 'Capture classes, interfaces, inheritance, and dependencies with a PlantUML class diagram.'],
  ['PlantUML activity', 'Express procedures, decisions, and exit paths with a PlantUML activity diagram.'],
  ['PlantUML state', 'Review screen or job states and event-driven transitions with a PlantUML state diagram.'],
  ['PlantUML component', 'Survey modules, provided interfaces, and dependency direction with a PlantUML component diagram.'],
  ['PlantUML deployment', 'Explain nodes, runtimes, and static asset placement with a PlantUML deployment diagram.'],
  ['PlantUML object', 'Snapshot runtime instances, values, and references with a PlantUML object diagram.'],
  ['PlantUML mind map', 'Expand requirements or document sections hierarchically with a PlantUML mind map.'],
  ['PlantUML Gantt', 'Show release work, review steps, and publish milestones with a PlantUML Gantt chart.'],
  ['Dependencies', 'Arrange relationships and dependency direction with the DOT layout engine.'],
  ['Small chart', 'Visualize metrics and comparisons in documents with declarative JSON.'],
  ['Timing', 'Draw hardware or protocol signal timing compactly.'],
  ['Bit field', 'Present register and packet formats with a specification-friendly look.'],
  ['Class sketch', 'Sketch conceptual models and responsibility boundaries with lightweight text.'],
  ['Block diagram', 'Create simple box-and-arrow diagrams that fit well in README files.'],
  ['ASCII art', 'Render existing text diagrams as readable SVG in HTML.'],
  ['Vega', 'Handle lower-level visualization specifications with local rendering.'],
]

const englishSamples = samples.map((sample, index) => ({
  ...sample,
  title: englishLabels[index][0],
  description: englishLabels[index][1],
}))

test('gallery samples include diverse PlantUML browser-rendered examples', () => {
  const plantumlSamples = samples.filter((sample) => sample.type === 'plantuml')
  assert.equal(plantumlSamples.length, 10)
  assert.deepEqual(
    plantumlSamples.map((sample) => sample.title),
    [
      'PlantUML シーケンス',
      'PlantUML ユースケース',
      'PlantUML クラス',
      'PlantUML アクティビティ',
      'PlantUML 状態遷移',
      'PlantUML コンポーネント',
      'PlantUML 配置',
      'PlantUML オブジェクト',
      'PlantUML マインドマップ',
      'PlantUML ガントチャート',
    ],
  )
  for (const sample of plantumlSamples) {
    assert.match(sample.source, /@start\w*/i)
    assert.match(sample.source, /@end\w*/i)
  }
})

test('gallery AsciiDoc files stay in sync with samples', async () => {
  const ja = await readFile(new URL('../site/public/ja/gallery.adoc', import.meta.url), 'utf8')
  const en = await readFile(new URL('../site/public/en/gallery.adoc', import.meta.url), 'utf8')

  assert.equal(ja, `${buildGalleryAsciidoc(samples, {
    title: 'ダイアグラムギャラリー',
    intro: 'AsciiDoc の図ブロック例を、単独の AsciiDoc として列挙しています。README や設計メモに必要なブロックをコピーして使えます。',
  })}\n`)
  assert.equal(en, `${buildGalleryAsciidoc(englishSamples, {
    title: 'Diagram gallery',
    intro: 'AsciiDoc diagram block examples are listed as one standalone AsciiDoc document. Copy the blocks you need into a README or design note.',
  })}\n`)
})
