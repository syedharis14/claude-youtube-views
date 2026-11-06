export type Row = { channel: string; title: string; views: number; published: string; checkedAt: number; error?: string }

declare module 'claude-code' {
  interface PluginState {
    'youtube-views': { rows: Shaped<Row[]> }
  }
}
