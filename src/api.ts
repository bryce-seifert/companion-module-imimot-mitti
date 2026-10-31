import { createSocket, type RemoteInfo } from 'node:dgram'
import { InstanceStatus } from '@companion-module/base'
import { Bonjour, type Service } from '@julusian/bonjour-service'
import { Server } from 'node-osc'
import { CueToggleFeedbackIds } from './feedbacks.js'
import type MittiInstance from './main.js'
import type { VariablesSchema } from './variables.js'

// Mitti always listens for OSC commands on this port
const MITTI_OSC_PORT = 51000

export type OscValue = string | number

export type CueState = Partial<Record<string, OscValue>>

export interface MittiState {
	currentCueName?: OscValue
	currentCueID?: OscValue
	selectedCueName?: OscValue
	selectedCueID?: OscValue
	playing?: 'Playing' | 'Paused'
	playhead?: number
	timeRemaining?: number
	videoOutputs?: boolean
	audioOutputs?: boolean
	inFromPlayheadEnabled?: boolean
	outFromPlayheadEnabled?: boolean
	currentCueVolume?: number
	currentCuePlaybackSpeed?: number
}

type OscMessage = [string, ...unknown[]]
type OscBundle = { elements: (OscMessage | OscBundle)[] }

interface ConnectionState {
	connected: boolean | null
	testService: NodeJS.Timeout | null
	testTimeout: NodeJS.Timeout | null
	lastPong: number | null
	bonjour: Bonjour | null
	bonjourService: Service | null
}

// Mitti sends '-' when there is no cue to report
function displayValue(value: OscValue | undefined): OscValue | undefined {
	return value != '-' ? value : 'None'
}

function roundVolume(value: OscValue | undefined): number {
	return Math.round(Number(value) * 100) / 100
}

interface Timecode {
	sign: string
	hh: string
	mm: string
	ss: string
}

// Mitti reports times as `HH:MM:SS`, with a leading '-' for time remaining
function parseTimecode(value: OscValue | undefined, sign: '' | '-'): Timecode | null {
	const match = String(value).match(new RegExp(`^${sign}(\\d\\d):(\\d\\d):(\\d\\d)`))
	if (!match) return null
	const [, hh, mm, ss] = match
	return { sign, hh, mm, ss }
}

// The short form drops the hours when they are zero
function timecodeVariables(
	name: 'cueTimeLeft' | 'cueTimeElapsed' | 'currentCueTRT',
	{ sign, hh, mm, ss }: Timecode,
): Partial<VariablesSchema> {
	return {
		[name]: `${sign}${hh == '00' ? '' : hh + ':'}${mm}:${ss}`,
		[`${name}_hhmmss`]: `${sign}${hh}:${mm}:${ss}`,
		[`${name}_h`]: hh,
		[`${name}_m`]: mm,
		[`${name}_s`]: ss,
	}
}

// Communication with Mitti: OSC commands out, the OSC feedback listener and decoding its messages into module state, the heartbeat and the Bonjour advertisement
export class MittiApi {
	host: string | null = null
	private listener: Server | null = null
	private connection: ConnectionState = {
		connected: null,
		testService: null,
		testTimeout: null,
		lastPong: null,
		bonjour: null,
		bonjourService: null,
	}

	constructor(private readonly self: MittiInstance) {}

	sendCommand(command: string, value?: OscValue, type?: 's' | 'i'): void {
		if (!this.host) return

		if (value || value === 0) {
			this.self.oscSend(this.host, MITTI_OSC_PORT, `/mitti/${command}`, [
				type === 'i' ? { type: 'i', value: Number(value) } : { type: 's', value: String(value) },
			])
		} else {
			this.self.oscSend(this.host, MITTI_OSC_PORT, `/mitti/${command}`, [])
		}
	}

	async connect(): Promise<void> {
		await this.closeListener()
		const feedbackPort = this.self.config.feedbackPort

		const portError = await this.checkPortAvailable(feedbackPort)
		if (portError) {
			this.handleListenerError(portError)
			return
		}

		this.listener = new Server(feedbackPort, '0.0.0.0')

		this.listener.on('listening', () => {
			this.self.updateStatus(InstanceStatus.Ok)
			this.connection.connected = true

			this.sendCommand('resendOSCFeedback')

			if (this.self.config.feedbackAlert) {
				this.startTestService()
			} else {
				this.stopTestService()
			}

			void this.startBonjourService()
		})

		this.listener.on('error', (err: NodeJS.ErrnoException, rinfo?: RemoteInfo) => {
			// node-osc reports undecodable packets as errors too (with rinfo); those don't affect the socket
			if (rinfo) {
				this.self.log('debug', `Ignoring malformed OSC packet from ${rinfo.address}: ${err.message}`)
				return
			}
			this.handleListenerError(err)
		})

		this.listener.on('message', (message: OscMessage) => this.processOSCMessage(message))
		this.listener.on('bundle', (bundle: OscBundle) => this.processOSCBundle(bundle))
	}

	private handleListenerError(err: NodeJS.ErrnoException): void {
		this.connection.connected = false
		if (err.code == 'EADDRINUSE') {
			this.self.log('error', `Error: Selected feedback port ${err.message.split(':')[1]} is already in use.`)
			this.self.updateStatus(InstanceStatus.BadConfig, 'Feedback port conflict')
		} else {
			this.self.log('error', `Error: ${err.message}`)
			this.self.updateStatus(InstanceStatus.BadConfig, 'Feedback Unavailable')
		}
	}

	// node-osc always binds with reuseAddr, so a port clash never errors; probe with an exclusive bind first
	private async checkPortAvailable(port: number): Promise<NodeJS.ErrnoException | null> {
		return new Promise((resolve) => {
			const probe = createSocket({ type: 'udp4', reuseAddr: false })
			probe.once('error', (err) => {
				probe.close()
				resolve(err)
			})
			probe.once('listening', () => probe.close(() => resolve(null)))
			probe.bind(port, '0.0.0.0')
		})
	}

	private async closeListener(): Promise<void> {
		const listener = this.listener
		if (!listener) return
		this.listener = null
		listener.removeAllListeners()
		// Wait for the socket to release the port so a restart on the same port passes the availability check
		await new Promise<void>((resolve) => {
			try {
				void listener.close(() => resolve())
			} catch {
				// Socket was never bound or is already closed
				resolve()
			}
		})
	}

	private processOSCBundle(bundle: OscBundle): void {
		for (const element of bundle.elements) {
			if (Array.isArray(element)) {
				this.processOSCMessage(element)
			} else {
				this.processOSCBundle(element)
			}
		}
	}

	private processOSCMessage(message: OscMessage): void {
		const [address, rawValue] = message
		const value = typeof rawValue === 'string' || typeof rawValue === 'number' ? rawValue : undefined

		if (!address || typeof address !== 'string') {
			return
		}

		if (address.match(/(^\/mitti\/current\/)/i)) {
			const cueInfo = address.match(/(\/mitti\/current\/)(\S*)/i)
			const param = cueInfo?.[2]
			if (param) {
				this.processCueUpdate('current', param, value)
			}
		} else if (address.match(/(^\/mitti\/\S*\/)/i)) {
			const cueInfo = address.match(/(\/mitti\/)(\S*)(\/)(\S*)/i)
			const cue = cueInfo?.[2]
			const param = cueInfo?.[4]

			if (cue && param && cue !== 'current') {
				this.processCueUpdate(cue, param, value)
			}
		} else {
			const sanitizedAddress = address.replace('/mitti/', '')
			if (sanitizedAddress === 'pong') {
				this.connection.lastPong = Date.now()
			} else {
				this.processListenerUpdate(sanitizedAddress, value)
			}
		}
	}

	private testConnection(): void {
		this.connection.testService = setInterval(() => {
			this.sendCommand('ping')

			this.connection.testTimeout = setTimeout(() => {
				if (Date.now() - 4000 > (this.connection.lastPong ?? 0)) {
					if (this.connection.connected === true) {
						this.connection.connected = false
						this.self.updateStatus(InstanceStatus.ConnectionFailure, 'Feedback Unavailable')
						this.self.log(
							'error',
							'Feedback unavailable, unable to receive response from Mitti. Check you OSC Feedback settings in both Mitti and Companion.',
						)
					}
				} else {
					if (this.connection.connected === false) {
						this.connection.connected = true
						this.self.updateStatus(InstanceStatus.Ok)
						this.self.log('info', 'Connected to Mitti')
					}
				}
			}, 2000)
		}, 4000)
	}

	private startTestService(): void {
		this.stopTestService()
		this.self.log('debug', 'Starting Connection Test')
		this.testConnection()
	}

	private stopTestService(): void {
		if (this.connection.testService) {
			this.self.log('debug', 'Stopping Connection Test')
			clearInterval(this.connection.testService)
			this.connection.testService = null
		}
		if (this.connection.testTimeout) {
			clearTimeout(this.connection.testTimeout)
			this.connection.testTimeout = null
		}
	}

	private async startBonjourService(): Promise<void> {
		await this.stopBonjourService()

		const feedbackPort = this.self.config.feedbackPort
		const name = `Bitfocus-Mitti-Module:${feedbackPort}`

		try {
			const bonjour = new Bonjour()
			this.connection.bonjour = bonjour

			const service = bonjour.publish({
				name: name,
				type: 'osc',
				port: feedbackPort,
				protocol: 'udp',
				disableIPv6: true,
			})
			this.connection.bonjourService = service

			service.on('up', () => {
				this.self.log('debug', `Bonjour advertised as ${name}`)
			})

			service.on('error', (err: unknown) => {
				this.self.log('debug', `Bonjour error: ${String(err)}`)
			})
		} catch (e) {
			this.self.log('error', `Error advertising Bonjour discovery service: ${String(e)}`)
			// Clean up if we created the Bonjour instance but failed to publish
			if (this.connection.bonjour) {
				try {
					this.connection.bonjour.destroy()
				} catch (destroyErr) {
					this.self.log('error', `Error destroying Bonjour instance: ${String(destroyErr)}`)
				}
				this.connection.bonjour = null
			}
		}
	}

	private async stopBonjourService(): Promise<void> {
		// Stop the service explicitly first
		if (this.connection.bonjourService) {
			try {
				this.connection.bonjourService.stop?.()
			} catch (e) {
				this.self.log('error', `Error stopping Bonjour service: ${String(e)}`)
			}
			// Remove event listeners from service before cleanup
			this.connection.bonjourService.removeAllListeners()
			this.connection.bonjourService = null
		}

		const bonjour = this.connection.bonjour
		if (bonjour) {
			await new Promise<void>((resolve) => {
				try {
					bonjour.unpublishAll(() => {
						this.self.log('debug', `Bonjour advertisement destroyed`)
						try {
							bonjour.destroy()
							this.self.log('debug', `Bonjour instance destroyed`)
						} catch (destroyErr) {
							this.self.log('error', `Error destroying Bonjour instance: ${String(destroyErr)}`)
						} finally {
							this.connection.bonjour = null
							resolve()
						}
					})
				} catch (e) {
					this.self.log('error', `Error stopping Bonjour instance: ${String(e)}`)
					this.connection.bonjour = null
					resolve()
				}
			})
		}
	}

	async disconnect(): Promise<void> {
		await this.closeListener()

		this.stopTestService()
		void this.stopBonjourService()
	}

	private processListenerUpdate(address: string, value: OscValue | undefined): void {
		switch (address) {
			case 'currentCueName':
				this.self.states.currentCueName = value
				this.self.setVariableValues({ currentCueName: displayValue(value) })
				this.self.checkFeedbacks('playingCueName', 'playingCueID', 'activeCueName')
				break
			case 'currentCueID':
				this.self.states.currentCueID = value
				this.self.setVariableValues({ currentCueID: displayValue(value) })
				this.self.checkFeedbacks('playingCueName', 'playingCueID', 'activeCueID')
				break
			case 'previousCueName':
				this.self.setVariableValues({ previousCueName: displayValue(value) })
				break
			case 'nextCueName':
				this.self.setVariableValues({ nextCueName: displayValue(value) })
				break
			case 'selectedCueName':
				this.self.states.selectedCueName = value
				this.self.setVariableValues({ selectedCueName: displayValue(value) })
				this.self.checkFeedbacks('selectedCueName')
				break
			case 'selectedCueID':
				this.self.states.selectedCueID = value
				this.self.setVariableValues({ selectedCueID: displayValue(value) })
				this.self.checkFeedbacks('selectedCueID')
				break
			case 'cueTimeLeft':
				{
					const time = parseTimecode(value, '-')
					if (time) {
						this.self.setVariableValues(timecodeVariables('cueTimeLeft', time))
						this.self.states.timeRemaining = parseInt(time.hh) * 3600 + parseInt(time.mm) * 60 + parseInt(time.ss)
						this.self.checkFeedbacks('timeRemaining')
					}
				}
				break
			case 'cueTimeElapsed':
			case 'currentCueTRT':
				{
					const time = parseTimecode(value, '')
					if (time) this.self.setVariableValues(timecodeVariables(address, time))
				}
				break
			case 'currentCueVolume':
				this.self.states.currentCueVolume = Number(value)
				this.self.setVariableValues({ currentCueVolume: roundVolume(value) })
				break
			case 'togglePlay':
				this.self.states.playing = value === 0 ? 'Paused' : 'Playing'
				this.self.setVariableValues({ playStatus: this.self.states.playing })
				this.self.checkFeedbacks('playStatus', 'playingCueName', 'playingCueID')
				break
			case 'playhead':
				this.self.states.playhead = Number(value)
				break
			case 'toggleVideoOutputs':
				this.self.states.videoOutputs = value == 1
				this.self.setVariableValues({ video_outputs: this.self.states.videoOutputs ? 'Active' : 'Off' })
				this.self.checkFeedbacks('videoOutputs')
				break
			case 'toggleAudio':
				this.self.states.audioOutputs = value == 1
				this.self.setVariableValues({ audio_outputs: this.self.states.audioOutputs ? 'Active' : 'Off' })
				this.self.checkFeedbacks('audioOutputs')
				break
			case 'inFromPlayheadEnabled':
				this.self.states.inFromPlayheadEnabled = value == 1
				this.self.checkFeedbacks('inFromPlayheadEnabled')
				break
			case 'outFromPlayheadEnabled':
				this.self.states.outFromPlayheadEnabled = value == 1
				this.self.checkFeedbacks('outFromPlayheadEnabled')
				break
			default:
				break
		}
	}

	private processCueUpdate(cue: string, param: string, value: OscValue | undefined): void {
		if (cue === 'current') {
			this.self.cues[cue] ??= {}
			this.self.cues[cue][param] = value

			let variableValue = value
			let variableId: `currentCue${string}`
			if (param.match(/^toggle/)) {
				const name = param.replace('toggle', '')
				if (name === 'Audio') {
					variableValue = Number(value) > 0 ? 'Unmuted' : 'Muted'
				} else {
					variableValue = Number(value) > 0 ? 'On' : 'Off'
				}
				variableId = `currentCue${name}`
			} else {
				let name = param.charAt(0).toUpperCase() + param.slice(1)
				if (name === 'VolumeAsDecibels') {
					this.self.states.currentCueVolume = Number(value)
					name = 'Volume'
					variableValue = roundVolume(value)
				}
				if (name === 'PlaybackSpeed') {
					this.self.states.currentCuePlaybackSpeed = Number(value)
				}

				variableId = `currentCue${name}`
			}

			this.self.setVariableValues({ [variableId]: variableValue })
		} else if (cue === 'previous' || cue === 'next') {
			this.self.cues[cue] ??= {}
			this.self.cues[cue][param] = value
		} else {
			if (!this.self.cues[cue]?.cueName && cue !== '0' && param === 'cueName') {
				this.self.cues[cue] ??= {}
				this.self.cues[cue][param] = value
				this.self.initVariables()
				this.self.initPresets()
				this.self.setVariableValues({ [`cue_${cue}_cueName`]: value })
			} else if (this.self.cues[cue] && cue !== '0' && param === 'deleted') {
				delete this.self.cues[cue]
				this.self.initVariables()
				this.self.initPresets()
			} else {
				this.self.cues[cue] ??= {}
				this.self.cues[cue][param] = value

				if (param === 'cueName') {
					this.self.setVariableValues({ [`cue_${cue}_cueName`]: value })
				}
				const feedbackId = CueToggleFeedbackIds[param]
				if (feedbackId) {
					this.self.checkFeedbacks(feedbackId)
				}
			}
		}
	}
}
