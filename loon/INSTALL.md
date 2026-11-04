# Install your Showrov plugins

Follow the complete **[installation guide](https://github.com/showrovbd/youtubepremiumios/blob/loon-preview/README.md#getting-started)** for Loon installation, certificate trust and activation.

1. Install the paid Loon app. Contact [@montouch](https://t.me/montouch) for installation access or assistance.
2. Generate a certificate in Loon, install its profile in iOS Settings, then enable full trust under General → About → Certificate Trust Settings.
3. Enable JavaScript / Script, Rewrite and MitM in Loon. Select your trusted certificate and connect Loon.
4. Add the [plugins you want](https://github.com/showrovbd/youtubepremiumios/blob/loon-preview/loon/apps/README.md), enter each matching Access Key, save and enable them.
5. Close and reopen the target app. For Spotify, sign out and sign in again with Loon enabled, and use Normal audio quality.

Already use Loon? Keep your configuration and add plugins individually. The optional [starter profile](https://raw.githubusercontent.com/showrovbd/youtubepremiumios/loon-preview/loon/Showrov-All.conf) uses direct connections and replaces the selected configuration; export your existing configuration before switching. It includes no access keys or certificate. You may instead add the [plugin entries](https://github.com/showrovbd/youtubepremiumios/blob/loon-preview/loon/Showrov-Plugin-Entries.txt) to your existing configuration.

[Keys, renewals and support — Showrov](https://t.me/montouch)
