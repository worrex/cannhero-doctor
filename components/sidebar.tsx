"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Home, User, Users, Settings, Menu, X, LogOut, CheckCircle, XCircle, Clock } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"

export function Sidebar() {
  const [isOpen, setIsOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const pathname = usePathname()
  const { signOut } = useAuth()

  // Check if mobile on mount and when window resizes
  useEffect(() => {
    const checkIfMobile = () => {
      setIsMobile(window.innerWidth < 1024)
    }
    // Initial check
    checkIfMobile()

    // Add event listener
    window.addEventListener("resize", checkIfMobile)

    // Cleanup
    return () => window.removeEventListener("resize", checkIfMobile)
  }, [])

  // Close sidebar when clicking outside on mobile
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const sidebar = document.getElementById("sidebar")
      const toggle = document.getElementById("sidebar-toggle")

      if (
        isMobile &&
        isOpen &&
        sidebar &&
        toggle &&
        !sidebar.contains(event.target as Node) &&
        !toggle.contains(event.target as Node)
      ) {
        setIsOpen(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)

    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [isMobile, isOpen])

  // Close sidebar when navigating on mobile
  useEffect(() => {
    if (isMobile) {
      setIsOpen(false)
    }
  }, [pathname, isMobile])

  const navItems = [
    {
      name: "Übersicht",
      href: "/dashboard",
      icon: Home,
    },
    {
      name: "Offene Rezeptanfragen",
      href: "/prescriptions/open",
      icon: Clock,
    },
    {
      name: "Bestätigte Rezepte",
      href: "/prescriptions/approved",
      icon: CheckCircle,
    },
    {
      name: "Abgelehnte Rezepte",
      href: "/prescriptions/denied",
      icon: XCircle,
    },
    {
      name: "Patienten",
      href: "/patients",
      icon: Users,
    },
    {
      name: "Profil",
      href: "/profile",
      icon: User,
    },
    {
      name: "Einstellungen",
      href: "/settings",
      icon: Settings,
    },
  ]

  return (
    <>
      {/* Mobile Toggle Button */}
      <button
        id="sidebar-toggle"
        className="fixed top-4 left-4 z-50 p-2 rounded-md bg-white shadow-md lg:hidden"
        onClick={() => setIsOpen(!isOpen)}
      >
        {isOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* Sidebar */}
      <div
        id="sidebar"
        className={`fixed top-0 left-0 z-40 h-screen bg-white border-r border-gray-200 transition-all duration-300 ease-in-out ${
          isMobile ? (isOpen ? "w-64 translate-x-0 shadow-xl" : "w-64 -translate-x-full") : "w-64 translate-x-0"
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center justify-center h-16 border-b border-gray-200 px-4">
            <span className="text-lg font-semibold text-primary">Arztportal</span>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-6 overflow-y-auto">
            <ul className="space-y-2">
              {navItems.map((item) => {
                const isActive =
                  pathname === item.href || (item.href !== "/dashboard" && pathname?.startsWith(item.href))

                return (
                  <li key={item.name}>
                    <Link
                      href={item.href}
                      className={`flex items-center px-4 py-3 rounded-md transition-colors ${
                        isActive ? "bg-primary text-white" : "text-gray-700 hover:bg-gray-100"
                      }`}
                    >
                      <item.icon className="h-5 w-5 mr-3" />
                      <span>{item.name}</span>
                    </Link>
                  </li>
                )
              })}
            </ul>
          </nav>

          {/* Footer */}
          <div className="p-4 border-t border-gray-200">
            <Button variant="ghost" className="w-full justify-start text-gray-700 hover:bg-gray-100" onClick={signOut}>
              <LogOut className="h-5 w-5 mr-3" />
              <span>Abmelden</span>
            </Button>
          </div>
        </div>
      </div>
    </>
  )
}
