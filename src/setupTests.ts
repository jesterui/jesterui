// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom'
import { TextEncoder, TextDecoder } from 'util'

// ref: https://jestjs.io/docs/manual-mocks#mocking-methods-which-are-not-implemented-in-jsdom
// ref: https://github.com/jsdom/jsdom/issues/2524
Object.defineProperty(global, 'TextEncoder', {
  writable: true,
  value: TextEncoder,
})
Object.defineProperty(global, 'TextDecoder', {
  writable: true,
  value: TextDecoder,
})

global.ArrayBuffer = ArrayBuffer
global.Uint8Array = Uint8Array
