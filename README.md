# Crashnet

![logo](https://github.com/user-attachments/assets/b046a392-150c-47bf-9744-0ca3ed4e7c0e)

A minimalist web proxy service designed for vintage computers like 68k Macintoshes. Crashnet makes modern websites accessible to older systems by stripping SSL, CSS, JavaScript, and compressing images to JPEG. Targets HTML available in 1994, and tested against MacWeb on a Macintosh Plus.

## Features

- **Ultra-Minimal Design**: Works with pre-CSS browsers. No SSL, CSS, or JavaScript.
- **Uses a real browser**: Loads and executes the page in a real browser, so JS and CSS are executed and page layout completes before packaging it up and simplifying it for vintage browsers
- **Supports All Images**: Automatically compresses images to JPEG format, even supports SVGs
- **Link Rewriting**: All links are rewritten to work through the proxy, even audio/video embeds get turned into downloads
- **DOM Reconstruction**: Uses getComputedStyle to transform CSS based styling to older attributes and semantic elements
- **Dual-mode**: Features a reading mode (optimized for text like blog posts, articles) and web mode (optimized for everything else)
- **Form Support**: Supports interacting with services with forms + POST requests
- **Tiny File Sizes**: Optimized for slow connections and limited memory. Uses specially crafted DOM minification on the final output.
- **Opinionated**: Optimizes for a functional experience - attempting to degrade newer HTML to something still usable

## TODO

- POST /proxy for form support (test using google.com search)
- Emoji -> svg/png via imagemoji or twemoji
- Display flex is not working with our inline detection
- video rendering by pulling the first frame, clicking it would go to download
- Incorporate an adblocker to hide even more crap
- Some images are going 520x520 for no reason
- Lots of empty buttons on some sites
- We can use dom.window.getComputedStyle! Things we can move from CSS/styles to DOM properties:
  - Font color
  - Background color
  - Height/width
  - Border (sometimes)
  - Font
- Support some kind of cookie jar w/ accounts or unique ids

## Getting Started

### Prerequisites

- Node.js 18.x or later
- npm or yarn

### Installation

1. Clone the repository:

   ```
   git clone https://github.com/yocontra/crashnet.git
   cd crashnet
   ```

2. Install dependencies:

   ```
   npm install
   ```

3. Run the development server:

   ```
   npm run dev
   ```

4. Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

### Building for Production

```
npm run build
npm start
```

## How It Works

1. **Homepage (/)**: A simple form where users can enter a URL to browse
2. **Proxy (/proxy?url=example.com)**: Fetches the target website, strips modern elements, and returns simplified HTML
3. **Image Proxy (/image_proxy?url=image.jpg)**: Fetches images and compresses them to JPEG format

## Technical Details

- Built with Next.js (App Router) and TypeScript
- Uses server-side rendering exclusively (no client-side JavaScript)
- JSDOM for HTML parsing and manipulation
- Sharp for image processing
- Designed for compatibility with browsers from the early 1990s

## Project Structure

```
crashnet/
├── app/ # Next.js App Router
│ ├── page.tsx # Homepage
│ ├── proxy/ # Proxy endpoint
│ └── image_proxy/ # Image proxy endpoint
├── components/ # React components
│ └── ascii-logo.tsx # ASCII art logo
├── lib/ # Utility functions
│ └── proxy-utils.ts # Proxy helper functions
└── public/ # Static files
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.
