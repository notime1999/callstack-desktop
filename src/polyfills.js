"use strict";
/**
 * Polyfills for browser compatibility with Node.js-style libraries
 */
// Socket.io and other libs expect 'global' to be defined
window.global = window;
// Some libs expect process.env
window.process = {
    env: {},
    nextTick: (fn) => setTimeout(fn, 0)
};
// Buffer polyfill (if needed)
window.Buffer = window.Buffer || {
    isBuffer: () => false
};
