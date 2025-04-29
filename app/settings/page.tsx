"use client"

import type React from "react"

import { useState } from "react"
import { SettingsIcon, Save, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"

export default function SettingsPage() {
  const { toast } = useToast()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [settings, setSettings] = useState({
    emailNotifications: true,
    darkMode: false,
    autoLogout: true,
  })

  const handleToggle = (setting: keyof typeof settings) => {
    setSettings({
      ...settings,
      [setting]: !settings[setting],
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000))

    toast({
      title: "Einstellungen gespeichert",
      description: "Ihre Einstellungen wurden erfolgreich gespeichert.",
      variant: "success",
    })

    setIsSubmitting(false)
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center mb-6">
          <div className="bg-primary text-white p-3 rounded-full mr-4">
            <SettingsIcon size={24} />
          </div>
          <h1 className="text-2xl font-bold">Einstellungen</h1>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <form onSubmit={handleSubmit}>
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-semibold mb-4">Benachrichtigungen</h2>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="emailNotifications" className="text-base">
                        E-Mail-Benachrichtigungen
                      </Label>
                      <p className="text-sm text-gray-500">
                        Erhalten Sie E-Mail-Benachrichtigungen über neue Rezeptanfragen.
                      </p>
                    </div>
                    <Switch
                      id="emailNotifications"
                      checked={settings.emailNotifications}
                      onCheckedChange={() => handleToggle("emailNotifications")}
                    />
                  </div>
                </div>
              </div>

              <div className="border-t border-gray-200 pt-6">
                <h2 className="text-lg font-semibold mb-4">Darstellung</h2>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="darkMode" className="text-base">
                        Dunkler Modus
                      </Label>
                      <p className="text-sm text-gray-500">
                        Aktivieren Sie den dunklen Modus für die Benutzeroberfläche.
                      </p>
                    </div>
                    <Switch
                      id="darkMode"
                      checked={settings.darkMode}
                      onCheckedChange={() => handleToggle("darkMode")}
                    />
                  </div>
                </div>
              </div>

              <div className="border-t border-gray-200 pt-6">
                <h2 className="text-lg font-semibold mb-4">Sicherheit</h2>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="autoLogout" className="text-base">
                        Automatische Abmeldung
                      </Label>
                      <p className="text-sm text-gray-500">Automatisch abmelden nach 30 Minuten Inaktivität.</p>
                    </div>
                    <Switch
                      id="autoLogout"
                      checked={settings.autoLogout}
                      onCheckedChange={() => handleToggle("autoLogout")}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <Button type="submit" disabled={isSubmitting} className="flex items-center">
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Speichern...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Speichern
                  </>
                )}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
