import './styles.css'
import { startBlobScene } from './blobScene'

startBlobScene({
  container: '#app',
  appearance: {
    textureAmountTop: 0.12,
    textureAmountBottom: 0.1,
    textureFrequencyTop: 0.75,
    textureFrequencyBottom: 0.8,
    textureOctaves: 2,
  },
})

