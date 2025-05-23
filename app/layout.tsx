import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { Toaster } from "@/components/ui/toaster"
import { AuthProvider } from "@/contexts/auth-context"
import { Layout } from "@/components/layout"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "CannHero | Arztportal für medizinische Cannabis-Verschreibungen",
  description:
    "Ein sicheres Portal für Ärzte zur Überprüfung und Bearbeitung von Patientenanfragen für medizinische Cannabis-Verschreibungen.",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="de">
      <body className={inter.className}>
        <AuthProvider>
          <Layout>
            {children}
            <Toaster />
          </Layout>
        </AuthProvider>
      </body>
    </html>
  )
}
