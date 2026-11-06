import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { Row } from '../types'

// Live views on the latest upload of each channel named in the `channels` option, from YouTube's public feed
// (no API key). Refreshes every 5 minutes; /views refreshes now and prints the counts.
const PANE = 'views'
const rows = atom({ plugin: 'youtube-views', key: 'rows' } as const, [], { shape: 'rows-1' })

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

const decode = (s: string) => s.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>')

async function refresh($: EngineInterface, channels: Channel[]) {
  const now = await $.clock.now()
  const out: Row[] = []
  for (const c of channels) {
    try {
      const r = await $.http.fetch(`https://www.youtube.com/feeds/videos.xml?channel_id=${c.id}`)
      const first = r.text.match(/<entry>[\s\S]*?<\/entry>/)?.[0] ?? ''
      const author = decode(r.text.match(/<author>\s*<name>([\s\S]*?)<\/name>/)?.[1] ?? c.name)
      out.push({
        channel: c.name === c.id ? author : c.name,
        title: decode(first.match(/<title>([\s\S]*?)<\/title>/)?.[1] ?? '?'),
        views: Number(first.match(/views="(\d+)"/)?.[1] ?? 0),
        published: first.match(/<published>(.*?)<\/published>/)?.[1] ?? '',
        checkedAt: now,
      })
    } catch (err) {
      out.push({ channel: c.name, title: '', views: 0, published: '', checkedAt: now, error: String(err) })
    }
  }
  await update($, rows, () => out)
}

export const register: Register = (on, options) => {
  const channels = parseChannels(options.channels)

  on('session.start', async ($, e, next) => {
    await $.command.register({ name: 'views', description: 'Show live views on the latest upload of your YouTube channels' })
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
    return { text: list.map(r => `${r.channel}: ${r.views.toLocaleString('en-US')} views · ${r.title}`).join('\n') }
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
            {r.error ? <Text color="red">feed failed</Text> : <Text>{r.views.toLocaleString('en-US')} views</Text>}
            <Text dimColor>{r.title.slice(0, 60)}</Text>
          </Box>
        ))}
        {list[0] && <Text dimColor>public feed · updates every 5 min</Text>}
      </Box>
    )
  })
}
