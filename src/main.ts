import './styles.css'
import { startBlobScene } from './blobScene'

startBlobScene({
  container: '#app',
  appearance: {
    blobScale: 0.48,
    textureAmountTop: 0.32,
    textureAmountBottom: 0.3,
    textureFrequencyTop: 0.52,
    textureFrequencyBottom: 0.56,
    textureOctaves: 1,
  },
})

