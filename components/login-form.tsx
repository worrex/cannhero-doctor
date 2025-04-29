"use client"

import type React from "react"
import { useState } from "react"
import { Eye, EyeOff } from "lucide-react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useAuth } from "@/contexts/auth-context"
import { useToast } from "@/hooks/use-toast"

export function LoginForm() {
  const auth = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loginSuccess, setLoginSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const result = await auth.signIn(email, password)

      if (!result.success) {
        throw new Error(result.error || "Anmeldung fehlgeschlagen")
      }

      // Successful login
      setLoginSuccess(true)
      toast({
        title: "Anmeldung erfolgreich",
        description: "Sie werden zum Dashboard weitergeleitet...",
      })

      // The redirect will be handled by the auth context
    } catch (error) {
      console.error("Login error:", error)
      toast({
        title: "Anmeldefehler",
        description: "Ungültige E-Mail oder Passwort. Bitte versuchen Sie es erneut.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email">E-Mail</Label>
        <Input
          id="email"
          type="email"
          placeholder="arzt@beispiel.de"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="border-gray-300 focus:border-primary focus:ring-primary"
        />
      </div>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="password">Passwort</Label>
          <a href="#" className="text-sm text-primary hover:underline">
            Passwort vergessen?
          </a>
        </div>
        <div className="relative">
          <Input
            id="password"
            type={showPassword ? "text" : "password"}
            placeholder="••••••••"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="border-gray-300 focus:border-primary focus:ring-primary"
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
      </div>
      <div className="flex items-center space-x-2">
        <Checkbox id="remember" />
        <Label htmlFor="remember" className="text-sm font-normal">
          Angemeldet bleiben
        </Label>
      </div>
      <Button
        type="submit"
        className="w-full bg-primary hover:bg-primary-600 text-white"
        disabled={isLoading || auth.isLoading || loginSuccess}
      >
        {isLoading || (auth.isLoading && loginSuccess) ? "Anmeldung läuft..." : "Anmelden"}
      </Button>
    </form>
  )
}
