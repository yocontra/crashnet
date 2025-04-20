import { Readability } from '@mozilla/readability'
import { getCrashnetHeader } from './header'
import { handleImages, processLinksForProxy, handleSVGs, processPictureElements } from './dom'
import { PlaywrightPage } from './fetch'

export interface ReadableResult {
  title: string
  content: string
  byline?: string
  excerpt?: string
}

export async function readify(
  pwPage: PlaywrightPage,
  url: string,
  baseUrl?: string
): Promise<PlaywrightPage> {
  // Extract article content using Readability directly in the browser context
  const article = await pwPage.page.evaluate(() => {
    // This runs in the browser context with Readability already loaded
    const reader = new Readability(document)
    return reader.parse()
  })

  if (!article) {
    throw new Error('Could not parse article content')
  }

  // Get article title and content
  const { title, content } = article

  // Create header outside of browser context
  const header = getCrashnetHeader(url, true)

  // Set the article content directly in the current page
  await pwPage.page.evaluate(
    (params) => {
      const { title, content, pageTitle, url, header } = params
      document.open()
      document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${title || pageTitle || url}</title>
        </head>
        <body>
          <div>
            ${header}
          </div>
          ${content}
        </body>
      </html>
    `)
      document.close()
    },
    { title, content, pageTitle: pwPage.title, url, header }
  )

  // Update the page title in our object
  pwPage.title = title || pwPage.title || url

  // Process picture elements first
  await processPictureElements(pwPage)

  // Process URLs for images and links
  await handleImages(pwPage, url, true, baseUrl)
  await handleSVGs(pwPage, baseUrl)
  await processLinksForProxy(pwPage, url, true, baseUrl)

  return pwPage
}
