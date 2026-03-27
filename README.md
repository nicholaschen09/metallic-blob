# Metallic Blob React Component

This is a small open-source React component that renders a chrome/metallic blob scene using WebGL (Three.js).

<img width="1653" height="1057" alt="Screenshot 2026-03-27 at 7 41 03 AM" src="https://github.com/user-attachments/assets/b9f52415-fe78-4b1a-b310-b2519d0d35e0" />


## Usage (React)

`import { MetallicBlob } from "metallic-blob/react"`

`MetallicBlob` supports `appearance` options:

- `blobScale`, `blobColor`
- `metalness`, `roughness`, `envMapIntensity`
- `backgroundColor`
- `backgroundAlpha` (set to `0` for transparent background)
- `ambientLightIntensity`
- `keyLightIntensity`
- `rimLightIntensity`
- `cameraZ`, `cameraFov`
- `spinSpeedY`, `wobbleSpeedX`, `wobbleAmountX`, `bobSpeedY`, `bobAmountY`
- `textureAmountTop`, `textureAmountBottom`
- `textureFrequencyTop`, `textureFrequencyBottom`
- `textureOctaves`

Appearance options are passed via the `appearance` prop.

## Interaction

- `draggable: true | false` (default `true`)

## Component props

- `className` / `style` are passed to the wrapping `<div>`

## Install

Install from the GitHub Releases tarball:

```bash
npm i "https://github.com/nicholaschen09/metallic-blob/releases/download/v0.1.2/metallic-blob-0.1.2.tgz"
```

```tsx
import React from "react";
import { MetallicBlob } from "metallic-blob/react";

export default function Page() {
  return (
    <div style={{ width: 420, height: 420 }}>
      <MetallicBlob
        draggable={true}
        appearance={{
          blobScale: 0.5,
          textureOctaves: 1,
          textureAmountTop: 0.18,
          textureAmountBottom: 0.15,
        }}
        style={{ width: "100%", height: "100%" }}
      />
    </div>
  );
}
```

## License

MIT

