import { expect, mock, test } from 'claude-code/testing'

const FEED = '<feed><author><name>Test Channel</name></author><entry><title>First video</title><published>2026-11-01T00:00:00+00:00</published><media:statistics views="1234"/></entry></feed>'

test('/views prints the latest upload of each configured channel', { options: { channels: 'Mine=UCAAAAAAAAAAAAAAAAAAAAAA' } }, async ($, on) => {
  mock.clock(on)
  on('command.register', () => ({ value: { command: 'views' } }))
  on('ui.open', () => ({ value: { isPlaced: true } }))
  on('http.fetch', () => ({ value: { status: 200, ok: true, headers: {}, text: FEED } }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })
  const r = await $.command.run({ command: 'views' })
  expect(r.text).toContain('Mine: 1,234 views · First video')
})

test('with no channels set it says how to set them', async ($, on) => {
  mock.clock(on)
  on('command.register', () => ({ value: { command: 'views' } }))
  on('ui.open', () => ({ value: { isPlaced: true } }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })
  const r = await $.command.run({ command: 'views' })
  expect(r.text).toContain('no channels set')
})
