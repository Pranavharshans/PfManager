'use client'

import React, { useState, useRef, useCallback, useMemo } from 'react'
import { ArrowLeft, Plus, Download, Trash, Edit, Save } from 'lucide-react'
import { utils, writeFile } from 'xlsx'
import type { Statement, Entry, StatementSummary } from '../types'
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Input } from "@/components/ui/input"

interface Props {
  statement?: Statement
  onSave: (statement: Statement) => void
  onBack: () => void
  isNewStatement: boolean
}

export default function StatementEditor({ statement, onSave, onBack, isNewStatement }: Props) {
  const initialEntries = statement?.entries?.map(entry => ({
    ...entry,
    date: entry.date instanceof Date ? entry.date : new Date(entry.date)
  })) || []

  const [company, setCompany] = useState(statement?.company || '')
  const [place, setPlace] = useState(statement?.place || '')
  const [entries, setEntries] = useState<Entry[]>(initialEntries)
  const [isEditMode, setIsEditMode] = useState(isNewStatement)
  const [showExportModal, setShowExportModal] = useState(false)

  const companyInputRef = useRef<HTMLInputElement>(null)
  const placeInputRef = useRef<HTMLInputElement>(null)

  // Sort entries by date
  const sortedEntries = useMemo(() => {
    return [...entries].sort((a, b) => a.date.getTime() - b.date.getTime())
  }, [entries])

  const handleHeaderKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, nextRef: React.RefObject<HTMLInputElement>) => {
    if (e.key === 'Enter' && nextRef.current) {
      e.preventDefault()
      nextRef.current.focus()
    }
  }

  const handleAddEntry = () => {
    const newEntry: Entry = {
      id: crypto.randomUUID(),
      date: new Date(),
      invoice: '',
      description: '',
      debit: 0,
      credit: 0,
    }
    setEntries(prevEntries => [...prevEntries, newEntry])
  }

  const handleEntryChange = (id: string, field: keyof Entry, value: string | number | Date) => {
    setEntries(entries.map((entry) => {
      if (entry.id === id) {
        if (field === 'date') {
          const dateValue = value instanceof Date ? value : new Date(value)
          return { ...entry, [field]: isNaN(dateValue.getTime()) ? new Date() : dateValue }
        }
        return { ...entry, [field]: value }
      }
      return entry
    }))
  }

  const formatDateForInput = (date: Date): string => {
    if (!(date instanceof Date) || isNaN(date.getTime())) {
      return ''
    }
    return date.toISOString().split('T')[0]
  }

  const formatDateForDisplay = (date: Date): string => {
    if (!(date instanceof Date) || isNaN(date.getTime())) {
      return 'Invalid Date'
    }
    return date.toLocaleDateString()
  }

  const handleEntryKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>, entryId: string, currentField: keyof Entry) => {
      const fields: (keyof Entry)[] = ['date', 'invoice', 'description', 'debit', 'credit']
      const currentIndex = fields.indexOf(currentField)
      const currentRowIndex = entries.findIndex((entry) => entry.id === entryId)

      const focusInput = (rowIndex: number, fieldIndex: number) => {
        if (rowIndex >= 0 && rowIndex < entries.length && fieldIndex >= 0 && fieldIndex < fields.length) {
          const targetId = entries[rowIndex].id
          const targetField = fields[fieldIndex]
          const targetInput = document.querySelector(
            `input[data-entry-id="${targetId}"][data-field="${targetField}"]`
          ) as HTMLElement
          targetInput?.focus()
        }
      }

      switch (e.key) {
        case 'Enter':
          e.preventDefault()
          if (currentField === 'credit') {
            handleAddEntry()
            setTimeout(() => focusInput(currentRowIndex + 1, 0), 0)
          } else {
            focusInput(currentRowIndex, currentIndex + 1)
          }
          break
        case 'ArrowDown':
          e.preventDefault()
          focusInput(currentRowIndex + 1, currentIndex)
          break
        case 'ArrowUp':
          e.preventDefault()
          focusInput(currentRowIndex - 1, currentIndex)
          break
        case 'ArrowLeft':
          if (e.currentTarget.selectionStart === 0) {
            e.preventDefault()
            focusInput(currentRowIndex, currentIndex - 1)
          }
          break
        case 'ArrowRight':
          if (e.currentTarget.selectionStart === e.currentTarget.value.length) {
            e.preventDefault()
            focusInput(currentRowIndex, currentIndex + 1)
          }
          break
      }
    },
    [entries, handleAddEntry]
  )

  const handleRemoveEntry = (id: string) => {
    setEntries(entries.filter((entry) => entry.id !== id))
  }

  const calculateSummary = (entriesToCalculate: Entry[]): StatementSummary => {
    const totalDebit = entriesToCalculate.reduce((sum, entry) => sum + (entry.debit || 0), 0)
    const totalCredit = entriesToCalculate.reduce((sum, entry) => sum + (entry.credit || 0), 0)
    const numberOfCredits = entriesToCalculate.filter((entry) => entry.credit > 0).length
    const numberOfDebits = entriesToCalculate.filter((entry) => entry.debit > 0).length

    return {
      totalDebit,
      totalCredit,
      difference: totalCredit - totalDebit,
      numberOfCredits,
      numberOfDebits,
    }
  }

  const handleSave = () => {
    const newStatement: Statement = {
      id: statement?.id || crypto.randomUUID(),
      company,
      place,
      date: new Date(),
      entries: entries.map(entry => ({
        ...entry,
        date: entry.date instanceof Date ? entry.date : new Date(entry.date)
      })),
    }
    onSave(newStatement)
    setIsEditMode(false)
  }

  const handleExport = (timeFrame: string, startDate?: Date, endDate?: Date) => {
    let filteredEntries = entries
    const now = new Date()
    let exportStartDate: Date
    let exportEndDate: Date = now
    
    switch (timeFrame) {
      case '1month':
        exportStartDate = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate())
        filteredEntries = entries.filter(entry => entry.date >= exportStartDate)
        break
      case '3months':
        exportStartDate = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate())
        filteredEntries = entries.filter(entry => entry.date >= exportStartDate)
        break
      case '6months':
        exportStartDate = new Date(now.getFullYear(), now.getMonth() - 6, now.getDate())
        filteredEntries = entries.filter(entry => entry.date >= exportStartDate)
        break
      case 'thisFinancialYear':
        exportStartDate = new Date(now.getFullYear(), 3, 1) // April 1st
        if (now < exportStartDate) {
          exportStartDate.setFullYear(exportStartDate.getFullYear() - 1)
        }
        filteredEntries = entries.filter(entry => entry.date >= exportStartDate)
        break
      case '1year':
        exportStartDate = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate())
        filteredEntries = entries.filter(entry => entry.date >= exportStartDate)
        break
      case 'custom':
        if (startDate && endDate) {
          exportStartDate = startDate
          exportEndDate = endDate
          filteredEntries = entries.filter(entry => entry.date >= startDate && entry.date <= endDate)
        }
        break
    }

    exportToExcel(filteredEntries, exportStartDate, exportEndDate)
    setShowExportModal(false)
  }

  const exportToExcel = (filteredEntries: Entry[], startDate: Date, endDate: Date) => {
    const wb = utils.book_new()
    const currentDate = new Date()
      .toLocaleDateString('en-GB', {
        day: '2-digit',
        month: '2-digit',
        year: '2-digit',
      })
      .replace(/\//g, '/')

    const timeFrameString = `${startDate.toLocaleDateString('en-GB')} - ${endDate.toLocaleDateString('en-GB')}`

    const ws = utils.aoa_to_sheet([
      ['PRANAV FASHIONS'],
      ['7029 KASIPALAYAM ROAD', '', '', 'PHONE: 9952352371 ,7907588876'],
      ['THALAYARI THOTTA', '', '', 'E-mail: suresh4ub@gmail.com'],
      ['SIDCO,MUDHALIPALAYAM'],
      ['TIRUPUR,641606'],
      [''],
      [`Time Frame: ${timeFrameString}`],
      [''],
      [currentDate, '', '', company],
      ['', '', '', place],
      [''],
      ['DATE', 'INVOICE', 'DESC', 'PAYMENT', 'BILL'],
      ...filteredEntries.map((entry) => [
        formatDateForDisplay(entry.date),
        entry.invoice,
        entry.description,
        entry.debit || '',
        entry.credit || ''
      ]),
      [''],
      [`CLOSING BALANCE AS ON ${currentDate} =`, '', '', calculateSummary(filteredEntries).totalCredit - calculateSummary(filteredEntries).totalDebit]
,
    ])

    ws['!cols'] = [
      { width: 15 },
      { width: 15 },
      { width: 30 },
      { width: 15 },
      { width: 15 },
    ]

    ws['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 4 } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: 2 } },
      { s: { r: 2, c: 0 }, e: { r: 2, c: 2 } },
      { s: { r: 3, c: 0 }, e: { r: 3, c: 4 } },
      { s: { r: 4, c: 0 }, e: { r: 4, c: 4 } },
      { s: { r: 6, c: 0 }, e: { r: 6, c: 4 } },
      { s: { r: 8, c: 3 }, e: { r: 8, c: 4 } },
      { s: { r: 9, c: 3 }, e: { r: 9, c: 4 } },
    ]

    utils.book_append_sheet(wb, ws, 'Statement')
    writeFile(wb, `${company || 'Company'}-statement-${currentDate}.xlsx`)
  }

  const summary = calculateSummary(entries)

  const pieChartData = [
    { name: 'Paid', value: (summary.totalDebit / summary.totalCredit) * 100 },
    { name: 'Unpaid', value: 100 - (summary.totalDebit / summary.totalCredit) * 100 },
  ]

  const COLORS = ['#10B981', '#EF4444'] // Green for paid, Red for unpaid

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
        >
          <ArrowLeft size={20} />
          Back to Statement Manager
        </button>
        <div className="flex gap-4">
          <button
            onClick={() => setShowExportModal(true)}
            className="flex items-center justify-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
          >
            <Download size={20} />
            Export
          </button>
        </div>
      </div>

      <div className="grid gap-4 mb-6">
        <div className="grid sm:grid-cols-[120px_1fr] items-center gap-2">
          <label htmlFor="company" className="text-gray-400 font-medium">
            Company:
          </label>
          {isEditMode ? (
            <input
              id="company"
              ref={companyInputRef}
              type="text"
              placeholder="Company Name"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              onKeyDown={(e) => handleHeaderKeyDown(e, placeInputRef)}
              className="bg-gray-800 text-white px-4 py-2 rounded-lg border border-gray-700 focus:outline-none focus:border-blue-500 w-full"
            />
          ) : (
            <div className="text-white">{company}</div>
          )}
        </div>
        <div className="grid sm:grid-cols-[120px_1fr] items-center gap-2">
          <label htmlFor="place" className="text-gray-400 font-medium">
            Place:
          </label>
          {isEditMode ? (
            <input
              id="place"
              ref={placeInputRef}
              type="text"
              placeholder="Place"
              value={place}
              onChange={(e) => setPlace(e.target.value)}
              className="bg-gray-800 text-white px-4 py-2 rounded-lg border border-gray-700 focus:outline-none focus:border-blue-500 w-full"
            />
          ) : (
            <div className="text-white">{place}</div>
          )}
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-6 mb-6">
        <div className="bg-gray-800 rounded-lg p-4">
          <h3 className="text-lg font-semibold mb-4">Summary</h3>
          <div className="grid gap-4">
            <div>
              <div className="text-gray-400 mb-1">Total Payment</div>
              <div className="text-xl font-semibold">{summary.totalDebit.toFixed(2)}</div>
              <div className="text-sm text-gray-400">Number of Payments: {summary.numberOfDebits}</div>
            </div>
            <div>
              <div className="text-gray-400 mb-1">Total Bill</div>
              <div className="text-xl font-semibold">{summary.totalCredit.toFixed(2)}</div>
              <div className="text-sm text-gray-400">Number of Bills: {summary.numberOfCredits}</div>
            </div>
            <div>
              <div className="text-gray-400 mb-1">Difference (Bill - Payment)</div>
              <div className="text-xl font-semibold">{summary.difference.toFixed(2)}</div>
            </div>
          </div>
        </div>
        <div className="bg-gray-800 rounded-lg p-4">
          <h3 className="text-lg font-semibold mb-4">Bill Payment Distribution</h3>
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieChartData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {pieChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => `${Number(value).toFixed(2)}%`} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="bg-gray-800 rounded-lg p-4 mb-6 overflow-x-auto">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Entries</h3>
          <div className="flex gap-2">
            {isEditMode ? (
              <button
                onClick={handleSave}
                className="flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Save size={20} />
                Save
              </button>
            ) : (
              <button
                onClick={() => setIsEditMode(true)}
                className="flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Edit size={20} />
                Edit
              </button>
            )}
          </div>
        </div>
        <div className="min-w-[800px]">
          <div className="grid grid-cols-[1fr_1fr_2fr_1fr_1fr_auto] gap-4 mb-4">
            <div className="font-medium text-gray-300 px-3 py-2">Date</div>
            <div className="font-medium text-gray-300 px-3 py-2">Invoice</div>
            <div className="font-medium text-gray-300 px-3 py-2">Description</div>
            <div className="font-medium text-gray-300 px-4 py-2">Bill</div>
            <div className="font-medium text-gray-300 px-3 py-2">Payment</div>
            {isEditMode && <div className="font-medium text-gray-300 px-1 py-2">Action</div>}
          </div>
          {sortedEntries.map((entry) => (
            <div key={entry.id} className="grid grid-cols-[1fr_1fr_2fr_1fr_1fr_auto] gap-4 mb-2">
              {isEditMode ? (
                <>
                  <input
                    type="date"
                    value={formatDateForInput(entry.date)}
                    onChange={(e) => handleEntryChange(entry.id, 'date', new Date(e.target.value))}
                    onKeyDown={(e) => handleEntryKeyDown(e, entry.id, 'date')}
                    data-entry-id={entry.id}
                    data-field="date"
                    className="bg-gray-700 text-white px-3 py-2 rounded border border-gray-600 focus:outline-none focus:border-blue-500 w-full"
                  />
                  <input
                    type="text"
                    value={entry.invoice}
                    onChange={(e) => handleEntryChange(entry.id, 'invoice', e.target.value)}
                    onKeyDown={(e) => handleEntryKeyDown(e, entry.id, 'invoice')}
                    data-entry-id={entry.id}
                    data-field="invoice"
                    className="bg-gray-700 text-white px-3 py-2 rounded border border-gray-600 focus:outline-none focus:border-blue-500 w-full"
                  />
                  <input
                    type="text"
                    value={entry.description}
                    onChange={(e) => handleEntryChange(entry.id, 'description', e.target.value)}
                    onKeyDown={(e) => handleEntryKeyDown(e, entry.id, 'description')}
                    data-entry-id={entry.id}
                    data-field="description"
                    className="bg-gray-700 text-white px-3 py-2 rounded border border-gray-600 focus:outline-none focus:border-blue-500 w-full"
                  />
                  <input
                    type="number"
                    value={entry.credit || ''}
                    onChange={(e) => handleEntryChange(entry.id, 'credit', parseFloat(e.target.value) || 0)}
                    onKeyDown={(e) => handleEntryKeyDown(e, entry.id, 'credit')}
                    data-entry-id={entry.id}
                    data-field="credit"
                    className="bg-gray-700 text-white px-3 py-2 rounded border border-gray-600 focus:outline-none focus:border-blue-500 w-full"
                  />
                  <input
                    type="number"
                    value={entry.debit || ''}
                    onChange={(e) => handleEntryChange(entry.id, 'debit', parseFloat(e.target.value) || 0)}
                    onKeyDown={(e) => handleEntryKeyDown(e, entry.id, 'debit')}
                    data-entry-id={entry.id}
                    data-field="debit"
                    className="bg-gray-700 text-white px-3 py-2 rounded border border-gray-600 focus:outline-none focus:border-blue-500 w-full"
                  />
                  <button
                    onClick={() => handleRemoveEntry(entry.id)}
                    className="bg-red-500 hover:bg-red-600 text-white px-3 py-2 rounded transition-colors"
                  >
                    <Trash size={20} />
                  </button>
                </>
              ) : (
                <>
                  <div className="text-white px-3 py-2">{formatDateForDisplay(entry.date)}</div>
                  <div className="text-white px-3 py-2">{entry.invoice}</div>
                  <div className="text-white px-3 py-2">{entry.description}</div>
                  <div className="text-white px-3 py-2">{entry.credit}</div>
                  <div className="text-white px-3 py-2">{entry.debit}</div>
                </>
              )}
            </div>
          ))}
        </div>

        {isEditMode && (
          <button
            onClick={handleAddEntry}
            className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors mt-4"
          >
            <Plus size={20} />
            Add Entry
          </button>
        )}
      </div>

      <ExportModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        onExport={handleExport}
      />
    </div>
  )
}

function ExportModal({ isOpen, onClose, onExport }) {
  const [timeFrame, setTimeFrame] = useState('1month')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  const handleExport = () => {
    if (timeFrame === 'custom') {
      onExport(timeFrame, new Date(startDate), new Date(endDate))
    } else {
      onExport(timeFrame)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Export Statement</DialogTitle>
          <DialogDescription>Choose a time frame for the export</DialogDescription>
        </DialogHeader>
        <RadioGroup value={timeFrame} onValueChange={setTimeFrame}>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="1month" id="1month" />
            <Label htmlFor="1month">1 Month</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="3months" id="3months" />
            <Label htmlFor="3months">3 Months</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="6months" id="6months" />
            <Label htmlFor="6months">6 Months</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="thisFinancialYear" id="thisFinancialYear" />
            <Label htmlFor="thisFinancialYear">This Financial Year</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="1year" id="1year" />
            <Label htmlFor="1year">1 Year</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="custom" id="custom" />
            <Label htmlFor="custom">Custom</Label>
          </div>
        </RadioGroup>
        {timeFrame === 'custom' && (
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col space-y-2">
              <Label htmlFor="startDate">Start Date</Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="flex flex-col space-y-2">
              <Label htmlFor="endDate">End Date</Label>
              <Input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>
        )}
        <DialogFooter>
          <Button onClick={handleExport}>Export</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}