let toastId = 0
let addToastFn = null

export function setToastCallback(callback) {
  addToastFn = callback
}

export function clearToastCallback() {
  addToastFn = null
}

export function showToast(message, type = 'info', duration = 4000) {
  if (addToastFn) {
    addToastFn({
      id: ++toastId,
      message,
      type,
      duration,
    })
  }
}

export function showWarning(message) {
  showToast(message, 'warning')
}

export function showError(message) {
  showToast(message, 'error', 6000)
}

export function showSuccess(message) {
  showToast(message, 'success')
}
