"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Eye, EyeOff, Info } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { registerDoctor } from "@/actions/auth-actions"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface DoctorSignupFormProps {
  setIsSubmitting: (value: boolean) => void
}

export function DoctorSignupForm({ setIsSubmitting }: DoctorSignupFormProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [showPassword, setShowPassword] = useState(false)
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    firstName: "",
    lastName: "",
    title: "",
    specialty: "",
    licenseNumber: "",
    phoneNumber: "",
    address: {
      street: "",
      city: "",
      postalCode: "",
      country: "Deutschland",
    },
    termsAccepted: false,
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target

    if (name.includes(".")) {
      const [parent, child] = name.split(".")
      setFormData((prev) => ({
        ...prev,
        [parent]: {
          ...(prev[parent as keyof typeof prev] as Record<string, any>),
          [child]: value,
        },
      }))
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }))
    }

    // Clear error when field is edited
    if (errors[name]) {
      setErrors((prev) => {
        const newErrors = { ...prev }
        delete newErrors[name]
        return newErrors
      })
    }
  }

  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }))

    // Clear error when field is edited
    if (errors[name]) {
      setErrors((prev) => {
        const newErrors = { ...prev }
        delete newErrors[name]
        return newErrors
      })
    }
  }

  const handleCheckboxChange = (name: string, checked: boolean) => {
    setFormData((prev) => ({ ...prev, [name]: checked }))

    // Clear error when field is edited
    if (errors[name]) {
      setErrors((prev) => {
        const newErrors = { ...prev }
        delete newErrors[name]
        return newErrors
      })
    }
  }

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    // Required fields
    const requiredFields = [
      { key: "email", label: "E-Mail" },
      { key: "password", label: "Passwort" },
      { key: "confirmPassword", label: "Passwort bestätigen" },
      { key: "firstName", label: "Vorname" },
      { key: "lastName", label: "Nachname" },
      { key: "licenseNumber", label: "Approbationsnummer" },
      { key: "phoneNumber", label: "Telefonnummer" },
      { key: "address.street", label: "Straße" },
      { key: "address.city", label: "Stadt" },
      { key: "address.postalCode", label: "Postleitzahl" },
    ]

    requiredFields.forEach((field) => {
      if (field.key.includes(".")) {
        const [parent, child] = field.key.split(".")
        const parentObj = formData[parent as keyof typeof formData] as Record<string, any>
        if (!parentObj[child]) {
          newErrors[field.key] = `${field.label} ist erforderlich`
        }
      } else if (!formData[field.key as keyof typeof formData]) {
        newErrors[field.key] = `${field.label} ist erforderlich`
      }
    })

    // Email validation
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Bitte geben Sie eine gültige E-Mail-Adresse ein"
    }

    // Password validation
    if (formData.password && formData.password.length < 8) {
      newErrors.password = "Das Passwort muss mindestens 8 Zeichen lang sein"
    }

    // Password confirmation
    if (formData.password && formData.confirmPassword && formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = "Die Passwörter stimmen nicht überein"
    }

    // Terms acceptance
    if (!formData.termsAccepted) {
      newErrors.termsAccepted = "Sie müssen die Nutzungsbedingungen akzeptieren"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    setIsSubmitting(true)

    try {
      const result = await registerDoctor({
        email: formData.email,
        password: formData.password,
        firstName: formData.firstName,
        lastName: formData.lastName,
        title: formData.title,
        specialty: formData.specialty,
        licenseNumber: formData.licenseNumber,
        phoneNumber: formData.phoneNumber,
        address: formData.address,
      })

      if (result.success) {
        toast({
          title: "Registrierung erfolgreich",
          description:
            "Ihre Registrierung wurde erfolgreich abgeschlossen. Sie erhalten eine Benachrichtigung, sobald Ihr Konto freigeschaltet wurde.",
          variant: "success",
        })

        // Redirect to confirmation page
        router.push("/signup/confirmation")
      } else {
        toast({
          title: "Registrierung fehlgeschlagen",
          description:
            result.error || "Bei der Registrierung ist ein Fehler aufgetreten. Bitte versuchen Sie es später erneut.",
          variant: "destructive",
        })

        if (result.fieldErrors) {
          setErrors(result.fieldErrors)
        }
      }
    } catch (error) {
      console.error("Registration error:", error)
      toast({
        title: "Registrierung fehlgeschlagen",
        description: "Bei der Registrierung ist ein Fehler aufgetreten. Bitte versuchen Sie es später erneut.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="bg-blue-50 border border-blue-200 rounded-md p-3 mb-6">
        <div className="flex items-start">
          <Info className="h-5 w-5 text-blue-500 mr-2 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-blue-700">
            <p className="font-medium">Hinweis zur Registrierung</p>
            <p>
              Nach der Registrierung wird Ihr Konto von unserem Team überprüft. Sie erhalten eine E-Mail, sobald Ihr
              Konto freigeschaltet wurde.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Personal Information */}
        <div className="space-y-4">
          <h2 className="text-lg font-medium text-gray-900">Persönliche Informationen</h2>

          <div className="space-y-2">
            <Label htmlFor="email">
              E-Mail <span className="text-red-500">*</span>
            </Label>
            <Input
              id="email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              className={errors.email ? "border-red-500" : ""}
            />
            {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">
              Passwort <span className="text-red-500">*</span>
            </Label>
            <div className="relative">
              <Input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                value={formData.password}
                onChange={handleChange}
                className={errors.password ? "border-red-500" : ""}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-0 top-0 h-full px-3 py-2 text-gray-400 hover:text-gray-600"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                <span className="sr-only">{showPassword ? "Passwort verbergen" : "Passwort anzeigen"}</span>
              </Button>
            </div>
            {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">
              Passwort bestätigen <span className="text-red-500">*</span>
            </Label>
            <Input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              value={formData.confirmPassword}
              onChange={handleChange}
              className={errors.confirmPassword ? "border-red-500" : ""}
            />
            {errors.confirmPassword && <p className="text-red-500 text-xs mt-1">{errors.confirmPassword}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">
                Vorname <span className="text-red-500">*</span>
              </Label>
              <Input
                id="firstName"
                name="firstName"
                value={formData.firstName}
                onChange={handleChange}
                className={errors.firstName ? "border-red-500" : ""}
              />
              {errors.firstName && <p className="text-red-500 text-xs mt-1">{errors.firstName}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="lastName">
                Nachname <span className="text-red-500">*</span>
              </Label>
              <Input
                id="lastName"
                name="lastName"
                value={formData.lastName}
                onChange={handleChange}
                className={errors.lastName ? "border-red-500" : ""}
              />
              {errors.lastName && <p className="text-red-500 text-xs mt-1">{errors.lastName}</p>}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="title">Titel</Label>
            <Select value={formData.title} onValueChange={(value) => handleSelectChange("title", value)}>
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
        </div>

        {/* Professional Information */}
        <div className="space-y-4">
          <h2 className="text-lg font-medium text-gray-900">Berufliche Informationen</h2>

          <div className="space-y-2">
            <Label htmlFor="specialty">Fachrichtung</Label>
            <Select value={formData.specialty} onValueChange={(value) => handleSelectChange("specialty", value)}>
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

          <div className="space-y-2">
            <Label htmlFor="licenseNumber">
              Approbationsnummer <span className="text-red-500">*</span>
            </Label>
            <Input
              id="licenseNumber"
              name="licenseNumber"
              value={formData.licenseNumber}
              onChange={handleChange}
              className={errors.licenseNumber ? "border-red-500" : ""}
            />
            {errors.licenseNumber && <p className="text-red-500 text-xs mt-1">{errors.licenseNumber}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="phoneNumber">
              Telefonnummer <span className="text-red-500">*</span>
            </Label>
            <Input
              id="phoneNumber"
              name="phoneNumber"
              value={formData.phoneNumber}
              onChange={handleChange}
              className={errors.phoneNumber ? "border-red-500" : ""}
            />
            {errors.phoneNumber && <p className="text-red-500 text-xs mt-1">{errors.phoneNumber}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="address.street">
              Straße <span className="text-red-500">*</span>
            </Label>
            <Input
              id="address.street"
              name="address.street"
              value={formData.address.street}
              onChange={handleChange}
              className={errors["address.street"] ? "border-red-500" : ""}
            />
            {errors["address.street"] && <p className="text-red-500 text-xs mt-1">{errors["address.street"]}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="address.postalCode">
                PLZ <span className="text-red-500">*</span>
              </Label>
              <Input
                id="address.postalCode"
                name="address.postalCode"
                value={formData.address.postalCode}
                onChange={handleChange}
                className={errors["address.postalCode"] ? "border-red-500" : ""}
              />
              {errors["address.postalCode"] && (
                <p className="text-red-500 text-xs mt-1">{errors["address.postalCode"]}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="address.city">
                Stadt <span className="text-red-500">*</span>
              </Label>
              <Input
                id="address.city"
                name="address.city"
                value={formData.address.city}
                onChange={handleChange}
                className={errors["address.city"] ? "border-red-500" : ""}
              />
              {errors["address.city"] && <p className="text-red-500 text-xs mt-1">{errors["address.city"]}</p>}
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-start space-x-2 pt-4">
        <Checkbox
          id="termsAccepted"
          checked={formData.termsAccepted}
          onCheckedChange={(checked) => handleCheckboxChange("termsAccepted", checked === true)}
          className={errors.termsAccepted ? "border-red-500" : ""}
        />
        <div className="grid gap-1.5 leading-none">
          <label
            htmlFor="termsAccepted"
            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
          >
            Ich akzeptiere die Nutzungsbedingungen und Datenschutzrichtlinien <span className="text-red-500">*</span>
          </label>
          {errors.termsAccepted && <p className="text-red-500 text-xs">{errors.termsAccepted}</p>}
        </div>
      </div>

      <Button
        type="submit"
        className="w-full bg-primary hover:bg-primary-600 text-white"
        disabled={Object.keys(errors).length > 0}
      >
        Registrieren
      </Button>
    </form>
  )
}
