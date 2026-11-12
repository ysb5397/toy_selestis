/** Incremental SSE decoder: UTF-8 and event boundaries may span arbitrary network chunks. */
export async function consumeSSE(
  body: ReadableStream<Uint8Array>,
  onEvent: (event: Record<string, unknown>) => void,
  signal?: AbortSignal,
) {
  const reader = body.getReader(),
    decoder = new TextDecoder();
  let buffer = "",
    packet: string[] = [],
    size = 0;
  const dispatch = () => {
    const data = packet.join("\n");
    packet = [];
    if (!data || data === "[DONE]") return;
    let parsed;
    try {
      parsed = JSON.parse(data);
    } catch {
      throw Error("AI 응답 형식을 읽지 못했어.");
    }
    if (parsed && typeof parsed === "object") onEvent(parsed);
  };
  const line = (text: string) => {
    if (!text) dispatch();
    else if (text.startsWith("data:"))
      packet.push(text.slice(5).replace(/^ /, ""));
  };
  const abort = () => {
    void reader.cancel().catch(() => {});
  };
  signal?.addEventListener("abort", abort, { once: true });
  try {
    while (true) {
      signal?.throwIfAborted();
      const { done, value } = await reader.read();
      signal?.throwIfAborted();
      if (done) break;
      size += value.byteLength;
      if (size > 20 * 1024 * 1024)
        throw Error("AI 응답이 너무 커. 요청을 나눠줘.");
      buffer += decoder.decode(value, { stream: true });
      let end;
      while ((end = buffer.indexOf("\n")) >= 0) {
        line(buffer.slice(0, end).replace(/\r$/, ""));
        buffer = buffer.slice(end + 1);
      }
    }
    buffer += decoder.decode();
    if (buffer) line(buffer.replace(/\r$/, ""));
    dispatch();
  } finally {
    signal?.removeEventListener("abort", abort);
    await reader.cancel().catch(() => {});
    reader.releaseLock();
  }
}
