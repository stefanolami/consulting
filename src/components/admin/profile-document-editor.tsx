'use client'

import { Plus, Trash2 } from 'lucide-react'
import { useMemo, useState } from 'react'

import { RichTextEditor } from '@/components/admin/rich-text-editor'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { emptyRichText } from '@/lib/team-profile-document'
import type { ProfileDocument, ProfileEndorsement } from '@/lib/team-profile-document'
import type { Json } from '@/types/database.generated'

export function ProfileDocumentEditor({ initialValue }: { initialValue: ProfileDocument }) {
	const [document, setDocument] = useState<ProfileDocument>(initialValue)

	const serializedDocument = useMemo(() => JSON.stringify(document), [document])

	function updateIntro(patch: Partial<ProfileDocument['intro']>) {
		setDocument((current) => ({ ...current, intro: { ...current.intro, ...patch } }))
	}
	function updateSection(id: string, patch: Partial<ProfileDocument['sections'][number]>) {
		setDocument((current) => ({
			...current,
			sections: current.sections.map((section) => section.id === id ? { ...section, ...patch } : section),
		}))
	}

	return (
		<div className="space-y-7">
			<input name="profileDocument" type="hidden" value={serializedDocument} />
			<div>
				<h3 className="font-semibold text-slate-900">Introduction</h3>
				<p className="mt-1 text-sm text-slate-600">Use paragraphs, bold, italic, links, lists and line breaks (Shift+Enter). This always appears before the titled profile sections.</p>
				<ProfileRichText label="Introduction text" value={document.intro.content} onChange={(content) => updateIntro({ content })} />
				<EndorsementFields label="Introduction endorsement" value={document.intro.endorsement} onChange={(endorsement) => updateIntro({ endorsement })} />
			</div>

			<div className="border-t border-slate-200 pt-6">
				<div className="flex flex-wrap items-center justify-between gap-3">
					<div><h3 className="font-semibold text-slate-900">Profile sections</h3><p className="mt-1 text-sm text-slate-600">Sections are ordered and always contain a title and controlled rich text.</p></div>
					<Button onClick={() => setDocument((current) => ({ ...current, sections: [...current.sections, { id: crypto.randomUUID(), title: '', content: emptyRichText() }] }))} type="button" variant="outline"><Plus />Add section</Button>
				</div>
				<div className="mt-5 space-y-6">
					{document.sections.map((section, index) => (
						<div className="rounded-lg border border-slate-200 bg-slate-50 p-4" key={section.id}>
							<div className="flex items-start justify-between gap-4"><Field label={`Section ${index + 1} title`}><Input value={section.title} onChange={(event) => updateSection(section.id, { title: event.target.value })} /></Field><Button aria-label={`Remove section ${index + 1}`} onClick={() => setDocument((current) => ({ ...current, sections: current.sections.filter((item) => item.id !== section.id) }))} size="icon" type="button" variant="ghost"><Trash2 /></Button></div>
							<ProfileRichText label={`Section ${index + 1} text`} value={section.content} onChange={(content) => updateSection(section.id, { content })} />
							<EndorsementFields label={`Section ${index + 1} endorsement`} value={section.endorsement} onChange={(endorsement) => updateSection(section.id, { endorsement })} />
						</div>
					))}
				</div>
			</div>
		</div>
	)
}

// The shared editor with the profile contract: paragraphs, lists, line
// breaks, bold, italic and links. Not inside a <label>, so a click in the box
// stays in the editor.
function ProfileRichText({ label, value, onChange }: { label: string; value: Json; onChange: (value: Json) => void }) {
	return <div className="mt-4 grid gap-1.5"><span className="text-sm font-medium text-slate-700">{label}</span><RichTextEditor height="compact" initialValue={value} kind="profile" label={label} onChange={onChange} /></div>
}

function EndorsementFields({ label, value, onChange }: { label: string; value: ProfileEndorsement | undefined; onChange: (value: ProfileEndorsement | undefined) => void }) {
	const enabled = Boolean(value)
	// The quote is required; an empty attribution or role is left out, as the
	// profile contract expects.
	function update(field: keyof ProfileEndorsement, fieldValue: string) {
		onChange({ quote: value?.quote ?? '', attribution: value?.attribution, role: value?.role, [field]: field === 'quote' || fieldValue.trim() ? fieldValue : undefined })
	}
	return <div className="mt-4 rounded-md border border-dashed border-slate-300 bg-white p-3"><label className="flex items-center gap-2 text-sm font-medium text-slate-700"><input checked={enabled} onChange={(event) => onChange(event.target.checked ? { quote: '' } : undefined)} type="checkbox" />{label}</label>{enabled && <div className="mt-3 grid gap-3 md:grid-cols-2"><Field className="md:col-span-2" label="Quote"><textarea className="min-h-24 w-full rounded-md border border-input px-3 py-2 text-sm shadow-xs" value={value?.quote ?? ''} onChange={(event) => update('quote', event.target.value)} /></Field><Field label="Attribution (optional)"><Input value={value?.attribution ?? ''} onChange={(event) => update('attribution', event.target.value)} /></Field><Field label="Attribution role (optional)"><Input value={value?.role ?? ''} onChange={(event) => update('role', event.target.value)} /></Field></div>}</div>
}

function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
	return <label className={`grid gap-1.5 text-sm font-medium text-slate-700 ${className ?? ''}`}><span>{label}</span>{children}</label>
}
