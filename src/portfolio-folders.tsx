import * as React from "react"
import {createRoot} from "react-dom/client"
import {ArrowUpRight} from "lucide-react"
import GlassFolder, {type FolderFile} from "@/components/ui/glass-folder-cards"
import "@/styles/globals.css"

declare global {interface Window {goTo?: (page: string) => void; bindHover?: () => void}}
type Category = {id: string; label: string; meta: string; tone: "light" | "dark"; files: FolderFile[]}
const tones: Record<string, "light" | "dark"> = {graphic:"dark",podcast:"dark",event:"dark",shortform:"dark",website:"dark",logo:"dark"}
const labels: Record<string,string> = {graphic:"Graphic Work",podcast:"Podcast Video",event:"Event Video",shortform:"Short Form & Real Estate",website:"Website",logo:"Logo Animation"}
const assets = new URL(import.meta.url)
assets.pathname = assets.pathname.replace(/[^/]*$/, "art/")
assets.search = ""; assets.hash = ""
const previewImage = (source: string) => {
  if(source.includes("res.cloudinary.com") && source.includes("/video/upload/")) return source.replace("/video/upload/","/video/upload/so_0,f_jpg,q_auto,w_544,c_limit/").replace(/\.(mp4|webm)(\?.*)?$/i,".jpg")
  if(source.includes("res.cloudinary.com") && source.includes("/image/upload/")) return source.replace("/image/upload/","/image/upload/f_auto,q_auto,w_544,c_limit/")
  return source
}
function readCategories(container: HTMLElement): Category[] {
  return [...container.querySelectorAll<HTMLAnchorElement>("a.cat-card")].map(anchor => {
    const id = anchor.hash.slice(1), label = labels[id] ?? anchor.querySelector(".cat-title")!.textContent!.trim()
    const page=document.getElementById("page-"+id)
    const media=[...page?.querySelectorAll<HTMLImageElement|HTMLVideoElement>(".gr-item img,.podcast-yt-card img,.ev-reel-frame video,.ev-grid-item video,.re-card video,.reel-card video,.website-grid img,.gallery-item img,.logo-grid video,video") ?? []]
    const sources=[...new Set(media.map(node=>node.getAttribute("src")).filter((src):src is string=>!!src))].slice(0,3)
    const files:FolderFile[]=sources.map((source,i)=>({name:(id==="podcast"?"Podcast":id==="graphic"?"Design":id==="shortform"?"Film":"Project")+" "+String(i+1).padStart(2,"0"),meta:"View work",image:previewImage(source),href:"#"+id}))
    if(!files.length) files.push({name:"View collection",meta:"Selected work",image:new URL(id+".webp",assets).href,href:"#"+id})
    return {id,label,meta:anchor.querySelector(".cat-type")?.textContent?.trim()??"Selected work",tone:tones[id]??"dark",files}
  })
}
function FolderCard({category,index,open,onOpenChange}:{category:Category;index:number;open:boolean;onOpenChange:(open:boolean)=>void}){
  const ref=React.useRef<HTMLElement>(null)
  const [width,setWidth]=React.useState(300)
  React.useLayoutEffect(()=>{
    const element=ref.current
    if(!element)return
    const observer=new ResizeObserver(entries=>setWidth(Math.max(200,Math.min(340,entries[0].contentRect.width-24))))
    observer.observe(element)
    return ()=>observer.disconnect()
  },[])
  return <article ref={ref} className="portfolio-folder-card tw:min-w-0" aria-label={category.label}>
    <GlassFolder label={category.label} meta={category.meta} tone={category.tone} image={new URL(category.id+".webp",assets).href} files={category.files} action="none" width={width} open={open} onOpenChange={onOpenChange} appearDelay={index%3*90} />
    <div className="portfolio-folder-caption"><span className="portfolio-folder-num">{String(index+1).padStart(2,"0")}</span><a className="portfolio-folder-link" href={"#"+category.id} aria-label={"View "+category.label+" gallery"}>View collection <ArrowUpRight aria-hidden="true" /></a></div>
  </article>
}
function FolderGrid({categories}:{categories:Category[]}){
  const [openId,setOpenId]=React.useState<string|null>(null)
  React.useEffect(()=>{
    window.bindHover?.()
    const reset=()=>setOpenId(null)
    window.addEventListener("hashchange",reset)
    return ()=>window.removeEventListener("hashchange",reset)
  },[])
  return <><div className="portfolio-folder-grid tw:grid tw:w-full">{categories.map((category,index)=><FolderCard key={category.id} category={category} index={index} open={openId===category.id} onOpenChange={open=>setOpenId(open?category.id:null)} />)}</div><p className="portfolio-folder-hint">Open a folder to explore · View a collection to see the full work</p></>
}
export function mountPortfolioFolders(container:HTMLElement){
  if(container.dataset.foldersMounted)return
  const categories=readCategories(container)
  if(!categories.length)return
  const onNavigate=(event:MouseEvent)=>{
    if(event.defaultPrevented || event.button!==0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)return
    const anchor=(event.target as Element).closest<HTMLAnchorElement>("a[href^='#']")
    if(!anchor || !container.contains(anchor))return
    const page=anchor.hash.slice(1)
    if(!categories.some(category=>category.id===page) || !window.goTo)return
    event.preventDefault();window.goTo(page)
  }
  container.addEventListener("click",onNavigate)
  container.classList.remove("hub-grid","reveal")
  container.classList.add("portfolio-folder-mount")
  container.dataset.foldersMounted="true"
  createRoot(container).render(<FolderGrid categories={categories} />)
}
