import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import {
  ArrowDown,
  ArrowLineDown,
  Check,
  ClipboardText,
  DownloadSimple,
  FilmSlate,
  LinkSimple,
  LockKey,
  Moon,
  MusicNotes,
  ShieldCheck,
  Sun,
} from '@phosphor-icons/react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import mediaConvertImage from './assets/media-convert.png'
import './App.css'

type MediaType = 'video' | 'audio'
type AnalysisStatus = 'idle' | 'loading' | 'ready' | 'error'
type DownloadStatus = 'idle' | 'loading' | 'success' | 'error'

type VideoInfo = {
  title: string
  channel: string
  thumbnail: string
}

const qualityOptions = {
  video: [
    { value: '720p', label: '720p', detail: 'HD' },
    { value: '480p', label: '480p', detail: 'Nhẹ' },
    { value: '360p', label: '360p', detail: 'Gọn' },
    { value: '240p', label: '240p', detail: 'Tiết kiệm' },
  ],
  audio: [{ value: '320kbps', label: '320 kbps', detail: 'MP3' }],
}

function getYouTubeId(rawUrl: string) {
  try {
    const url = new URL(rawUrl.trim())
    const host = url.hostname.replace(/^www\./, '')

    if (host === 'youtu.be') {
      return url.pathname.split('/').filter(Boolean)[0] ?? null
    }

    if (!['youtube.com', 'm.youtube.com', 'music.youtube.com'].includes(host)) {
      return null
    }

    if (url.pathname === '/watch') return url.searchParams.get('v')

    const [, section, id] = url.pathname.split('/')
    if (['shorts', 'embed', 'live'].includes(section) && id) return id
  } catch {
    return null
  }

  return null
}

function App() {
  const reduceMotion = useReducedMotion()
  const inputRef = useRef<HTMLInputElement>(null)
  const [isDark, setIsDark] = useState(() =>
    window.matchMedia('(prefers-color-scheme: dark)').matches,
  )
  const [url, setUrl] = useState('')
  const [status, setStatus] = useState<AnalysisStatus>('idle')
  const [error, setError] = useState('')
  const [mediaType, setMediaType] = useState<MediaType>('video')
  const [quality, setQuality] = useState('720p')
  const [video, setVideo] = useState<VideoInfo | null>(null)
  const [downloadStatus, setDownloadStatus] = useState<DownloadStatus>('idle')
  const [downloadMessage, setDownloadMessage] = useState('')

  useEffect(() => {
    document.documentElement.dataset.theme = isDark ? 'dark' : 'light'
    return () => {
      delete document.documentElement.dataset.theme
    }
  }, [isDark])

  const handlePaste = async () => {
    try {
      const clipboardText = await navigator.clipboard.readText()
      setUrl(clipboardText)
      setError('')
      inputRef.current?.focus()
    } catch {
      setError('Trình duyệt chưa cho phép đọc clipboard. Hãy dán link bằng Ctrl + V.')
      setStatus('error')
    }
  }

  const handleAnalyze = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const videoId = getYouTubeId(url)

    if (!videoId || !/^[\w-]{6,}$/.test(videoId)) {
      setError('Link chưa đúng. Hãy dùng link youtube.com hoặc youtu.be.')
      setStatus('error')
      setVideo(null)
      return
    }

    setStatus('loading')
    setError('')
    setDownloadStatus('idle')
    setDownloadMessage('')

    const canonicalUrl = `https://www.youtube.com/watch?v=${videoId}`
    let nextVideo: VideoInfo

    try {
      const response = await fetch(
        `https://www.youtube.com/oembed?url=${encodeURIComponent(canonicalUrl)}&format=json`,
      )
      if (!response.ok) throw new Error('Không đọc được metadata')

      const data = (await response.json()) as {
        title?: string
        author_name?: string
        thumbnail_url?: string
      }

      nextVideo = {
        title: data.title || 'Video YouTube đã sẵn sàng',
        channel: data.author_name || 'YouTube',
        thumbnail: data.thumbnail_url || `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
      }
    } catch {
      nextVideo = {
        title: 'Video YouTube đã sẵn sàng',
        channel: 'YouTube',
        thumbnail: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
      }
    }

    setVideo(nextVideo)
    setStatus('ready')
  }

  const handleMediaType = (nextType: MediaType) => {
    setMediaType(nextType)
    setQuality(nextType === 'video' ? '720p' : '320kbps')
    setDownloadStatus('idle')
    setDownloadMessage('')
  }

  const handleDownload = async () => {
    const videoId = getYouTubeId(url)
    if (!videoId) {
      setDownloadStatus('error')
      setDownloadMessage('Link video không còn hợp lệ. Hãy phân tích lại đường dẫn.')
      return
    }

    setDownloadStatus('loading')
    setDownloadMessage('Đang tạo đường dẫn tải an toàn...')

    try {
      const response = await fetch('/api/download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: `https://www.youtube.com/watch?v=${videoId}`,
          mediaType,
          quality,
        }),
      })

      const data = (await response.json()) as {
        downloadUrl?: string
        filename?: string | null
        fileSize?: string | null
        error?: string
      }

      if (!response.ok || !data.downloadUrl) {
        throw new Error(data.error || 'Không tạo được file tải xuống.')
      }

      const downloadUrl = new URL(data.downloadUrl)
      if (downloadUrl.protocol !== 'https:') {
        throw new Error('Đường dẫn tải xuống không an toàn.')
      }

      const fileLabel = [data.filename, data.fileSize && `(${data.fileSize})`]
        .filter(Boolean)
        .join(' ')

      setDownloadStatus('success')
      setDownloadMessage(
        fileLabel ? `Đang bắt đầu tải ${fileLabel}.` : 'Đang bắt đầu tải file.',
      )
      window.location.assign(downloadUrl.toString())
    } catch (downloadError) {
      setDownloadStatus('error')
      setDownloadMessage(
        downloadError instanceof Error
          ? downloadError.message
          : 'Không thể tải file. Vui lòng thử lại.',
      )
    }
  }

  const motionProps = reduceMotion
    ? {}
    : {
        initial: { opacity: 0, y: 20 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.55, ease: [0.16, 1, 0.3, 1] as const },
      }

  return (
    <div className="site-shell">
      <header className="site-header">
        <nav className="nav-wrap" aria-label="Điều hướng chính">
          <a className="brand" href="#top" aria-label="Kéo, về đầu trang">
            <span className="brand-mark" aria-hidden="true">
              <ArrowLineDown size={19} weight="bold" />
            </span>
            <span>kéo.</span>
          </a>

          <div className="nav-links">
            <a href="#cach-dung">Cách dùng</a>
            <a href="#luu-y">Lưu ý</a>
          </div>

          <button
            className="icon-button"
            type="button"
            onClick={() => setIsDark((current) => !current)}
            aria-label={isDark ? 'Chuyển sang giao diện sáng' : 'Chuyển sang giao diện tối'}
          >
            {isDark ? <Sun size={19} /> : <Moon size={19} />}
          </button>
        </nav>
      </header>

      <main id="top">
        <section className="hero-section" aria-labelledby="hero-title">
          <motion.div className="hero-copy" {...motionProps}>
            <p className="eyebrow">Tải gọn trong một lần</p>
            <h1 id="hero-title">
              Tải video.
              <span>Giữ đúng chất lượng.</span>
            </h1>
            <p className="hero-description">
              Dán link YouTube, chọn định dạng và lưu file theo cách bạn muốn.
            </p>

            <figure className="hero-visual">
              <img
                src={mediaConvertImage}
                alt="Mô hình video được tách thành định dạng hình ảnh và âm thanh"
                width="1536"
                height="1024"
              />
            </figure>
          </motion.div>

          <motion.section
            className="downloader-panel"
            aria-labelledby="downloader-title"
            {...(reduceMotion
              ? {}
              : {
                  initial: { opacity: 0, y: 28 },
                  animate: { opacity: 1, y: 0 },
                  transition: { duration: 0.65, delay: 0.1, ease: [0.16, 1, 0.3, 1] },
                })}
          >
            <div className="panel-heading">
              <div>
                <h2 id="downloader-title">Dán link video</h2>
                <p>Hỗ trợ youtube.com, youtu.be và YouTube Shorts.</p>
              </div>
              <span className="panel-icon" aria-hidden="true">
                <LinkSimple size={22} />
              </span>
            </div>

            <form onSubmit={handleAnalyze} noValidate>
              <label htmlFor="video-url">Đường dẫn YouTube</label>
              <div className="url-row">
                <div className={`url-input ${status === 'error' ? 'has-error' : ''}`}>
                  <LinkSimple size={19} aria-hidden="true" />
                  <input
                    ref={inputRef}
                    id="video-url"
                    type="url"
                    inputMode="url"
                    autoComplete="url"
                    value={url}
                    onChange={(event) => {
                      setUrl(event.target.value)
                      if (status === 'error') {
                        setStatus('idle')
                        setError('')
                      }
                    }}
                    placeholder="https://youtu.be/..."
                    aria-describedby="url-help url-error"
                    aria-invalid={status === 'error'}
                  />
                  <button className="paste-button" type="button" onClick={handlePaste}>
                    <ClipboardText size={17} />
                    Dán
                  </button>
                </div>
                <button
                  className="analyze-button"
                  type="submit"
                  disabled={!url.trim() || status === 'loading'}
                >
                  {status === 'loading' ? 'Đang đọc link' : 'Phân tích'}
                  {status !== 'loading' && <ArrowDown size={17} weight="bold" />}
                </button>
              </div>
              <p id="url-help" className="field-help">
                Link chỉ được gửi đến dịch vụ xử lý khi bạn bấm tải.
              </p>
              <AnimatePresence initial={false}>
                {error && (
                  <motion.p
                    id="url-error"
                    className="field-error"
                    role="alert"
                    initial={reduceMotion ? false : { opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                  >
                    {error}
                  </motion.p>
                )}
              </AnimatePresence>
            </form>

            <div className="result-area" aria-live="polite">
              <AnimatePresence mode="wait">
                {status === 'loading' && (
                  <motion.div
                    className="result-skeleton"
                    key="loading"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    <div className="skeleton thumbnail-skeleton" />
                    <div className="skeleton-lines">
                      <div className="skeleton line-wide" />
                      <div className="skeleton line-short" />
                    </div>
                  </motion.div>
                )}

                {status !== 'loading' && status !== 'ready' && (
                  <motion.div
                    className="empty-result"
                    key="empty"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    <span aria-hidden="true">
                      <FilmSlate size={29} />
                    </span>
                    <div>
                      <h3>Kết quả sẽ xuất hiện tại đây</h3>
                      <p>Nhập một link hợp lệ để chọn file và chất lượng.</p>
                    </div>
                  </motion.div>
                )}

                {status === 'ready' && video && (
                  <motion.div
                    className="ready-result"
                    key="ready"
                    initial={reduceMotion ? false : { opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                  >
                    <div className="video-preview">
                      <img src={video.thumbnail} alt={`Ảnh thu nhỏ của ${video.title}`} />
                      <div>
                        <p className="video-channel">{video.channel}</p>
                        <h3>{video.title}</h3>
                        <span className="ready-label">
                          <Check size={15} weight="bold" /> Link hợp lệ
                        </span>
                      </div>
                    </div>

                    <fieldset className="format-fieldset">
                      <legend>Định dạng</legend>
                      <div className="format-switch">
                        <button
                          type="button"
                          className={mediaType === 'video' ? 'active' : ''}
                          onClick={() => handleMediaType('video')}
                          aria-pressed={mediaType === 'video'}
                        >
                          <FilmSlate size={18} />
                          <span>
                            <strong>Video</strong>
                            <small>MP4</small>
                          </span>
                        </button>
                        <button
                          type="button"
                          className={mediaType === 'audio' ? 'active' : ''}
                          onClick={() => handleMediaType('audio')}
                          aria-pressed={mediaType === 'audio'}
                        >
                          <MusicNotes size={18} />
                          <span>
                            <strong>Âm thanh</strong>
                            <small>MP3</small>
                          </span>
                        </button>
                      </div>
                    </fieldset>

                    <fieldset className="quality-fieldset">
                      <legend>Chất lượng</legend>
                      <div className="quality-options">
                        {qualityOptions[mediaType].map((option) => (
                          <button
                            type="button"
                            key={option.value}
                            className={quality === option.value ? 'selected' : ''}
                            onClick={() => {
                              setQuality(option.value)
                              setDownloadStatus('idle')
                              setDownloadMessage('')
                            }}
                            aria-pressed={quality === option.value}
                          >
                            <strong>{option.label}</strong>
                            <small>{option.detail}</small>
                          </button>
                        ))}
                      </div>
                    </fieldset>

                    <button
                      className="download-button"
                      type="button"
                      onClick={handleDownload}
                      disabled={downloadStatus === 'loading'}
                    >
                      <DownloadSimple size={20} weight="bold" />
                      {downloadStatus === 'loading'
                        ? 'Đang chuẩn bị file'
                        : `Tải ${mediaType === 'video' ? 'MP4' : 'MP3'}`}
                    </button>

                    <AnimatePresence initial={false}>
                      {downloadMessage && (
                        <motion.p
                          className={`download-note ${downloadStatus === 'error' ? 'is-error' : ''}`}
                          role={downloadStatus === 'error' ? 'alert' : 'status'}
                          initial={reduceMotion ? false : { opacity: 0, y: -4 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0 }}
                        >
                          {downloadMessage}
                        </motion.p>
                      )}
                    </AnimatePresence>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.section>
        </section>

        <section className="process-section" id="cach-dung" aria-labelledby="process-title">
          <div className="process-heading">
            <h2 id="process-title">Từ đường dẫn đến file tải về.</h2>
            <p>Ba thao tác quen thuộc, không có bước thừa.</p>
          </div>
          <div className="process-list">
            <article>
              <LinkSimple size={24} aria-hidden="true" />
              <div>
                <h3>Dán đường dẫn</h3>
                <p>Sao chép link của video YouTube bạn muốn lưu.</p>
              </div>
            </article>
            <article>
              <FilmSlate size={24} aria-hidden="true" />
              <div>
                <h3>Chọn file</h3>
                <p>Giữ hình ảnh với MP4 hoặc chỉ lấy âm thanh bằng MP3.</p>
              </div>
            </article>
            <article>
              <DownloadSimple size={24} aria-hidden="true" />
              <div>
                <h3>Lưu về máy</h3>
                <p>Chọn chất lượng phù hợp trước khi bắt đầu tải.</p>
              </div>
            </article>
          </div>
        </section>

        <section className="trust-section" id="luu-y" aria-labelledby="trust-title">
          <div className="trust-icon" aria-hidden="true">
            <ShieldCheck size={32} />
          </div>
          <div>
            <h2 id="trust-title">Tải có trách nhiệm.</h2>
            <p>
              Chỉ tải nội dung bạn sở hữu hoặc được phép sử dụng. Kéo không lưu lịch sử đường
              dẫn; link chỉ được chuyển tới dịch vụ tạo file khi bạn yêu cầu tải.
            </p>
          </div>
          <div className="privacy-note">
            <LockKey size={18} />
            <span>Khóa API được giữ kín trên Cloudflare.</span>
          </div>
        </section>
      </main>

      <footer>
        <a className="brand footer-brand" href="#top">
          <span className="brand-mark" aria-hidden="true">
            <ArrowLineDown size={17} weight="bold" />
          </span>
          <span>kéo.</span>
        </a>
        <p>Công cụ tải media gọn gàng cho những nội dung bạn được quyền sử dụng.</p>
      </footer>
    </div>
  )
}

export default App
