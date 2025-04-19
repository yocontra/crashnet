import type React from "react"

export const metadata = {
  title: "Crashnet",
  description: "Web Proxy for Vintage Computers",
    generator: 'v0.dev'
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Return children directly without wrapping them
  return children
}


import './globals.css'