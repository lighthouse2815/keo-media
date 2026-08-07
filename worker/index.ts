interface Env {
  ASSETS: {
    fetch(request: Request): Promise<Response>
  }
  TUNELIO_API_KEY?: string
}

type DownloadPayload = {
  url?: unknown
  mediaType?: unknown
  quality?: unknown
}

type ProviderResponse = {
  url?: unknown
  filename?: unknown
  quality?: unknown
  mode?: unknown
  expires?: unknown
  file_size?: unknown
  file_size_str?: unknown
  status?: unknown
  error?: unknown
  message?: unknown
}

const VIDEO_QUALITIES = new Set(['240p', '360p', '480p', '720p'])

function json(data: unknown, status = 200) {
  return Response.json(data, {
    status,
    headers: {
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  })
}

function getYouTubeId(rawUrl: string) {
  try {
    const url = new URL(rawUrl.trim())
    const host = url.hostname.replace(/^www\./, '').toLowerCase()

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

function getProviderError(status: number) {
  switch (status) {
    case 400:
      return 'Định dạng hoặc chất lượng đã chọn không hợp lệ.'
    case 401:
      return 'Khóa dịch vụ tải xuống chưa hợp lệ. Chủ website cần cấu hình lại API.'
    case 402:
      return 'Dịch vụ đã hết lượt tải miễn phí. Vui lòng thử lại sau hoặc nâng gói API.'
    case 404:
      return 'Video không tồn tại, đang ở chế độ riêng tư hoặc đã bị xóa.'
    case 429:
      return 'Có quá nhiều lượt tải cùng lúc. Vui lòng đợi một phút rồi thử lại.'
    case 503:
      return 'YouTube vừa thay đổi hệ thống nên dịch vụ tạm thời chưa xử lý được video này.'
    default:
      return 'Dịch vụ tải xuống đang bận. Vui lòng thử lại sau.'
  }
}

async function handleDownload(request: Request, env: Env) {
  if (request.method !== 'POST') {
    return json({ error: 'Chỉ hỗ trợ phương thức POST.' }, 405)
  }

  if (!env.TUNELIO_API_KEY) {
    return json(
      { error: 'Website chưa được cấu hình khóa API tải xuống.' },
      503,
    )
  }

  const contentLength = Number(request.headers.get('content-length') || '0')
  if (contentLength > 4_096) {
    return json({ error: 'Dữ liệu gửi lên quá lớn.' }, 413)
  }

  let payload: DownloadPayload
  try {
    payload = (await request.json()) as DownloadPayload
  } catch {
    return json({ error: 'Dữ liệu gửi lên không hợp lệ.' }, 400)
  }

  if (
    typeof payload.url !== 'string' ||
    typeof payload.mediaType !== 'string' ||
    typeof payload.quality !== 'string'
  ) {
    return json({ error: 'Thiếu đường dẫn, định dạng hoặc chất lượng.' }, 400)
  }

  const videoId = getYouTubeId(payload.url)
  if (!videoId || !/^[\w-]{6,}$/.test(videoId)) {
    return json({ error: 'Đường dẫn YouTube không hợp lệ.' }, 400)
  }

  const isAudio = payload.mediaType === 'audio'
  const isVideo = payload.mediaType === 'video'
  if (!isAudio && !isVideo) {
    return json({ error: 'Định dạng tải xuống không hợp lệ.' }, 400)
  }

  if (isAudio && payload.quality !== '320kbps') {
    return json({ error: 'Gói API hiện chỉ hỗ trợ MP3 320 kbps.' }, 400)
  }

  if (isVideo && !VIDEO_QUALITIES.has(payload.quality)) {
    return json({ error: 'Chất lượng video không được hỗ trợ.' }, 400)
  }

  const providerUrl = new URL('https://tunelio.dev/create')
  providerUrl.searchParams.set(
    'url',
    `https://www.youtube.com/watch?v=${videoId}`,
  )
  providerUrl.searchParams.set('quality', isAudio ? 'mp3' : payload.quality)

  let providerResponse: Response
  try {
    providerResponse = await fetch(providerUrl, {
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${env.TUNELIO_API_KEY}`,
      },
    })
  } catch (error) {
    console.error('Tunelio request failed', error)
    return json(
      { error: 'Không thể kết nối tới dịch vụ tải xuống. Vui lòng thử lại.' },
      502,
    )
  }

  let data: ProviderResponse = {}
  try {
    data = (await providerResponse.json()) as ProviderResponse
  } catch {
    console.error('Tunelio returned a non-JSON response', providerResponse.status)
  }

  if (!providerResponse.ok) {
    console.error('Tunelio rejected a request', {
      status: providerResponse.status,
      error: data.error,
      message: data.message,
    })
    return json(
      { error: getProviderError(providerResponse.status) },
      providerResponse.status >= 500 ? 502 : providerResponse.status,
    )
  }

  if (typeof data.url !== 'string') {
    console.error('Tunelio response is missing a download URL')
    return json({ error: 'Dịch vụ không trả về đường dẫn tải xuống.' }, 502)
  }

  let downloadUrl: URL
  try {
    downloadUrl = new URL(data.url)
  } catch {
    return json({ error: 'Dịch vụ trả về đường dẫn tải xuống không hợp lệ.' }, 502)
  }

  if (downloadUrl.protocol !== 'https:') {
    return json({ error: 'Dịch vụ trả về đường dẫn tải xuống không an toàn.' }, 502)
  }

  return json({
    downloadUrl: downloadUrl.toString(),
    filename: typeof data.filename === 'string' ? data.filename : null,
    fileSize: typeof data.file_size_str === 'string' ? data.file_size_str : null,
    expires: typeof data.expires === 'number' ? data.expires : null,
  })
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)

    if (url.pathname === '/api/download') {
      return handleDownload(request, env)
    }

    if (url.pathname.startsWith('/api/')) {
      return json({ error: 'Không tìm thấy API.' }, 404)
    }

    return env.ASSETS.fetch(request)
  },
}
