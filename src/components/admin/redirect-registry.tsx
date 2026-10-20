'use client'

import { PencilLine, Plus } from 'lucide-react'
import { useMemo, useState } from 'react'

import { createRedirectAction, setRedirectEnabledAction, updateRedirectAction } from '@/app/(admin)/admin/redirects/actions'
import { AdminForm, CommandButton, CommandNotice, Field, FormActions, ResultNotice, useAdminCommand, useAdminForm } from '@/components/admin/form/admin-form'
import { useUnsavedChanges } from '@/components/admin/form/unsaved-changes'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { AdminActionResult } from '@/lib/admin-form-state.mjs'

type RedirectRow = { id: string; locale: string | null; sourcePath: string; destinationPath: string; statusCode: number; isActive: boolean; updatedAt: string }

export function RedirectRegistry({ redirects }: { redirects: RedirectRow[] }) {
	const [query, setQuery] = useState(''); const [showCreate, setShowCreate] = useState(false)
	const visible = useMemo(() => redirects.filter((item) => `${item.locale ?? 'global'} ${item.sourcePath} ${item.destinationPath}`.toLowerCase().includes(query.trim().toLowerCase())), [query, redirects])
	return <div className="mt-9 space-y-6"><div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-950"><strong>Registry only:</strong> enabled records are prepared for review, but the application does not currently execute this registry. Public redirect handling remains deferred until the localized route strategy is implemented.</div><div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><label className="block max-w-md flex-1"><span className="sr-only">Search redirects</span><Input className="bg-white" onChange={(event) => setQuery(event.target.value)} placeholder="Search source, destination or locale" value={query} /></label><Button aria-expanded={showCreate} onClick={() => setShowCreate((value) => !value)} type="button"><Plus />New redirect</Button></div>{showCreate && <CreateRedirectForm /> }<div className="space-y-4">{visible.map((redirect) => <RedirectEditor key={redirect.id} redirect={redirect} />)}{!visible.length && <div className="rounded-xl border border-slate-200 bg-white px-5 py-14 text-center text-sm text-slate-500">No redirects match this view.</div>}</div></div>
}

function CreateRedirectForm() {
	// After a create the fields empty for the next redirect; the notice clears on the next edit.
	const form = useAdminForm({ action: createRedirectAction, label: 'the new redirect', resetOnSuccess: true })
	return <AdminForm className="rounded-xl border border-blue-200 bg-white p-5 shadow-sm" form={form}><div className="flex items-center gap-2"><Plus className="size-4" /><h2 className="font-semibold">Create permanent redirect</h2></div><p className="mt-1 text-sm text-slate-600">New records are disabled unless explicitly enabled below.</p><div className="mt-5 grid gap-4 md:grid-cols-[9rem_1fr_1fr_7rem]"><LocaleSelect /><Field label="Legacy source path" name="sourcePath" required><Input name="sourcePath" placeholder="/old-path" required /></Field><Field label="Destination" name="destinationPath" required><Input name="destinationPath" placeholder="/new-path or https://…" required /></Field><StatusSelect /></div><label className="mt-4 flex items-center gap-2 text-sm text-slate-700"><input name="enabled" type="checkbox" />Enable in registry after validation</label><FormActions className="mt-5" form={form} label="Create redirect" /></AdminForm>
}

function RedirectEditor({ redirect }: { redirect: RedirectRow }) {
	const [editing, setEditing] = useState(false)
	// One notice per row: the last action's result.
	const [saved, setSaved] = useState<{ result: AdminActionResult; savedAt: Date } | null>(null)
	const toggle = useAdminCommand(setRedirectEnabledAction)
	const unsaved = useUnsavedChanges()
	const edit = useAdminForm({ action: updateRedirectAction, label: `the redirect from ${redirect.sourcePath}`, scope: redirect.id, onSuccess: (result) => { setEditing(false); toggle.clear(); setSaved({ result, savedAt: new Date() }) } })
	return <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><Badge variant="outline">{redirect.locale ?? 'global'}</Badge><Badge className={redirect.isActive ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-slate-50 text-slate-600'} variant="outline">{redirect.isActive ? 'Enabled' : 'Disabled'}</Badge><span className="text-xs text-slate-500">HTTP {redirect.statusCode}</span></div><p className="mt-3 break-all font-medium text-slate-900">{redirect.sourcePath}</p><p className="mt-1 break-all text-sm text-slate-600">→ {redirect.destinationPath}</p><p className="mt-2 text-xs text-slate-400">Updated {new Date(redirect.updatedAt).toLocaleString()}</p></div><div className="flex flex-wrap gap-2"><Button aria-expanded={editing} onClick={async () => { if (editing && unsaved && !(await unsaved.confirmDiscard({ reason: 'close', scope: redirect.id }))) return; setEditing(!editing); setSaved(null); toggle.clear() }} type="button" variant="outline"><PencilLine />Edit</Button><CommandButton onClick={() => { setSaved(null); toggle.run({ enabled: String(!redirect.isActive), id: redirect.id }) }} pending={toggle.pending} variant={redirect.isActive ? 'destructive' : 'default'}>{redirect.isActive ? 'Disable' : 'Enable'}</CommandButton></div></div><CommandNotice className="mt-4" command={toggle} />{saved ? <ResultNotice className="mt-4" result={saved.result} savedAt={saved.savedAt} /> : null}{editing && <AdminForm className="mt-5 border-t border-slate-200 pt-5" form={edit}><input name="id" type="hidden" value={redirect.id} /><div className="grid gap-4 md:grid-cols-[9rem_1fr_1fr_7rem]"><LocaleSelect locale={redirect.locale} /><Field label="Legacy source path" name="sourcePath" required><Input defaultValue={redirect.sourcePath} name="sourcePath" required /></Field><Field label="Destination" name="destinationPath" required><Input defaultValue={redirect.destinationPath} name="destinationPath" required /></Field><StatusSelect statusCode={redirect.statusCode} /></div><FormActions className="mt-5" form={edit} label="Save redirect" /></AdminForm>}</section>
}

function LocaleSelect({ locale }: { locale?: string | null }) { return <Field label="Locale scope" name="locale"><select className="input-select" defaultValue={locale ?? ''} name="locale"><option value="">Global</option>{['en', 'de', 'it', 'pt-BR', 'pt-PT'].map((item) => <option key={item} value={item}>{item}</option>)}</select></Field> }
function StatusSelect({ statusCode = 308 }: { statusCode?: number }) { return <Field label="Permanent code" name="statusCode"><select className="input-select" defaultValue={statusCode} name="statusCode"><option value="308">308</option><option value="301">301</option></select></Field> }
