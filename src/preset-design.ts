import {
	ButtonGraphicsDecorationType,
	type ButtonGraphicsTextElement,
	type CompanionLayeredButtonPresetDefinition,
	type CompanionGraphicsElementValue,
	type CompanionPresetAlternatives,
	type CompanionPresetFeedbackStyleOverride,
	type CompanionSimplePresetDefinition,
	type SomeButtonGraphicsElement,
	type SomePresetActionEntry,
	type SomePresetLayeredFeedbackEntry,
	type SomePresetSimpleFeedbackEntry,
} from '@companion-module/base'
import type { ModuleSchema } from './main.js'
import {
	ColorDisabledText,
	ColorGold,
	ColorGreen,
	ColorMuted,
	ColorOrange,
	ColorRed,
	ColorRedDim,
	ColorSurface,
	ColorWhite,
	MittiCyan,
	MittiGray,
} from './utils.js'

export type PresetAction = SomePresetActionEntry<ModuleSchema>
export type PresetFeedback = SomePresetSimpleFeedbackEntry<ModuleSchema>
export type TransportIcon = 'play' | 'playlist' | 'pause' | 'previous' | 'next' | 'playPause'

export const PresetTextSizes = { primary: '18', standard: '14', fit: 'auto' } as const

interface ButtonPreset {
	name: string
	/** Context first, then the action or live value. */
	lines: string[]
	size?: keyof typeof PresetTextSizes
	bgcolor?: number
	icon?: TransportIcon
	hint?: string
	mono?: boolean
	cue?: boolean
	progress?: boolean
	down?: PresetAction[]
	rotateLeft?: PresetAction[]
	rotateRight?: PresetAction[]
	feedbacks?: PresetFeedback[]
}

function accentColor(background: number): number {
	switch (background) {
		case ColorGreen:
			return 0x64e5ad
		case ColorGold:
		case ColorOrange:
			return 0xffd27a
		case ColorRed:
		case ColorRedDim:
			return 0xff8598
		case MittiCyan:
			return MittiCyan
		case MittiGray:
			return 0xbfbfbf
		default:
			return 0x555555
	}
}

function text(
	id: string,
	value: string,
	y: number,
	height: number,
	fontsize: number,
	color = ColorWhite,
): ButtonGraphicsTextElement {
	return {
		type: 'text',
		id,
		name: id.charAt(0).toUpperCase() + id.slice(1),
		x: 7,
		y,
		width: 86,
		height,
		text: displayText(value),
		fontsize,
		fontsizeAllowShrink: true,
		font: 'companion-sans',
		weight: 'bold',
		color,
		outlineColor: 0xff000000, // Transparent: keep small text crisp without a black outline.
		halign: 'center',
		valign: 'center',
	}
}

/** Keep placeholders in the presentation; raw module variables retain their original values. */
function displayText(template: string): CompanionGraphicsElementValue<string> {
	const parts: string[] = []
	let end = 0
	for (const match of template.matchAll(/\$\([^)]+\)/g)) {
		parts.push(JSON.stringify(template.slice(end, match.index)))
		const variable = match[0]
		const variableEnd = match.index + variable.length
		const unit = template.slice(variableEnd).match(/^(%| dB)(?=\n|$)/)?.[0] ?? ''
		const value = unit ? `concat(${variable}, ${JSON.stringify(unit)})` : variable
		parts.push(`(${variable} == null || ${variable} === "" ? "—" : ${value})`)
		end = variableEnd + unit.length
	}
	if (!parts.length) return template
	parts.push(JSON.stringify(template.slice(end)))
	return { isExpression: true, value: `concat(${parts.join(', ')})` }
}

/** Native transport symbols in a square coordinate space. */
function transportIcon(icon: TransportIcon): SomeButtonGraphicsElement<undefined>[] {
	const stroke = (fromX: number, fromY: number, toX: number, toY: number): SomeButtonGraphicsElement<undefined> => ({
		type: 'line',
		fromX,
		fromY,
		toX,
		toY,
		borderWidth: 4,
		borderColor: ColorWhite,
	})
	// Overlapping vertical strokes form a solid triangle without raster artwork.
	const play = (x: number, width: number, top = 32, height = 36) =>
		Array.from({ length: 24 }, (_, index) => {
			const fraction = index / 24
			return {
				...stroke(
					x + width * fraction,
					top + (height * fraction) / 2,
					x + width * fraction,
					top + height - (height * fraction) / 2,
				),
				borderWidth: width / 24 + 0.2,
			}
		})
	switch (icon) {
		case 'play':
			return [
				{
					type: 'circle',
					x: 25,
					y: 25,
					width: 50,
					height: 50,
					color: 0xff000000,
					borderWidth: 3,
					borderColor: ColorWhite,
				},
				...play(43, 20, 37, 26),
			]
		case 'playlist':
			return [...play(47, 26), stroke(24, 36, 34, 36), stroke(24, 50, 34, 50), stroke(24, 64, 34, 64)]
		case 'pause':
			return [stroke(40, 32, 40, 68), stroke(60, 32, 60, 68)]
		case 'previous':
		case 'next': {
			const mirror = (x: number) => (icon === 'previous' ? 100 - x : x)
			return [
				stroke(mirror(32), 32, mirror(32), 68),
				stroke(mirror(32), 32, mirror(58), 50),
				stroke(mirror(58), 50, mirror(32), 68),
				stroke(mirror(68), 32, mirror(68), 68),
			]
		}
		case 'playPause':
			return [...play(25, 23), stroke(61, 32, 61, 68), stroke(75, 32, 75, 68)]
	}
}

function layeredFeedback(
	feedback: PresetFeedback,
	cue: boolean,
	icon?: TransportIcon,
): SomePresetLayeredFeedbackEntry<ModuleSchema> {
	const { style, ...entry } = feedback
	const styleOverrides: CompanionPresetFeedbackStyleOverride[] = []
	if (style.bgcolor !== undefined) {
		styleOverrides.push(
			{ elementId: 'surface', elementProperty: 'color', override: style.bgcolor },
			{ elementId: 'accent', elementProperty: 'color', override: accentColor(style.bgcolor) },
		)
	}
	if (style.color !== undefined) {
		styleOverrides.push({ elementId: 'value', elementProperty: 'color', override: cue ? ColorWhite : style.color })
		if (style.color === MittiCyan) {
			styleOverrides.push({ elementId: 'accent', elementProperty: 'color', override: MittiCyan })
			if (cue) styleOverrides.push({ elementId: 'label', elementProperty: 'color', override: MittiCyan })
		}
		if (style.color === ColorDisabledText) {
			styleOverrides.push({ elementId: 'label', elementProperty: 'color', override: ColorDisabledText })
		}
	}
	if (style.text !== undefined) {
		const [label, ...lines] = style.text.split('\n')
		if (lines.length) styleOverrides.push({ elementId: 'label', elementProperty: 'text', override: label })
		styleOverrides.push({
			elementId: 'value',
			elementProperty: 'text',
			override: lines.length ? lines.join('\n') : label,
		})
	}
	if (icon === 'playPause' && feedback.feedbackId === 'playStatus') {
		const playing = feedback.options.playPause === 'Playing'
		styleOverrides.push(
			{ elementId: 'pauseSymbol', elementProperty: 'enabled', override: playing },
			{ elementId: 'resumeSymbol', elementProperty: 'enabled', override: !playing },
			{ elementId: 'unknownSymbol', elementProperty: 'enabled', override: false },
		)
	}
	if (feedback.feedbackId === 'selectedCueID') {
		styleOverrides.push(
			{ elementId: 'selection', elementProperty: 'enabled', override: true },
			{ elementId: 'label', elementProperty: 'color', override: MittiCyan },
		)
	}
	return { ...entry, styleOverrides }
}

/** Every preset ships a native layered layout and a compatible text fallback. */
export function button({
	name,
	lines,
	size = 'standard',
	bgcolor = ColorSurface,
	icon,
	hint,
	mono = false,
	cue = false,
	progress = false,
	down = [],
	rotateLeft,
	rotateRight,
	feedbacks = [],
}: ButtonPreset): CompanionPresetAlternatives<ModuleSchema> {
	const label = lines.length > 1 ? lines[0].toUpperCase() : 'MITTI'
	const value = lines.length > 1 ? lines.slice(1).join('\n') : (lines[0] ?? '')
	// Uppercase static actions; preserve live variables and cue names exactly as supplied.
	const displayValue = mono || value.includes('$(') ? value : value.toUpperCase()
	const steps = [
		{ down, up: [], ...(rotateLeft && rotateRight && { rotate_left: rotateLeft, rotate_right: rotateRight }) },
	]
	const elements: SomeButtonGraphicsElement<undefined>[] = [
		{ type: 'box', id: 'surface', name: 'State Background', x: 0, y: 0, width: 100, height: 100, color: bgcolor },
		{ type: 'box', id: 'accent', name: 'State Accent', x: 9, y: 0, width: 82, height: 3, color: accentColor(bgcolor) },
		text('label', label, 9, 15, 85, ColorMuted),
	]
	if (cue) {
		elements.push({
			type: 'box',
			id: 'selection',
			name: 'Selected Cue',
			x: 0,
			y: 0,
			width: 3,
			height: 100,
			color: MittiCyan,
			enabled: false,
		})
	}
	if (icon) {
		elements.push({
			type: 'group',
			id: 'icon',
			name: 'Transport Symbol',
			squareCoords: true,
			children:
				icon === 'playPause'
					? [
							{
								type: 'group',
								id: 'pauseSymbol',
								name: 'Pause Symbol',
								enabled: false,
								children: transportIcon('pause'),
							},
							{
								type: 'group',
								id: 'resumeSymbol',
								name: 'Resume Symbol',
								enabled: false,
								children: transportIcon('play'),
							},
							{
								type: 'group',
								id: 'unknownSymbol',
								name: 'Unknown State Symbol',
								enabled: true,
								children: transportIcon('playPause'),
							},
						]
					: transportIcon(icon),
		})
		elements.push(text('value', displayValue, 78, 15, 85))
	} else {
		elements.push({
			...text('value', displayValue, 30, hint ? 43 : 58, size === 'primary' ? 75 : 60),
			font: mono ? 'companion-mono' : 'companion-sans',
		})
		if (hint) elements.push(text('hint', hint, 82, 11, 85, ColorMuted))
	}
	if (progress)
		elements.push({
			type: 'gauge',
			id: 'progress',
			name: 'Cue Progress',
			x: 7,
			y: 94,
			width: 86,
			height: 3,
			orientation: 'horizontal',
			min: 0,
			max: { isExpression: true, value: '$(mitti:currentCueTRT_seconds) > 0 ? $(mitti:currentCueTRT_seconds) : 1' },
			value: {
				isExpression: true,
				value: '$(mitti:cueTimeElapsed_seconds) >= 0 ? $(mitti:cueTimeElapsed_seconds) : 0',
			},
			enabled: {
				isExpression: true,
				value: '$(mitti:currentCueTRT_seconds) > 0 && $(mitti:cueTimeElapsed_seconds) >= 0',
			},
			fillEnabled: true,
			fillWidth: 100,
			trackWidth: 100,
			trackStyle: 'dimmed',
			trackAmount: 25,
			stops: [{ value: 0, color: MittiCyan, gradient: false }],
		})
	const layered: CompanionLayeredButtonPresetDefinition<ModuleSchema> = {
		type: 'layered',
		name,
		canvas: { decoration: ButtonGraphicsDecorationType.None },
		options: {},
		elements,
		steps,
		feedbacks: feedbacks.map((feedback) => layeredFeedback(feedback, cue, icon)),
	}
	const simpleText = displayText(`${label}\n${displayValue}${hint ? '\n' + hint : ''}`)
	const simple: CompanionSimplePresetDefinition<ModuleSchema> = {
		type: 'simple',
		name,
		options: {},
		style: {
			text: typeof simpleText === 'string' ? simpleText : simpleText.value,
			textExpression: typeof simpleText !== 'string' && simpleText.isExpression,
			size: hint ? 'auto' : size === 'primary' ? PresetTextSizes.standard : PresetTextSizes[size],
			color: ColorWhite,
			bgcolor,
			show_topbar: false,
		},
		steps,
		feedbacks: cue
			? feedbacks.map((feedback) => ({ ...feedback, style: { ...feedback.style, color: ColorWhite } }))
			: feedbacks,
	}
	return { type: 'alternatives', variants: [layered, simple] }
}
