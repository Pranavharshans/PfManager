'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { collection, query, where, getDocs, addDoc, updateDoc, doc, Timestamp, orderBy } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useAuth } from '../contexts/AuthContext'
import type { Statement } from '../types'
import StatementList from './StatementList'
import StatementEditor from './StatementEditor'
import AllTransactions from './AllTransactions'
import UserProfile from './UserProfile'
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip, LineChart, Line, XAxis, YAxis, CartesianGrid } from 'recharts'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { User } from 'lucide-react'

const COLORS = ['#10B981', '#EF4444'] // Green for paid, Red for unpaid

export default function StatementManager() {
  const { user, logout } = useAuth();
  const [statements, setStatements] = useState<Statement[]>([])
  const [currentStatement, setCurrentStatement] = useState<Statement | undefined>()
  const [isEditing, setIsEditing] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [timeFrame, setTimeFrame] = useState('thisFinancialYear')
  const [showAllTransactions, setShowAllTransactions] = useState(false)
  const [showUserProfile, setShowUserProfile] = useState(false)

  const getStartDate = (timeFrame: string) => {
    const now = new Date()
    switch (timeFrame) {
      case 'last7Days':
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      case '1month':
        return new Date(now.getFullYear(), now.getMonth() - 1, now.getDate())
      case '3months':
        return new Date(now.getFullYear(), now.getMonth() - 3, now.getDate())
      case '6months':
        return new Date(now.getFullYear(), now.getMonth() - 6, now.getDate())
      case 'thisFinancialYear':
        const startOfFinancialYear = new Date(now.getFullYear(), 3, 1) // April 1st
        if (now < startOfFinancialYear) {
          startOfFinancialYear.setFullYear(startOfFinancialYear.getFullYear() - 1)
        }
        return startOfFinancialYear
      case 'last1Year':
        return new Date(now.getFullYear() - 1, now.getMonth(), now.getDate())
      default:
        return new Date(0)
    }
  }

  const getFilteredStatements = (statements: Statement[], timeFrame: string) => {
    const startDate = getStartDate(timeFrame)
    return statements.map(statement => ({
      ...statement,
      entries: statement.entries.filter(entry => new Date(entry.date) >= startDate)
    })).filter(statement => statement.entries.length > 0)
  }

  useEffect(() => {
    const fetchStatements = async () => {
      if (!user) {
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        setError(null)
        
        const statementsRef = collection(db, 'statements')
        const q = query(
          statementsRef,
          where('userId', '==', user.uid),
          orderBy('company', 'asc')
        )
        
        const querySnapshot = await getDocs(q)
        const loadedStatements = querySnapshot.docs.map((doc) => {
          const data = doc.data()
          return {
            ...data,
            id: doc.id,
            date: data.date instanceof Timestamp ? data.date.toDate() : new Date(data.date),
            entries: data.entries ? data.entries.map((entry: any) => ({
              ...entry,
              date: entry.date instanceof Timestamp ? entry.date.toDate() : new Date(entry.date)
            })) : []
          }
        }) as Statement[]

        setStatements(loadedStatements)
      } catch (error) {
        console.error('Error loading statements:', error)
        setError('Failed to load statements. Please try again later.')
      } finally {
        setLoading(false)
      }
    }

    fetchStatements()
  }, [user])

  const handleNewStatement = () => {
    setCurrentStatement(undefined)
    setIsEditing(true)
  }

  const handleEditStatement = (id: string) => {
    const statement = statements.find((s) => s.id === id)
    if (statement) {
      setCurrentStatement(statement)
      setIsEditing(true)
    }
  }

  const handleSaveStatement = async (statement: Statement) => {
    if (!user) return

    try {
      setError(null)
      const statementData = {
        ...statement,
        userId: user.uid,
        updatedAt: Timestamp.now(),
        date: Timestamp.fromDate(new Date(statement.date)),
        entries: statement.entries.map(entry => ({
          ...entry,
          date: Timestamp.fromDate(new Date(entry.date))
        }))
      }

      if (statement.id && statements.some((s) => s.id === statement.id)) {
        const statementRef = doc(db, 'statements', statement.id)
        await updateDoc(statementRef, statementData)

        setStatements((prevStatements) =>
          prevStatements.map((s) => (s.id === statement.id ? statement : s))
        )
      } else {
        const docRef = await addDoc(collection(db, 'statements'), statementData)
        const newStatement = { ...statement, id: docRef.id }

        setStatements((prevStatements) => [...prevStatements, newStatement])
      }

      setIsEditing(false)
    } catch (error) {
      console.error('Error saving statement:', error)
      setError('Failed to save statement. Please try again later.')
    }
  }

  const { filteredStatements, totals, pieChartData } = useMemo(() => {
    const filtered = getFilteredStatements(statements, timeFrame)
    
    const newTotals = filtered.reduce(
      (acc, statement) => {
        statement.entries.forEach((entry) => {
          acc.totalCredit += Number(entry.credit) || 0
          acc.totalDebit += Number(entry.debit) || 0
        })
        return acc
      },
      { totalCredit: 0, totalDebit: 0 }
    )

    const totalBill = newTotals.totalCredit
    const totalPayment = newTotals.totalDebit
    const paidPercentage = (totalPayment / totalBill) * 100
    const unpaidPercentage = 100 - paidPercentage

    const newPieChartData = [
      { name: 'Paid', value: paidPercentage },
      { name: 'Unpaid', value: unpaidPercentage },
    ]

    return { filteredStatements: filtered, totals: newTotals, pieChartData: newPieChartData }
  }, [statements, timeFrame])

  const monthlyTrends = useMemo(() => {
    const monthlyData: { [key: string]: { credit: number; debit: number } } = {}

    filteredStatements.forEach((statement) => {
      statement.entries.forEach((entry) => {
        const date = new Date(entry.date)
        const monthKey = date.toLocaleString('default', { month: 'short', year: '2-digit' })

        if (!monthlyData[monthKey]) {
          monthlyData[monthKey] = { credit: 0, debit: 0 }
        }

        monthlyData[monthKey].credit += Number(entry.credit) || 0
        monthlyData[monthKey].debit += Number(entry.debit) || 0
      })
    })

    return Object.entries(monthlyData)
      .sort((a, b) => {
        const dateA = new Date(a[0])
        const dateB = new Date(b[0])
        return dateA.getTime() - dateB.getTime()
      })
      .map(([month, data]) => ({
        month,
        credit: Number(data.credit.toFixed(2)),
        debit: Number(data.debit.toFixed(2)),
      }))
  }, [filteredStatements])

  const recentTransactions = useMemo(() => {
    const allEntries = filteredStatements.flatMap((statement) =>
      statement.entries?.map((entry) => ({
        ...entry,
        statementTitle: statement.company || '',
        statementDate: statement.date,
      })) || []
    )

    return allEntries
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 5)
  }, [filteredStatements])

  const greeting = user ? `Good ${getTimeOfDay()}, ${user.displayName || 'User'}` : 'Welcome'

  const handleLogout = async () => {
    try {
      await logout();
      // Redirect to login page or show a message
    } catch (error) {
      console.error('Failed to log out', error)
      setError('Failed to log out. Please try again.')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-red-500 text-center">
          <p>{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  if (showAllTransactions) {
    return <AllTransactions statements={filteredStatements} onBack={() => setShowAllTransactions(false)} />
  }

  if (showUserProfile) {
    return <UserProfile onBack={() => setShowUserProfile(false)} />
  }

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100">
      <header className="border-b border-gray-800">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center gap-4">
            <h1 className="text-xl font-semibold text-gray-300">{greeting}</h1>
            <div className="flex items-center gap-4">
              <Select value={timeFrame} onValueChange={setTimeFrame}>
                <SelectTrigger className="w-[180px] bg-gray-800 border-gray-700 hover:bg-gray-700 transition-colors">
                  <SelectValue placeholder="Select time frame" />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-700">
                  <SelectItem value="last7Days" className="hover:bg-gray-700 focus:bg-gray-700">Last 7 days</SelectItem>
                  <SelectItem value="1month" className="hover:bg-gray-700 focus:bg-gray-700">1 month</SelectItem>
                  <SelectItem value="3months" className="hover:bg-gray-700 focus:bg-gray-700">3 months</SelectItem>
                  <SelectItem value="6months" className="hover:bg-gray-700 focus:bg-gray-700">6 months</SelectItem>
                  <SelectItem value="thisFinancialYear" className="hover:bg-gray-700 focus:bg-gray-700">This financial year</SelectItem>
                  <SelectItem value="last1Year" className="hover:bg-gray-700 focus:bg-gray-700">Last 1 year</SelectItem>
                </SelectContent>
              </Select>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="relative bg-gray-800 border-gray-700 hover:bg-gray-700 transition-colors"
                  >
                    <User className="h-5 w-5" />
                    <span className="sr-only">User menu</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48 bg-gray-800 border-gray-700">
                  <DropdownMenuItem 
                    onClick={() => setShowUserProfile(true)}
                    className="hover:bg-gray-700 focus:bg-gray-700"
                  >
                    User Profile
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={handleLogout}
                    className="hover:bg-gray-700 focus:bg-gray-700"
                  >
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </header>

      {isEditing ? (
        <StatementEditor 
          statement={currentStatement} 
          onSave={handleSaveStatement} 
          onBack={() => setIsEditing(false)} 
          isNewStatement={currentStatement === undefined}
        />
      ) : (
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col lg:flex-row gap-8">
            <div className="lg:w-1/2 space-y-6">
              <StatementList
                statements={statements}
                onNewStatement={handleNewStatement}
                onEditStatement={handleEditStatement}
              />
            </div>
            <div className="lg:w-1/2 space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-gray-800 rounded-lg p-6">
                  <h3 className="text-lg font-semibold mb-2">Total Bill</h3>
                  <p className="text-3xl font-bold text-green-500">
                    ₹{totals.totalCredit.toLocaleString('en-IN', { 
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2 
                    })}
                  </p>
                </div>
                <div className="bg-gray-800 rounded-lg p-6">
                  <h3 className="text-lg font-semibold mb-2">Total Payment</h3>
                  <p className="text-3xl font-bold text-red-500">
                    ₹{totals.totalDebit.toLocaleString('en-IN', { 
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2 
                    })}
                  </p>
                </div>
              </div>

              <div className="bg-gray-800 rounded-lg p-6">
                <h3 className="text-xl font-semibold mb-4">Bill Payment Distribution</h3>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <defs>
                        <filter id="shadow">
                          <feDropShadow dx="0" dy="0" stdDeviation="3" floodOpacity="0.5" />
                        </filter>
                      </defs>
                      <Pie
                        data={pieChartData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        outerRadius={100}
                        innerRadius={60}
                        fill="#8884d8"
                        dataKey="value"
                        label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
                      >
                        {pieChartData.map((entry, index) => (
                          <Cell 
                            key={`cell-${index}`} 
                            fill={COLORS[index % COLORS.length]}
                            filter="url(#shadow)"
                          />
                        ))}
                      </Pie>
                      <Legend 
                        verticalAlign="bottom" 
                        height={36}
                        formatter={(value, entry, index) => (
                          <span style={{ color: COLORS[index % COLORS.length] }}>{value}</span>
                        )}
                      />
                      <Tooltip 
                        formatter={(value) => `${Number(value).toFixed(2)}%`}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-4 text-center">
                  <p className="text-sm text-gray-400">
                    Total Bill: ₹{totals.totalCredit.toLocaleString('en-IN', { 
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2 
                    })}
                  </p>
                  <p className="text-sm text-gray-400">
                    Total Payment: ₹{totals.totalDebit.toLocaleString('en-IN', { 
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2 
                    })}
                  </p>
                </div>
              </div>

              <div className="bg-gray-800 rounded-lg p-6">
                <h3 className="text-xl font-semibold mb-4">Monthly Trends</h3>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={monthlyTrends}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                      <XAxis 
                        dataKey="month" 
                        stroke="#9CA3AF"
                        tick={{ fill: '#9CA3AF' }}
                      />
                      <YAxis 
                        stroke="#9CA3AF"
                        tick={{ fill: '#9CA3AF' }}
                        tickFormatter={(value) => `₹${value.toLocaleString('en-IN', {
                          notation: 'compact',
                          maximumFractionDigits: 1
                        })}`}
                      />
                      <Tooltip
                        contentStyle={{ 
                          backgroundColor: '#1F2937', 
                          border: 'none',
                          borderRadius: '0.5rem',
                          padding: '0.75rem'
                        }}
                        formatter={(value) => [`₹${Number(value).toLocaleString('en-IN', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2
                        })}`, '']}
                      />
                      <Legend />
                      <Line 
                        type="monotone" 
                        dataKey="credit" 
                        stroke="#10B981" 
                        name="Bill" 
                        strokeWidth={2}
                        dot={{ fill: '#10B981' }}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="debit" 
                        stroke="#EF4444" 
                        name="Payment" 
                        strokeWidth={2}
                        dot={{ fill: '#EF4444' }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-gray-800 rounded-lg p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xl font-semibold">Recent Transactions</h3>
                  <Button 
                    onClick={() => setShowAllTransactions(true)} 
                    variant="outline" 
                    size="sm"
                  >
                    View All
                  </Button>
                </div>
                <div className="space-y-3">
                  {recentTransactions.map((transaction, index) => (
                    <div
                      key={`${transaction.id}-${index}`}
                      className="flex justify-between items-center p-3 hover:bg-gray-700 rounded-lg transition-colors"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="font-medium truncate">{transaction.statementTitle}</p>
                        <p className="text-sm text-gray-400 truncate">
                          {transaction.description} - {new Date(transaction.date).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex gap-4 ml-4">
                        {transaction.payment > 0 && (
                          <span className="text-red-500 whitespace-nowrap">
                            -₹{transaction.payment.toLocaleString('en-IN', {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2
                            })}
                          </span>
                        )}
                        {transaction.bill > 0 && (
                          <span className="text-green-500 whitespace-nowrap">
                            +₹{transaction.bill.toLocaleString('en-IN', {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2
                            })}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                  {recentTransactions.length === 0 && (
                    <p className="text-gray-400 text-center py-4">
                      No recent transactions
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function getTimeOfDay() {
  const hour = new Date().getHours()
  if (hour < 12) return 'morning'
  if (hour < 18) return 'afternoon'
  return 'evening'
}


console.log({
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
});
