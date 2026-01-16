/**
 * Polyfills for browser compatibility with Node.js-style libraries
 */

// Socket.io and other libs expect 'global' to be defined
(window as any).global = window;

// Some libs expect process.env
(window as any).process = {
  env: {},
  nextTick: (fn: Function) => setTimeout(fn, 0)
};

// Buffer polyfill (if needed)
(window as any).Buffer = (window as any).Buffer || {
  isBuffer: () => false
};
