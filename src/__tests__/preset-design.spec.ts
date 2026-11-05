import type { SomeButtonGraphicsElement } from '@companion-module/base'
import { describe, expect, test } from 'vitest'
import { getFeedbacks } from '../feedbacks.js'
import { getPresets } from '../presets.js'
import { getVariables } from '../variables.js'
import {
	ColorGold,
	ColorGreen,
	ColorOrange,
	ColorRed,
	ColorRedDim,
	ColorSurface,
	ColorWhite,
	MittiCyan,
	MittiGray,
} from '../utils.js'
import { asInstance, createFakeInstance, presetVariants } from './helpers.js'

const fake = createFakeInstance()
fake.cues['1'] = { cueName: 'Opening Film' }
const self = asInstance(fake)
const { presets } = getPresets(self)

function elementsIn(elements: SomeButtonGraphicsElement<undefined>[]): SomeButtonGraphicsElement<undefined>[] {
	return elements.flatMap((element) => [element, ...('children' in element ? elementsIn(element.children) : [])])
}

describe('layered presets', () => {
	test('every fallback preserves the same actions, feedback conditions, and live variables', () => {
		for (const preset of Object.values(presets)) {
			const [layered, simple] = presetVariants(preset)
			if (layered?.type !== 'layered' || simple?.type !== 'simple') throw new Error('Missing preset variant')
			expect(layered.steps, layered.name).toEqual(simple.steps)
			const condition = ({
				feedbackId,
				options,
				isInverted,
			}: Pick<(typeof layered.feedbacks)[number], 'feedbackId' | 'options' | 'isInverted'>) => ({
				feedbackId,
				options,
				isInverted,
			})
			expect(layered.feedbacks.map(condition), layered.name).toEqual(simple.feedbacks.map(condition))
			const templates = elementsIn(layered.elements)
				.filter((element) => 'text' in element)
				.map((element) => (typeof element.text === 'string' ? element.text : element.text.value))
				.join('\n')
			expect(templates.match(/\$\([^)]+\)/g), layered.name).toEqual(simple.style.text.match(/\$\([^)]+\)/g))
		}
	})

	test('all feedback overrides target real elements with unique ids', () => {
		for (const preset of Object.values(presets).flatMap(presetVariants)) {
			if (preset.type !== 'layered') continue
			const elements = elementsIn(preset.elements)
			const ids = elements.map((element) => element.id).filter((id) => id !== undefined)
			expect(new Set(ids).size, preset.name).toBe(ids.length)
			for (const feedback of preset.feedbacks) {
				for (const override of feedback.styleOverrides) {
					const target = elements.find((element) => element.id === override.elementId)
					expect(target, preset.name).toHaveProperty(override.elementProperty)
				}
			}
		}
	})

	test('all live labels and progress expressions use defined variables', () => {
		const variables = getVariables(self)
		for (const preset of Object.values(presets)) {
			for (const match of JSON.stringify(preset).matchAll(/\$\(mitti:([^)]*)\)/g)) {
				expect(variables).toHaveProperty(match[1])
			}
		}
	})
})

async function resolvedStyle(id: string) {
	const simple = presetVariants(presets[id]).find((preset) => preset.type === 'simple')
	if (!simple || simple.type !== 'simple') throw new Error('Missing fallback')
	const definitions = getFeedbacks(self)
	const style = { ...simple.style }
	for (const feedback of simple.feedbacks) {
		if (!(feedback.feedbackId in definitions)) throw new Error('Unknown feedback')
		const definition = definitions[feedback.feedbackId as keyof typeof definitions]
		if (!definition) throw new Error('Missing feedback definition')
		// These callbacks only read options; no host callback context or networking is required.
		const active: unknown = await Reflect.apply(definition.callback, undefined, [{ options: feedback.options }])
		if (Boolean(active) !== Boolean(feedback.isInverted)) Object.assign(style, feedback.style)
	}
	return style
}

async function resolvedBackground(id: string): Promise<number> {
	return (await resolvedStyle(id)).bgcolor
}

async function resolvedElements(id: string) {
	const layered = presetVariants(presets[id])[0]
	if (layered?.type !== 'layered') throw new Error('Missing layered cue preset')
	const elements = structuredClone(elementsIn(layered.elements))
	const definitions = getFeedbacks(self)
	for (const feedback of layered.feedbacks) {
		const definition = definitions[feedback.feedbackId as keyof typeof definitions]
		if (!definition) throw new Error('Unknown feedback')
		const active: unknown = await Reflect.apply(definition.callback, undefined, [{ options: feedback.options }])
		if (Boolean(active) === Boolean(feedback.isInverted)) continue
		for (const override of feedback.styleOverrides) {
			const element = elements.find((element) => element.id === override.elementId)
			if (!element) throw new Error('Unknown target element')
			Object.assign(element, { [override.elementProperty]: override.override })
		}
	}
	return elements
}

describe('preset state priority', () => {
	test.each([
		['Playing', '1', '1', ColorGreen, ColorGreen],
		['Playing', '1', '2', ColorGreen, ColorSurface],
		['Paused', '1', '1', ColorSurface, ColorSurface],
		[undefined, undefined, undefined, ColorSurface, ColorSurface],
		['Playing', '1', undefined, ColorGreen, ColorSurface],
	] as const)(
		'Play indicators match playback %s, current cue %s and selected cue %s',
		async (playing, currentCueID, selectedCueID, playlistColor, selectedColor) => {
			fake.states = { playing, currentCueID, selectedCueID }
			for (const [ids, color] of [
				[['playPlaylist', 'playPlaylistText'], playlistColor],
				[['playSelected', 'playSelectedText', 'selectedCueStatus'], selectedColor],
			] as const) {
				for (const id of ids) {
					expect(await resolvedBackground(id), id).toBe(color)
					expect(
						(await resolvedElements(id)).find((element) => element.id === 'surface'),
						id,
					).toMatchObject({ color })
				}
			}
		},
	)

	test('unknown output and cue toggle states do not select Off or show warnings', async () => {
		fake.states = {}
		fake.cues.current = {}
		for (const id of [
			'videoOutputsOn',
			'videoOutputsOff',
			'videoOutputsActive',
			'audioOutputsOn',
			'audioOutputsOff',
			'audioOutputsActive',
			'loopOn',
			'loopOff',
			'audioOn',
			'audioOff',
		]) {
			expect(await resolvedStyle(id), id).toMatchObject({ bgcolor: ColorSurface, color: ColorWhite })
			const elements = await resolvedElements(id)
			expect(
				elements.find((element) => element.id === 'surface'),
				id,
			).toMatchObject({ color: ColorSurface })
		}
		fake.cues.current.toggleLoop = 0
		expect(await resolvedBackground('loopOff')).toBe(MittiGray)
		fake.cues.current.toggleLoop = 1
		expect(await resolvedStyle('loopOn')).toMatchObject({ color: MittiCyan })
		expect(await resolvedBackground('loopOff')).toBe(ColorSurface)
	})

	test('cue audio controls use Mute and Unmute and omit the repeated toggle caption', () => {
		const variant = (id: string) => presetVariants(presets[id])[0]
		expect(variant('audioOn').name).toBe('Unmute Cue Audio')
		expect(variant('audioOff').name).toBe('Mute Cue Audio')
		const toggle = variant('toggleAudio')
		if (toggle.type !== 'layered') throw new Error('Missing layered preset')
		const elements = elementsIn(toggle.elements)
		expect(elements.find((element) => element.id === 'label')).toMatchObject({ text: 'CUE AUDIO' })
		expect(elements.find((element) => element.id === 'hint')).toBeUndefined()
	})

	test.each([
		['Playing', 'PAUSE', true, false, false],
		['Paused', 'RESUME', false, true, false],
		[undefined, 'PAUSE / RESUME', false, false, true],
	] as const)(
		'Pause / Resume reflects %s in text and symbol visibility',
		async (playing, label, pause, resume, unknown) => {
			fake.states = { playing }
			for (const id of ['pauseResume', 'pauseResumeText']) {
				expect((await resolvedStyle(id)).text).toBe(`TRANSPORT\n${label}`)
				const elements = await resolvedElements(id)
				expect(elements.find((element) => element.id === 'value')).toMatchObject({ text: label })
				if (id === 'pauseResume') {
					expect(elements.find((element) => element.id === 'pauseSymbol')).toMatchObject({ enabled: pause })
					expect(elements.find((element) => element.id === 'resumeSymbol')).toMatchObject({ enabled: resume })
					expect(elements.find((element) => element.id === 'unknownSymbol')).toMatchObject({ enabled: unknown })
				}
			}
		},
	)

	test('volume status warns only for a known muted cue and keeps its dB readout', async () => {
		fake.states = {}
		expect(await resolvedBackground('currentCueVolumeStatus')).toBe(ColorSurface)
		fake.states = { currentCueAudioMuted: true }
		expect(await resolvedBackground('currentCueVolumeStatus')).toBe(ColorOrange)
		const style = await resolvedStyle('currentCueVolumeStatus')
		expect(style.textExpression).toBe(true)
		expect(style.text).toContain('$(mitti:currentCueVolume)')
		expect(style.text).toContain('$(mitti:currentCueAudio)')
		fake.states.currentCueAudioMuted = false
		expect(await resolvedBackground('currentCueVolumeStatus')).toBe(ColorSurface)
	})

	test('selected-cue playback and resets have explicit targets and values', () => {
		const actions = (id: string) => presetVariants(presets[id])[0].steps[0].down
		expect(actions('selectedCueStatus')).toEqual([{ actionId: 'play_select', options: { forceCut: false } }])
		expect(actions('currentCuePlaybackReset')).toEqual([
			{ actionId: 'playbackSpeed', options: { cuenumber: 'current', value: 100 } },
		])
		expect(actions('currentCueVolumeReset')).toEqual([
			{ actionId: 'volume', options: { cuenumber: 'current', value: 0 } },
		])
	})

	test.each([
		[undefined, ColorSurface],
		[11, ColorSurface],
		[10, ColorOrange],
		[6, ColorOrange],
		[5, ColorRed],
		[4, ColorRed],
		[3, ColorRed],
		[2, ColorRed],
		[1, ColorRedDim],
		[0, ColorRed],
	])('time remaining %s keeps the timer legible with background %s', async (time, color) => {
		fake.states = { timeRemaining: time }
		expect(await resolvedBackground('currentCueTimeRemaining')).toBe(color)
	})

	test('output On and Off use distinct enabled and selected colors', async () => {
		fake.states = { videoOutputs: true }
		expect(await resolvedStyle('videoOutputsOn')).toMatchObject({ bgcolor: ColorSurface, color: MittiCyan })
		expect(await resolvedBackground('videoOutputsOff')).toBe(ColorSurface)
		fake.states = { videoOutputs: false }
		expect(await resolvedBackground('videoOutputsOn')).toBe(ColorSurface)
		expect(await resolvedBackground('videoOutputsOff')).toBe(MittiGray)
	})

	test('playing cue wins over selected and active cue colors', async () => {
		fake.states = { selectedCueID: '1', currentCueID: '1', playing: 'Playing' }
		expect(await resolvedBackground('playCueID_1')).toBe(ColorGreen)
		fake.states.playing = 'Paused'
		expect(await resolvedStyle('playCueID_1')).toMatchObject({ bgcolor: ColorSurface, color: ColorWhite })
		expect(await resolvedBackground('pauseResume')).toBe(ColorGold)
	})

	test('a selected playing cue retains its cyan marker and restores white text on green', async () => {
		fake.states = { selectedCueID: '1', currentCueID: '1', playing: 'Playing' }
		const elements = await resolvedElements('playCueID_1')
		expect(elements.find((element) => element.id === 'selection')).toMatchObject({ enabled: true, color: MittiCyan })
		expect(elements.find((element) => element.id === 'label')).toMatchObject({ color: MittiCyan })
		expect(elements.find((element) => element.id === 'value')).toMatchObject({ color: ColorWhite })
		expect(elements.find((element) => element.id === 'surface')).toMatchObject({ color: ColorGreen })
	})
})
