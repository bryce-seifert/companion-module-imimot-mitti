import { describe, expect, test } from 'vitest'
import { getActions } from '../actions.js'
import { getFeedbacks } from '../feedbacks.js'
import { getPresets } from '../presets.js'
import { getCueVariableValues, getVariables } from '../variables.js'
import { asInstance, createApi, createFakeInstance } from './helpers.js'

function withPlaylist() {
	const fake = createFakeInstance()
	for (const id of ['current', 'previous', 'next', '0', '1', 'AB12']) fake.cues[id] = {}
	fake.cues['1'].cueName = 'Intro'
	return fake
}

describe('presets', () => {
	const self = asInstance(withPlaylist())
	const { structure, presets } = getPresets(self)
	const actions = getActions(self)
	const feedbacks = getFeedbacks(self)
	const referenced = structure.flatMap((section) =>
		section.definitions.flatMap((definition) => {
			if (typeof definition === 'string') return [definition]
			return definition.type === 'simple' ? definition.presets : []
		}),
	)

	test('every preset appears in the structure exactly once', () => {
		expect([...referenced].sort()).toEqual(Object.keys(presets).sort())
	})

	test('presets only use actions and feedbacks that exist', () => {
		for (const preset of Object.values(presets)) {
			if (preset?.type !== 'simple') throw new Error('Only simple presets are expected')
			for (const step of preset.steps) {
				for (const entry of [...step.down, ...step.up, ...(step.rotate_left ?? []), ...(step.rotate_right ?? [])]) {
					expect(actions, preset.name).toHaveProperty([entry.actionId])
				}
			}
			for (const feedback of preset.feedbacks) {
				expect(feedbacks, preset.name).toHaveProperty([feedback.feedbackId])
			}
		}
	})

	test('Play Cue by ID only lists playlist cues', () => {
		const section = structure.find((s) => s.id === 'playCueById')

		expect(section?.definitions).toEqual(['playCueID_1', 'playCueID_AB12'])
	})
})

describe('variables', () => {
	test('each playlist cue gets a name variable with its current value', () => {
		const self = asInstance(withPlaylist())

		expect(Object.keys(getVariables(self)).filter((id) => id.startsWith('cue_'))).toEqual([
			'cue_1_cueName',
			'cue_AB12_cueName',
		])
		expect(getCueVariableValues(self)).toEqual({ cue_1_cueName: 'Intro', cue_AB12_cueName: undefined })
	})
})

describe('actions', () => {
	function run(actionId: string, options: Record<string, unknown>) {
		const fake = createFakeInstance()
		const self = asInstance(fake)
		self.api = createApi(fake)
		const definition = getActions(self)[actionId as keyof ReturnType<typeof getActions>]
		if (!definition) throw new Error(`No action ${actionId}`)
		void (definition.callback as (event: { options: Record<string, unknown> }) => void)({ options })
		return fake
	}

	test('cue actions target the conformed cue ID', () => {
		const fake = run('audioOn', { cuenumber: 'ab12' })

		expect(fake.oscSend).toHaveBeenCalledWith('10.0.0.2', 51000, '/mitti/AB12/audioOn', [])
	})

	test('cue value actions send the value', () => {
		const fake = run('opacity', { cuenumber: 'current', value: 50 })

		expect(fake.oscSend).toHaveBeenCalledWith('10.0.0.2', 51000, '/mitti/current/opacityAsPercent', [
			{ type: 's', value: '50' },
		])
	})

	test('play cue at index sends an integer, or warns when out of range', () => {
		expect(run('playCueIndex', { index: 3, forceCut: false }).oscSend).toHaveBeenCalledWith(
			'10.0.0.2',
			51000,
			'/mitti/playCueAtIndex',
			[{ type: 'i', value: 3 }],
		)

		const outOfRange = run('playCueIndex', { index: 1000, forceCut: false })
		expect(outOfRange.oscSend).not.toHaveBeenCalled()
		expect(outOfRange.log).toHaveBeenCalledWith('warn', expect.any(String))
	})
})
