import { defineConfig } from 'astro/config'

const [owner = 'YoshihideShirai', repo = 'asciidoctor-kroki-embedded'] =
  (process.env.GITHUB_REPOSITORY || '').split('/')

export default defineConfig({
  site: process.env.SITE_URL || `https://${owner}.github.io`,
  base: process.env.SITE_BASE || `/${repo}`,
  srcDir: './site',
  publicDir: './site/public',
  outDir: './dist',
})
