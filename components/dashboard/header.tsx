"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import Link from "next/link"
import { Bell, ChevronDown, LogOut, Settings, User } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/contexts/auth-context"
import { useToast } from "@/hooks/use-toast"
import { supabase } from "@/lib/supabase/client"

export function DashboardHeader() {
  const { user, signOut } = useAuth()
  const { toast } = useToast()
  const [notifications, setNotifications] = useState(3)
  const [doctorInfo, setDoctorInfo] = useState<{
    fullName: string
    title: string | null
    specialty: string | null
  }>({
    fullName: "",
    title: null,
    specialty: null,
  })

  useEffect(() => {
    const fetchDoctorInfo = async () => {
      if (!user) return

      try {
        // Fetch doctor info
        const { data: doctorData, error: doctorError } = await supabase
          .from("doctors")
          .select(`
            title,
            specialty,
            users:user_id (
              first_name,
              last_name
            )
          `)
          .eq("user_id", user.id)
          .single()

        if (doctorError) {
          console.error("Error fetching doctor info:", doctorError)
          return
        }

        if (doctorData) {
          const firstName = doctorData.users?.[0]?.first_name || ""
          const lastName = doctorData.users?.[0]?.last_name || ""
          const fullName = `${firstName} ${lastName}`.trim()

          setDoctorInfo({
            fullName: fullName || user.email?.split("@")[0] || "Arzt",
            title: doctorData.title,
            specialty: doctorData.specialty,
          })
        }
      } catch (error) {
        console.error("Error in fetchDoctorInfo:", error)
      }
    }

    fetchDoctorInfo()
  }, [user])

  const handleLogout = async () => {
    try {
      await signOut()
    } catch (error) {
      console.error("Logout error:", error)
      toast({
        title: "Fehler beim Abmelden",
        description: "Es gab ein Problem beim Abmelden. Bitte versuchen Sie es erneut.",
        variant: "destructive",
      })
    }
  }

  // Format the display name with title if available
  const displayName = doctorInfo.title ? `${doctorInfo.title} ${doctorInfo.fullName}` : doctorInfo.fullName

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-30">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center">
          <Link href="/dashboard" className="flex items-center">
            <div className="relative h-10 w-40 mr-2">
              <Image src="/absolem420-logo.svg" alt="Absolem420 Logo" fill className="object-contain" />
            </div>
          </Link>
        </div>

        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="icon" className="relative" onClick={() => setNotifications(0)}>
            <Bell className="h-5 w-5 text-gray-600" />
            {notifications > 0 && (
              <span className="absolute top-1 right-1 h-4 w-4 bg-red-500 rounded-full flex items-center justify-center text-[10px] text-white">
                {notifications}
              </span>
            )}
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex items-center space-x-2">
                <div className="relative h-8 w-8 rounded-full overflow-hidden">
                  <Image src={`/abstract-geometric-shapes.png`} alt="Arzt Profil" fill className="object-cover" />
                </div>
                <div className="hidden md:block text-left">
                  <p className="text-sm font-medium">{displayName}</p>
                  <p className="text-xs text-gray-500">{doctorInfo.specialty || "Arzt"}</p>
                </div>
                <ChevronDown className="h-4 w-4 text-gray-500" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem className="cursor-pointer">
                <User className="mr-2 h-4 w-4" />
                <span>Mein Profil</span>
              </DropdownMenuItem>
              <DropdownMenuItem className="cursor-pointer">
                <Settings className="mr-2 h-4 w-4" />
                <span>Einstellungen</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="cursor-pointer text-red-600" onClick={handleLogout}>
                <LogOut className="mr-2 h-4 w-4" />
                <span>Abmelden</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )
}
