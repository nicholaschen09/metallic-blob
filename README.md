# Metallic Blob React Component

This is a small open-source React component that renders a chrome/metallic blob scene using WebGL (Three.js).

<img width="1653" height="1057" alt="Screenshot 2026-03-27 at 7 41 03 AM" src="https://github.com/user-attachments/assets/b9f52415-fe78-4b1a-b310-b2519d0d35e0" />


## Installation

Install from npm:

```bash
npm install metallic-blob
```

## Usage

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

## Props

### `MetallicBlob` props

- `className?: string`
- `style?: React.CSSProperties`
- `draggable?: boolean` (default `true`)
- `appearance?: BlobAppearanceOptions`

### `appearance` (`BlobAppearanceOptions`)

- `blobScale?: number`
- `blobColor?: string`
- `metalness?: number`
- `roughness?: number`
- `envMapIntensity?: number`
- `backgroundColor?: string`
- `backgroundAlpha?: number` (set `0` = transparent)
- `ambientLightIntensity?: number`
- `keyLightIntensity?: number`
- `rimLightIntensity?: number`
- `cameraZ?: number`
- `cameraFov?: number`
- `spinSpeedY?: number`
- `wobbleSpeedX?: number`
- `wobbleAmountX?: number`
- `bobSpeedY?: number`
- `bobAmountY?: number`
- `textureAmountTop?: number`
- `textureAmountBottom?: number`
- `textureFrequencyTop?: number`
- `textureFrequencyBottom?: number`
- `textureOctaves?: number`

## License

MIT

