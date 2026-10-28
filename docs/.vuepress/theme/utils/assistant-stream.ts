/** Incremental UTF-8/SSE decoding shared by the browser and edge runtime. */
export async function* serverEvents(body: ReadableStream<Uint8Array>, signal?: AbortSignal) {
  const reader = body.getReader(), decoder = new TextDecoder()
  let buffer = '', total = 0
  const cancel = () => { void reader.cancel().catch(() => {}) }
  signal?.addEventListener('abort', cancel, { once: true })
  try {
    while (true) {
      if (signal?.aborted) throw new DOMException('Aborted', 'AbortError')
      const { value, done } = await reader.read()
      if (signal?.aborted) throw new DOMException('Aborted', 'AbortError')
      if (done) break
      total += value.byteLength
      if (total > 512_000) throw new Error('stream-too-large')
      buffer += decoder.decode(value, { stream: true })
      // SSE accepts CRLF and LF. A trailing CR must survive split reads.
      let boundary: RegExpExecArray | null
      while ((boundary = /\r?\n\r?\n/.exec(buffer))) {
        const frame = buffer.slice(0, boundary.index)
        buffer = buffer.slice(boundary.index + boundary[0].length)
        if (frame.length > 64_000) throw new Error('frame-too-large')
        let event = 'message'
        const data: string[] = []
        for (const line of frame.split(/\r?\n/)) {
          if (line.startsWith('event:')) event = line.slice(6).trim()
          if (line.startsWith('data:')) data.push(line.slice(5).replace(/^ /, ''))
        }
        if (data.length) yield { event, data: data.join('\n') }
      }
      if (buffer.length > 64_000) throw new Error('frame-too-large')
    }
    if (buffer.trim()) throw new Error('incomplete-stream')
  } finally {
    signal?.removeEventListener('abort', cancel)
    await reader.cancel().catch(() => {})
    reader.releaseLock()
  }
}
