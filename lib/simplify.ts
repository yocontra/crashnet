import { PlaywrightPage } from './fetch'
import {
  addCrashnetHeader,
  handleAudioTags,
  handleVideoTags,
  handleSVGs,
  handleImages,
  processLinksForProxy,
  preserveComputed,
  processPictureElements,
  removeHiddenElements,
  removeModernAttributesFromAll,
  setBodyAttributes,
  replaceModernTags,
  removeUnwantedElements,
} from './dom'
import { convertTablesToLayout } from './tables'

export async function simplify(
  pwPage: PlaywrightPage,
  url: string,
  baseUrl?: string
): Promise<PlaywrightPage> {
  await removeHiddenElements(pwPage)
  await preserveComputed(pwPage)

  // Process picture elements first
  await processPictureElements(pwPage)

  await setBodyAttributes(pwPage)
  await replaceModernTags(pwPage)

  // Convert tables to simpler layouts for vintage browsers
  await convertTablesToLayout(pwPage)

  await handleImages(pwPage, url, false, baseUrl)
  await handleSVGs(pwPage, baseUrl)
  await processLinksForProxy(pwPage, url, false, baseUrl)
  await handleVideoTags(pwPage)
  await handleAudioTags(pwPage, url)

  // Remove unwanted elements
  await removeUnwantedElements(pwPage)
  await removeModernAttributesFromAll(pwPage)

  await addCrashnetHeader(pwPage, url)
  return pwPage
}
