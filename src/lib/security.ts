// Security utilities to prevent developer tools access and protect sensitive data

export const initializeSecurity = () => {
  // Disable right-click context menu
  disableContextMenu()
  
  // Prevent keyboard shortcuts for DevTools
  blockDevToolsShortcuts()
  
  // Clear sensitive data from window object
  protectSensitiveData()
  
  // Obfuscate common debugging patterns
  obfuscateDebugging()
}

// Disable right-click to prevent inspect element
const disableContextMenu = () => {
  document.addEventListener('contextmenu', (e) => {
    e.preventDefault()
    return false
  })
}

// Prevent DevTools keyboard shortcuts
const blockDevToolsShortcuts = () => {
  document.addEventListener('keydown', (e) => {
    // F12 - DevTools
    if (e.key === 'F12') {
      e.preventDefault()
      return false
    }
    
    // Ctrl+Shift+I / Cmd+Option+I - Inspect
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'I') {
      e.preventDefault()
      return false
    }
    
    // Ctrl+Shift+C / Cmd+Option+C - Inspect Element
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'C') {
      e.preventDefault()
      return false
    }
    
    // Ctrl+Shift+J / Cmd+Option+J - Console
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'J') {
      e.preventDefault()
      return false
    }
    
    // Ctrl+Shift+K / Cmd+Option+K - Network
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'K') {
      e.preventDefault()
      return false
    }
  }, true)
}

// Protect sensitive data from window object
const protectSensitiveData = () => {
  // Remove sensitive properties from window
  const sensitiveKeys = ['__REACT_DEVTOOLS_GLOBAL_HOOK__']
  
  sensitiveKeys.forEach((key) => {
    try {
      Object.defineProperty(window, key, {
        get: () => undefined,
        set: () => {},
        configurable: false,
      })
    } catch (e) {
      // Ignore errors for properties that can't be redefined
    }
  })
}

// Obfuscate debugging patterns
const obfuscateDebugging = () => {
  // Hide React DevTools
  if (typeof window !== 'undefined') {
    ;(window as any).__REACT_DEVTOOLS_GLOBAL_HOOK__ = undefined
  }
  
  // Prevent access to internals
  Object.defineProperty(window, '__DEV__', {
    value: false,
    writable: false,
    configurable: false,
  })
}

// Encrypt sensitive strings in code (basic obfuscation)
export const secureString = (str: string): string => {
  // Basic ROT13 cipher - replace with stronger encryption in production
  return str.split('').map((char) => {
    const code = char.charCodeAt(0)
    if (code >= 65 && code <= 90) {
      return String.fromCharCode(((code - 65 + 13) % 26) + 65)
    }
    if (code >= 97 && code <= 122) {
      return String.fromCharCode(((code - 97 + 13) % 26) + 97)
    }
    return char
  }).join('')
}

// Prevent localStorage from storing sensitive data
export const secureLSSet = (key: string, value: string) => {
  // Don't store sensitive keys like tokens
  const blockedKeys = ['token', 'password', 'secret', 'key', 'api', 'session']
  const isSensitive = blockedKeys.some((blocked) => key.toLowerCase().includes(blocked))
  
  if (!isSensitive) {
    localStorage.setItem(key, value)
  }
}

// Safe way to retrieve from localStorage
export const secureLSGet = (key: string): string | null => {
  return localStorage.getItem(key)
}

export default initializeSecurity
