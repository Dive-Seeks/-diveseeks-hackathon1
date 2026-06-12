import * as React from "react"
import { Plus, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { MenuNav } from "./_components/menu-nav"
import { AIChatWidget } from "@/components/ai-chat/ai-chat-widget"
import { MenuWizardTrigger } from "@/components/menu/MenuWizardTrigger"

export default function MenuLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex-1 space-y-4 md:space-y-8 p-4 md:p-8 pt-6 bg-background min-h-screen">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-2xl md:text-4xl font-bold tracking-tight text-foreground flex items-center gap-3">
            <div className="h-6 md:h-8 w-1 bg-foreground rounded-full" />
            Menu Management
          </h2>
          <p className="text-muted-foreground text-sm md:text-lg">
            Manage products, categories, modifiers, and pricing across your stores.
          </p>
        </div>
        <div className="flex items-center gap-2 md:gap-3">
          <MenuWizardTrigger />
          <Button variant="outline" size="sm" className="flex-1 md:flex-none">
            Import Menu
          </Button>
          <Button size="sm" className="flex-1 md:flex-none bg-foreground text-background hover:bg-foreground/90">
            <Plus className="h-4 w-4 mr-2" />
            Add New
          </Button>
        </div>
      </div>

      <MenuNav />

      {children}

      {/* AI Chat Widget */}
      <AIChatWidget 
        title="Abigail Menu Assistant" 
        greeting="Hi! I'm Abigail, your AI assistant. How can I help you with your menu today? Please start by telling me your store name."
      />
    </div>
  )
}
