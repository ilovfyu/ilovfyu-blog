export type TopicReadingMarker = { id: string; chapter: string; kind: 'chapter' | 'note'; top: number }

/** The latest heading or article above the reading line owns the current location. */
export function topicReadingPosition(markers: TopicReadingMarker[], line = 180) {
  let current: TopicReadingMarker | undefined
  for (const marker of markers) {
    if (marker.top <= line && (!current || marker.top >= current.top)) current = marker
  }
  return { chapter: current?.chapter || '', note: current?.kind === 'note' ? current.id : '' }
}
