import { PlaywrightPage } from '../fetch'

// Replace video tags with black background divs
export async function handleVideoTags(pw: PlaywrightPage): Promise<void> {
  await pw.page.evaluate(() => {
    const videos = document.querySelectorAll('video')

    for (const video of videos) {
      // Get dimensions from computed style or attributes
      const computedStyle = getComputedStyle(video)
      let width = computedStyle.width || video.getAttribute('width') || '320'
      let height = computedStyle.height || video.getAttribute('height') || '240'

      // Remove 'px' if present
      width = width.replace('px', '')
      height = height.replace('px', '')

      // Create a black div as placeholder
      const placeholder = document.createElement('div')
      placeholder.setAttribute('bgcolor', 'black')
      placeholder.setAttribute('width', width)
      placeholder.setAttribute('height', height)
      placeholder.innerHTML = `
        <table width="100%" height="100%" bgcolor="black">
          <tr>
            <td align="center" valign="middle">
              <font color="white">Video is not supported</font>
            </td>
          </tr>
        </table>
      `

      // Replace the video with the placeholder
      video.parentNode?.replaceChild(placeholder, video)
    }
  })
}

// Replace audio tags with download links
export async function handleAudioTags(pw: PlaywrightPage, baseUrl: string): Promise<void> {
  await pw.page.evaluate(
    (params) => {
      const { baseUrl } = params
      const audios = document.querySelectorAll('audio')

      for (const audio of audios) {
        // Find the source elements or src attribute
        const sources = audio.querySelectorAll('source')
        let audioSrc = ''

        if (sources.length > 0) {
          // Get the first source element's src
          audioSrc = sources[0].getAttribute('src') || ''
        } else {
          // Get the audio element's src
          audioSrc = audio.getAttribute('src') || ''
        }

        if (audioSrc) {
          try {
            // Convert to absolute URL
            let absoluteSrc
            if (audioSrc.startsWith('http') || audioSrc.startsWith('//')) {
              absoluteSrc = audioSrc.startsWith('//') ? 'https:' + audioSrc : audioSrc
            } else {
              // Construct absolute URL from base
              const url = new URL(audioSrc, baseUrl)
              absoluteSrc = url.toString()
            }

            // Create a download link
            const downloadLink = document.createElement('a')
            downloadLink.setAttribute('href', absoluteSrc)
            downloadLink.innerHTML = 'Download Audio'

            // Replace the audio element with the download link
            audio.parentNode?.replaceChild(downloadLink, audio)
          } catch (error) {
            console.error(`Error processing audio src: ${audioSrc}`, error)

            // Create a plain text replacement if URL is invalid
            const errorText = document.createTextNode('Audio not available')
            audio.parentNode?.replaceChild(errorText, audio)
          }
        } else {
          // No source found, just remove the audio element
          audio.remove()
        }
      }
    },
    { baseUrl }
  )
}
