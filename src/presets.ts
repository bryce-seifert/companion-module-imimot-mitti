import type {
	CompanionPresetDefinitions,
	CompanionPresetSection,
	CompanionPresetAlternatives,
} from '@companion-module/base'
import type { CueToggleFeedbackId, StateFlagFeedbackId } from './feedbacks.js'
import type MittiInstance from './main.js'
import type { ModuleSchema } from './main.js'
import { button, type PresetAction, type PresetFeedback } from './preset-design.js'

import {
	ColorGold,
	ColorSurface,
	ColorWhite,
	ColorRedDim,
	ColorDisabledText,
	ColorGreen,
	ColorOrange,
	ColorRed,
	MittiCyan,
	MittiGray,
	playlistCueIDs,
} from './utils.js'

export { PresetTextSizes } from './preset-design.js'

type Presets = Record<string, CompanionPresetAlternatives<ModuleSchema>>

interface SettingButtons {
	ids: { toggle?: string; on: string; off: string }
	name: string
	subject: string[]
	down: { toggle?: PresetAction; on: PresetAction; off: PresetAction }
	// Builds the feedback that is true while the setting is on, or off when inverted
	state: ((isOff: boolean) => PresetFeedback) | null
}

// The live label uses the same variable that Mitti's current-cue feedback updates.
const CurrentCueStatusVariables = new Map<string, string>([
	['cueAudioStatus', 'currentCueAudio'],
	['cuePauseAtBeginningStatus', 'currentCuePauseAtBeginning'],
	['cuePauseAtEndStatus', 'currentCuePauseAtEnd'],
	['cueFadeInStatus', 'currentCueFadeIn'],
	['cueFadeOutStatus', 'currentCueFadeOut'],
	['cueLoopStatus', 'currentCueLoop'],
	['cueTransitionStatus', 'currentCueTransition'],
])

// Toggle and On light up while the setting is on, Off while it is off
function settingButtons({ ids, name, subject, down, state }: SettingButtons): Presets {
	const lit = (isOff: boolean) => (state ? [state(isOff)] : [])
	const statusVariable = state ? CurrentCueStatusVariables.get(state(false).feedbackId) : undefined
	return {
		...(ids.toggle && down.toggle
			? {
					[ids.toggle]: button({
						name: `Toggle ${name}`,
						lines: [subject.join(' '), statusVariable ? `$(mitti:${statusVariable})` : 'Toggle'],
						down: [down.toggle],
						feedbacks: lit(false),
					}),
				}
			: {}),
		[ids.on]: button({
			name: name === 'Cue Audio' ? 'Unmute Cue Audio' : `${name} On`,
			lines: [subject.join(' '), name === 'Cue Audio' ? 'Unmute' : 'On'],
			down: [down.on],
			feedbacks: lit(false),
		}),
		[ids.off]: button({
			name: name === 'Cue Audio' ? 'Mute Cue Audio' : `${name} Off`,
			lines: [subject.join(' '), name === 'Cue Audio' ? 'Mute' : 'Off'],
			down: [down.off],
			feedbacks: lit(true),
		}),
	}
}

// Cyan means enabled; gray confirms an Off selection without implying the setting is enabled.
const isOn =
	(feedbackId: StateFlagFeedbackId) =>
	(isOff: boolean): PresetFeedback => ({
		feedbackId,
		options: isOff ? { enabled: false } : {},
		isInverted: false,
		style: isOff ? { bgcolor: MittiGray } : { bgcolor: ColorSurface, color: MittiCyan },
	})

const currentCueIsOn =
	(feedbackId: CueToggleFeedbackId) =>
	(isOff: boolean): PresetFeedback => ({
		feedbackId,
		options: { cueID: 'current', ...(isOff && { enabled: false }) },
		isInverted: false,
		style: isOff ? { bgcolor: MittiGray } : { bgcolor: ColorSurface, color: MittiCyan },
	})

const current = { cuenumber: 'current' }

const playStateFeedbacks: PresetFeedback[] = [
	{ feedbackId: 'playStatus', options: { playPause: 'Playing' }, style: { bgcolor: ColorGreen } },
	{ feedbackId: 'playStatus', options: { playPause: 'Paused' }, style: { bgcolor: ColorGold } },
]

const pauseResumeFeedbacks: PresetFeedback[] = [
	{
		feedbackId: 'playStatus',
		options: { playPause: 'Playing' },
		style: { bgcolor: ColorGreen, text: 'TRANSPORT\nPAUSE' },
	},
	{
		feedbackId: 'playStatus',
		options: { playPause: 'Paused' },
		style: { bgcolor: ColorGold, text: 'TRANSPORT\nRESUME' },
	},
]

const cueMutedFeedback: PresetFeedback = { feedbackId: 'cueAudioMuted', options: {}, style: { bgcolor: ColorOrange } }
const selectedPlayingFeedback: PresetFeedback = {
	feedbackId: 'selectedCuePlaying',
	options: {},
	style: { bgcolor: ColorGreen },
}

// A section shows its presets directly, or split into named groups
type PresetSection = { id: string; name: string } & (
	{ presets: Presets } | { groups: { id: string; name: string; presets: Presets }[] }
)

const StaticSections: PresetSection[] = [
	{
		id: 'playlistActions',
		name: 'Transport & Navigation',
		groups: [
			{
				id: 'playlistGraphics',
				name: 'Transport Control - Icons',
				presets: {
					playSelected: button({
						name: 'Play Selected Cue',
						lines: ['Selected Cue', 'Play'],
						icon: 'play',
						down: [{ actionId: 'play_select', options: { forceCut: false } }],
						feedbacks: [selectedPlayingFeedback],
					}),
					playPlaylist: button({
						name: 'Play Playlist',
						lines: ['Playlist', 'Play'],
						icon: 'playlist',
						down: [{ actionId: 'play', options: {} }],
						feedbacks: [playStateFeedbacks[0]],
					}),
					pause: button({
						name: 'Pause',
						lines: ['Transport', 'Pause'],
						icon: 'pause',
						down: [{ actionId: 'stop', options: {} }],
						feedbacks: [playStateFeedbacks[1]],
					}),
					jumpPrevious: button({
						name: 'Jump to Previous Cue',
						lines: ['Jump Cue', 'Previous'],
						icon: 'previous',
						down: [{ actionId: 'jump_prev', options: {} }],
					}),
					jumpNext: button({
						name: 'Jump to Next Cue',
						lines: ['Jump Cue', 'Next'],
						icon: 'next',
						down: [{ actionId: 'jump_next', options: {} }],
					}),
					pauseResume: button({
						name: 'Pause / Resume',
						lines: ['Transport', 'Pause / Resume'],
						icon: 'playPause',
						down: [{ actionId: 'toggle_play', options: {} }],
						feedbacks: pauseResumeFeedbacks,
					}),
				},
			},
			{
				id: 'playlistText',
				name: 'Transport Control - Text',
				presets: {
					playSelectedText: button({
						name: 'Play Selected Cue',
						lines: ['Selected Cue', 'Play'],
						down: [{ actionId: 'play_select', options: { forceCut: false } }],
						feedbacks: [selectedPlayingFeedback],
					}),
					playPlaylistText: button({
						name: 'Play Playlist',
						lines: ['Playlist', 'Play'],
						size: 'primary',
						down: [{ actionId: 'play', options: {} }],
						feedbacks: [playStateFeedbacks[0]],
					}),
					pauseText: button({
						name: 'Pause',
						lines: ['Transport', 'Pause'],
						size: 'primary',
						down: [{ actionId: 'stop', options: {} }],
						feedbacks: [playStateFeedbacks[1]],
					}),
					pauseResumeText: button({
						name: 'Pause / Resume',
						lines: ['Transport', 'Pause / Resume'],
						down: [{ actionId: 'toggle_play', options: {} }],
						feedbacks: pauseResumeFeedbacks,
					}),
					rewindText: button({
						name: 'Rewind',
						lines: ['Transport', 'Rewind'],
						size: 'primary',
						down: [{ actionId: 'rewind', options: {} }],
					}),
					panic: button({
						name: 'Panic',
						lines: ['Emergency', 'Panic'],
						size: 'primary',
						bgcolor: ColorRed,
						down: [{ actionId: 'panic', options: {} }],
					}),
					goTo30: button({
						name: 'Goto 30',
						lines: ['Goto', '30'],
						mono: true,
						down: [{ actionId: 'goto_30', options: {} }],
					}),
					goTo20: button({
						name: 'Goto 20',
						lines: ['Goto', '20'],
						mono: true,
						down: [{ actionId: 'goto_20', options: {} }],
					}),
					goTo10: button({
						name: 'Goto 10',
						lines: ['Goto', '10'],
						mono: true,
						down: [{ actionId: 'goto_10', options: {} }],
					}),
					scrubPlayheadRotary: button({
						name: 'Scrub Playhead - Rotary Knob',
						lines: ['Playhead', 'Scrub'],
						hint: 'TURN 1s / PRESS +1s',
						down: [{ actionId: 'scrubPlayhead', options: { value: '+01:00' } }],
						rotateLeft: [{ actionId: 'scrubPlayhead', options: { value: '-01:00' } }],
						rotateRight: [{ actionId: 'scrubPlayhead', options: { value: '+01:00' } }],
					}),
					scrubPlayheadMinusOne: button({
						name: 'Scrub -1 Second',
						lines: ['Scrub', '−1s'],
						mono: true,
						down: [{ actionId: 'scrubPlayhead', options: { value: '-01:00' } }],
					}),
					scrubPlayheadPlusOne: button({
						name: 'Scrub +1 Second',
						lines: ['Scrub', '+1s'],
						mono: true,
						down: [{ actionId: 'scrubPlayhead', options: { value: '+01:00' } }],
					}),
				},
			},
			{
				id: 'playlistTextCueNav',
				name: 'Cue Navigation',
				presets: {
					jumpPreviousText: button({
						name: 'Jump to Previous Cue',
						lines: ['Jump', 'Previous'],
						down: [{ actionId: 'jump_prev', options: {} }],
					}),
					jumpNextText: button({
						name: 'Jump to Next Cue',
						lines: ['Jump', 'Next'],
						down: [{ actionId: 'jump_next', options: {} }],
					}),
					jumpSelected: button({
						name: 'Jump to Selected Cue',
						lines: ['Jump', 'Selected'],
						down: [{ actionId: 'jump_selected', options: {} }],
					}),
					selectPrevious: button({
						name: 'Select Previous Cue',
						lines: ['Select', 'Previous'],
						down: [{ actionId: 'select_prev', options: {} }],
					}),
					selectNext: button({
						name: 'Select Next Cue',
						lines: ['Select', 'Next'],
						down: [{ actionId: 'select_next', options: {} }],
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
						subject: ['Play Transition'],
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
		],
	},
	{
		id: 'cueActions',
		name: 'Cue Selection',
		presets: {
			playCue: button({
				name: 'Play Cue by ID',
				lines: ['Cue by ID', 'Play'],
				down: [{ actionId: 'play_cue', options: { cuenumber: 'current', forceCut: false } }],
			}),
			jumpToCueWithNamePlay: button({
				name: 'Play Cue by Name',
				lines: ['Cue by Name', 'Play'],
				down: [{ actionId: 'playCueName', options: { forceCut: false, string: '' } }],
			}),
			jumpToCueWithName: button({
				name: 'Jump to Cue by Name',
				lines: ['Cue by Name', 'Jump'],
				down: [{ actionId: 'jumpCueName', options: { string: '' } }],
			}),
			jumpToSpecificCue: button({
				name: 'Jump to Cue by ID',
				lines: ['Cue by ID', 'Jump'],
				down: [{ actionId: 'jump_cue', options: current }],
			}),
			selectCue: button({
				name: 'Select Cue by ID',
				lines: ['Cue by ID', 'Select'],
				down: [{ actionId: 'select_cue', options: current }],
			}),
		},
	},
	{
		id: 'currentCueActions',
		name: 'Current Cue',
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
						subject: ['Pause Start'],
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
						subject: ['Pause End'],
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
						name: 'Video FX',
						subject: ['Video FX'],
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
						lines: ['Playhead', 'Set In'],
						down: [{ actionId: 'setInFromPlayhead', options: {} }],
						feedbacks: [
							{
								feedbackId: 'inFromPlayheadEnabled',
								options: { enabled: false },
								style: { bgcolor: ColorSurface, color: ColorDisabledText },
							},
						],
					}),
					setOutFromPlayhead: button({
						name: 'Set Out From Playhead',
						lines: ['Playhead', 'Set Out'],
						down: [{ actionId: 'setOutFromPlayhead', options: {} }],
						feedbacks: [
							{
								feedbackId: 'outFromPlayheadEnabled',
								options: { enabled: false },
								style: { bgcolor: ColorSurface, color: ColorDisabledText },
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
						name: 'Cue Speed Status',
						lines: ['Speed', '$(mitti:currentCuePlaybackSpeed)%'],
						mono: true,
					}),
					currentCuePlaybackMinusFive: button({
						name: 'Decrease Cue Speed by 5%',
						lines: ['Speed', '-5%'],
						mono: true,
						down: [{ actionId: 'adjustPlaybackSpeed', options: { value: -5 } }],
					}),
					currentCuePlaybackPlusFive: button({
						name: 'Increase Cue Speed by 5%',
						lines: ['Speed', '+5%'],
						mono: true,
						down: [{ actionId: 'adjustPlaybackSpeed', options: { value: 5 } }],
					}),
					currentCuePlaybackReset: button({
						name: 'Reset Cue Speed',
						lines: ['Reset Speed', '100%'],
						mono: true,
						down: [{ actionId: 'playbackSpeed', options: { cuenumber: 'current', value: 100 } }],
					}),
					currentCuePlaybackRotary: button({
						name: 'Cue Speed - Rotary Knob',
						lines: ['Speed', '$(mitti:currentCuePlaybackSpeed)%'],
						hint: 'TURN 5% / PRESS 100%',
						mono: true,
						down: [{ actionId: 'playbackSpeed', options: { cuenumber: 'current', value: 100 } }],
						rotateLeft: [{ actionId: 'adjustPlaybackSpeed', options: { value: -5 } }],
						rotateRight: [{ actionId: 'adjustPlaybackSpeed', options: { value: 5 } }],
					}),
				},
			},
			{
				id: 'currentCueVolume',
				name: 'Cue Audio / Volume',
				presets: {
					...settingButtons({
						ids: { toggle: 'toggleAudio', on: 'audioOn', off: 'audioOff' },
						name: 'Cue Audio',
						subject: ['Cue Audio'],
						down: {
							toggle: { actionId: 'toggleAudio', options: current },
							on: { actionId: 'audioOn', options: current },
							off: { actionId: 'audioOff', options: current },
						},
						state: currentCueIsOn('cueAudioStatus'),
					}),
					currentCueVolumeStatus: button({
						name: 'Cue Volume and Mute Status',
						lines: ['Volume', '$(mitti:currentCueVolume) dB'],
						hint: '$(mitti:currentCueAudio)',
						mono: true,
						feedbacks: [cueMutedFeedback],
					}),
					currentCueVolumeMinusOne: button({
						name: 'Decrease Cue Volume by 1 dB',
						lines: ['Volume', '-1 dB'],
						mono: true,
						down: [{ actionId: 'adjustVolume', options: { value: -1 } }],
					}),
					currentCueVolumePlusOne: button({
						name: 'Increase Cue Volume by 1 dB',
						lines: ['Volume', '+1 dB'],
						mono: true,
						down: [{ actionId: 'adjustVolume', options: { value: 1 } }],
					}),
					currentCueVolumeReset: button({
						name: 'Reset Cue Volume',
						lines: ['Reset Volume', '0 dB'],
						mono: true,
						down: [{ actionId: 'volume', options: { cuenumber: 'current', value: 0 } }],
					}),
					currentCueVolumeRotary: button({
						name: 'Cue Volume - Rotary Knob',
						lines: ['Volume', '$(mitti:currentCueVolume) dB'],
						hint: 'TURN 1dB / PRESS 0dB',
						mono: true,
						down: [{ actionId: 'volume', options: { cuenumber: 'current', value: 0 } }],
						rotateLeft: [{ actionId: 'adjustVolume', options: { value: -1 } }],
						rotateRight: [{ actionId: 'adjustVolume', options: { value: 1 } }],
						feedbacks: [cueMutedFeedback],
					}),
				},
			},
		],
	},
	{
		id: 'playlistStatus',
		name: 'Live Status',
		presets: {
			selectedCueStatus: button({
				name: 'Selected Cue - Play on Press',
				lines: ['Selected', '$(mitti:selectedCueName)'],
				hint: 'PRESS TO PLAY',
				cue: true,
				size: 'fit',
				down: [{ actionId: 'play_select', options: { forceCut: false } }],
				feedbacks: [selectedPlayingFeedback],
			}),
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
				name: 'Cue Total Run Time',
				lines: ['Run Time', '$(mitti:currentCueTRT)'],
				mono: true,
			}),
			currentCueTimeElapsed: button({
				name: 'Cue Time Elapsed',
				lines: ['Elapsed', '$(mitti:cueTimeElapsed)'],
				mono: true,
				progress: true,
			}),
			currentCueTimeRemaining: button({
				name: 'Cue Time Remaining',
				lines: ['Remaining', '$(mitti:cueTimeLeft)'],
				mono: true,
				progress: true,
				// Keep the value readable: amber at 10s, red at 5s, one dim pulse at 1s.
				feedbacks: [
					{ feedbackId: 'timeRemaining', options: { time: 10 }, style: { bgcolor: ColorOrange } },
					{ feedbackId: 'timeRemaining', options: { time: 5 }, style: { bgcolor: ColorRed } },
					{ feedbackId: 'timeRemaining', options: { time: 1 }, style: { bgcolor: ColorRedDim } },
					{ feedbackId: 'timeRemaining', options: { time: 0 }, style: { bgcolor: ColorRed } },
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
						name: 'Video Outputs - Status / Toggle',
						lines: ['Video Out', '$(mitti:video_outputs)'],
						down: [{ actionId: 'toggleVideoOutputs', options: {} }],
						feedbacks: [
							isOn('videoOutputs')(false),
							{ feedbackId: 'videoOutputs', options: { enabled: false }, style: { bgcolor: ColorOrange } },
						],
					}),
					...settingButtons({
						ids: { on: 'videoOutputsOn', off: 'videoOutputsOff' },
						name: 'Video Outputs',
						subject: ['Video Out'],
						down: {
							on: { actionId: 'videoOutputsOn', options: {} },
							off: { actionId: 'videoOutputsOff', options: {} },
						},
						state: isOn('videoOutputs'),
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
						name: 'Audio Outputs - Status / Toggle',
						lines: ['Audio Out', '$(mitti:audio_outputs)'],
						down: [{ actionId: 'toggleAudioOutputs', options: {} }],
						feedbacks: [
							isOn('audioOutputs')(false),
							{ feedbackId: 'audioOutputs', options: { enabled: false }, style: { bgcolor: ColorOrange } },
						],
					}),
					...settingButtons({
						ids: { on: 'audioOutputsOn', off: 'audioOutputsOff' },
						name: 'Audio Outputs',
						subject: ['Audio Out'],
						down: {
							on: { actionId: 'audioOutputsOn', options: {} },
							off: { actionId: 'audioOutputsOff', options: {} },
						},
						state: isOn('audioOutputs'),
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
			// The label stays fixed while the cue name shrinks within its own bounds.
			lines: ['PLAY', `$(mitti:cue_${cueID}_cueName)`],
			cue: true,
			size: 'fit',
			down: [{ actionId: 'play_cue', options: { cuenumber: cueID, forceCut: false } }],
			feedbacks: [
				{ feedbackId: 'selectedCueID', options: { cueID }, style: { bgcolor: ColorSurface, color: MittiCyan } },
				{ feedbackId: 'activeCueID', options: { cueID }, style: { bgcolor: ColorSurface, color: MittiCyan } },
				{ feedbackId: 'playingCueID', options: { cueID }, style: { bgcolor: ColorGreen, color: ColorWhite } },
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
