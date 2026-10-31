import { InstanceBase, InstanceStatus, type SomeCompanionConfigField } from '@companion-module/base'
import { getActions, type ActionsSchema } from './actions.js'
import { MittiApi, type CueState, type MittiState } from './api.js'
import { DEFAULT_FEEDBACK_PORT, getConfigFields, getMittiHost, type MittiConfig } from './config.js'
import { getFeedbacks, type FeedbacksSchema } from './feedbacks.js'
import { getPresets } from './presets.js'
import { UpgradeScripts } from './upgrades.js'
import { getVariables, type VariablesSchema } from './variables.js'

export { UpgradeScripts }

export type ModuleSchema = {
	config: MittiConfig
	secrets: undefined
	actions: ActionsSchema
	feedbacks: FeedbacksSchema
	variables: VariablesSchema
}

export default class MittiInstance extends InstanceBase<ModuleSchema> {
	config: MittiConfig = { feedbackPort: DEFAULT_FEEDBACK_PORT }
	cues: Record<string, CueState> = {}
	states: MittiState = {}
	api = new MittiApi(this)

	constructor(internal: unknown) {
		super(internal)
	}

	async init(config: MittiConfig): Promise<void> {
		this.initActions()
		await this.applyConfig(config)
	}

	getConfigFields(): SomeCompanionConfigField[] {
		return getConfigFields()
	}

	async configUpdated(config: MittiConfig): Promise<void> {
		await this.applyConfig(config)
	}

	async applyConfig(config: MittiConfig): Promise<void> {
		this.config = config
		this.api.host = getMittiHost(config)

		this.initPresets()
		this.initVariables()
		this.initFeedbacks()

		if (this.api.host) {
			this.updateStatus(InstanceStatus.Connecting)
			void this.initOSC()
		} else {
			await this.api.disconnect()
			this.updateStatus(InstanceStatus.BadConfig, 'Unable to determine IP Address')
		}
	}

	async destroy(): Promise<void> {
		await this.api.disconnect()

		this.cues = {}
	}

	initVariables(): void {
		this.setVariableDefinitions(getVariables(this))
	}

	initFeedbacks(): void {
		this.setFeedbackDefinitions(getFeedbacks(this))
	}

	initPresets(): void {
		const { structure, presets } = getPresets(this)
		this.setPresetDefinitions(structure, presets)
	}

	initActions(): void {
		this.setActionDefinitions(getActions(this))
	}

	async initOSC(): Promise<void> {
		this.cues = {}
		this.states = {}

		await this.api.connect()
	}
}
