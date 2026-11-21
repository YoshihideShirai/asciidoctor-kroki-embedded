import init, * as lini from 'lini-wasm/web'
import wasmBytes from 'lini-wasm/lini_wasm_bg.wasm'

let compiler

export function loadLini() {
  compiler ||= init({ module_or_path: wasmBytes }).then(() => lini)
  return compiler
}
