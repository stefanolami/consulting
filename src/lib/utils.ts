import { clsx, type ClassValue } from 'clsx'
import { extendTailwindMerge } from 'tailwind-merge'

// Register the custom @theme tokens from globals.css so tailwind-merge does not
// mistake a type-scale size (text-heading-3) for a text colour and drop one.
const twMerge = extendTailwindMerge({
	extend: {
		theme: {
			text: ['display', 'heading-1', 'heading-2', 'heading-3', 'lead', 'body-lg', 'body', 'label'],
			radius: ['control', 'panel', 'pill'],
			container: ['content', 'shell'],
		},
	},
})

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs))
}
