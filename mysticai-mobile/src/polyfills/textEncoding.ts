// react-native-qrcode-svg -> qr code encoder expects global TextEncoder/TextDecoder.
// Hermes/React Native may not expose these globals in some builds.
// We patch them once at app bootstrap time.
/* eslint-disable @typescript-eslint/no-var-requires */
const encoding = require('text-encoding');

if (!(globalThis as any).TextEncoder && encoding?.TextEncoder) {
  (globalThis as any).TextEncoder = encoding.TextEncoder;
}

if (!(globalThis as any).TextDecoder && encoding?.TextDecoder) {
  (globalThis as any).TextDecoder = encoding.TextDecoder;
}

export {};
