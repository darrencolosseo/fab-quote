// Module-level listener
let _listener = null

export function showToast(message, type = 'success') {
  if (_listener) _listener({ message, type, id: Date.now() })
}

export function _setToastListener(fn) {
  _listener = fn
}
