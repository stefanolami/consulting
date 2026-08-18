import Link from 'next/link'
import { RegionEditor } from '@/components/admin/outreach-record-editors'
export default function NewRegionPage() { return <div className="mx-auto max-w-4xl"><Link className="text-sm font-semibold text-[#53617f] underline-offset-4 hover:underline" href="/admin/outreach/regions">← Regions</Link><p className="mt-5 text-xs font-semibold uppercase tracking-[0.2em] text-[#53617f]">Our Outreach administration</p><h1 className="mt-2 font-robo text-4xl tracking-tight text-slate-950">New region</h1><RegionEditor /></div> }
