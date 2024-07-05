import './globals.css'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Vara Template App',
  description:
    'Start your Vara journey here, without unnecessary configuration and setup. Just clone it and code on top of it. Powered by Nightly Wallet.',
  twitter: {
    title: 'Vara Template App',
    description:
      'Start your Vara journey here, without unnecessary configuration and setup. Just clone it and code on top of it. Powered by Nightly Wallet.',
    images: 'https://vara-web3-template.nightly.app/preview.png',
    card: 'summary_large_image',
    site: '@nightly_app',
  },
  openGraph: {
    title: 'Vara Template App',
    description:
      'Start your Vara journey here, without unnecessary configuration and setup. Just clone it and code on top of it. Powered by Nightly Wallet.',
    images: 'https://vara-web3-template.nightly.app/preview.png',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang='en'>
      <body className={inter.className}>{children}</body>
    </html>
  )
}
