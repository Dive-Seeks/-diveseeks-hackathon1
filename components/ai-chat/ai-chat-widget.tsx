"use client"

import * as React from "react"
import { useChat } from "@ai-sdk/react"
import { DefaultChatTransport } from "ai"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { MessageSquare, Send, Phone, X, Minimize2, Maximize2, Store, Sparkles } from "lucide-react"
import { cn } from "@/lib/utils"
import { useRouter, usePathname } from "next/navigation"
import { StoreSelector } from "./store-selector"
import { Site } from "@/lib/api/contracts"
import { MenuStatsCard } from "./menu-stats-card"


export function AIChatWidget({ 
  title = "Abigail AI Assistant",
  greeting = "Hi! I'm Abigail, your AI assistant. How can I help you with your menu today?"
}: { 
  title?: string
  greeting?: string
}) {
  const router = useRouter()
  const pathname = usePathname()
  const [isOpen, setIsOpen] = React.useState(false)
  const [isMinimized, setIsMinimized] = React.useState(false)
  const [input, setInput] = React.useState("")
  const [selectedSiteId, setSelectedSiteId] = React.useState<string | undefined>()
  const [selectedSite, setSelectedSite] = React.useState<Site | null>(null)
  const [activeFlow, setActiveFlow] = React.useState<'STATS' | null>(null)
  const scrollAnchorRef = React.useRef<HTMLDivElement>(null)

  const { messages, sendMessage, status, stop } = useChat({
    transport: new DefaultChatTransport({
      api: "/api/ai/chat",
    }),
  })

  const isLoading = status === "submitted" || status === "streaming"

  // Auto-scroll to bottom when new messages arrive
  React.useEffect(() => {
    if (scrollAnchorRef.current) {
      scrollAnchorRef.current.scrollIntoView({ behavior: "smooth" })
    }
  }, [messages, isLoading])

  const handleCallClick = () => {
    // Placeholder for future voice/call implementation
    alert("Voice call feature coming soon! This will enable voice interaction with Abigail AI.")
  }

  const handleSend = (e?: React.FormEvent) => {
    e?.preventDefault()
    if (!input.trim() || isLoading) return
    
    // Dispatch event for Hermes behavior agent
    document.dispatchEvent(new CustomEvent('hermes:message_sent', { 
      detail: { message: input, sessionId: selectedSiteId || 'global' } 
    }));

    sendMessage({ text: input })
    setInput("")
  }

  const handleSiteSelect = (site: Site) => {
    setSelectedSite(site)
    setSelectedSiteId(site.id)
    setActiveFlow('STATS')
    
    const msg = `I want to manage the menu for store: ${site.name} (ID: ${site.id})`;
    document.dispatchEvent(new CustomEvent('hermes:message_sent', { 
      detail: { message: msg, sessionId: site.id } 
    }));

    sendMessage({ text: msg })
  }

  const handleWizardRedirect = () => {
    setIsOpen(false)
    router.push(`/menu/wizard?siteId=${selectedSiteId}`)
  }

  // Hide widget entirely if on the wizard page
  if (pathname === "/menu/wizard") return null;

  if (!isOpen) {
    return (
      <Button
        onClick={() => setIsOpen(true)}
        size="lg"
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full bg-foreground text-background hover:bg-foreground/90 z-50 animate-in zoom-in duration-300"
      >
        <MessageSquare className="h-6 w-6" />
      </Button>
    )
  }

  return (
    <Card
      className={cn(
        "fixed bottom-6 right-6 z-50 border-border transition-all duration-300 overflow-hidden flex flex-col",
        isMinimized ? "w-80 h-16" : "w-96 h-[600px]",
      )}
    >
      <CardHeader className="p-4 bg-card border-b border-border flex flex-row items-center justify-between space-y-0 shrink-0">
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          {!isMinimized && title}
        </CardTitle>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleCallClick}
            className="h-8 w-8 text-white hover:bg-white/20"
            title="Start voice call (coming soon)"
          >
            <Phone className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              setSelectedSiteId(undefined)
              setSelectedSite(null)
              setActiveFlow(null)
            }}
            className="h-8 w-8 text-white hover:bg-white/20"
            title="Switch store"
          >
            <Store className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsMinimized(!isMinimized)}
            className="h-8 w-8 text-white hover:bg-white/20"
          >
            {isMinimized ? (
              <Maximize2 className="h-4 w-4" />
            ) : (
              <Minimize2 className="h-4 w-4" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsOpen(false)}
            className="h-8 w-8 text-white hover:bg-white/20"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>

      {!isMinimized && (
        <CardContent className="p-0 flex flex-col flex-1 overflow-hidden">
          <div 
            className="flex-1 overflow-y-auto p-4 scroll-smooth"
            style={{ 
              scrollbarWidth: 'thin',
              scrollbarColor: 'rgba(234, 88, 12, 0.5) transparent'
            }}
          >
            <div className="space-y-4 pb-4">
              {(messages.length === 0 || !selectedSiteId) && (
                <div className="flex flex-col gap-4">
                  {messages.length === 0 && (
                    <div className="flex justify-start animate-in fade-in slide-in-from-left-2 duration-300">
                      <div className="bg-muted rounded-2xl rounded-tl-none px-4 py-3 shadow-sm text-sm">
                          {greeting}
                      </div>
                    </div>
                  )}
                  <StoreSelector 
                    onSelect={handleSiteSelect} 
                    selectedSiteId={selectedSiteId} 
                  />
                </div>
              )}
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={cn(
                    "flex animate-in fade-in slide-in-from-bottom-2 duration-300",
                    message.role === "user" ? "justify-end" : "justify-start",
                  )}
                >
                  <div
                    className={cn(
                      "rounded-2xl px-4 py-3 max-w-[85%] shadow-sm text-sm",
                      message.role === "user"
                        ? "bg-foreground text-background rounded-tr-none"
                        : "bg-muted text-foreground rounded-tl-none",
                    )}
                  >
                    <div className="whitespace-pre-wrap">
                      {(message as any).parts?.map((part: any, i: number) => 
                        part.type === 'text' ? part.text : null
                      ).join("") || (message as any).text || (message as any).content || ""}
                    </div>
                  </div>
                </div>
              ))}
              
              {activeFlow === 'STATS' && selectedSite && (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <MenuStatsCard 
                    categories={selectedSite.categoryCount || 0}
                    items={selectedSite.itemCount || 0}
                    modifiers={selectedSite.modifierCount || 0}
                    siteName={selectedSite.name}
                    onOnboardClick={handleWizardRedirect}
                  />
                </div>
              )}

              {isLoading && (
                <div className="flex justify-start fade-in animate-in">
                  <div className="bg-muted rounded-2xl rounded-tl-none px-4 py-3">
                    <div className="flex gap-1.5">
                      <div className="w-1.5 h-1.5 bg-foreground rounded-full animate-bounce [animation-delay:0ms]" />
                      <div className="w-1.5 h-1.5 bg-foreground rounded-full animate-bounce [animation-delay:150ms]" />
                      <div className="w-1.5 h-1.5 bg-foreground rounded-full animate-bounce [animation-delay:300ms]" />
                    </div>
                  </div>
                </div>
              )}
              <div ref={scrollAnchorRef} />
            </div>
          </div>

          <div className="p-4 border-t bg-background shrink-0">
            <form
              onSubmit={handleSend}
              className="flex gap-2"
            >
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask Abigail anything..."
                className="flex-1 h-10 rounded-xl"
                disabled={isLoading}
              />
              <Button
                type="submit"
                size="icon"
                disabled={isLoading || !input?.trim()}
                className="bg-foreground hover:bg-foreground/90 h-10 w-10 rounded-xl"
              >
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </div>
        </CardContent>
      )}
    </Card>
  )
}
