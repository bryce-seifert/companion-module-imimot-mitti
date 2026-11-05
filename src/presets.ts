import type {
	CompanionPresetDefinitions,
	CompanionPresetSection,
	CompanionSimplePresetDefinition,
	SomePresetActionEntry,
	SomePresetSimpleFeedbackEntry,
} from '@companion-module/base'
import type { CueToggleFeedbackId, StateFlagFeedbackId } from './feedbacks.js'
import type MittiInstance from './main.js'
import type { ModuleSchema } from './main.js'
import {
	ColorGold,
	ColorBlack,
	ColorDisabledText,
	ColorGreen,
	ColorOrange,
	ColorRed,
	ColorWhite,
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

type PresetAction = SomePresetActionEntry<ModuleSchema>
type PresetFeedback = SomePresetSimpleFeedbackEntry<ModuleSchema>
type Presets = Record<string, CompanionSimplePresetDefinition<ModuleSchema>>

// Single-word transport buttons are primary; anything showing a cue name is sized to fit
export const PresetTextSizes = {
	primary: '18',
	standard: '14',
	fit: 'auto',
} as const

interface ButtonPreset {
	name: string
	// Title Case: what the button controls first, then what it does or the value it shows
	lines: string[]
	size?: keyof typeof PresetTextSizes
	bgcolor?: number
	icon?: string
	down?: PresetAction[]
	rotateLeft?: PresetAction[]
	rotateRight?: PresetAction[]
	feedbacks?: PresetFeedback[]
}

function button({
	name,
	lines,
	size = 'standard',
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
			text: lines.join('\n'),
			size: PresetTextSizes[size],
			color: ColorWhite,
			bgcolor,
			show_topbar: false,
			...(icon && { png64: icon, pngalignment: 'center:center' }),
		},
		steps: [{ down, up: [], ...(rotateLeft && rotateRight && { rotate_left: rotateLeft, rotate_right: rotateRight }) }],
		feedbacks,
	}
}

interface SettingButtons {
	ids: { toggle: string; on: string; off: string }
	name: string
	subject: string[]
	down: { toggle: PresetAction; on: PresetAction; off: PresetAction }
	// Builds the feedback that is true while the setting is on, or off when inverted
	state: ((isInverted: boolean) => PresetFeedback) | null
}

// Toggle and On light up while the setting is on, Off while it is off
function settingButtons({ ids, name, subject, down, state }: SettingButtons): Presets {
	const lit = (isInverted: boolean) => (state ? [state(isInverted)] : [])
	return {
		[ids.toggle]: button({
			name: `Toggle ${name}`,
			lines: [...subject, 'Toggle'],
			down: [down.toggle],
			feedbacks: lit(false),
		}),
		[ids.on]: button({ name: `${name} On`, lines: [...subject, 'On'], down: [down.on], feedbacks: lit(false) }),
		[ids.off]: button({ name: `${name} Off`, lines: [...subject, 'Off'], down: [down.off], feedbacks: lit(true) }),
	}
}

// Builders for the feedbacks that light a button while something is on; the casts only bridge the
// generic id to the preset feedback union, whose options for these feedbacks are fixed below
const isOn =
	(feedbackId: StateFlagFeedbackId) =>
	(isInverted: boolean): PresetFeedback => ({ feedbackId, options: {}, isInverted, style: { bgcolor: MittiBlue } })

const currentCueIsOn =
	(feedbackId: CueToggleFeedbackId) =>
	(isInverted: boolean): PresetFeedback => ({
		feedbackId,
		options: { cueID: 'current' },
		isInverted,
		style: { bgcolor: MittiBlue },
	})

const current = { cuenumber: 'current' }

const playStateFeedbacks: PresetFeedback[] = [
	{ feedbackId: 'playStatus', options: { playPause: 'Playing' }, style: { bgcolor: ColorGreen } },
	{ feedbackId: 'playStatus', options: { playPause: 'Paused' }, style: { bgcolor: ColorGold } },
]

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
						lines: [],
						icon: playIcon,
						down: [{ actionId: 'play_select', options: { forceCut: false } }],
					}),
					playPlaylist: button({
						name: 'Play Playlist',
						lines: [],
						icon: playPlaylistIcon,
						down: [{ actionId: 'play', options: {} }],
					}),
					pause: button({ name: 'Pause', lines: [], icon: pauseIcon, down: [{ actionId: 'stop', options: {} }] }),
					jumpPrevious: button({
						name: 'Jump to previous',
						lines: [],
						icon: skipBackwardIcon,
						down: [{ actionId: 'jump_prev', options: {} }],
					}),
					jumpNext: button({
						name: 'Jump to next',
						lines: [],
						icon: skipForwardIcon,
						down: [{ actionId: 'jump_next', options: {} }],
					}),
					pauseResume: button({
						name: 'Pause / Resume',
						lines: [],
						icon: playPauseIcon,
						down: [{ actionId: 'toggle_play', options: {} }],
						feedbacks: playStateFeedbacks,
					}),
				},
			},
			{
				id: 'playlistText',
				name: 'Transport Control - Text',
				presets: {
					playSelectedText: button({
						name: 'Play Selected',
						lines: ['Play', 'Selected'],
						bgcolor: ColorGreen,
						down: [{ actionId: 'play_select', options: { forceCut: false } }],
					}),
					playPlaylistText: button({
						name: 'Play Playlist',
						lines: ['Play'],
						size: 'primary',
						bgcolor: ColorGreen,
						down: [{ actionId: 'play', options: {} }],
					}),
					pauseText: button({
						name: 'Pause',
						lines: ['Pause'],
						size: 'primary',
						down: [{ actionId: 'stop', options: {} }],
						feedbacks: [playStateFeedbacks[1]],
					}),
					pauseResumeText: button({
						name: 'Pause / Resume',
						lines: ['Pause', 'Resume'],
						down: [{ actionId: 'toggle_play', options: {} }],
						feedbacks: playStateFeedbacks,
					}),
					rewindText: button({
						name: 'Rewind',
						lines: ['Rewind'],
						size: 'primary',
						down: [{ actionId: 'rewind', options: {} }],
					}),
					panic: button({
						name: 'Panic',
						lines: ['Panic'],
						size: 'primary',
						bgcolor: ColorRed,
						down: [{ actionId: 'panic', options: {} }],
					}),
					goTo30: button({ name: 'Goto 30', lines: ['Goto', '30'], down: [{ actionId: 'goto_30', options: {} }] }),
					goTo20: button({ name: 'Goto 20', lines: ['Goto', '20'], down: [{ actionId: 'goto_20', options: {} }] }),
					goTo10: button({ name: 'Goto 10', lines: ['Goto', '10'], down: [{ actionId: 'goto_10', options: {} }] }),
					scrubPlayheadRotary: button({
						name: 'Scrub Playhead - Rotary Knob',
						lines: ['Scrub', 'Rotary'],
						down: [{ actionId: 'scrubPlayhead', options: { value: '+01:00' } }],
						rotateLeft: [{ actionId: 'scrubPlayhead', options: { value: '-01:00' } }],
						rotateRight: [{ actionId: 'scrubPlayhead', options: { value: '+01:00' } }],
					}),
					scrubPlayheadMinusOne: button({
						name: 'Scrub -1 Second',
						lines: ['Scrub', '-1 sec'],
						down: [{ actionId: 'scrubPlayhead', options: { value: '-01:00' } }],
					}),
					scrubPlayheadPlusOne: button({
						name: 'Scrub +1 Second',
						lines: ['Scrub', '+1 sec'],
						down: [{ actionId: 'scrubPlayhead', options: { value: '+01:00' } }],
					}),
				},
			},
			{
				id: 'playlistTextMain',
				name: 'Playlist Settings',
				presets: {
					...settingButtons({
						ids: { toggle: 'togglePlaylistLoop', on: 'playlistLoopOn', off: 'playlistLoopOff' },
						name: 'Playlist Loop',
						subject: ['Playlist', 'Loop'],
						down: {
							toggle: { actionId: 'plLoopToggle', options: {} },
							on: { actionId: 'plLoopOn', options: {} },
							off: { actionId: 'plLoopOff', options: {} },
						},
						// Mitti's playlist loop state isn't tracked by the module
						state: null,
					}),
					...settingButtons({
						ids: { toggle: 'toggleTransitionOnPlay', on: 'transitionOnPlayOn', off: 'transitionOnPlayOff' },
						name: 'Transition on Play',
						subject: ['Playlist', 'Transition'],
						down: {
							toggle: { actionId: 'plTransToggle', options: {} },
							on: { actionId: 'plTransOn', options: {} },
							off: { actionId: 'plTransOff', options: {} },
						},
						// Mitti's transition on play state isn't tracked by the module
						state: null,
					}),
				},
			},
			{
				id: 'playlistTextCueNav',
				name: 'Cue Navigation',
				presets: {
					jumpPreviousText: button({
						name: 'Jump to previous',
						lines: ['Jump', 'Previous'],
						down: [{ actionId: 'jump_prev', options: {} }],
					}),
					jumpNextText: button({
						name: 'Jump to next',
						lines: ['Jump', 'Next'],
						down: [{ actionId: 'jump_next', options: {} }],
					}),
					jumpSelected: button({
						name: 'Jump to selected',
						lines: ['Jump', 'Selected'],
						down: [{ actionId: 'jump_selected', options: {} }],
					}),
					selectPrevious: button({
						name: 'Select previous',
						lines: ['Select', 'Previous'],
						down: [{ actionId: 'select_prev', options: {} }],
					}),
					selectNext: button({
						name: 'Select next',
						lines: ['Select', 'Next'],
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
				lines: ['Play Cue', 'by ID'],
				bgcolor: ColorGreen,
				down: [{ actionId: 'play_cue', options: { cuenumber: 'current', forceCut: false } }],
			}),
			jumpToCueWithNamePlay: button({
				name: 'Jump to cue with (name) and Play',
				lines: ['Play Cue', 'by Name'],
				bgcolor: ColorGreen,
				down: [{ actionId: 'playCueName', options: { forceCut: false, string: '' } }],
			}),
			jumpToCueWithName: button({
				name: 'Jump to cue with name',
				lines: ['Jump Cue', 'by Name'],
				down: [{ actionId: 'jumpCueName', options: { string: '' } }],
			}),
			jumpToSpecificCue: button({
				name: 'Jump to specific cue',
				lines: ['Jump Cue', 'by ID'],
				down: [{ actionId: 'jump_cue', options: current }],
			}),
			selectCue: button({
				name: 'Select cue',
				lines: ['Select', 'by ID'],
				down: [{ actionId: 'select_cue', options: current }],
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
					...settingButtons({
						ids: { toggle: 'toggleFadeIn', on: 'fadeInOn', off: 'fadeInOff' },
						name: 'Fade In',
						subject: ['Fade In'],
						down: {
							toggle: { actionId: 'toggleFadeIn', options: current },
							on: { actionId: 'fadeInOn', options: current },
							off: { actionId: 'fadeInOff', options: current },
						},
						state: currentCueIsOn('cueFadeInStatus'),
					}),
					...settingButtons({
						ids: { toggle: 'toggleFadeOut', on: 'fadeOutOn', off: 'fadeOutOff' },
						name: 'Fade Out',
						subject: ['Fade Out'],
						down: {
							toggle: { actionId: 'toggleFadeOut', options: current },
							on: { actionId: 'fadeOutOn', options: current },
							off: { actionId: 'fadeOutOff', options: current },
						},
						state: currentCueIsOn('cueFadeOutStatus'),
					}),
					...settingButtons({
						ids: { toggle: 'toggleLoop', on: 'loopOn', off: 'loopOff' },
						name: 'Loop',
						subject: ['Loop'],
						down: {
							toggle: { actionId: 'toggleLoop', options: current },
							on: { actionId: 'loopOn', options: current },
							off: { actionId: 'loopOff', options: current },
						},
						state: currentCueIsOn('cueLoopStatus'),
					}),
					...settingButtons({
						ids: { toggle: 'togglePauseAtBeginning', on: 'pauseAtBeginningOn', off: 'pauseAtBeginningOff' },
						name: 'Pause at Beginning',
						subject: ['Pause at', 'Beginning'],
						down: {
							toggle: { actionId: 'togglePauseAtBeginning', options: current },
							on: { actionId: 'pauseAtBeginningOn', options: current },
							off: { actionId: 'pauseAtBeginningOff', options: current },
						},
						state: currentCueIsOn('cuePauseAtBeginningStatus'),
					}),
					...settingButtons({
						ids: { toggle: 'togglePauseAtEnd', on: 'pauseAtEndOn', off: 'pauseAtEndOff' },
						name: 'Pause at End',
						subject: ['Pause at', 'End'],
						down: {
							toggle: { actionId: 'togglePauseAtEnd', options: current },
							on: { actionId: 'pauseAtEndOn', options: current },
							off: { actionId: 'pauseAtEndOff', options: current },
						},
						state: currentCueIsOn('cuePauseAtEndStatus'),
					}),
					...settingButtons({
						ids: { toggle: 'toggleTransition', on: 'transitionOn', off: 'transitionOff' },
						name: 'Transition',
						subject: ['Transition'],
						down: {
							toggle: { actionId: 'toggleTransition', options: current },
							on: { actionId: 'transitionOn', options: current },
							off: { actionId: 'transitionOff', options: current },
						},
						state: currentCueIsOn('cueTransitionStatus'),
					}),
					...settingButtons({
						ids: { toggle: 'toggleVideoFX', on: 'videoFXOn', off: 'videoFXOff' },
						name: 'VideoFx',
						subject: ['VideoFx'],
						down: {
							toggle: { actionId: 'toggleVideoFx', options: current },
							on: { actionId: 'videoFxOn', options: current },
							off: { actionId: 'videoFxOff', options: current },
						},
						// Mitti doesn't report a cue's VideoFx state
						state: null,
					}),
				},
			},
			{
				id: 'currentInOut',
				name: 'Cue In / Out',
				presets: {
					setInFromPlayhead: button({
						name: 'Set In From Playhead',
						lines: ['Set In', 'Playhead'],
						down: [{ actionId: 'setInFromPlayhead', options: {} }],
						feedbacks: [
							{
								feedbackId: 'inFromPlayheadEnabled',
								isInverted: true,
								options: {},
								style: { bgcolor: MittiGray, color: ColorDisabledText },
							},
						],
					}),
					setOutFromPlayhead: button({
						name: 'Set Out From Playhead',
						lines: ['Set Out', 'Playhead'],
						down: [{ actionId: 'setOutFromPlayhead', options: {} }],
						feedbacks: [
							{
								feedbackId: 'outFromPlayheadEnabled',
								isInverted: true,
								options: {},
								style: { bgcolor: MittiGray, color: ColorDisabledText },
							},
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
						lines: ['Speed', '$(mitti:currentCuePlaybackSpeed)%'],
					}),
					currentCuePlaybackRotary: button({
						name: 'Cue Playback Speed - Rotary Knob',
						lines: ['Speed', 'Rotary'],
						down: [{ actionId: 'playbackSpeed', options: { cuenumber: 'current', value: 100 } }],
						rotateLeft: [{ actionId: 'adjustPlaybackSpeed', options: { value: -5 } }],
						rotateRight: [{ actionId: 'adjustPlaybackSpeed', options: { value: 5 } }],
					}),
					currentCuePlaybackMinusFive: button({
						name: 'Current Cue -5%',
						lines: ['Speed', '-5%'],
						down: [{ actionId: 'adjustPlaybackSpeed', options: { value: -5 } }],
					}),
					currentCuePlaybackPlusFive: button({
						name: 'Current Cue +5%',
						lines: ['Speed', '+5%'],
						down: [{ actionId: 'adjustPlaybackSpeed', options: { value: 5 } }],
					}),
				},
			},
			{
				id: 'currentCueVolume',
				name: 'Cue Audio / Volume',
				presets: {
					...settingButtons({
						ids: { toggle: 'toggleAudio', on: 'audioOn', off: 'audioOff' },
						name: 'Audio',
						subject: ['Audio'],
						down: {
							toggle: { actionId: 'toggleAudio', options: current },
							on: { actionId: 'audioOn', options: current },
							off: { actionId: 'audioOff', options: current },
						},
						state: currentCueIsOn('cueAudioStatus'),
					}),
					currentCueVolumeRotary: button({
						name: 'Cue Volume - Rotary Knob',
						lines: ['Volume', 'Rotary'],
						down: [{ actionId: 'volume', options: { cuenumber: 'current', value: 0 } }],
						rotateLeft: [{ actionId: 'adjustVolume', options: { value: -1 } }],
						rotateRight: [{ actionId: 'adjustVolume', options: { value: 1 } }],
					}),
					currentCueVolumeMinusOne: button({
						name: 'Current Cue -1 dB',
						lines: ['Volume', '-1 dB'],
						down: [{ actionId: 'adjustVolume', options: { value: -1 } }],
					}),
					currentCueVolumePlusOne: button({
						name: 'Current Cue +1 dB',
						lines: ['Volume', '+1 dB'],
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
			currentCueStatus: button({
				name: 'Current Cue',
				lines: ['Current', '$(mitti:currentCueName)'],
				size: 'fit',
			}),
			previousCueStatus: button({
				name: 'Previous Cue',
				lines: ['Previous', '$(mitti:previousCueName)'],
				size: 'fit',
			}),
			nextCueStatus: button({ name: 'Next Cue', lines: ['Next', '$(mitti:nextCueName)'], size: 'fit' }),
			playStauts: button({
				name: 'Play Status',
				lines: ['Status', '$(mitti:playStatus)'],
				feedbacks: playStateFeedbacks,
			}),
			currentCueTRT: button({
				name: 'Current Cue - Total Run Time',
				lines: ['Run Time', '$(mitti:currentCueTRT)'],
			}),
			currentCueTimeRemaining: button({
				name: 'Current Cue - Time Remaining',
				lines: ['Remaining', '$(mitti:cueTimeLeft)'],
				// Warns at 10 seconds, then flashes red for the last 5
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
						lines: ['Video Out', '$(mitti:video_outputs)'],
						down: [{ actionId: 'toggleVideoOutputs', options: {} }],
						feedbacks: [
							isOn('videoOutputs')(false),
							{ feedbackId: 'videoOutputs', isInverted: true, options: {}, style: { bgcolor: ColorOrange } },
						],
					}),
					videoOutputsOn: button({
						name: 'Video Outputs On',
						lines: ['Video Out', 'On'],
						down: [{ actionId: 'videoOutputsOn', options: {} }],
						feedbacks: [isOn('videoOutputs')(false)],
					}),
					videoOutputsOff: button({
						name: 'Video Outputs Off',
						lines: ['Video Out', 'Off'],
						down: [{ actionId: 'videoOutputsOff', options: {} }],
						feedbacks: [isOn('videoOutputs')(true)],
					}),
					...settingButtons({
						ids: { toggle: 'toggleFullscreen', on: 'fullscreenOn', off: 'fullscreenOff' },
						name: 'Fullscreen',
						subject: ['Fullscreen'],
						down: {
							toggle: { actionId: 'fullscreenToggle', options: {} },
							on: { actionId: 'fullscreenOn', options: {} },
							off: { actionId: 'fullscreenOff', options: {} },
						},
						// Mitti doesn't report whether it is fullscreen
						state: null,
					}),
				},
			},
			{
				id: 'audioOutput',
				name: 'Audio Outputs',
				presets: {
					audioOutputsActive: button({
						name: 'Audio Outputs Active',
						lines: ['Audio Out', '$(mitti:audio_outputs)'],
						down: [{ actionId: 'toggleAudioOutputs', options: {} }],
						feedbacks: [
							isOn('audioOutputs')(false),
							{ feedbackId: 'audioOutputs', isInverted: true, options: {}, style: { bgcolor: ColorOrange } },
						],
					}),
					audioOutputsOn: button({
						name: 'Audio Outputs On',
						lines: ['Audio Out', 'On'],
						down: [{ actionId: 'audioOutputsOn', options: {} }],
						feedbacks: [isOn('audioOutputs')(false)],
					}),
					audioOutputsOff: button({
						name: 'Audio Outputs Off',
						lines: ['Audio Out', 'Off'],
						down: [{ actionId: 'audioOutputsOff', options: {} }],
						feedbacks: [isOn('audioOutputs')(true)],
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
			// Upper case sets the action apart from the cue name below it
			lines: ['PLAY', `$(mitti:cue_${cueID}_cueName)`],
			size: 'fit',
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
