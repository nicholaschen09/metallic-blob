import React, { useEffect, useRef } from 'react'
import { startBlobScene } from '../blobScene'
import type { BlobAppearanceOptions } from '../blobScene'

export type MetallicBlobProps = {
  className?: string
  style?: React.CSSProperties
  appearance?: BlobAppearanceOptions
}

export function MetallicBlob(props: MetallicBlobProps) {
  const hostRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const el = hostRef.current
    if (!el) return

    const handle = startBlobScene({ container: el, appearance: props.appearance })
    return () => handle.destroy()
  }, [props.appearance])

  return <div ref={hostRef} className={props.className} style={props.style} />
}

