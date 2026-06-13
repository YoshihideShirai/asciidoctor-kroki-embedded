#!/usr/bin/env node

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const scanTargets = [
  'src',
  'scripts',
  'package.json',
]

const allowedRuntimeDependencies = new Set([
  '@asciidoctor/core',
  '@plantuml/core',
  '@viz-js/viz',
  'asciidoctor-kroki-embedded',
  'bit-field',
  'json5',
  'mermaid',
  'nomnoml',
  'pikchr-js',
  'vega',
  'vega-interpreter',
  'vega-lite',
  'wavedrom',
])

const blockedPatterns = [
  {
    name: 'browser network API call',
    pattern: /\b(fetch|XMLHttpRequest|WebSocket|EventSource)\s*\(/,
  },
  {
    name: 'Node network module import',
    pattern: /\b(?:import|from|require)\b[^;\n]*(?:node:)?(?:http|https|http2|net|tls|dgram|dns)\b/,
  },
  {
    name: 'process execution API',
    pattern: /\bchild_process\b|(?<![.\w$])(?:spawn|execFile|exec|fork)\s*\(/,
  },
  {
    name: 'remote URL literal in extension-controlled code',
    pattern: /(?:https?:|ftp:|wss?:)\/\//,
  },
  {
    name: 'webview CSP allows remote network access',
    pattern: /(?:connect-src|media-src|font-src|script-src|style-src)[^;"']*(?:https?:|wss?:|\*)/,
  },
  {
    name: 'Asciidoctor remote URI reads enabled',
    pattern: /['"]allow-uri-read['"]\s*:\s*(?:true|['"]true['"])/,
  },
  {
    name: 'unsafe Asciidoctor mode',
    pattern: /\bsafe\s*:\s*['"]unsafe['"]/,
  },
]

const expectedText = [
  {
    file: 'src/extension.js',
    text: "'allow-uri-read': false",
    message: 'Asciidoctor conversion must explicitly disable allow-uri-read.',
  },
  {
    file: 'src/extension.js',
    text: "safe: 'safe'",
    message: 'Asciidoctor conversion must run in safe mode or stricter.',
  },
  {
    file: 'scripts/generate-standalone-preview.mjs',
    text: "'allow-uri-read': false",
    message: 'Standalone preview generation must explicitly disable allow-uri-read.',
  },
  {
    file: 'scripts/generate-standalone-preview.mjs',
    text: "safe: 'safe'",
    message: 'Standalone preview generation must run in safe mode or stricter.',
  },
  {
    file: 'src/extension.js',
    text: "default-src 'none'",
    message: 'Webview CSP must deny all loads by default.',
  },
  {
    file: 'src/webview.js',
    text: 'installNetworkGuards(globalThis)',
    message: 'Webview must install network guards before hydrating diagrams.',
  },
  {
    file: 'src/extension.js',
    text: '<script nonce="${nonce}">${networkGuardScript}</script>',
    message: 'VS Code preview HTML must install network guards before loading the Webview bundle.',
  },
  {
    file: 'scripts/generate-standalone-preview.mjs',
    text: '<script>${networkGuardScript}</script>',
    message: 'Standalone preview HTML must install network guards before loading the Webview bundle.',
  },
]

const failures = []

for (const file of listFiles(scanTargets)) {
  const rel = path.relative(rootDir, file)
  const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/)

  for (const [index, line] of lines.entries()) {
    for (const blocked of blockedPatterns) {
      if (isAllowedLine(rel, blocked.name, line)) {
        continue
      }

      if (blocked.pattern.test(line)) {
        failures.push(`${rel}:${index + 1}: ${blocked.name}: ${line.trim()}`)
      }
    }
  }
}

for (const expected of expectedText) {
  const file = path.join(rootDir, expected.file)
  const text = fs.readFileSync(file, 'utf8')
  if (!text.includes(expected.text)) {
    failures.push(`${expected.file}: ${expected.message}`)
  }
}

verifyRuntimeDependencies()

if (failures.length > 0) {
  console.error('No-network verification failed:')
  for (const failure of failures) {
    console.error(`- ${failure}`)
  }
  process.exitCode = 1
} else {
  console.log('No-network verification passed.')
}

function listFiles(targets) {
  const files = []

  for (const target of targets) {
    const absolute = path.join(rootDir, target)
    if (!fs.existsSync(absolute)) {
      continue
    }

    const stat = fs.statSync(absolute)
    if (stat.isDirectory()) {
      for (const entry of fs.readdirSync(absolute)) {
        if (entry === 'node_modules' || entry === 'dist') {
          continue
        }
        files.push(...listFiles([path.join(target, entry)]))
      }
    } else if (/\.(?:js|json|mjs|cjs)$/i.test(absolute)) {
      if (path.relative(rootDir, absolute) !== 'scripts/verify-no-network.mjs') {
        files.push(absolute)
      }
    }
  }

  return files
}

function verifyRuntimeDependencies() {
  const manifest = JSON.parse(fs.readFileSync(path.join(rootDir, 'package.json'), 'utf8'))
  const dependencies = Object.keys(manifest.dependencies || {})

  for (const dependency of dependencies) {
    if (!allowedRuntimeDependencies.has(dependency)) {
      failures.push(`package.json: runtime dependency "${dependency}" is not in the no-network allowlist.`)
    }
  }
}

function isAllowedLine(rel, blockedName, line) {
  if (rel === 'package.json' && blockedName === 'remote URL literal in extension-controlled code') {
    return true
  }

  if (rel === 'src/preview-html.js') {
    return (
      blockedName === 'remote URL literal in extension-controlled code' &&
      (
        line.includes('`${scheme}://') ||
        line.includes('`https://${')
      )
    )
  }

  return false
}
