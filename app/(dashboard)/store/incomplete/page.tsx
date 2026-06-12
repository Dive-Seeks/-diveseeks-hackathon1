"use client";

import * as React from "react";
import { StoreRecordsTable } from "../store-records-table";

export default function IncompleteStorePage() {
  return (
    <div className="flex flex-col gap-6 p-4 md:p-8">
      <StoreRecordsTable
        status="incomplete"
        title="Incomplete Stores"
        description="Track all incomplete or unsubmitted business records linked to your account."
      />
    </div>
  );
}
