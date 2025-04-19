# Crashnet

A minimalist web proxy service designed for vintage computers like 68k Macintoshes. Crashnet makes modern websites accessible to older systems by stripping SSL, CSS, JavaScript, and compressing images to JPEG.

## Features

- **Ultra-Minimal Design**: Works with pre-CSS browsers
- **HTTP-Only**: No SSL, CSS, or JavaScript
- **Image Compression**: Automatically compresses images to JPEG format
- **Link Rewriting**: All links are rewritten to work through the proxy
- **Modern Web Compatibility**: Access modern websites on vintage hardware
- **Tiny File Sizes**: Optimized for slow connections and limited memory

## Getting Started

### Prerequisites

- Node.js 18.x or later
- npm or yarn

### Installation

1. Clone the repository:
   \`\`\`
   git clone https://github.com/yourusername/crashnet.git
   cd crashnet
   \`\`\`

2. Install dependencies:
   \`\`\`
   npm install
   \`\`\`

3. Run the development server:
   \`\`\`
   npm run dev
   \`\`\`

4. Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

### Building for Production

\`\`\`
npm run build
npm start
\`\`\`

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

\`\`\`
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
\`\`\`

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.
