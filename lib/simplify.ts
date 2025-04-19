import { JSDOM } from 'jsdom'
import {
  addCrashnetHeader,
  handleAudioTags,
  handleVideoTags,
  handleSVGs,
  processImagesVintage,
  processLinksForProxy,
  removeIframes,
  removeMetaTags,
  removeModernAttributesFromAll,
  removeScripts,
  removeStyles,
  setBodyAttributes,
  replaceModernTags,
} from './dom'

// Main function to simplify DOM for vintage browsers
export async function simplify(dom: JSDOM, url: string): Promise<JSDOM> {
  // Clone the DOM to avoid modifying the original
  const clonedDom = new JSDOM(dom.serialize())

  // Apply transformations
  replaceModernTags(clonedDom)
  removeScripts(clonedDom)
  removeStyles(clonedDom)
  removeMetaTags(clonedDom)
  setBodyAttributes(clonedDom)
  processImagesVintage(clonedDom, url)
  processLinksForProxy(clonedDom, url)
  removeIframes(clonedDom)
  handleSVGs(clonedDom)
  handleVideoTags(clonedDom)
  handleAudioTags(clonedDom, url)
  removeModernAttributesFromAll(clonedDom)

  // Add our header
  addCrashnetHeader(clonedDom, url)
  return clonedDom
}
