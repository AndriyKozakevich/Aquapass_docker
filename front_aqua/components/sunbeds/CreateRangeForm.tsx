"use client";

import React, { useState } from "react";
import { CreateRangeSunbedDto } from "@/types/sunbeds"; 

interface Props {
  onSubmit: (dto: CreateRangeSunbedDto) => Promise<void>;
}

export default function CreateRangeForm({ onSubmit }: Props) {
  const [row, setRow] = useState("");
  const [count, setCount] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);  

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!row || !count) return;
    
    setIsSubmitting(true);
    try {
      await onSubmit({
        row: row.trim().toUpperCase(),
        count: parseInt(count, 10),
      });
      setCount(""); 
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white p-5 rounded-2xl border border-gray-200 space-y-4 shadow-sm">
      {/* Повернули emerald колір для візуального розділення */}
      <h2 className="text-base font-semibold text-emerald-700">Створити цілий ряд</h2>
      
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-gray-600 block mb-1">Ряд (Row)</label>
            <input
              type="text" required placeholder="B" value={row}
              onChange={(e) => setRow(e.target.value)}
              className="w-full bg-white border border-gray-300 rounded-lg p-2.5 text-sm uppercase focus:border-emerald-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="text-xs text-gray-600 block mb-1">Кількість (Count)</label>
            <input
              type="number" required min={1} max={100} placeholder="10" value={count}
              onChange={(e) => setCount(e.target.value)}
              className="w-full bg-white border border-gray-300 rounded-lg p-2.5 text-sm focus:border-emerald-500 focus:outline-none"
            />
          </div>
        </div>
        <button 
          type="submit" 
          disabled={isSubmitting} 
          className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:bg-gray-400 text-white py-2.5 rounded-lg text-sm font-medium transition"
        >
          {isSubmitting ? "Генерація..." : "Згенерувати ряд"}
        </button>
      </form>
    </div>
  );
}