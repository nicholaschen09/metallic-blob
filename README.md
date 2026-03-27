# Metallic Blob React Component

This is a small open-source react component that creates a chrome/metallic blob scene using WebGL (Three.js).

## Quick start

1. Install deps:
   `npm install`
2. Run dev server:
   `npm run dev`
3. Open `http://localhost:5173`

## Build

`npm run build`

## Use in your app

React:

`import { MetallicBlob } from "metallic-blob/react"`

`MetallicBlob` supports `appearance` options:

- `blobScale`, `blobColor`
- `metalness`, `roughness`, `envMapIntensity`
- `backgroundColor`
- `ambientLightIntensity`
- `keyLightIntensity`
- `rimLightIntensity`
- `cameraZ`, `cameraFov`
- `spinSpeedY`, `wobbleSpeedX`, `wobbleAmountX`, `bobSpeedY`, `bobAmountY`
- `textureAmountTop`, `textureAmountBottom`
- `textureFrequencyTop`, `textureFrequencyBottom`
- `textureOctaves`

Interaction option:

- `draggable: true | false` (default `true`)

Component props:

- `className` / `style` are passed to the wrapping `<div>`

## License

MIT

