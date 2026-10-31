import type {
	CompanionPresetDefinitions,
	CompanionPresetSection,
	CompanionSimplePresetDefinition,
	CompanionTextSize,
	SomePresetActionEntry,
	SomePresetSimpleFeedbackEntry,
} from '@companion-module/base'
import {
	ColorBlack,
	ColorGreen,
	ColorLime,
	ColorOrange,
	ColorRed,
	ColorWhite,
	ColorYellow,
	MittiBlue,
	MittiGray,
	pauseIcon,
	playIcon,
	playlistCueIDs,
	playPauseIcon,
	playPlaylistIcon,
	skipBackwardIcon,
	skipForwardIcon,
} from './utils.js'
import type MittiInstance from './main.js'
import type { ModuleSchema } from './main.js'

type PresetAction = SomePresetActionEntry<ModuleSchema>
type PresetFeedback = SomePresetSimpleFeedbackEntry<ModuleSchema>
type Presets = Record<string, CompanionSimplePresetDefinition<ModuleSchema>>

interface ButtonPreset {
	name: string
	text: string
	size: CompanionTextSize
	bgcolor?: number
	icon?: string
	down?: PresetAction[]
	rotateLeft?: PresetAction[]
	rotateRight?: PresetAction[]
	feedbacks?: PresetFeedback[]
}

// Every preset is a single-step button with white text, black by default
function button({
	name,
	text,
	size,
	bgcolor = ColorBlack,
	icon,
	down = [],
	rotateLeft,
	rotateRight,
	feedbacks = [],
}: ButtonPreset): CompanionSimplePresetDefinition<ModuleSchema> {
	return {
		type: 'simple',
		name,
		options: {},
		style: {
			text,
			size,
			color: ColorWhite,
			bgcolor,
			...(icon && { png64: icon, pngalignment: 'center:center' }),
		},
		steps: [{ down, up: [], ...(rotateLeft && rotateRight && { rotate_left: rotateLeft, rotate_right: rotateRight }) }],
		feedbacks,
	}
}

// A section shows its presets directly, or split into named groups
type PresetSection = { id: string; name: string } & (
	{ presets: Presets } | { groups: { id: string; name: string; presets: Presets }[] }
)

const StaticSections: PresetSection[] = [
	{
		id: 'playlistActions',
		name: 'Playlist Actions',
		groups: [
			{
				id: 'playlistGraphics',
				name: 'Transport Control - Icons',
				presets: {
					playSelected: button({
						name: 'Play Selected',
						text: '',
						size: '18',
						icon: playIcon,
						down: [{ actionId: 'play_select', options: { forceCut: false } }],
					}),
					playPlaylist: button({
						name: 'Play Playlist',
						text: '',
						size: '14',
						icon: playPlaylistIcon,
						down: [{ actionId: 'play', options: {} }],
					}),
					pause: button({
						name: 'Pause',
						text: '',
						size: '14',
						icon: pauseIcon,
						down: [{ actionId: 'stop', options: {} }],
					}),
					jumpPrevious: button({
						name: 'Jump to previous',
						text: '',
						size: '14',
						icon: skipBackwardIcon,
						down: [{ actionId: 'jump_prev', options: {} }],
					}),
					jumpNext: button({
						name: 'Jump to next',
						text: '',
						size: '14',
						icon: skipForwardIcon,
						down: [{ actionId: 'jump_next', options: {} }],
					}),
					pauseResume: button({
						name: 'Pause / Resume',
						text: '',
						size: '14',
						icon: playPauseIcon,
						down: [{ actionId: 'toggle_play', options: {} }],
						feedbacks: [
							{ feedbackId: 'playStatus', options: { playPause: 'Playing' }, style: { bgcolor: ColorLime } },
							{ feedbackId: 'playStatus', options: { playPause: 'Paused' }, style: { bgcolor: ColorYellow } },
						],
					}),
				},
			},
			{
				id: 'playlistText',
				name: 'Transport Control - Text',
				presets: {
					playSelectedText: button({
						name: 'Play Selected',
						text: 'Play Selected',
						size: '14',
						bgcolor: ColorGreen,
						down: [{ actionId: 'play_select', options: { forceCut: false } }],
					}),
					playPlaylistText: button({
						name: 'Play Playlist',
						text: 'Play Playlist',
						size: '14',
						down: [{ actionId: 'play', options: {} }],
					}),
					pauseText: button({ name: 'Pause', text: 'Pause', size: '14', down: [{ actionId: 'stop', options: {} }] }),
					pauseResumeText: button({
						name: 'Pause / Resume',
						text: 'Pause / Resume',
						size: '14',
						down: [{ actionId: 'toggle_play', options: {} }],
					}),
					rewindText: button({
						name: 'Rewind',
						text: 'Rewind',
						size: '14',
						down: [{ actionId: 'rewind', options: {} }],
					}),
					panic: button({
						name: 'Panic',
						text: 'Panic',
						size: '14',
						bgcolor: ColorRed,
						down: [{ actionId: 'panic', options: {} }],
					}),
					goTo30: button({
						name: 'Goto 30',
						text: 'Goto\\n30',
						size: '14',
						down: [{ actionId: 'goto_30', options: {} }],
					}),
					goTo20: button({
						name: 'Goto 20',
						text: 'Goto\\n20',
						size: '14',
						down: [{ actionId: 'goto_20', options: {} }],
					}),
					goTo10: button({
						name: 'Goto 10',
						text: 'Goto\\n10',
						size: '14',
						down: [{ actionId: 'goto_10', options: {} }],
					}),
					scrubPlayheadRotary: button({
						name: 'Scrub Playhead - Rotary Knob',
						text: 'Scrub Playhead- Rotary Knob',
						size: 12,
						down: [{ actionId: 'scrubPlayhead', options: { value: '+01:00' } }],
						rotateLeft: [{ actionId: 'scrubPlayhead', options: { value: '-01:00' } }],
						rotateRight: [{ actionId: 'scrubPlayhead', options: { value: '+01:00' } }],
					}),
					scrubPlayheadMinusOne: button({
						name: 'SCRUB -1 Seconds',
						text: 'SCRUB\n-1\nSeconds',
						size: 12,
						down: [{ actionId: 'scrubPlayhead', options: { value: '-01:00' } }],
					}),
					scrubPlayheadPlusOne: button({
						name: 'SCRUB +1 Seconds',
						text: 'SCRUB\n+1\nSeconds',
						size: 12,
						down: [{ actionId: 'scrubPlayhead', options: { value: '+01:00' } }],
					}),
				},
			},
			{
				id: 'playlistTextMain',
				name: 'Playlist Settings',
				presets: {
					togglePlaylistLoop: button({
						name: 'Toggle Playlist Loop',
						text: 'Toggle\\nPlaylist\\nLoop',
						size: '14',
						down: [{ actionId: 'plLoopToggle', options: {} }],
					}),
					playlistLoopOn: button({
						name: 'Playlist Loop On',
						text: 'Playlist\\nLoop\\nOn',
						size: '14',
						down: [{ actionId: 'plLoopOn', options: {} }],
					}),
					playlistLoopOff: button({
						name: 'Playlist Loop Off',
						text: 'Playlist\\nLoop\\nOff',
						size: '14',
						down: [{ actionId: 'plLoopOff', options: {} }],
					}),
					toggleTransitionOnPlay: button({
						name: 'Toggle Transition on Play',
						text: 'Toggle\\nTransition',
						size: '14',
						down: [{ actionId: 'plTransToggle', options: {} }],
					}),
					transitionOnPlayOff: button({
						name: 'Transition on Play Off',
						text: 'Playlist\\nTransition\\nOff',
						size: '14',
						down: [{ actionId: 'plTransOff', options: {} }],
					}),
					transitionOnPlayOn: button({
						name: 'Transition on Play On',
						text: 'Playlist\\nTransition\\nOn',
						size: '14',
						down: [{ actionId: 'plTransOn', options: {} }],
					}),
				},
			},
			{
				id: 'playlistTextCueNav',
				name: 'Cue Navigation',
				presets: {
					jumpPreviousText: button({
						name: 'Jump to previous',
						text: 'Jump to previous',
						size: '14',
						down: [{ actionId: 'jump_prev', options: {} }],
					}),
					jumpNextText: button({
						name: 'Jump to next',
						text: 'Jump to next',
						size: '14',
						down: [{ actionId: 'jump_next', options: {} }],
					}),
					jumpSelected: button({
						name: 'Jump to selected',
						text: 'Jump\\nSelected',
						size: '14',
						down: [{ actionId: 'jump_selected', options: {} }],
					}),
					selectPrevious: button({
						name: 'Select previous',
						text: 'Select\\nPrevious',
						size: '14',
						down: [{ actionId: 'select_prev', options: {} }],
					}),
					selectNext: button({
						name: 'Select next',
						text: 'Select\\nNext',
						size: '14',
						down: [{ actionId: 'select_next', options: {} }],
					}),
				},
			},
		],
	},
	{
		id: 'cueActions',
		name: 'Cue Actions',
		presets: {
			playCue: button({
				name: 'Play Cue',
				text: 'Play\\nCue\\n(Number)',
				size: '14',
				bgcolor: ColorGreen,
				down: [{ actionId: 'play_cue', options: { cuenumber: 'current', forceCut: false } }],
			}),
			jumpToCueWithNamePlay: button({
				name: 'Jump to cue with (name) and Play',
				text: 'Play\\nCue\\n(Name)',
				size: '14',
				bgcolor: ColorGreen,
				down: [{ actionId: 'playCueName', options: { forceCut: false, string: '' } }],
			}),
			jumpToCueWithName: button({
				name: 'Jump to cue with name',
				text: 'Jump\\nCue\\n(Name)',
				size: '14',
				down: [{ actionId: 'jumpCueName', options: { string: '' } }],
			}),
			jumpToSpecificCue: button({
				name: 'Jump to specific cue',
				text: 'Jump\\nCue\\n(Number)',
				size: '14',
				down: [{ actionId: 'jump_cue', options: { cuenumber: 'current' } }],
			}),
			selectCue: button({
				name: 'Select cue',
				text: 'Select\\nCue\\n(Number)',
				size: '14',
				down: [{ actionId: 'select_cue', options: { cuenumber: 'current' } }],
			}),
		},
	},
	{
		id: 'currentCueActions',
		name: 'Current Cue Actions',
		groups: [
			{
				id: 'currentPlayback',
				name: 'Cue Playback Options',
				presets: {
					toggleFadeIn: button({
						name: 'Toggle Fade In',
						text: 'Toggle\\nFade\\nIn',
						size: '14',
						down: [{ actionId: 'toggleFadeIn', options: { cuenumber: 'current' } }],
					}),
					fadeInOn: button({
						name: 'Fade In On',
						text: 'Fade\\nIn\\nOn',
						size: '14',
						down: [{ actionId: 'fadeInOn', options: { cuenumber: 'current' } }],
					}),
					fadeInOff: button({
						name: 'Fade In Off',
						text: 'Fade\\nIn\\nOff',
						size: '14',
						down: [{ actionId: 'fadeInOff', options: { cuenumber: 'current' } }],
					}),
					toggleFadeOut: button({
						name: 'Toggle Fade Out',
						text: 'Toggle\\nFade\\nOut',
						size: '14',
						down: [{ actionId: 'toggleFadeOut', options: { cuenumber: 'current' } }],
					}),
					fadeOutOn: button({
						name: 'Fade Out On',
						text: 'Fade\\nOut\\nOn',
						size: '14',
						down: [{ actionId: 'fadeOutOn', options: { cuenumber: 'current' } }],
					}),
					fadeOutOff: button({
						name: 'Fade Out Off',
						text: 'Fade\\nOut\\nOff',
						size: '14',
						down: [{ actionId: 'fadeOutOff', options: { cuenumber: 'current' } }],
					}),
					toggleLoop: button({
						name: 'Toggle Loop',
						text: 'Toggle\\nLoop',
						size: '14',
						down: [{ actionId: 'toggleLoop', options: { cuenumber: 'current' } }],
					}),
					loopOn: button({
						name: 'Loop On',
						text: 'Loop\\nOn',
						size: '14',
						down: [{ actionId: 'loopOn', options: { cuenumber: 'current' } }],
					}),
					loopOff: button({
						name: 'Loop Off',
						text: 'Loop\\nOff',
						size: '14',
						down: [{ actionId: 'loopOff', options: { cuenumber: 'current' } }],
					}),
					togglePauseAtBeginning: button({
						name: 'Toggle Pause at Beginning',
						text: 'Toggle\\nPause\\nBeginning',
						size: '14',
						down: [{ actionId: 'togglePauseAtBeginning', options: { cuenumber: 'current' } }],
					}),
					pauseAtBeginningOn: button({
						name: 'Pause At Beginning On',
						text: 'Pause\\nBeginning\\nOn',
						size: '14',
						down: [{ actionId: 'pauseAtBeginningOn', options: { cuenumber: 'current' } }],
					}),
					pauseAtBeginningOff: button({
						name: 'Pause At Beginning Off',
						text: 'Pause\\nBeginning\\nOff',
						size: '14',
						down: [{ actionId: 'pauseAtBeginningOff', options: { cuenumber: 'current' } }],
					}),
					togglePauseAtEnd: button({
						name: 'Toggle Pause at End',
						text: 'Toggle\\nPause\\nEnd',
						size: '14',
						down: [{ actionId: 'togglePauseAtEnd', options: { cuenumber: 'current' } }],
					}),
					pauseAtEndOn: button({
						name: 'Pause At End On',
						text: 'Pause\\nEnd\\nOn',
						size: '14',
						down: [{ actionId: 'pauseAtEndOn', options: { cuenumber: 'current' } }],
					}),
					pauseAtEndOff: button({
						name: 'Pause At End Off',
						text: 'Pause\\nEnd\\nOff',
						size: '14',
						down: [{ actionId: 'pauseAtEndOff', options: { cuenumber: 'current' } }],
					}),
					toggleTransition: button({
						name: 'Toggle Transition',
						text: 'Toggle\\nTransition',
						size: '14',
						down: [{ actionId: 'toggleTransition', options: { cuenumber: 'current' } }],
					}),
					transitionOn: button({
						name: 'Transition On',
						text: 'Transition\\nOn',
						size: '14',
						down: [{ actionId: 'transitionOn', options: { cuenumber: 'current' } }],
					}),
					transitionOff: button({
						name: 'Transition Off',
						text: 'Transition\\nOff',
						size: '14',
						down: [{ actionId: 'transitionOff', options: { cuenumber: 'current' } }],
					}),
					toggleVideoFX: button({
						name: 'Toggle VideoFx',
						text: 'Toggle\\nVideoFx',
						size: '14',
						down: [{ actionId: 'toggleVideoFx', options: { cuenumber: 'current' } }],
					}),
					videoFXOn: button({
						name: 'VideoFx On',
						text: 'VideoFx\\nOn',
						size: '14',
						down: [{ actionId: 'videoFxOn', options: { cuenumber: 'current' } }],
					}),
					videoFXOff: button({
						name: 'VideoFx Off',
						text: 'VideoFx\\nOff',
						size: '14',
						down: [{ actionId: 'videoFxOff', options: { cuenumber: 'current' } }],
					}),
				},
			},
			{
				id: 'currentInOut',
				name: 'Cue In / Out',
				presets: {
					setInFromPlayhead: button({
						name: 'Set In From Playhead',
						text: 'Set IN From Playhead',
						size: '14',
						down: [{ actionId: 'setInFromPlayhead', options: {} }],
						feedbacks: [
							{ feedbackId: 'inFromPlayheadEnabled', isInverted: true, options: {}, style: { bgcolor: MittiGray } },
						],
					}),
					setOutFromPlayhead: button({
						name: 'Set Out From Playhead',
						text: 'Set OUT From Playhead',
						size: '14',
						down: [{ actionId: 'setOutFromPlayhead', options: {} }],
						feedbacks: [
							{ feedbackId: 'outFromPlayheadEnabled', isInverted: true, options: {}, style: { bgcolor: MittiGray } },
						],
					}),
				},
			},
			{
				id: 'currentCuePlaybackSpeed',
				name: 'Cue Playback Speed',
				presets: {
					currentCuePlaybackSpeedStatus: button({
						name: 'Current Cue Playback Speed',
						text: 'Current Speed:\n$(mitti:currentCuePlaybackSpeed)%',
						size: 12,
					}),
					currentCuePlaybackRotary: button({
						name: 'Cue Playback Speed - Rotary Knob',
						text: 'Playback Speed - Rotary Knob',
						size: 12,
						down: [{ actionId: 'playbackSpeed', options: { cuenumber: 'current', value: 100 } }],
						rotateLeft: [{ actionId: 'adjustPlaybackSpeed', options: { value: -5 } }],
						rotateRight: [{ actionId: 'adjustPlaybackSpeed', options: { value: 5 } }],
					}),
					currentCuePlaybackMinusFive: button({
						name: 'Current Cue -5%',
						text: 'Playback Speed\n -5%',
						size: 12,
						down: [{ actionId: 'adjustPlaybackSpeed', options: { value: -5 } }],
					}),
					currentCuePlaybackPlusFive: button({
						name: 'Current Cue +5%',
						text: 'Playback Speed\n +5%',
						size: 12,
						down: [{ actionId: 'adjustPlaybackSpeed', options: { value: 5 } }],
					}),
				},
			},
			{
				id: 'currentCueVolume',
				name: 'Cue Audio / Volume',
				presets: {
					toggleAudio: button({
						name: 'Toggle Audio',
						text: 'Toggle\\nAudio',
						size: '14',
						down: [{ actionId: 'toggleAudio', options: { cuenumber: 'current' } }],
					}),
					audioOn: button({
						name: 'Audio On',
						text: 'Audio\\nOn',
						size: '14',
						down: [{ actionId: 'audioOn', options: { cuenumber: 'current' } }],
					}),
					audioOff: button({
						name: 'Audio Off',
						text: 'Audio\\nOff',
						size: '14',
						down: [{ actionId: 'audioOff', options: { cuenumber: 'current' } }],
					}),
					currentCueVolumeRotary: button({
						name: 'Cue Volume - Rotary Knob',
						text: 'Cue Volume - Rotary Knob',
						size: 12,
						down: [{ actionId: 'volume', options: { cuenumber: 'current', value: 0 } }],
						rotateLeft: [{ actionId: 'adjustVolume', options: { value: -1 } }],
						rotateRight: [{ actionId: 'adjustVolume', options: { value: 1 } }],
					}),
					currentCueVolumeMinusOne: button({
						name: 'Current Cue -1 dB',
						text: 'Volume\n -1 dB',
						size: 12,
						down: [{ actionId: 'adjustVolume', options: { value: -1 } }],
					}),
					currentCueVolumePlusOne: button({
						name: 'Current Cue +1 dB',
						text: 'Volume\n +1 dB',
						size: 12,
						down: [{ actionId: 'adjustVolume', options: { value: 1 } }],
					}),
				},
			},
		],
	},
	{
		id: 'playlistStatus',
		name: 'Playlist Status',
		presets: {
			currentCueStatus: button({ name: 'Current Cue', text: 'Current:\\n$(mitti:currentCueName)', size: 'auto' }),
			previousCueStatus: button({ name: 'Previous Cue', text: 'Prev:\\n$(mitti:previousCueName)', size: 'auto' }),
			nextCueStatus: button({ name: 'Next Cue', text: 'Next:\\n$(mitti:nextCueName)', size: 'auto' }),
			playStauts: button({
				name: 'Play Status',
				text: '$(mitti:playStatus)',
				size: '18',
				feedbacks: [
					{
						feedbackId: 'playStatus',
						options: { playPause: 'Playing' },
						style: { bgcolor: ColorGreen, color: ColorWhite },
					},
				],
			}),
			currentCueTRT: button({
				name: 'Current Cue - Total Run Time',
				text: 'TRT:\\n$(mitti:currentCueTRT)',
				size: '14',
			}),
			currentCueTimeRemaining: button({
				name: 'Current Cue - Time Remaining',
				text: 'Remaining$(mitti:cueTimeLeft)',
				size: '14',
				feedbacks: [
					{ feedbackId: 'timeRemaining', options: { time: 10 }, style: { bgcolor: ColorOrange } },
					{ feedbackId: 'timeRemaining', options: { time: 5 }, style: { bgcolor: ColorRed } },
					{ feedbackId: 'timeRemaining', options: { time: 4 }, style: { bgcolor: ColorBlack } },
					{ feedbackId: 'timeRemaining', options: { time: 3 }, style: { bgcolor: ColorRed } },
					{ feedbackId: 'timeRemaining', options: { time: 2 }, style: { bgcolor: ColorBlack } },
					{ feedbackId: 'timeRemaining', options: { time: 1 }, style: { bgcolor: ColorRed } },
					{ feedbackId: 'timeRemaining', options: { time: 0 }, style: { bgcolor: ColorBlack } },
				],
			}),
		},
	},
	{
		id: 'outputs',
		name: 'Outputs',
		groups: [
			{
				id: 'videoOutput',
				name: 'Video Outputs',
				presets: {
					videoOutputsActive: button({
						name: 'Video Outputs Active',
						text: 'Video Outputs:\\n$(mitti:video_outputs)',
						size: '14',
						down: [{ actionId: 'toggleVideoOutputs', options: {} }],
						feedbacks: [
							{ feedbackId: 'videoOutputs', options: {}, style: { bgcolor: ColorGreen, color: ColorWhite } },
							{
								feedbackId: 'videoOutputs',
								isInverted: true,
								options: {},
								style: { bgcolor: ColorOrange, color: ColorWhite },
							},
						],
					}),
					videoOutputsOn: button({
						name: 'Video Outputs On',
						text: 'ENABLE\\nVideo Outputs',
						size: '14',
						down: [{ actionId: 'videoOutputsOn', options: {} }],
						feedbacks: [{ feedbackId: 'videoOutputs', options: {}, style: { bgcolor: MittiGray } }],
					}),
					videoOutputsOff: button({
						name: 'Video Outputs Off',
						text: 'DISABLE\\nVideo Outputs',
						size: '14',
						down: [{ actionId: 'videoOutputsOff', options: {} }],
						feedbacks: [{ feedbackId: 'videoOutputs', isInverted: true, options: {}, style: { bgcolor: MittiGray } }],
					}),
					toggleFullscreen: button({
						name: 'Toggle Fullscreen',
						text: 'Toggle\\nFullscreen',
						size: '14',
						down: [{ actionId: 'fullscreenToggle', options: {} }],
					}),
					fullscreenOn: button({
						name: 'Fullscreen On',
						text: 'Fullscreen\\nOn',
						size: '14',
						down: [{ actionId: 'fullscreenOn', options: {} }],
					}),
					fullscreenOff: button({
						name: 'Fullscreen Off',
						text: 'Fullscreen\\nOff',
						size: '14',
						down: [{ actionId: 'fullscreenOff', options: {} }],
					}),
				},
			},
			{
				id: 'audioOutput',
				name: 'Audio Outputs',
				presets: {
					audioOutputsActive: button({
						name: 'Audio Outputs Active',
						text: 'Audio Outputs:\\n$(mitti:audio_outputs)',
						size: '14',
						down: [{ actionId: 'toggleAudioOutputs', options: {} }],
						feedbacks: [
							{ feedbackId: 'audioOutputs', options: {}, style: { bgcolor: ColorGreen, color: ColorWhite } },
							{
								feedbackId: 'audioOutputs',
								isInverted: true,
								options: {},
								style: { bgcolor: ColorOrange, color: ColorWhite },
							},
						],
					}),
					audioOutputsOn: button({
						name: 'Audio Outputs On',
						text: 'ENABLE\\nAudio Outputs',
						size: '14',
						down: [{ actionId: 'audioOutputsOn', options: {} }],
						feedbacks: [{ feedbackId: 'audioOutputs', options: {}, style: { bgcolor: MittiGray } }],
					}),
					audioOutputsOff: button({
						name: 'Audio Outputs Off',
						text: 'DISABLE\\nAudio Outputs',
						size: '14',
						down: [{ actionId: 'audioOutputsOff', options: {} }],
						feedbacks: [{ feedbackId: 'audioOutputs', isInverted: true, options: {}, style: { bgcolor: MittiGray } }],
					}),
				},
			},
		],
	},
]

function cuePresets(self: MittiInstance): Presets {
	const presets: Presets = {}
	for (const cueID of playlistCueIDs(self.cues)) {
		presets[`playCueID_${cueID}`] = button({
			name: `Play Cue ${cueID}`,
			text: `Play\\n$(mitti:cue_${cueID}_cueName)`,
			size: 'auto',
			down: [{ actionId: 'play_cue', options: { cuenumber: cueID, forceCut: false } }],
			feedbacks: [
				{ feedbackId: 'selectedCueID', options: { cueID }, style: { bgcolor: MittiGray } },
				{ feedbackId: 'activeCueID', options: { cueID }, style: { bgcolor: MittiBlue } },
				{ feedbackId: 'playingCueID', options: { cueID }, style: { bgcolor: ColorGreen } },
			],
		})
	}
	return presets
}

export function getPresets(self: MittiInstance): {
	structure: CompanionPresetSection<ModuleSchema>[]
	presets: CompanionPresetDefinitions<ModuleSchema>
} {
	const sections = [...StaticSections]
	const cues = cuePresets(self)
	if (Object.keys(cues).length > 0) {
		sections.push({ id: 'playCueById', name: 'Play Cue by ID', presets: cues })
	}

	const structure: CompanionPresetSection<ModuleSchema>[] = []
	const presets: Presets = {}
	for (const section of sections) {
		if ('groups' in section) {
			structure.push({
				id: section.id,
				name: section.name,
				definitions: section.groups.map((group) => ({
					id: group.id,
					type: 'simple' as const,
					name: group.name,
					presets: Object.keys(group.presets),
				})),
			})
			for (const group of section.groups) Object.assign(presets, group.presets)
		} else {
			structure.push({ id: section.id, name: section.name, definitions: Object.keys(section.presets) })
			Object.assign(presets, section.presets)
		}
	}

	return { structure, presets }
}
