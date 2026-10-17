/** Viewport-relative bounds of the Markdown body, excluding the article footer. */
export function readingProgress(bounds: { top: number; bottom: number }, viewportHeight: number, topOffset: number): number {
  const distance = bounds.bottom - bounds.top - viewportHeight + topOffset
  if (distance <= 0) return bounds.bottom <= viewportHeight ? 1 : 0
  return Math.min(1, Math.max(0, (topOffset - bounds.top) / distance))
}
