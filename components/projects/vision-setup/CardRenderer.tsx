"use client";

import * as React from "react";
import type { CardBlock } from "@/types/vision-setup-envelope";
import { SingleChoiceCard } from "./SingleChoiceCard";
import { MultiSelectCard } from "./MultiSelectCard";
import { YesNoCard } from "./YesNoCard";
import { FreeTextCard } from "./FreeTextCard";
import { ConfirmationCard } from "./ConfirmationCard";

interface CardRendererProps {
  card: CardBlock;
  selectedIds: string[];
  onSingleSelect: (id: string) => void;
  onMultiToggle: (id: string) => void;
  onYesNo: (yes: boolean) => void;
}

export function CardRenderer({
  card,
  selectedIds,
  onSingleSelect,
  onMultiToggle,
  onYesNo,
}: CardRendererProps) {
  switch (card.kind) {
    case "single_choice":
      return (
        <SingleChoiceCard
          card={card}
          selectedId={selectedIds[0] ?? null}
          onSelect={onSingleSelect}
        />
      );
    case "multi_select":
      return (
        <MultiSelectCard
          card={card}
          selectedIds={selectedIds}
          onToggle={onMultiToggle}
        />
      );
    case "yes_no":
      return <YesNoCard card={card} onAnswer={onYesNo} />;
    case "free_text":
      return <FreeTextCard card={card} />;
    case "confirmation":
      return <ConfirmationCard card={card} />;
  }
}
