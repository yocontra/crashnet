import { PlaywrightPage } from '../fetch'
import { APP_BASE_URL } from './constants'

// Process links in the document for proxy
export async function processLinksForProxy(
  pw: PlaywrightPage,
  baseUrl: string,
  isReadMode = false,
  appBaseUrl?: string
): Promise<void> {
  // Use provided appBaseUrl or fall back to APP_BASE_URL constant
  const baseUrlToUse = appBaseUrl || APP_BASE_URL

  await pw.page.evaluate(
    async (params) => {
      const { baseUrl, isReadMode, appBaseUrl } = params
      // Process anchor links
      const links = document.querySelectorAll('a')

      for (const link of links) {
        const href = link.getAttribute('href')

        // Remove javascript: links entirely
        if (href && href.startsWith('javascript:')) {
          link.parentNode?.removeChild(link)
          continue
        }

        if (href && !href.startsWith('#')) {
          try {
            // Get absolute URL
            let absoluteHref
            if (href.startsWith('http') || href.startsWith('//')) {
              absoluteHref = href.startsWith('//') ? 'https:' + href : href
            } else {
              // Construct absolute URL from base
              const url = new URL(href, baseUrl)
              absoluteHref = url.toString()
            }

            // Add read parameter if in reading mode
            const readParam = isReadMode ? 'read=true&' : ''
            const proxyUrl = `${appBaseUrl}/proxy?${readParam}url=${encodeURIComponent(absoluteHref)}`
            link.setAttribute('href', proxyUrl)
          } catch (error) {
            console.error(`Error processing link: ${href}`, error)
          }
        }
      }

      // Process form actions
      const forms = document.querySelectorAll('form')

      for (const form of forms) {
        const action = form.getAttribute('action')
        if (action) {
          try {
            // Skip forms that already point to our proxy
            if (
              action.startsWith('/proxy') ||
              action === '/' ||
              action.startsWith(`${appBaseUrl}/proxy`)
            ) {
              continue
            }

            // Get absolute URL
            let absoluteAction
            if (action.startsWith('http') || action.startsWith('//')) {
              absoluteAction = action.startsWith('//') ? 'https:' + action : action
            } else {
              // Construct absolute URL from base
              const url = new URL(action, baseUrl)
              absoluteAction = url.toString()
            }

            // Set action to our proxy endpoint
            const proxyUrl = `${appBaseUrl}/proxy`
            form.setAttribute('action', proxyUrl)

            // Add a hidden field with the original form action
            const hiddenField = document.createElement('input')
            hiddenField.setAttribute('type', 'hidden')
            hiddenField.setAttribute('name', 'x-form-action')
            hiddenField.setAttribute('value', encodeURIComponent(absoluteAction))
            form.appendChild(hiddenField)

            // Ensure method is POST for external form submissions
            form.setAttribute('method', 'post')
          } catch (error) {
            console.error(`Error processing form action: ${action}`, error)
          }
        }
      }
    },
    { baseUrl, isReadMode, appBaseUrl: baseUrlToUse }
  )
}
