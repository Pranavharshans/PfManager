'use client'

import React, { useState, useMemo } from 'react'
import { ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from "@/components/ui/button"
import type { Statement, Entry } from '../types'

interface Props {
  statements: Statement[]
  onBack: () => void
}

interface TransactionWithMetadata extends Entry {
  statementTitle: string
  statementDate: Date
}

export default function AllTransactions({ statements, onBack }: Props) {
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  const allTransactions = useMemo(() => {
    return statements
      .flatMap((statement) =>
        statement.entries.map((entry) => ({
          ...entry,
          statementTitle: statement.company || '',
          statementDate: statement.date,
        }))
      )
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  }, [statements])

  const totalPages = Math.ceil(allTransactions.length / itemsPerPage)
  const currentTransactions = allTransactions.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
          >
            <ArrowLeft size={20} />
            Back to Overview
          </button>
          <h1 className="text-2xl font-bold">All Transactions</h1>
        </div>

        <div className="bg-gray-800 rounded-lg p-4 mb-6">
          <div className="space-y-2">
            {currentTransactions.map((transaction: TransactionWithMetadata, index) => (
              <div
                key={`${transaction.id}-${index}`}
                className="flex justify-between items-center p-2 hover:bg-gray-700 rounded"
              >
                <div>
                  <p className="font-medium">{transaction.description}</p>
                  <p className="text-sm text-gray-400">
                    {transaction.statementTitle} - {new Date(transaction.date).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex gap-4">
                  {transaction.debit > 0 && <span className="text-red-500">-₹{transaction.debit.toFixed(2)}</span>}
                  {transaction.credit > 0 && (
                    <span className="text-green-500">+₹{transaction.credit.toFixed(2)}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {totalPages > 1 && (
          <div className="flex justify-center items-center gap-4">
            <Button
              onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              variant="outline"
              size="icon"
            >
              <ChevronLeft size={16} />
              <span className="sr-only">Previous page</span>
            </Button>
            <span className="text-gray-400">
              Page {currentPage} of {totalPages}
            </span>
            <Button
              onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              variant="outline"
              size="icon"
            >
              <ChevronRight size={16} />
              <span className="sr-only">Next page</span>
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}