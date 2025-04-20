import { JSDOM } from 'jsdom'
import {
  addCrashnetHeader,
  handleAudioTags,
  handleVideoTags,
  handleSVGs,
  handleImages,
  processLinksForProxy,
  removeIframes,
  removeMetaTags,
  removeModernAttributesFromAll,
  removeScripts,
  removeStyles,
  setBodyAttributes,
  replaceModernTags,
} from './dom'

export async function simplify(dom: JSDOM, url: string): Promise<JSDOM> {
  const clonedDom = new JSDOM(dom.serialize())

  removeScripts(clonedDom)
  removeStyles(clonedDom)
  removeMetaTags(clonedDom)

  setBodyAttributes(clonedDom)
  replaceModernTags(clonedDom)
  handleImages(clonedDom, url, false)
  processLinksForProxy(clonedDom, url)
  removeIframes(clonedDom)
  handleVideoTags(clonedDom)
  handleAudioTags(clonedDom, url)
  handleSVGs(clonedDom, url)
  removeModernAttributesFromAll(clonedDom)

  addCrashnetHeader(clonedDom, url)
  return clonedDom
}
