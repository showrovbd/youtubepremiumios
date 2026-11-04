# Install all five plugins

[Open the all-five profile in Loon](https://www.nsloon.com/openloon/import?sub=https%3A%2F%2Fraw.githubusercontent.com%2Fshowrovbd%2Fyoutubepremiumios%2Floon-preview%2Floon%2FShowrov-All-v10-v5-v3.conf) · [Download the file](Showrov-All-v10-v5-v3.conf)

This imports a configuration profile with five separate plugins. Selecting it uses direct connections and system DNS; it does not append to your current proxy/routing configuration. Export your current configuration first.

To keep your current proxy rules and certificate, copy the five entries from [this list](Showrov-Plugin-Entries.txt) into the existing configuration's `[Plugin]` section instead. Add that section only if absent; disable/remove older copies of these five plugins.

1. Use Loon 3.5.3 (1014) or newer. Import the profile and let Loon download its five plugins.
2. Enter each app's matching access key in its plugin settings. Keys are separate and are not included in the file.
3. Ensure your own Loon certificate is selected and trusted and HTTPS decryption, Rewrite and Script are enabled. The file does not include a certificate.
4. Open the apps to test. New Spotify/Picsart/Alight Motion/Truecaller access notices default to **Manual only**; use each plugin's Access script for one result. Optional **Status changes** mode reports changed results once. Disable older plugin copies to stop their old scheduled notices.

YouTube is the exact working v10. Spotify v5 is a seek comparison, with an album/artist layout switch; seeking is not confirmed fixed and ads may appear. The import itself still needs an iPhone check. Contact: [Showrov](https://t.me/montouch).
