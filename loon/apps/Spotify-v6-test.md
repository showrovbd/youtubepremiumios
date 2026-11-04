# Spotify v6 seeking test

V5 still advanced to the next track when seeking. V6 aligns the newer playback-license setting with the existing one; it needs an iPhone test.

1. Disable every older Spotify plugin copy, import [v6](Showrov-Spotify-v6-test.lpxe), and enter the same Spotify key.
2. Keep Normal audio quality and restart Spotify. If old account settings persist, sign out/in once.
3. Confirm version 6 at `https://showrov-youtube-keys.showrovbd.workers.dev/health?loonapp=spotify&rev=6`.
4. Play a song and drag to its middle. Report whether it stays on the track, jumps, or disables seeking; also check Previous.

The network rules, quiet notifications and other apps are unchanged. Ads may appear during this comparison. Support: [Showrov](https://t.me/montouch).
