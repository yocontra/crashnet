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
        if (!href) continue

        // Remove javascript: links entirely
        if (href.startsWith('javascript:')) {
          link.parentNode?.removeChild(link)
          continue
        }

        // Skip fragment-only links
        if (href.startsWith('#')) continue

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

      // Process form actions
      const forms = document.querySelectorAll('form')

      for (const form of forms) {
        const action = form.getAttribute('action')
        if (!action) continue

        // Skip forms that already point to our proxy
        if (
          action.startsWith('/proxy') ||
          action === '/' ||
          action.startsWith(`${appBaseUrl}/proxy`)
        ) {
          continue
        }

        try {
          // Get absolute URL
          let absoluteAction
          if (action.startsWith('http') || action.startsWith('//')) {
            absoluteAction = action.startsWith('//') ? 'https:' + action : action
          } else {
            // Construct absolute URL from base
            const url = new URL(action, baseUrl)
            absoluteAction = url.toString()
          }

          // Preserve the original form method (GET or POST)
          const method = form.getAttribute('method')?.toLowerCase() || 'get'
          form.setAttribute('method', method)

          if (method === 'post') {
            // For POST forms, we can include the parameters in the action URL
            const readParam = isReadMode ? 'read=true&' : ''
            form.setAttribute(
              'action',
              `${appBaseUrl}/proxy?${readParam}url=${encodeURIComponent(absoluteAction)}`
            )
          } else {
            // For GET forms, we need to add hidden inputs since query params would be overwritten
            form.setAttribute('action', `${appBaseUrl}/proxy`)

            // Add hidden input for the target URL
            const urlField = document.createElement('input')
            urlField.setAttribute('type', 'hidden')
            urlField.setAttribute('name', 'url')
            urlField.setAttribute('value', absoluteAction)
            form.appendChild(urlField)

            // Add hidden input for read mode if needed
            if (isReadMode) {
              const readField = document.createElement('input')
              readField.setAttribute('type', 'hidden')
              readField.setAttribute('name', 'read')
              readField.setAttribute('value', 'true')
              form.appendChild(readField)
            }
          }
        } catch (error) {
          console.error(`Error processing form action: ${action}`, error)
        }
      }
    },
    { baseUrl, isReadMode, appBaseUrl: baseUrlToUse }
  )
}
