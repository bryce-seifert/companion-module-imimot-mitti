## Mitti

Requires Companion 5.0 or newer.

**Basic Configuration**

- In Mitti > Settings... > OSC/UDP Controls, select "Enable"
- In the configuration page for the Mitti module in Companion, enter the IP address of the computer running Mitti

**Enabling Button Variables & Feedback**

- In Mitti > Settings... > OSC/UDP Controls, select **Companion-Mitti-Module** from the **Feedback To** dropdown
- If **Companion-Mitti-Module** is not an option, select **Custom** then follow the next steps:
  - For **IP** enter the IP address of the computer running Companion
  - For **Port** enter the port number that is present on the configuration page for the Mitti module in Companion. By default port `51001` is used
- _Optional: Enable **Feedback Alert** in the Companion module settings. This will show an error when Companion does not receive feedback from Mitti. Disable this feature if you do not plan on using the Feedback features._

![Mitti](images/mitti.png?raw=true 'Mitti')

**What's Included**

- **Actions** for playlist transport (play, pause, rewind, panic, goto), cue selection and navigation, playing cues by number / ID, name or index, playlist settings, fullscreen, video and audio outputs, the master fader and playhead
- **Cue actions** that change a cue's audio, volume, fades, loop, transition, goto, pause at beginning / end, playback speed, scale, position, crop, rotation and colour. Cue fields accept a cue number or ID, or `current`, `selected`, `previous`, `next` or `all`
- **Feedbacks** for play / pause status, the playing, active and selected cue, per-cue settings, time remaining on the playing cue, video and audio outputs, and whether Set In / Out from Playhead is available
- **Variables** for the current, previous, next and selected cue, play status, time remaining, time elapsed and total run time of the current cue, the current cue's settings, video and audio outputs, and a name variable for every cue in the playlist (`cue_<number>_cueName`)
- **Presets** for all of the above, including a "Play Cue by ID" button for every cue in the playlist

Many cue features require Mitti 2 or newer. Where a specific Mitti version is needed, the action or feedback description in Companion says so.
