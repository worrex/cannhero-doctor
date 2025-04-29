import Image from "next/image"

export function EmptyState() {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
      <div className="mx-auto w-24 h-24 relative mb-4">
        <Image src="/clean-slate-inbox.png" alt="Keine Anfragen" fill className="object-contain" />
      </div>
      <h3 className="text-lg font-medium text-gray-900 mb-2">Keine Patientenanfragen</h3>
      <p className="text-gray-500 max-w-md mx-auto">
        Es gibt keine Patientenanfragen, die Ihren Kriterien entsprechen. Schauen Sie später noch einmal vorbei oder
        passen Sie Ihre Filter an.
      </p>
    </div>
  )
}
