"use client"

import * as React from "react"
import { Check, ChevronRight, LayoutGrid, Package, Settings2, Sparkles, Wand2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

interface Template {
  id: string
  name: string
  icon: string
  items: string[]
}

const TEMPLATES: Record<string, Template[]> = {
  RESTAURANT: [
    { id: 'appetizers', name: 'Appetizers', icon: '🍤', items: ['Wings', 'Nacho', 'Spring Rolls'] },
    { id: 'main-course', name: 'Main Course', icon: '🍽️', items: ['Steak', 'Pasta', 'Burger'] },
    { id: 'desserts', name: 'Desserts', icon: '🍰', items: ['Cake', 'Ice Cream', 'Brownie'] },
  ],
  CAFE: [
    { id: 'coffee', name: 'Coffee', icon: '☕', items: ['Latte', 'Espresso', 'Mocha'] },
    { id: 'bakery', name: 'Bakery', icon: '🥐', items: ['Croissant', 'Muffin', 'Cookie'] },
    { id: 'tea', name: 'Tea', icon: '🍵', items: ['Matcha', 'Chai', 'Green Tea'] },
  ],
  BAR: [
    { id: 'cocktails', name: 'Cocktails', icon: '🍸', items: ['Martini', 'Mojito', 'Margarita'] },
    { id: 'mocktails', name: 'Mocktails', icon: '🍹', items: ['Virgin Mojito', 'Shirley Temple'] },
    { id: 'bites', name: 'Bar Bites', icon: '🍔', items: ['Sliders', 'Truffle Fries'] },
  ]
}

export function OnboardingFlow({ 
  storeType, 
  onComplete 
}: { 
  storeType: string, 
  onComplete: (data: any) => void 
}) {
  const [step, setStep] = React.useState<'CATEGORIES' | 'PRODUCTS' | 'MODIFIERS'>('CATEGORIES')
  const [selectedCats, setSelectedCats] = React.useState<string[]>([])
  const [selectedProds, setSelectedProds] = React.useState<string[]>([])
  
  const type = storeType.toUpperCase() as keyof typeof TEMPLATES
  const templates = TEMPLATES[type] || TEMPLATES.RESTAURANT

  const handleNext = () => {
    if (step === 'CATEGORIES') setStep('PRODUCTS')
    else if (step === 'PRODUCTS') setStep('MODIFIERS')
    else onComplete({ selectedCats, selectedProds })
  }

  const toggleCat = (id: string) => {
    setSelectedCats(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id])
  }

  return (
    <div className="w-full space-y-4 animate-in fade-in slide-in-from-right-4 duration-500">
      <div className="flex items-center gap-2 mb-2">
        <Sparkles className="h-4 w-4 text-muted-foreground" />
        <h3 className="text-sm font-bold uppercase tracking-wide text-foreground">
          Step {step === 'CATEGORIES' ? '1' : step === 'PRODUCTS' ? '2' : '3'}: {step.toLowerCase()}
        </h3>
      </div>

      <div className="grid gap-2">
        {step === 'CATEGORIES' && templates.map(t => (
          <button
            key={t.id}
            onClick={() => toggleCat(t.id)}
            className={cn(
              "flex items-center gap-3 p-3 text-left bg-white border rounded-xl transition-all",
              selectedCats.includes(t.id) ? "border-foreground bg-muted ring-1 ring-foreground/20" : "hover:border-border"
            )}
          >
            <span className="text-xl">{t.icon}</span>
            <span className="flex-1 font-semibold text-sm">{t.name}</span>
            {selectedCats.includes(t.id) && <Check className="h-4 w-4 text-foreground" />}
          </button>
        ))}

        {step === 'PRODUCTS' && templates.filter(t => selectedCats.includes(t.id)).map(t => (
          <div key={t.id} className="space-y-2">
            <Badge variant="outline" className="text-[10px] font-bold uppercase border-border text-foreground">
              {t.name}
            </Badge>
            <div className="grid grid-cols-2 gap-2">
              {t.items.map(item => (
                <button
                  key={item}
                  onClick={() => setSelectedProds(p => p.includes(item) ? p.filter(i => i !== item) : [...p, item])}
                  className={cn(
                    "p-2 text-xs font-medium border rounded-lg transition-all",
                    selectedProds.includes(item) ? "bg-foreground text-background border-foreground" : "bg-background hover:border-border"
                  )}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>
        ))}

        {step === 'MODIFIERS' && (
          <div className="p-4 bg-muted border border-border rounded-xl text-center space-y-3">
            <Settings2 className="h-8 w-8 text-muted-foreground mx-auto" />
            <h4 className="font-bold text-sm text-foreground">Add Modifiers?</h4>
            <p className="text-xs text-muted-foreground">Standard modifiers (Like cheese, sugar level) will be added to relevant items.</p>
            <div className="flex justify-center gap-2">
               <Badge className="bg-background text-foreground border-border">Custom Size</Badge>
               <Badge className="bg-background text-foreground border-border">Toppings</Badge>
            </div>
          </div>
        )}
      </div>

      <Button 
        onClick={handleNext} 
        disabled={step === 'CATEGORIES' && selectedCats.length === 0}
        className="w-full bg-foreground text-background hover:bg-foreground/90 h-11 rounded-xl"
      >
        <span>{step === 'MODIFIERS' ? 'Finish & Save Menu' : 'Next Step'}</span>
        <ChevronRight className="ml-2 h-4 w-4" />
      </Button>
    </div>
  )
}
