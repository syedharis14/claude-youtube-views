export type Item = { title: string; views: string }
export type Row = { channel: string; long?: Item; short?: Item; checkedAt: number; error?: string }

declare module 'claude-code' {
  interface PluginState {
    'youtube-views': { rows: Shaped<Row[]> }
  }
}
