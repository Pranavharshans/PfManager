'use client'

import React, { useState } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

interface PinEntryProps {
  onPinSubmit: (pin: string) => void;
}

export default function PinEntry({ onPinSubmit }: PinEntryProps) {
  const [pin, setPin] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onPinSubmit(pin)
  }

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center">
      <form onSubmit={handleSubmit} className="bg-gray-800 p-8 rounded-lg shadow-lg">
        <h2 className="text-2xl font-bold text-gray-100 mb-6 text-center">Enter PIN</h2>
        <Input
          type="password"
          value={pin}
          onChange={(e) => setPin(e.target.value)}
          className="mb-4 bg-gray-700 text-gray-100 border-gray-600"
          placeholder="Enter your PIN"
          maxLength={4}
        />
        <Button type="submit" className="w-full">Submit</Button>
      </form>
    </div>
  )
}

