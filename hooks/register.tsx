import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { Item, Row } from '../types'

// Live views on the latest long and latest Short of each channel in the `channels` option, read from the channel's public /videos and /shorts pages
// (no API key). The RSS feed this used first started answering 404 on 7 Nov, so it isn't used. Refreshes every 5 minutes;
// a failed read keeps the last good numbers instead of showing 0.
const PANE = 'views'
type Channel = { name: string; id: string }

function parseChannels(raw: unknown): Channel[] {
  return String(raw ?? '')
    .split(',')
    .map(part => part.trim())
    .filter(Boolean)
    .map(part => {
      const [a, b] = part.split('=').map(s => s.trim())
      return b ? { name: a ?? b, id: b } : { name: a ?? '', id: a ?? '' }
    })
    .filter(c => /^UC[\w-]{22}$/.test(c.id))
}
// the row's shape changed (long and short instead of one upload): a new tag declines what the old version stored
const rows = atom({ plugin: 'youtube-views', key: 'rows' } as const, [], { shape: 'rows-2' })

function find(node: unknown, key: string): any {
  if (node && typeof node === 'object') {
    if (key in (node as Record<string, unknown>)) return (node as Record<string, unknown>)[key]
    for (const v of Object.values(node as Record<string, unknown>)) {
      const hit = find(v, key)
      if (hit !== undefined) return hit
    }
  }
  return undefined
}

async function page($: EngineInterface, id: string, tab: 'videos' | 'shorts'): Promise<Item | undefined> {
  const r = await $.http.fetch(`https://www.youtube.com/channel/${id}/${tab}`, { headers: { 'Accept-Language': 'en-US,en;q=0.9' } })
  const m = r.text.match(/var ytInitialData\s*=\s*(\{[\s\S]+?\});\s*<\/script>/)
  if (!m?.[1]) return undefined
  const data = JSON.parse(m[1])
  if (tab === 'shorts') {
    const s = find(data, 'shortsLockupViewModel')
    if (!s) return undefined
    return { title: s.overlayMetadata?.primaryText?.content ?? '?', views: s.overlayMetadata?.secondaryText?.content ?? '' }
  }
  const l = find(data, 'lockupViewModel')
  const md = l?.metadata?.lockupMetadataViewModel
  if (!md) return undefined
  const parts: string[] = (md.metadata?.contentMetadataViewModel?.metadataRows ?? []).flatMap((row: any) => (row.metadataParts ?? []).map((p: any) => p.text?.content ?? ''))
  const views = parts.find(p => /view/i.test(p)) ?? parts.find(p => /^[\d.,]+[KMB]?$/.test(p)) ?? ''
  return { title: md.title?.content ?? '?', views: /view/i.test(views) ? views : `${views} views` }
}

async function refresh($: EngineInterface, channels: Channel[]) {
  const now = await $.clock.now()
  const old = await read($, rows)
  const out: Row[] = []
  for (const c of channels) {
    const before = old.find(r => r.channel === c.name)
    try {
      const [long, short] = await Promise.all([page($, c.id, 'videos'), page($, c.id, 'shorts')])
      if (!long && !short) throw new Error('page had no videos')
      out.push({ channel: c.name, long: long ?? before?.long, short: short ?? before?.short, checkedAt: now })
    } catch (err) {
      out.push({ ...(before ?? { channel: c.name }), checkedAt: before?.checkedAt ?? now, error: String(err).slice(0, 80) })
    }
  }
  await update($, rows, () => out)
}

export const register: Register = (on, options) => {
  const channels = parseChannels(options.channels)

  on('session.start', async ($, e, next) => {
    await $.command.register({ name: 'views', description: 'Show live views on the latest long and Short of your YouTube channels' })
    void $.ui.open({ id: PANE, title: 'Views' })
    void refresh($, channels)
    $.clock.every(5 * 60 * 1000, () => void refresh($, channels))
    return next(e)
  })

  on('command.run', { command: 'views' }, async $ => {
    if (channels.length === 0) return { text: 'youtube-views: no channels set. Add channel IDs (UC...) in the plugin settings under "YouTube channels".' }
    await refresh($, channels)
    await $.ui.open({ id: PANE, title: 'Views' })
    const list = await read($, rows)
    return { text: list.map(r => `${r.channel}: long ${r.long?.views ?? '?'} (${r.long?.title ?? '?'}) · Short ${r.short?.views ?? '?'} (${r.short?.title ?? '?'})${r.error ? ' · last read failed' : ''}`).join('\n') }
  })

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const { Box, Text } = $.ui.resolve(e)
    const list = await read($, rows)
    return (
      <Box flexDirection="column">
        {channels.length === 0 && <Text dimColor>No channels set. Add channel IDs in the plugin settings.</Text>}
        {channels.length > 0 && list.length === 0 && <Text dimColor>Loading views…</Text>}
        {list.map(r => (
          <Box flexDirection="column" marginBottom={1}>
            <Text bold>{r.channel}</Text>
            {r.long && <Text>Long: {r.long.views}</Text>}
            {r.long && <Text dimColor>{r.long.title.slice(0, 60)}</Text>}
            {r.short && <Text>Short: {r.short.views}</Text>}
            {r.short && <Text dimColor>{r.short.title.slice(0, 60)}</Text>}
            {r.error && <Text color="yellow">last read failed; showing the previous numbers</Text>}
          </Box>
        ))}
        {list[0] && <Text dimColor>public channel pages · updates every 5 min</Text>}
      </Box>
    )
  })
}
