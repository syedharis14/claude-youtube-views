# youtube-views

A Claude Code mod that keeps a **Views** panel beside the chat with live view counts on the latest long video and latest Short of each YouTube channel you name. It reads the channels' public pages, so it needs no API key, and it refreshes every 5 minutes. If a read fails, it keeps the last numbers it had. Type `/views` to refresh now and print the counts.

Built with Claude Code for [Agentwright](https://www.youtube.com/channel/UCPZ-6Lxwy0Cco3qatD0q1Gw).

## Install

At the prompt of a terminal session:

```
/plugin install youtube-views --marketplace syedharis14/claude-youtube-views
```

Answer `y` to add the marketplace, then pick a scope.

From a shell:

```
claude plugin install youtube-views --marketplace syedharis14/claude-youtube-views
```

In the desktop app, where `/plugin` does not run: click + next to the prompt box, then Plugins, Add marketplace with `syedharis14/claude-youtube-views`, then Add plugin.

## Set your channels

Set the **YouTube channels** option to your channel IDs, comma-separated. A channel ID starts with `UC`; you can name each one:

```
My Channel=UCxxxxxxxxxxxxxxxxxxxxxx, UCyyyyyyyyyyyyyyyyyyyyyy
```

## Limits

- Counts come from the public channel pages, which can lag behind YouTube Studio. (Version 0.1.0 used YouTube's RSS feed, which started answering 404 in November 2026.)
- Like every Claude Code mod, it runs with the same access as Claude Code. It only fetches your channels' `/videos` and `/shorts` pages on youtube.com.

## License

MIT
