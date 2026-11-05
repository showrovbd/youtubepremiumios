# YouTube downloads

Save a YouTube video as **MP4**, or export its audio as **M4A** with your preferred bitrate.

> **Preview:** iPhone compatibility has not yet been confirmed. This optional companion requires a one-time setup in a-Shell and Shortcuts.

| Option | Choices |
| :-- | :-- |
| Video | Available MP4 resolutions, including 360p, 720p and 1080p when offered by the video |
| Audio | 64, 96, 128, **192**, 256 or 320 kbps; 192 kbps is the default |
| Save | Files; compatible MP4 videos can also be saved to Photos |

Audio bitrates are export targets. A higher setting creates a larger file and cannot restore quality missing from the original. Available video resolutions vary by video. Download content you own or have permission to save.

## 1. Install a-Shell

Install **[a-Shell from the App Store](https://apps.apple.com/app/a-shell/id1473805438)** and open it once. Use the latest version. Also keep Apple's **Shortcuts** app installed.

## 2. Set up downloads

Copy each line below into a-Shell and press **Return**. Wait for each command to finish before continuing.

```sh
mkdir -p ~/Documents/ShowrovDownloads
```

```sh
curl -fL --retry 2 https://raw.githubusercontent.com/showrovbd/youtubepremiumios/loon-preview/loon/companions/youtube-download/Showrov-Download.pyz -o ~/Documents/ShowrovDownloads/Showrov-Download.pyz
```

```sh
pip install -U yt-dlp yt-dlp-ejs yt-dlp-apple-webkit-jsi certifi
```

```sh
python ~/Documents/ShowrovDownloads/Showrov-Download.pyz --check
```

Continue when you see **Setup check passed**. If a command fails, stop and **[Contact Showrov](https://t.me/montouch)** with the error message.

## 3. Add your Share shortcut

Create this shortcut directly on your iPhone:

1. Open **Shortcuts**, tap **+**, and name it **Showrov Download**.
2. Open its **Details** and enable **Show in Share Sheet**. Accept **URLs** and **Text** as input.
3. Add the **Base64 Encode** action. Set it to **Encode Shortcut Input** and set **Line Breaks → None**.
4. Add a-Shell's **Execute Command** action. Set its execution mode to **In App**.
5. Enter the command below. Replace `[Base64 Encoded]` with the **Base64 Encoded variable** from the previous action, using the variable picker. Keep the quotation marks around that variable.

```sh
python ~/Documents/ShowrovDownloads/Showrov-Download.pyz --url-base64 "[Base64 Encoded]"
```

Save the shortcut. The finished shortcut has **two actions**: Base64 Encode, then Execute Command.

## 4. Download a video or audio

1. In **YouTube**, open a video and tap **Share → More → Showrov Download**.
2. a-Shell opens. Enter the number for **Video** or **Audio**, then press **Return**.
3. Select an available video resolution or your audio bitrate in the same way. Press Return without a number to use the highlighted default. Enter **q** to cancel.
4. Keep a-Shell open and the iPhone awake until downloading and exporting finish.
5. In the share sheet, choose **Save to Files** and a folder, or choose **Save Video** to add a compatible MP4 to **Photos**. Allow Photos access if asked.

A copy also stays in **Files → On My iPhone → a-Shell → ShowrovDownloads**. You can open it and tap **Share** again later. Audio files belong in Files; Photos does not store audio-only M4A files.

To download without the Share shortcut, run this in a-Shell and paste the video link when asked:

```sh
python ~/Documents/ShowrovDownloads/Showrov-Download.pyz
```

## Help and updates

- **Shortcut missing from Share:** check that Show in Share Sheet is enabled and URLs/Text are accepted. In YouTube, tap More to open the iPhone share sheet.
- **No compatible MP4 quality:** try another video. The video menu shows available H.264/AAC formats for iPhone playback; it does not upscale videos or promise 4K.
- **Sign-in or unavailable-video message:** some videos cannot be downloaded. Try a public video that does not require sign-in.
- **Download interrupted:** keep a-Shell in the foreground and start again. Completed files are kept; interrupted downloads are not resumed.
- **Save Video missing:** save to Files and open the completed MP4 there. Photos export depends on the file and your device.
- **Update:** repeat the download, package-install and setup-check commands in step 2. Your completed files stay in ShowrovDownloads. Loon's Update action updates the Loon plugin separately.
- **Remove:** delete the Showrov Download shortcut and the ShowrovDownloads folder after moving any files you want to keep.

For setup assistance, **[Contact Showrov](https://t.me/montouch)**.

[Third-party notices](NOTICE.txt) · [Download checksum](SHA256SUMS)
