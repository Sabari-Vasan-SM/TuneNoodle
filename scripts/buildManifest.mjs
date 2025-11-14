import { readdir } from 'node:fs/promises'
import { basename, extname, join, resolve } from 'node:path'
import { writeFile } from 'node:fs/promises'

const SONG_EXTENSIONS = new Set(['.mp3', '.m4a', '.wav', '.ogg', '.aac', '.flac'])
const SONGS_DIR = resolve(process.cwd(), 'public', 'songs')
const MANIFEST_PATH = resolve(SONGS_DIR, 'manifest.json')

const colorPalette = ['#7C68F8', '#9C5DF2', '#B067F0', '#6F7EF4', '#5A8EF5', '#FF8BA7']

const titleCase = (value) =>
  value
    .toLowerCase()
    .split(' ')
    .filter(Boolean)
    .map((segment) => segment[0].toUpperCase() + segment.slice(1))
    .join(' ')

const tidy = (value) =>
  titleCase(
    value
      .replace(/[_]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
  )

const toId = (value) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

const guessMetadata = (filename) => {
  const base = basename(filename, extname(filename))
  const cleaned = base.replace(/[_]+/g, ' ').replace(/\s+/g, ' ').trim()
  const parts = cleaned.split(' - ')

  if (parts.length >= 2) {
    const [artist, ...rest] = parts
    return {
      artist: titleCase(artist),
      title: tidy(rest.join(' - '))
    }
  }

  return {
    artist: 'Unknown Artist',
    title: tidy(cleaned)
  }
}

const buildManifest = async () => {
  const entries = await readdir(SONGS_DIR, { withFileTypes: true })

  const songs = entries
    .filter((entry) => entry.isFile() && SONG_EXTENSIONS.has(extname(entry.name).toLowerCase()))
    .map((entry, index) => {
      const { artist, title } = guessMetadata(entry.name)
      const accent = colorPalette[index % colorPalette.length]

      return {
        id: toId(entry.name),
        title,
        artist,
        accent,
        duration: 0,
        src: join('songs', entry.name).replace(/\\/g, '/')
      }
    })

  await writeFile(MANIFEST_PATH, JSON.stringify({ generatedAt: new Date().toISOString(), songs }, null, 2), 'utf8')
  console.log(`Manifest written with ${songs.length} songs → ${MANIFEST_PATH}`)
}

buildManifest().catch((error) => {
  console.error('Failed to build manifest', error)
  process.exit(1)
})

