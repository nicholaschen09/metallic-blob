import './styles.css'
import { startBlobScene } from './blobScene'

startBlobScene({
  container: '#app',
  appearance: {
    blobScale: 0.48,
    textureAmountTop: 0.4,
    textureAmountBottom: 0.35,
    textureFrequencyTop: 0.78,
    textureFrequencyBottom: 0.88,
    textureOctaves: 2,
  },
})
