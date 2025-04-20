import { readFile } from 'fs/promises'
import { join } from 'path'
import { getCrashNetHeader } from './header'
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
  // First, inject the Readability library into the page
  // Read the Readability.js file content from node_modules
  const readabilityPath = join(
    process.cwd(),
    'node_modules',
    '@mozilla',
    'readability',
    'Readability.js'
  )
  const readabilitySource = await readFile(readabilityPath, 'utf-8')

  // Inject the library into the page
  await pwPage.page.addScriptTag({
    content: readabilitySource,
  })

  // Extract article content using Readability in the browser context
  const article = await pwPage.page.evaluate(() => {
    // Now Readability is defined in the page context
    // @ts-ignore - Readability is injected at runtime
    const reader = new Readability(document)
    return reader.parse()
  })

  if (!article) {
    throw new Error('Could not parse article content')
  }

  // Get article title and content
  const { title, content } = article

  // Create header outside of browser context
  const header = getCrashNetHeader(url, true)

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
