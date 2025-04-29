import Link from "next/link"
import { CheckCircle } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function ConfirmationPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="w-full max-w-md z-10">
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="p-8 text-center">
            <div className="flex justify-center mb-6">
              <h1 className="text-3xl font-bold text-primary">Arztportal</h1>
            </div>

            <div className="flex justify-center mb-6">
              <CheckCircle className="h-16 w-16 text-primary" />
            </div>

            <h1 className="text-2xl font-bold text-gray-800 mb-4">Registrierung erfolgreich</h1>

            <p className="text-gray-600 mb-6">
              Vielen Dank für Ihre Registrierung. Ihr Konto wird nun von unserem Team überprüft. Sie erhalten eine
              E-Mail, sobald Ihr Konto freigeschaltet wurde.
            </p>

            <div className="bg-blue-50 border border-blue-200 rounded-md p-4 mb-6 text-left">
              <p className="text-sm text-blue-700">
                <strong>Wichtig:</strong> Bitte beachten Sie, dass die Überprüfung bis zu 48 Stunden dauern kann. Wir
                bitten um Ihr Verständnis.
              </p>
            </div>

            <Button asChild className="w-full">
              <Link href="/login">Zurück zum Login</Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
