// Web API polyfills for tana-edge V8 environment
// These are needed by React DOM Server

if (typeof globalThis.TextEncoder === 'undefined') {
  globalThis.TextEncoder = class TextEncoder {
    encode(str) {
      const arr = new Uint8Array(str.length);
      for (let i = 0; i < str.length; i++) {
        arr[i] = str.charCodeAt(i) & 0xff;
      }
      return arr;
    }
  };
}

if (typeof globalThis.TextDecoder === 'undefined') {
  globalThis.TextDecoder = class TextDecoder {
    decode(arr) {
      if (!arr) return '';
      let str = '';
      for (let i = 0; i < arr.length; i++) {
        str += String.fromCharCode(arr[i]);
      }
      return str;
    }
  };
}

// React SSR also needs these
if (typeof globalThis.setTimeout === 'undefined') {
  globalThis.setTimeout = (fn) => fn();
}

if (typeof globalThis.clearTimeout === 'undefined') {
  globalThis.clearTimeout = () => {};
}

if (typeof globalThis.queueMicrotask === 'undefined') {
  globalThis.queueMicrotask = (fn) => Promise.resolve().then(fn);
}
