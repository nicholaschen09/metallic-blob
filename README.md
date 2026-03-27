# Blob Demo

This is a small open-source demo that recreates the chrome/snow blob scene from your screenshot using WebGL (Three.js).

## Quick start

1. Install deps:
   `npm install`
2. Run dev server:
   `npm run dev`
3. Open `http://localhost:5173`

## Build

`npm run build`

## Use in your app

Vanilla:

`import { startBlobScene } from "metallic-blob"`

React:

`import { MetallicBlob } from "metallic-blob/react"`

Both APIs support `appearance` options:

- `blobScale`, `blobColor`
- `metalness`, `roughness`, `envMapIntensity`
- `backgroundColor`
- `cameraZ`, `cameraFov`
- `spinSpeedY`, `wobbleSpeedX`, `wobbleAmountX`, `bobSpeedY`, `bobAmountY`

## License

MIT

