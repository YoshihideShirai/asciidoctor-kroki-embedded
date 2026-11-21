import init, * as lini from 'lini-wasm/web'
import wasmDataUrl from 'lini-wasm/lini_wasm_bg.wasm?url&inline'

let compiler

export function loadLini() {
  if (!compiler) {
    const bytes = Uint8Array.from(atob(wasmDataUrl.split(',')[1]), (char) => char.charCodeAt(0))
    compiler = init({ module_or_path: bytes }).then(() => lini)
  }
  return compiler
}
