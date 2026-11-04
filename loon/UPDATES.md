# Install once, update in Loon

Use one permanent URL per plugin:

| Plugin | Download URL |
| --- | --- |
| YouTube | [Showrov-YouTube.lpxe](https://raw.githubusercontent.com/showrovbd/youtubepremiumios/loon-preview/loon/apps/Showrov-YouTube.lpxe) |
| Spotify | [Showrov-Spotify.lpxe](https://raw.githubusercontent.com/showrovbd/youtubepremiumios/loon-preview/loon/apps/Showrov-Spotify.lpxe) |
| Picsart | [Showrov-PicsArt.lpxe](https://raw.githubusercontent.com/showrovbd/youtubepremiumios/loon-preview/loon/apps/Showrov-PicsArt.lpxe) |
| Alight Motion | [Showrov-AlightMotion.lpxe](https://raw.githubusercontent.com/showrovbd/youtubepremiumios/loon-preview/loon/apps/Showrov-AlightMotion.lpxe) |
| Truecaller | [Showrov-Truecaller.lpxe](https://raw.githubusercontent.com/showrovbd/youtubepremiumios/loon-preview/loon/apps/Showrov-Truecaller.lpxe) |

For a first installation, add each wanted plugin once and enter its matching key. For an existing entry, compare its download URL with the table. If it differs, edit that entry’s URL once, save, then run Update. Keep its key and settings, and disable duplicate copies. Old commit-pinned URLs stay on their original version; the old YouTube location and numbered test paths are archived.

After this one-time setup, use Loon’s Update action on the same entry whenever a release is published. Its filename and URL stay the same during testing, improvements and rollbacks. Confirm the version in the plugin description after updating.

We save every confirmed working version before modifying it. The revised package replaces the active file; a rollback restores the saved bytes to that same URL. YouTube v10 is confirmed working. Spotify v7 seeking and the other app releases still need device tests; Spotify ads may appear during testing.

Keep the current routing and certificate by changing only the existing plugin URLs, or use the [plugin entries](Showrov-Plugin-Entries.txt). The optional [all-five profile](INSTALL.md) uses direct connections and system DNS. [Keys and support](https://t.me/montouch).

Current Spotify test: after Update shows Version 7, restart Spotify and play three songs for at least 30 seconds each without seeking. Then try Previous and seeking. Report any automatic skips or disabled controls; this is not yet a confirmed playback fix.
