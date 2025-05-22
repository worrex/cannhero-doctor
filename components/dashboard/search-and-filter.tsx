"use client"

import { Search } from "lucide-react"
import { Input } from "@/components/ui/input"

interface SearchAndFilterProps {
  onSearch: (term: string) => void
}

export function SearchAndFilter({ onSearch }: SearchAndFilterProps) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Suche nach Patientenname oder ID..."
              className="pl-10 border-gray-300"
              onChange={(e) => onSearch(e.target.value)}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
