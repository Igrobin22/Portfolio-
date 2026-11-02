"use client"
import GlassFolder from "./glass-folder-cards"

/** Standalone demonstration of the supplied Add / More / Open interactions. */
export default function GlassFolderCardsDemo(){
  return <div className="tw:grid tw:grid-cols-1 tw:gap-12 tw:md:grid-cols-2 tw:xl:grid-cols-3 tw:justify-items-center tw:p-8">
    <GlassFolder label="My Files" art="aurora" seed={3} />
    <GlassFolder label="Archives" art="none" action="more" labelPlacement="top-left" appearDelay={140} files={[
      {name:"Lookbook 2024",meta:"38 images",art:"dusk"},{name:"Invoices",meta:"12 PDFs"},{name:"Shoot — Lisbon",meta:"RAW · 2.1 GB",art:"ember"},{name:"Contract.pdf",meta:"PDF · 320 KB"},
    ]} />
    <GlassFolder label="My Files" meta="Wed 19 Aug" tone="dark" art="ember" seed={11} action="none" labelPlacement="top-right" appearDelay={280} files={[
      {name:"Stills",meta:"64 images",art:"verdant"},{name:"Edit notes",meta:"TXT · 4 KB"},{name:"Grade v3",meta:"DRX · 18 MB",art:"aurora"},
    ]} />
  </div>
}
