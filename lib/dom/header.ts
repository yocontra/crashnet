import { PlaywrightPage } from '../fetch'
import { getCrashNetHeader } from '../header'

// Add the CrashNet header to the document
export async function addCrashNetHeader(pw: PlaywrightPage, url: string): Promise<void> {
  const header = getCrashNetHeader(url, false)
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
