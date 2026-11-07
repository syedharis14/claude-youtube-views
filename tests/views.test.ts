import { expect, mock, test } from 'claude-code/testing'

// A channel page carries its data as `var ytInitialData = {...};</script>`; these are the parts the mod reads.
const VIDEOS = { contents: { lockupViewModel: { metadata: { lockupMetadataViewModel: { title: { content: 'First video' }, metadata: { contentMetadataViewModel: { metadataRows: [{ metadataParts: [{ text: { content: '1,234 views' } }, { text: { content: '2 days ago' } }] }] } } } } } } }
const SHORTS = { contents: { shortsLockupViewModel: { overlayMetadata: { primaryText: { content: 'First Short' }, secondaryText: { content: '567 views' } } } } }
const html = (data: unknown) => `<script>var ytInitialData = ${JSON.stringify(data)};</script>`

function engine(on: Parameters<Parameters<typeof test>[1]>[1], pages?: (url: string) => string) {
  mock.clock(on)
  on('command.register', () => ({ value: { command: 'views' } }))
  on('ui.open', () => ({ value: { isPlaced: true } }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  if (pages) on('http.fetch', (_, e) => ({ value: { status: 200, ok: true, headers: {}, text: pages(e.url) } }))
}

test('/views prints the latest long and Short of each configured channel', { options: { channels: 'Mine=UCAAAAAAAAAAAAAAAAAAAAAA' } }, async ($, on) => {
  engine(on, url => html(url.endsWith('/shorts') ? SHORTS : VIDEOS))
  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })
  const r = await $.command.run({ command: 'views' })
  expect(r.text).toContain('Mine: long 1,234 views (First video) · Short 567 views (First Short)')
})

test('a page with no data keeps the previous numbers instead of showing 0', { options: { channels: 'Mine=UCAAAAAAAAAAAAAAAAAAAAAA' } }, async ($, on) => {
  let broken = false
  engine(on, url => (broken ? '<html>404</html>' : html(url.endsWith('/shorts') ? SHORTS : VIDEOS)))
  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })
  await $.command.run({ command: 'views' })
  broken = true
  const r = await $.command.run({ command: 'views' })
  expect(r.text).toContain('1,234 views')
  expect(r.text).toContain('last read failed')
})

test('with no channels set it says how to set them', async ($, on) => {
  engine(on)
  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })
  const r = await $.command.run({ command: 'views' })
  expect(r.text).toContain('no channels set')
})
