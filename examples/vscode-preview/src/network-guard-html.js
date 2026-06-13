export const networkGuardScript = `(() => {
  const blockedNames = ['fetch', 'XMLHttpRequest', 'WebSocket', 'EventSource']
  const blockedNetworkApi = (name) => () => {
    throw new Error(name + ' is disabled for local Kroki embedded rendering.')
  }
  for (const name of blockedNames) {
    try {
      Object.defineProperty(globalThis, name, {
        value: blockedNetworkApi(name),
        configurable: false,
        writable: false,
      })
    } catch {
      globalThis[name] = blockedNetworkApi(name)
    }
  }
  if (globalThis.navigator && typeof globalThis.navigator === 'object') {
    try {
      Object.defineProperty(globalThis.navigator, 'sendBeacon', {
        value: blockedNetworkApi('sendBeacon'),
        configurable: false,
        writable: false,
      })
    } catch {
      globalThis.navigator.sendBeacon = blockedNetworkApi('sendBeacon')
    }
  }
})()`
