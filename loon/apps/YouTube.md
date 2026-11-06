# YouTube settings

Personalize the player, captions and feeds from **Loon → Plugins → YouTube → Settings**.

[Install Loon and the plugin](https://github.com/showrovbd/youtubepremiumios#1-install-loon) · [Contact Showrov](https://t.me/montouch)

## Get started

1. In Loon, **Update** your existing YouTube plugin. Keep one enabled copy.
2. Open its settings and follow the setup instructions in the plugin description.
3. Choose a **Viewing Preset**, or keep **Custom** and select individual options.
4. Save, fully close YouTube, then reopen it. Reload feeds or videos to apply changes.

New options start off or use **Default / Any**. Existing appearance and navigation preferences remain available. Features depend on the controls, captions and audio tracks supplied by your YouTube version and the selected video.

## Choose a viewing preset

| Preset | Included preferences |
| :-- | :-- |
| **Custom** | Uses your individual settings. |
| **Focus** | Hides Shorts shelves, comments, related videos and end cards; disables autoplay. |
| **Learning** | Hides end cards, disables autoplay and transcript auto-scroll, shows transcript search, enlarges fullscreen captions and cleans share links. |
| **Music** | Hides end cards and info cards, disables ambient lighting, enables Quick Loop and prefers original audio when supplied. |

A preset overrides only the options listed above. Other individual settings still apply. Choose **Custom** to control every option individually. A matching channel profile takes precedence over the viewing preset; an active Focus schedule takes precedence over distraction settings.

## Player and appearance

| Setting | How to use it |
| :-- | :-- |
| **YouTube Premium Logo** | Shows the Premium wordmark in supported headers. Changes appearance only. |
| **Hide Shorts Tab** | Hides the Shorts navigation entry. |
| **Hide Create / Upload** | Hides the Create/upload navigation entry. |
| **Hide Immersive Music Tab** | Hides the immersive Music navigation entry. |
| **Hide End Cards** | Removes recommendations displayed at the end of a video. |
| **Hide Creator Logo** | Hides the separate creator logo overlay. Logos embedded in the video remain visible. |
| **Hide Info Cards** | Hides information-card teasers during playback. |
| **Disable Ambient Lighting** | Removes supported backgrounds around the player. |
| **Disable Autoplay** | Disables the supplied autoplay toggle and continuation. |
| **Playback Speed Menu** | Choose **Default**, **Up to 3x** or **Up to 4x**. Available playback rates depend on YouTube and its player. |
| **Quick Loop** | Moves YouTube’s existing Loop control into the main player settings menu when available. |
| **Transcript Shortcut** | Adds a Transcript action when a transcript panel is supplied. |

### Arrange player actions

Enter a comma-separated list in **Player Action Order**, for example:

```text
transcript,share,like,save
```

Actions omitted from the list follow in their usual order. Use **Hide Player Actions** to hide selected actions, for example `clip,remix,thanks`.

Supported names: `share`, `like`, `save`, `clip`, `remix`, `thanks`, `download`, `transcript`. Like and dislike stay together. The `download` name only arranges or hides YouTube’s existing action; it does not add download capability.

## Captions, audio and transcripts

| Setting | How to use it |
| :-- | :-- |
| **Caption Language** | Enter a language code: `bn` for Bangla, `en` for English, `ja` for Japanese or `es` for Spanish. Leave empty to keep YouTube’s preference. |
| **Allow Caption Translation** | Allows YouTube translation when your chosen language is missing and the video offers translation. |
| **Dual Captions** | Shows the original captions alongside your selected Caption Language. Enable captions in YouTube. |
| **Fullscreen Caption Size** | Choose **Larger**, **Standard** or **Default**. |
| **Caption Position** | Choose **Above controls**, **Standard** or **Default**. |
| **Audio Language** | Enter a supplied language code or `original`. Leave empty to keep YouTube’s preference. |
| **Transcript Auto-scroll** | Select **Off** to stop automatic scrolling in supported transcript panels. |
| **Show Transcript Search** | Shows the supplied transcript search box where available. |

For English and Bangla together, enter `bn` in **Caption Language**, enable **Dual Captions**, then open an English-captioned video and turn on captions. Translation may be unavailable or temporarily limited; original captions remain available. Audio preferences select existing tracks and do not create a translation or dub.

## Feeds and comments

| Setting | How to use it |
| :-- | :-- |
| **Hide Shorts Shelves** | Hides supported Shorts shelves in feeds. This is separate from Hide Shorts Tab. |
| **Hide Comments** | Hides supported comment panels and threads. |
| **Hide Related Videos** | Hides supported suggestions below the current video. |
| **Hide Video Keywords** | Enter comma-separated title words or phrases, such as `spoiler,trailer`. |
| **Hide Channels** | Enter comma-separated exact channel names or full channel IDs. |
| **Minimum Video Seconds** | Hide videos shorter than this duration. `300` means five minutes; `0` disables the minimum. |
| **Maximum Video Seconds** | Hide videos longer than this duration. `1200` means twenty minutes; `0` disables the maximum. |
| **Hide Live Videos** | Hides supported cards marked as live. |
| **Hide Comment Keywords** | Enter comma-separated words or phrases to hide matching comments locally. |
| **Spoiler Keywords** | Masks matching video titles and thumbnails while keeping the video link. |
| **Spoiler Channels** | Masks titles and thumbnails from exact channel names or full channel IDs. |
| **Subscriptions on Home** | Loads Subscriptions when a signed-in Home feed is requested. |

Duration filters apply to cards with a supplied duration. Keep the minimum at or below the maximum. Filtering and spoiler protection apply when supported content loads; they do not modify your account’s subscriptions or watch history.

## Search and sharing

| Setting | How to use it |
| :-- | :-- |
| **Default Search Date** | Choose **Any**, **Hour**, **Today**, **Week**, **Month** or **Year**. |
| **Default Search Type** | Choose **Any**, **Video**, **Channel** or **Playlist**. |
| **Default Search Duration** | Choose **Any**, **Under 4 minutes**, **4–20 minutes** or **Over 20 minutes**. |
| **Clean Share Links** | Removes the sharing tracking tag from Copy Link and iOS sharing, preserving supplied timestamps and playlists. |

Search defaults apply to new searches without existing filters. Filters chosen directly in YouTube are preserved.

## Schedules and channel profiles

**Focus Schedule** uses your iPhone’s local time. Enter one time window:

| Example | Active time |
| :-- | :-- |
| `weekdays 09:00-17:00` | Monday to Friday, 9 am to 5 pm. |
| `weekends 10:00-14:00` | Saturday and Sunday, 10 am to 2 pm. |
| `22:00-07:00` | Every night, 10 pm to 7 am. |

Leave empty to disable. An overnight window belongs to its starting day. During the window, Focus preferences apply to newly loaded content. Reload the feed or video when a window begins or ends.

**Channel Profiles** applies preferences while watching an identified channel. Use the channel’s full `UC…` ID, not its display name or `@handle`:

```text
CHANNEL_ID=Learning|captions:bn|audio:original
```

Replace `CHANNEL_ID` with the full channel ID. Separate profiles with semicolons:

```text
FIRST_CHANNEL_ID=Learning|captions:bn;SECOND_CHANNEL_ID=Music
```

Available presets are `Custom`, `Focus`, `Learning` and `Music`. Caption and audio overrides are optional. Profiles apply when the current video can be associated with its channel; they do not apply to every card in a mixed feed.

## Video information and community options

| Setting | What it provides |
| :-- | :-- |
| **Precise Video Information** | Displays supplied exact view counts and full publication dates on supported surfaces. |
| **Show Estimated Dislikes** | Displays Return YouTube Dislike estimates for the current video. |
| **DeArrow Titles** | Uses available community titles on supported video cards. |
| **DeArrow Thumbnails** | Uses available community thumbnails on supported video cards. |
| **Sponsor Timestamps** | Adds community segment timestamps to the video description. It does not automatically skip playback or add player timeline chapters. |
| **Segment Categories** | Select categories with a comma-separated list. Default: `sponsor,intro,outro`. |

Available categories: `sponsor`, `intro`, `outro`, `selfpromo`, `interaction`, `music_offtopic`, `preview`, `filler`.

Community options are optional and depend on coverage and service availability. They request video information from Return YouTube Dislike, DeArrow or SponsorBlock when enabled. Spoiler protection takes precedence over community titles and thumbnails.

## If an option does not appear

Confirm the plugin is updated, save its settings, and reopen YouTube. Try another video with the relevant feature, such as captions or a transcript. Use **Custom** and clear any schedule or channel profile when checking an individual switch.

For help, [Contact Showrov](https://t.me/montouch) with your YouTube version, plugin version, setting name and a brief description of what happens.
