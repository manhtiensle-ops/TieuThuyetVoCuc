import { normalizeNFC } from './utils'

export interface ParagraphItem {
  index: number
  html: string
  text: string
}

export function parseContentParagraphs(rawContent: string): ParagraphItem[] {
  if (!rawContent) return []
  const content = normalizeNFC(rawContent.trim())

  // Check if content contains HTML <p> tags
  if (/<p[\s>]/i.test(content)) {
    const doc = new DOMParser().parseFromString(content, 'text/html')
    const pNodes = Array.from(doc.body.querySelectorAll('p'))
    if (pNodes.length > 0) {
      return pNodes
        .map((p, idx) => ({
          index: idx,
          html: p.innerHTML.trim(),
          text: (p.textContent || '').trim(),
        }))
        .filter((item) => item.text.length > 0)
    }
  }

  // Fallback: split by newlines
  const blocks = content.split(/\n\s*\n/)
  return blocks
    .map((b) => b.trim())
    .filter((b) => b.length > 0)
    .map((b, idx) => ({
      index: idx,
      html: b.replace(/\n/g, '<br/>'),
      text: b.replace(/<[^>]*>/g, '').trim(),
    }))
    .filter((item) => item.text.length > 0)
}
