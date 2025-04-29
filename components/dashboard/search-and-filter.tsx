"use client"

import { Search } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface SearchAndFilterProps {
  onSearch: (term: string) => void
  onFilter: (status: string) => void
  totalRequests: number
  pendingRequests: number
}

export function SearchAndFilter({ onSearch, onFilter, totalRequests, pendingRequests }: SearchAndFilterProps) {
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
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <Select onValueChange={onFilter} defaultValue="all">
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Nach Status filtern" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alle Anfragen</SelectItem>
              <SelectItem value="new">Neue Anfragen</SelectItem>
              <SelectItem value="approved">Genehmigt</SelectItem>
              <SelectItem value="denied">Abgelehnt</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex items-center gap-3">
            <div className="bg-gray-100 rounded-md px-3 py-1 text-sm">
              <span className="font-medium">{totalRequests}</span> Gesamt
            </div>
            <div className="bg-primary-50 text-primary-700 rounded-md px-3 py-1 text-sm">
              <span className="font-medium">{pendingRequests}</span> Ausstehend
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
