import { PlaywrightPage } from '../fetch'
import { getCrashnetHeader } from '../header'

// Add the Crashnet header to the document
export async function addCrashnetHeader(pw: PlaywrightPage, url: string): Promise<void> {
  const header = getCrashnetHeader(url, false)
  await pw.page.evaluate(
    (params) => {
      const { header } = params
      const headerDiv = document.createElement('div')
      headerDiv.innerHTML = header
      document.body.insertBefore(headerDiv, document.body.firstChild)
    },
    { header }
  )
}
