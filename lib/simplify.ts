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
  removeModernAttributesFromAll,
  setBodyAttributes,
  replaceModernTags,
  removeUselessRoles,
  removeModernTags,
} from './dom'

export async function simplify(dom: JSDOM, url: string): Promise<JSDOM> {
  // Save the original title before manipulation
  const originalTitle = dom.window.document.title

  const clonedDom = new JSDOM(dom.serialize())

  // Also preserve the title in the cloned DOM
  if (originalTitle) {
    clonedDom.window.document.title = originalTitle
  }

  removeHiddenElements(clonedDom)
  preserveComputed(clonedDom)

  setBodyAttributes(clonedDom)
  replaceModernTags(clonedDom)
  handleImages(clonedDom, url, false)
  handleSVGs(clonedDom)
  processLinksForProxy(clonedDom, url)
  handleVideoTags(clonedDom)
  handleAudioTags(clonedDom, url)

  // finally remove junk
  removeModernTags(clonedDom)
  removeUselessRoles(clonedDom)
  removeModernAttributesFromAll(clonedDom)

  addCrashnetHeader(clonedDom, url)
  return clonedDom
}
