import React, { useEffect, useRef } from 'react'
import { startBlobScene } from '../blobScene'

export type MetallicBlobProps = {
  className?: string
  style?: React.CSSProperties
}

export function MetallicBlob(props: MetallicBlobProps) {
  const hostRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const el = hostRef.current
    if (!el) return

    const handle = startBlobScene({ container: el })
    return () => handle.destroy()
  }, [])

  return <div ref={hostRef} className={props.className} style={props.style} />
}

