"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { ListTree, LayoutGrid, UtensilsCrossed } from "lucide-react"

export function MenuNav() {
  const pathname = usePathname()
  
  const navItems = [
    { href: "/menu", label: "Sites & Items", icon: ListTree },
    { href: "/menu/categories", label: "Categories", icon: LayoutGrid },
    { href: "/menu/modifiers", label: "Modifiers", icon: UtensilsCrossed },
  ]

  return (
    <div className="flex items-center border-b pb-4">
      <nav className="flex items-center space-x-4 md:space-x-6 w-full overflow-x-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.href
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-2 px-3 py-2 text-sm font-medium transition-colors border-b-2 whitespace-nowrap ${
                isActive
                  ? "border-foreground text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
              }`}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
