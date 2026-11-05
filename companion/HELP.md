# Imimot Mitti

This module will allow you to control [Mitti](https://imimot.com/mitti), a modern, feature-packed but easy-to-use pro video playback solution for live events and exhibitions.

## Requirements

- Mitti with OSC control enabled
- Bitfocus Buttons: v1.8.0 or newer
- Bitfocus Companion: v5.0.0 or newer
- Some features require specific a version of Mitti. The action or feedback description will contain information about version requirements if applicable.

## Basic Configuration

- In Mitti > Settings... > OSC/UDP Controls, select "Enable"
- In the configuration page for the Mitti module, choose your Mitti from the **Mitti Connection** dropdown. Mitti instances on the network are discovered automatically.
- If your Mitti isn't listed or you wish to manually setup the connection, select **Manual** and enter the IP address of the computer running Mitti in **IP Address**

## Enabling Button Variables & Feedbacks

- In Mitti > Settings... > OSC/UDP Controls, select **Bitfocus-Mitti-Module** from the **Feedback To** dropdown
- If **Bitfocus-Mitti-Module** is not an option, select **Custom** then follow the next steps:
  - For **IP** enter the IP address of the computer running Companion or Buttons
  - For **Port** enter the port number that is present on the configuration page for the Mitti module. By default port `51001` is used
- _Optional: Enable **Feedback Alert** in the module settings. This will show an error when the module does not receive feedback from Mitti. Disable this feature if you do not plan on using the Feedback features._

![Mitti](images/mitti.png?raw=true 'Mitti')

## What's Included

- **Actions** for playlist transport (play, pause, rewind, panic, goto), cue selection and navigation, playing cues by number / ID, name or index, playlist settings, fullscreen, video and audio outputs, the master fader and playhead
- **Cue actions** that change a cue's audio, volume, fades, loop, transition, goto, pause at beginning / end, playback speed, scale, position, crop, rotation and colour. Cue fields accept a cue number or ID, or `current`, `selected`, `previous`, `next` or `all`
- **Feedbacks** for play / pause status, the playing, active and selected cue, per-cue settings, time remaining on the playing cue, video and audio outputs, and whether Set In / Out from Playhead is available
- **Variables** for the current, previous, next and selected cue, play status, time remaining, time elapsed and total run time of the current cue, the current cue's settings, video and audio outputs, and a name variable for every cue in the playlist (`cue_<number>_cueName`)
- **Presets** for all of the above, including a "Play Cue by ID" button for every cue in the playlist

## Preset Appearance

Presets use neutral charcoal backgrounds, softer gray context labels and large actions or live values. Cue names automatically shrink to fit their own area. Transport presets are available with matching icons or text, and rotary presets show what turning and pressing the knob will do.

Settings with reported state display On / Off, or Muted / Unmuted for cue audio; pressing the button toggles the setting. Settings whose state Mitti does not report retain a Toggle label. Pause / Resume shows the action that pressing it will perform, and the Selected Cue display plays the selected cue on press. Dedicated reset buttons restore speed to 100% and volume to 0 dB.

Unknown states stay neutral until feedback arrives, and missing live values display `—`. Cue Audio provides explicit Mute and Unmute buttons, separate from Audio Out. Speed and volume adjustments follow the order: live display, decrease, increase, reset, rotary.

Play Playlist lights green while playing. Play Selected and the Selected Cue display light green only when the selected cue is the one currently playing. Both icon and text transport presets show this feedback.

- **Green**: playing
- **Cyan text and accents**: an enabled setting or active cue
- **Cyan left-edge marker**: a selected cue
- **Gray**: an Off setting
- **Amber**: paused, muted cue audio, an inactive output, or 10 seconds or less remaining
- **Red**: Panic, or 5 seconds or less remaining
- **Dim text**: Set In / Out from Playhead is unavailable

The countdown stays readable throughout, with a single dim pulse at 1 second remaining. Elapsed and remaining time displays include a progress strip in Companion when duration and elapsed time are available. The volume status display keeps the dB value visible alongside the current cue's mute status. Cue names stay white, with cyan reserved for their context labels and selection markers. Bitfocus Buttons uses a simpler text layout with the same actions and state colors.

Existing buttons retain their saved appearance. Add a fresh preset to use the new design.
