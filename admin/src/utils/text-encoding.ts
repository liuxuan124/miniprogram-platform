/** 把 UTF-8 被当成 Latin-1 读出来的乱码还原成中文。已是正常中文则原样返回。 */
export function decodeMojibake(input?: string | null): string {
  const text = String(input || '')
  if (!text || !/[À-ÿ]/.test(text)) return text
  try {
    const bytes = Uint8Array.from(text, (ch) => ch.charCodeAt(0) & 0xff)
    const decoded = new TextDecoder('utf-8', { fatal: false }).decode(bytes)
    if (!decoded || decoded.includes('\uFFFD')) return text
    const originalCjk = /[\u4e00-\u9fff]/.test(text)
    const decodedCjk = /[\u4e00-\u9fff]/.test(decoded)
    if (!originalCjk && decodedCjk) return decoded
    return text
  } catch {
    return text
  }
}
