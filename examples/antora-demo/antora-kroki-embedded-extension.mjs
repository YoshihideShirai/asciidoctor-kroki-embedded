import { createAntoraExtension } from '../../src/antora.js'

const extension = createAntoraExtension({
  defaultFormat: 'svg',
})

export function register(registry, context) {
  extension.register(registry, context)
}
