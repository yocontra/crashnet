import type React from 'react'

export const metadata = {
  title: 'Crashnet',
  description: 'Web Proxy for Vintage Computers',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  // Return children directly without wrapping them
  return children
}
