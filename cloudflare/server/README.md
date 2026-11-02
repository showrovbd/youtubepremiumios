# Showrov server processing preview

This preview keeps the YouTube response processor on the Cloudflare Worker. The downloaded Shadowrocket response script contains a binary transport client, not the processor.

The original Worker and the working public baseline stay available. Install this preview using its own Worker configuration URL to test it separately.

## Data flow

For matching YouTube API responses up to 2 MiB, Shadowrocket sends the binary response body, a license key, and a fixed endpoint label to the Worker over HTTPS. The client does not forward the YouTube URL, cookies, authorization headers, or other YouTube headers. The response body itself can contain account or viewing information.

The Worker validates the key using the existing LicenseRegistry before its application reads or processes the body. Expired or revoked keys are rejected using Cloudflare's clock. Successful processing returns binary response data. No response bodies are stored in application storage or logged by this code.

Request URL blocking and redirects remain in the small key-checked request script. There are no unconditional static URL Rewrite or Map Local sections in the protected profile.

Network errors, oversized responses, invalid keys, and processing failures preserve ordinary YouTube traffic by skipping modifications. Expiry stops future processing; it cannot undo app settings or video responses already applied.

## Scope and limits

The server adapter uses the pinned archived processor and retains its Apache-2.0 attribution and license. Lyrics translation, caption translation, external fetches, and persistent learning of ad classifications are disabled in this preview. Its focus is ad response processing and background-play flags.

The Worker never offers its response processor as a downloadable script. Server authentication still applies when a client is edited. Public upstream scripts and earlier repository history remain available independently.

A real iPhone playback test and Cloudflare CPU checks are required. Local tests use synthetic protobuf data, not current real YouTube traffic. This design adds upload/download traffic and latency, and uses more Cloudflare requests and CPU than key-only validation. Free-plan quotas still apply.

## Deploy

The original showrov-youtube-keys Worker must exist in the same account. The preview binds to that Worker's existing SQLite-backed LicenseRegistry, so keys and expiry dates are shared. Its admin password should be the same private password.

Use Node.js 22 or newer:

    npm install
    npm run build:server
    npm run test:server
    npm run deploy:server

Configure the preview Worker's ADMIN_PASSWORD secret after deployment. The Worker denies service until the secret and binding are configured.

The preview Worker name is showrov-youtube-server. Open its /admin page to create a key and copy the preview configuration URL. The username is Showrov.

Repository pushes do not deploy either Worker automatically.
