"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useAuth } from "@/contexts/auth-context"
import { useRouter } from "next/navigation"
import { Loader2, Save, User } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { supabase } from "@/lib/supabase/index"

interface DoctorProfile {
  id: string
  title: string | null
  specialty: string | null
  license_number: string | null
  phone_number: string | null
  address: {
    street: string
    city: string
    postal_code: string
    country: string
  } | null
}

export default function ProfilePage() {
  const { user, isLoading } = useAuth()
  const router = useRouter()
  const { toast } = useToast()
  const [profile, setProfile] = useState<DoctorProfile | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoadingProfile, setIsLoadingProfile] = useState(true)

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) return

      try {
        const { data, error } = await supabase.from("doctors").select("*").eq("user_id", user.id).single()

        if (error) {
          throw error
        }

        setProfile(data)
      } catch (error) {
        console.error("Error fetching profile:", error)
        toast({
          title: "Fehler",
          description: "Profil konnte nicht geladen werden.",
          variant: "destructive",
        })
      } finally {
        setIsLoadingProfile(false)
      }
    }

    if (!isLoading && user) {
      fetchProfile()
    }
  }, [isLoading, user, toast])

  const handleChange = (field: string, value: string) => {
    if (!profile) return

    if (field.includes(".")) {
      const [parent, child] = field.split(".")
      const parentKey = parent as keyof DoctorProfile
      const parentValue = profile[parentKey] || {}
      
      setProfile({
        ...profile,
        [parent]: {
          ...(typeof parentValue === 'object' ? parentValue : {}),
          [child]: value,
        },
      })
    } else {
      setProfile({
        ...profile,
        [field]: value,
      })
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!profile || !user) return

    setIsSubmitting(true)

    try {
      const { error } = await supabase
        .from("doctors")
        .update({
          title: profile.title,
          specialty: profile.specialty,
          license_number: profile.license_number,
          phone_number: profile.phone_number,
          address: profile.address,
          updated_at: new Date().toISOString(),
        })
        .eq("id", profile.id)

      if (error) {
        throw error
      }

      toast({
        title: "Erfolg",
        description: "Profil wurde aktualisiert.",
        variant: "success",
      })
    } catch (error) {
      console.error("Error updating profile:", error)
      toast({
        title: "Fehler",
        description: "Profil konnte nicht aktualisiert werden.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading || isLoadingProfile) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Wird geladen...</span>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <p className="text-lg text-gray-700">Profil nicht gefunden.</p>
          <Button className="mt-4" onClick={() => router.push("/dashboard")}>
            Zurück zum Dashboard
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center mb-6">
          <div className="bg-primary text-white p-3 rounded-full mr-4">
            <User size={24} />
          </div>
          <h1 className="text-2xl font-bold">Mein Profil</h1>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label htmlFor="email">E-Mail</Label>
                <Input id="email" value={user?.email || ""} disabled className="bg-gray-50" />
                <p className="text-sm text-gray-500 mt-1">E-Mail kann nicht geändert werden.</p>
              </div>

              <div>
                <Label htmlFor="title">Titel</Label>
                <Select value={profile.title || ""} onValueChange={(value) => handleChange("title", value)}>
                  <SelectTrigger id="title">
                    <SelectValue placeholder="Titel auswählen" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Kein Titel">Kein Titel</SelectItem>
                    <SelectItem value="Dr. med.">Dr. med.</SelectItem>
                    <SelectItem value="Prof. Dr. med.">Prof. Dr. med.</SelectItem>
                    <SelectItem value="PD Dr. med.">PD Dr. med.</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="specialty">Fachrichtung</Label>
                <Select value={profile.specialty || ""} onValueChange={(value) => handleChange("specialty", value)}>
                  <SelectTrigger id="specialty">
                    <SelectValue placeholder="Fachrichtung auswählen" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Allgemeinmedizin">Allgemeinmedizin</SelectItem>
                    <SelectItem value="Anästhesiologie">Anästhesiologie</SelectItem>
                    <SelectItem value="Neurologie">Neurologie</SelectItem>
                    <SelectItem value="Orthopädie">Orthopädie</SelectItem>
                    <SelectItem value="Psychiatrie">Psychiatrie</SelectItem>
                    <SelectItem value="Schmerztherapie">Schmerztherapie</SelectItem>
                    <SelectItem value="Andere">Andere</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="license_number">Approbationsnummer</Label>
                <Input
                  id="license_number"
                  value={profile.license_number || ""}
                  onChange={(e) => handleChange("license_number", e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="phone_number">Telefonnummer</Label>
                <Input
                  id="phone_number"
                  value={profile.phone_number || ""}
                  onChange={(e) => handleChange("phone_number", e.target.value)}
                />
              </div>

              <div className="md:col-span-2">
                <Label>Adresse</Label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                  <div>
                    <Label htmlFor="address.street" className="text-sm">
                      Straße
                    </Label>
                    <Input
                      id="address.street"
                      value={profile.address?.street || ""}
                      onChange={(e) => handleChange("address.street", e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="address.city" className="text-sm">
                      Stadt
                    </Label>
                    <Input
                      id="address.city"
                      value={profile.address?.city || ""}
                      onChange={(e) => handleChange("address.city", e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="address.postal_code" className="text-sm">
                      Postleitzahl
                    </Label>
                    <Input
                      id="address.postal_code"
                      value={profile.address?.postal_code || ""}
                      onChange={(e) => handleChange("address.postal_code", e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="address.country" className="text-sm">
                      Land
                    </Label>
                    <Input
                      id="address.country"
                      value={profile.address?.country || "Deutschland"}
                      onChange={(e) => handleChange("address.country", e.target.value)}
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
