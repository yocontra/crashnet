import { PlaywrightPage } from './fetch'
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

export async function simplify(pwPage: PlaywrightPage, url: string): Promise<PlaywrightPage> {
  // Apply all transformations directly to the original page
  await removeHiddenElements(pwPage)
  await preserveComputed(pwPage)

  await setBodyAttributes(pwPage)
  await replaceModernTags(pwPage)
  await handleImages(pwPage, url, false)
  await handleSVGs(pwPage)
  await processLinksForProxy(pwPage, url)
  await handleVideoTags(pwPage)
  await handleAudioTags(pwPage, url)

  // finally remove junk
  await removeModernTags(pwPage)
  await removeUselessRoles(pwPage)
  await removeModernAttributesFromAll(pwPage)

  await addCrashnetHeader(pwPage, url)
  return pwPage
}
