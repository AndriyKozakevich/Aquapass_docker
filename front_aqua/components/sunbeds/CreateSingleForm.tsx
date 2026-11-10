"use client";

import React, { useState } from "react";
import { CreateSingleSunbedDto } from "@/types/sunbeds";

const DEFAULT_ZONE_ID = "22222222-2222-2222-2222-222222222222";

interface Props {
  onSubmit: (dto: CreateSingleSunbedDto) => Promise<void>;
}

export default function CreateSingleForm({ onSubmit }: Props) {
  const [row, setRow] = useState("");
  const [number, setNumber] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!row || !number) return;
    
    setIsSubmitting(true);
    try {
      await onSubmit({
        row: row.trim().toUpperCase(),
        number: parseInt(number, 10),
        zoneId: DEFAULT_ZONE_ID,
      });
      setNumber(""); 
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white p-5 rounded-2xl border border-gray-200 space-y-4 shadow-sm">
      <h2 className="text-base font-semibold text-blue-600">Додати один шезлонг</h2>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-gray-600 block mb-1">Ряд (Row)</label>
            <input
              type="text" required placeholder="A" value={row}
              onChange={(e) => setRow(e.target.value)}
              className="w-full bg-white border border-gray-300 rounded-lg p-2.5 text-sm uppercase focus:border-blue-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="text-xs text-gray-600 block mb-1">Номер (Number)</label>
            <input
              type="number" required placeholder="1" value={number}
              onChange={(e) => setNumber(e.target.value)}
              className="w-full bg-white border border-gray-300 rounded-lg p-2.5 text-sm focus:border-blue-500 focus:outline-none"
            />
          </div>
        </div>
        <button type="submit" disabled={isSubmitting} className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-gray-400 text-white py-2.5 rounded-lg text-sm font-medium transition">
          {isSubmitting ? "Створення..." : "Створити шезлонг"}
        </button>
      </form>
    </div>
  );
}