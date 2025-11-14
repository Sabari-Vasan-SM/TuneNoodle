import { useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from './lib/supabase'

type Song = {
  id: string
  title: string
  artist: string
  duration: number
  accent: string
  src: string
}

const colorPalette = ['#1db954', '#20c997', '#64b5f6', '#f06292', '#9575cd', '#ff8a65']

const FALLBACK_SONGS: Song[] = [
  {
    id: 'aurora-echoes',
    title: 'Aurora Echoes',
    artist: 'Synth Lab',
    duration: 0,
    accent: '#1db954',
    src: 'songs/aurora-echoes.wav'
  },
  {
    id: 'sunset-drive',
    title: 'Sunset Drive',
    artist: 'Neon Nights',
    duration: 0,
    accent: '#20c997',
    src: 'songs/sunset-drive.wav'
  },
  {
    id: 'opalescent-sky',
    title: 'Opalescent Sky',
    artist: 'Lumen Bloom',
    duration: 0,
    accent: '#64b5f6',
    src: 'songs/opalescent-sky.wav'
  },
  {
    id: 'midnight-canvas',
    title: 'Midnight Canvas',
    artist: 'Violet Wave',
    duration: 0,
    accent: '#9575cd',
    src: 'songs/midnight-canvas.wav'
  },
  {
    id: 'luminous-trails',
    title: 'Luminous Trails',
    artist: 'Mirage Bloom',
    duration: 0,
    accent: '#ff8a65',
    src: 'songs/luminous-trails.wav'
  }
]

const toTitleCase = (value: string) =>
  value
    .split(/[\s_]+/)
    .filter(Boolean)
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join(' ')

const formatTime = (seconds: number) => {
  if (!Number.isFinite(seconds)) return '00:00'
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

const navItems = ['Home', 'Search', 'Radio', 'Library']

function App() {
  const [songs, setSongs] = useState<Song[]>(FALLBACK_SONGS)
  const [selectedSong, setSelectedSong] = useState<Song>(FALLBACK_SONGS[0])
  const [isLoadingSongs, setIsLoadingSongs] = useState(true)
  const [isPlaying, setIsPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const autoplayRef = useRef(false)
  const [duration, setDuration] = useState(0)

  const currentSongAccent = selectedSong.accent || '#1db954'

  const heroGradient = useMemo(
    () => `linear-gradient(135deg, ${currentSongAccent}, rgba(18, 18, 18, 0.6))`,
    [currentSongAccent]
  )

  const coverGradient = useMemo(
    () => `linear-gradient(160deg, ${currentSongAccent}, rgba(29, 185, 84, 0.65))`,
    [currentSongAccent]
  )

  const trackCountLabel = useMemo(() => {
    const count = songs.length
    return count === 1 ? '1 song' : `${count} songs`
  }, [songs.length])

  useEffect(() => {
    const loadSongs = async () => {
      try {
        if (!supabase) {
          throw new Error('Supabase client not configured')
        }

        setIsLoadingSongs(true)

        const bucket = supabase.storage.from('songs')
        const { data, error } = await bucket.list('', {
          limit: 200,
          sortBy: { column: 'name', order: 'asc' }
        })

        if (error) throw error
        if (!data || data.length === 0) throw new Error('No tracks in bucket')

        const files = data.filter((item) => item.name && !item.name.endsWith('/'))

        const signedUrls = await Promise.all(
          files.map(async (file) => {
            const { data: signedData, error: signedError } = await bucket.createSignedUrl(
              file.name,
              60 * 60
            )
            if (signedError || !signedData?.signedUrl) {
              console.warn(`Failed to sign URL for ${file.name}`, signedError)
            }
            return signedData?.signedUrl ?? null
          })
        )

        const supabaseSongs: Song[] = files
          .map((file, index) => {
            const url = signedUrls[index]
            if (!url) return null

            const baseName = decodeURIComponent(file.name.replace(/\.[^/.]+$/, ''))
            const [maybeArtist, maybeTitle] = baseName.split(' - ')

            const title =
              files.length > 1 && maybeTitle ? toTitleCase(maybeTitle) : toTitleCase(baseName)
            const artist = maybeTitle ? toTitleCase(maybeArtist) : 'Unknown Artist'

            return {
              id: `${file.name}-${index}`,
              title,
              artist,
              duration: 0,
              accent: colorPalette[index % colorPalette.length],
              src: url
            }
          })
          .filter((song): song is Song => Boolean(song))

        if (supabaseSongs.length === 0) throw new Error('No playable songs resolved')

        setSongs(supabaseSongs)
        setSelectedSong((current) => {
          const found = supabaseSongs.find((song) => song.id === current.id)
          return found ?? supabaseSongs[0]
        })
      } catch (error) {
        console.warn('Falling back to demo songs', error)
        setSongs(FALLBACK_SONGS)
        setSelectedSong(FALLBACK_SONGS[0])
      } finally {
        setIsLoadingSongs(false)
      }
    }

    void loadSongs()
  }, [])

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    const handleLoadedMetadata = () => {
      if (audio.duration && Number.isFinite(audio.duration)) {
        setDuration(audio.duration)
        setSongs((prev) =>
          prev.map((song) =>
            song.id === selectedSong.id ? { ...song, duration: audio.duration } : song
          )
        )
      } else {
        setDuration(selectedSong.duration || 0)
      }
    }

    const handleTimeUpdate = () => {
      if (!audio.duration) return
      setProgress(audio.currentTime)
    }

    const handleEnded = () => {
      setIsPlaying(false)
      setProgress(audio.duration)
    }

    audio.addEventListener('loadedmetadata', handleLoadedMetadata)
    audio.addEventListener('timeupdate', handleTimeUpdate)
    audio.addEventListener('ended', handleEnded)

    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata)
      audio.removeEventListener('timeupdate', handleTimeUpdate)
      audio.removeEventListener('ended', handleEnded)
    }
  }, [selectedSong])

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    audio.pause()
    audio.src = selectedSong.src
    audio.currentTime = 0
    audio.load()
    setProgress(0)
    setDuration(selectedSong.duration || 0)

    if (autoplayRef.current) {
      autoplayRef.current = false
      void audio.play().then(() => {
        setIsPlaying(true)
      })
    } else {
      setIsPlaying(false)
    }
  }, [selectedSong])

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    if (!isPlaying) {
      audio.pause()
      return
    }
    void audio.play()
  }, [isPlaying])

  const togglePlay = () => {
    const audio = audioRef.current
    if (!audio) return
    if (isPlaying) {
      audio.pause()
      setIsPlaying(false)
    } else {
      void audio.play()
      setIsPlaying(true)
    }
  }

  const handleSeek = (value: number) => {
    const audio = audioRef.current
    if (!audio) return
    audio.currentTime = value
    setProgress(value)
  }

  const handleSelectSong = (song: Song) => {
    autoplayRef.current = true
    setSelectedSong(song)
    setIsPlaying(true)
  }

  return (
    <div className="spotify-page">
      <audio ref={audioRef} preload="auto" />

      <aside className="spotify-sidebar">
        <div className="sidebar-brand">TuneNoodle</div>
        <nav className="sidebar-nav">
          {navItems.map((item, index) => (
            <button
              key={item}
              type="button"
              className={index === 0 ? 'nav-link active' : 'nav-link'}
              disabled={index !== 0}
            >
              {item}
            </button>
          ))}
        </nav>
        <div className="sidebar-mini">
          <div className="mini-cover" style={{ background: coverGradient }}>
            ♪
          </div>
          <div className="mini-meta">
            <span className="mini-title">{selectedSong.title}</span>
            <span className="mini-subtitle">{selectedSong.artist}</span>
          </div>
        </div>
      </aside>

      <main className="spotify-main">
        <header className="spotify-header">
          <div className="header-arrows">
            <button type="button" className="round">
              ←
            </button>
            <button type="button" className="round">
              →
            </button>
          </div>
          <div className="header-search">
            <input type="text" placeholder="Search in your library" disabled />
          </div>
          <div className="header-avatar">SV</div>
        </header>

        <section className="hero-card" style={{ background: heroGradient }}>
          <div className="hero-art" style={{ background: coverGradient }}>
            ♪
          </div>
          <div className="hero-meta">
            <span className="hero-label">Now Playing</span>
            <h2>{selectedSong.title}</h2>
            <p>{selectedSong.artist}</p>
            <div className="hero-actions">
              <button type="button" className="pill primary" onClick={togglePlay}>
                {isPlaying ? 'Pause' : 'Play'}
              </button>
              <button type="button" className="pill ghost" disabled>
                ♡
              </button>
              <button type="button" className="pill ghost" disabled>
                ⋮
              </button>
            </div>
          </div>
        </section>

        <section className="track-section">
          <header className="section-head">
            <div>
              <h3>All tracks</h3>
              <p>{trackCountLabel}</p>
            </div>
            <button type="button" className="filter-pill" disabled>
              Sort ▾
            </button>
          </header>

          <ul className="track-table">
            {isLoadingSongs && <li className="empty-row">Loading tracks…</li>}
            {!isLoadingSongs && songs.length === 0 && (
              <li className="empty-row">No songs available.</li>
            )}
            {!isLoadingSongs &&
              songs.map((song, index) => {
                const isCurrent = song.id === selectedSong.id
                const displayDuration =
                  song.duration || (isCurrent ? duration : 0) || (song.duration ?? 0)

                return (
                  <li key={song.id}>
                    <button
                      type="button"
                      className={isCurrent ? 'track-row active' : 'track-row'}
                      onClick={() => handleSelectSong(song)}
                    >
                      <span className="track-index">
                        {isCurrent && isPlaying ? '▹' : String(index + 1).padStart(2, '0')}
                      </span>
                      <div className="track-cover" style={{ background: song.accent }}>
                        ♪
                      </div>
                      <div className="track-text">
                        <span className="track-title">{song.title}</span>
                        <span className="track-artist">{song.artist}</span>
                      </div>
                      <span className="track-duration">
                        {displayDuration ? formatTime(displayDuration) : '--:--'}
                      </span>
                    </button>
                  </li>
                )
              })}
          </ul>
        </section>
      </main>

      <div className="bottom-player">
        <div className="player-info">
          <div className="player-cover" style={{ background: coverGradient }}>
            ♪
          </div>
          <div className="player-meta">
            <span className="player-title">{selectedSong.title}</span>
            <span className="player-artist">{selectedSong.artist}</span>
          </div>
        </div>

        <div className="player-center">
          <div className="player-buttons">
            <button type="button" className="ghost" disabled>
              🔀
            </button>
            <button type="button" className="ghost" disabled>
              ⏮
            </button>
            <button type="button" className="primary" onClick={togglePlay}>
              {isPlaying ? '⏸' : '▶'}
            </button>
            <button type="button" className="ghost" disabled>
              ⏭
            </button>
            <button type="button" className="ghost" disabled>
              🔁
            </button>
          </div>
          <div className="player-progress">
            <span>{formatTime(progress)}</span>
            <input
              type="range"
              min={0}
              max={duration || 0}
              value={progress}
              onChange={(event) => handleSeek(Number(event.target.value))}
              style={{ accentColor: currentSongAccent }}
            />
            <span>{formatTime(duration || 0)}</span>
          </div>
        </div>

        <div className="player-extra">
          <button type="button" className="ghost" disabled>
            ☰
          </button>
        </div>
      </div>

      <nav className="mobile-nav">
        {navItems.slice(0, 3).map((item, index) => (
          <button key={item} type="button" className={index === 0 ? 'nav-link active' : 'nav-link'}>
            {item}
          </button>
        ))}
      </nav>
    </div>
  )
}

export default App

