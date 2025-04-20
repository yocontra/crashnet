import { JSDOM } from 'jsdom'
import {
  addCrashnetHeader,
  handleAudioTags,
  handleVideoTags,
  handleSVGs,
  handleImages,
  processLinksForProxy,
  preserveComputed,
  removeHiddenElements,
  removeIframes,
  removeMetaTags,
  removeModernAttributesFromAll,
  removeScripts,
  removeStyles,
  setBodyAttributes,
  replaceModernTags,
} from './dom'

export async function simplify(dom: JSDOM, url: string): Promise<JSDOM> {
  removeHiddenElements(dom)
  removeScripts(dom)
  preserveComputed(dom)
  removeStyles(dom)
  removeMetaTags(dom)

  setBodyAttributes(dom)
  replaceModernTags(dom)
  handleImages(dom, url, false)
  processLinksForProxy(dom, url)
  removeIframes(dom)
  handleVideoTags(dom)
  handleAudioTags(dom, url)
  handleSVGs(dom)
  removeModernAttributesFromAll(dom)

  addCrashnetHeader(dom, url)
  return dom
}
