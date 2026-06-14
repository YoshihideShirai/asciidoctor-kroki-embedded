export function buildGalleryAsciidoc(samples, { title, intro }) {
  const sections = samples.map((sample) => `== ${sample.title}\n\n${sample.description}\n\n[${sample.type}]\n----\n${sample.source}\n----`)
  return `= ${title}\n:toc: left\n:source-highlighter: highlight.js\n\n${intro}\n\n${sections.join('\n\n')}`
}
