# Showrov YouTube configuration

The author of `youtube-test.conf` is Showrov. That file is the original YouTube-only extraction used for the working baseline. Its rules, original script links, and options remain intact.

The Cloudflare project creates a separate key-controlled configuration. It requires an active key to download/update the configuration, download its scripts, and execute each protected script action. No local license cache is used. Invalid keys or validation failures leave normal YouTube traffic unmodified.

## Deploy on Cloudflare

1. In Cloudflare, open **Workers & Pages → Create application → Import a repository** and connect GitHub.
2. Select **showrovbd/youtubepremiumios**, production branch **main**, and repository root.
3. Set the Worker name to **showrov-youtube-keys**.
4. Set **Build command** to `npm test` and **Deploy command** to `npm run deploy`. Use Node.js 22 or newer. Save and deploy.
5. Open the Worker’s **Settings → Variables and Secrets → Add**. Add a **Secret** named `ADMIN_PASSWORD` with a password of at least 32 characters, then deploy the secret change.
6. Open the Worker’s `/admin` page. Sign in with username **Showrov** and your `ADMIN_PASSWORD`.
7. Create an expiring key and copy its configuration URL. Share that URL with its owner.

Wrangler creates the SQLite-backed `LicenseRegistry` Durable Object and the `LICENSES` binding through the included migration. This uses features available on Cloudflare’s free plan, subject to that plan’s limits. The service denies access until the admin secret and binding are configured.

Keep passwords and Cloudflare tokens out of this repository and out of chat.

## Install the protected version

Download the generated Worker URL using Shadowrocket’s **Config → +**. Select and use/compile that configuration, set global routing to **Config**, and enable HTTPS decryption for it using a locally generated, installed, trusted certificate.

The Worker generates both script entries as single physical lines. Use the admin page’s **Copy link** button to avoid copying wrapped terminal output.

The protected version needs a separate iPhone playback test. It removes static URL rewrites and local mappings from the downloaded configuration and performs their actions inside the key-checked request script. It retains the original UDP transport rules and MITM host list. Response processing uses a reachable archived script with runtime validation wrapped around it. The original missing JavaScript link is not used by the protected build.

## Key behavior and limits

- The admin page creates one key per person, with an expiry from 1 to 3650 days, and can revoke it.
- Only SHA-256 key digests and license metadata are stored. Complete keys are returned only when created.
- Download and update requests are checked on the server. Each protected script action makes a fresh HTTPS validation request, with a five-second timeout.
- Only the license key is sent to the key service. YouTube request URLs, headers, and response bodies are not sent there.
- Revocation prevents future protected actions. It cannot undo responses or settings already applied, or stop buffered playback immediately.
- Obfuscation discourages casual editing; it is not encryption or tamper-proof licensing. A recipient can alter the client, share a key, or use public alternatives.
- The public baseline file and earlier public Git history remain accessible. The key gate protects the Cloudflare-served build, not every copy of the original configuration. Repository visibility has not been changed.

## Development

```sh
npm install
npm test
npm run build:clients
npm test
```

Prebuilt obfuscated client files are committed, so normal deployment does not need to rebuild them. Rebuild and test after changing the client template or configuration rules. The build checks the archived response script’s SHA-256.

Tests use Node.js and an in-memory Durable Object storage model. They cover key lifecycle, route access checks, client validation, pass-through behavior, URL rewriting, and a synthetic protobuf response. They do not replace an on-device test or a deployment check on Cloudflare.

## Upstream sources

- Original configuration: https://raw.githubusercontent.com/Gaucuto/ver2promax/refs/heads/main/10in1
- Archived response script: https://raw.githubusercontent.com/Phuocdz28/Module_IOS/34865755c1aee7ba770c1afa364254d8924cfd85/js/youtube.response.js
- Archived script SHA-256: `5762e310cd546084f172828d827e16b1db36d1677a692c5de4f1a476c3bd89e6`
- The original script history credits duyvinh09 and the YouTube Enhance project by Maasea. The retained upstream license is in `cloudflare/vendor/LICENSE` and is available at the deployed Worker’s `/licenses` endpoint.
- The archived source file is unchanged. Generated distributions add the Showrov key-validation wrapper and obfuscation.
