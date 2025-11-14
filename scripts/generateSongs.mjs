import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const SAMPLE_RATE = 44100
const BIT_DEPTH = 16
const CHANNELS = 2

const songs = [
  { name: 'aurora-echoes', seconds: 32, frequency: 432, fade: true },
  { name: 'sunset-drive', seconds: 28, frequency: 520, fade: false },
  { name: 'opalescent-sky', seconds: 36, frequency: 396, fade: true },
  { name: 'midnight-canvas', seconds: 30, frequency: 480, fade: false },
  { name: 'luminous-trails', seconds: 26, frequency: 444, fade: true }
]

const targetDir = resolve(__dirname, '..', 'public', 'songs')

const createSineWave = ({ seconds, frequency, fade }) => {
  const sampleCount = seconds * SAMPLE_RATE
  const amplitude = 32760
  const buffer = Buffer.alloc(44 + sampleCount * CHANNELS * 2)

  // Write WAV header
  buffer.write('RIFF', 0)
  buffer.writeUInt32LE(36 + sampleCount * CHANNELS * 2, 4)
  buffer.write('WAVE', 8)
  buffer.write('fmt ', 12)
  buffer.writeUInt32LE(16, 16) // Subchunk1Size for PCM
  buffer.writeUInt16LE(1, 20) // AudioFormat PCM
  buffer.writeUInt16LE(CHANNELS, 22)
  buffer.writeUInt32LE(SAMPLE_RATE, 24)
  buffer.writeUInt32LE(SAMPLE_RATE * CHANNELS * (BIT_DEPTH / 8), 28)
  buffer.writeUInt16LE(CHANNELS * (BIT_DEPTH / 8), 32)
  buffer.writeUInt16LE(BIT_DEPTH, 34)
  buffer.write('data', 36)
  buffer.writeUInt32LE(sampleCount * CHANNELS * (BIT_DEPTH / 8), 40)

  for (let i = 0; i < sampleCount; i += 1) {
    const time = i / SAMPLE_RATE
    let envelope = 1
    if (fade) {
      const fadeIn = Math.min(1, time / 1.5)
      const fadeOut = Math.min(1, (seconds - time) / 1.5)
      envelope = Math.min(fadeIn, fadeOut)
    }
    const sample = Math.sin(2 * Math.PI * frequency * time) * amplitude * envelope

    const offset = 44 + i * CHANNELS * 2
    for (let c = 0; c < CHANNELS; c += 1) {
      buffer.writeInt16LE(sample, offset + c * 2)
    }
  }

  return buffer
}

const run = async () => {
  await mkdir(targetDir, { recursive: true })

  await Promise.all(
    songs.map(async (song) => {
      const wav = createSineWave(song)
      const filepath = resolve(targetDir, `${song.name}.wav`)
      await writeFile(filepath, wav)
    })
  )

  console.log(`Generated ${songs.length} audio files in ${targetDir}`)
}

run().catch((error) => {
  console.error(error)
  process.exit(1)
})

