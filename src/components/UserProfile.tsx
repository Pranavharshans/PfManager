import React from 'react'
import { useAuth } from '../contexts/AuthContext'
import { Button } from "@/components/ui/button"
import { ArrowLeft } from 'lucide-react'

interface Props {
  onBack: () => void
}

export default function UserProfile({ onBack }: Props) {
  const { user } = useAuth()

  if (!user) {
    return <div>No user logged in</div>
  }

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 p-4">
      <div className="max-w-2xl mx-auto">
        <button
          onClick={onBack}
          className="mb-6 flex items-center text-gray-400 hover:text-white"
        >
          <ArrowLeft className="mr-2" size={20} />
          Back to Dashboard
        </button>

        <h1 className="text-3xl font-bold mb-6">User Profile</h1>

        <div className="bg-gray-800 rounded-lg p-6 space-y-4">
          <div>
            <h2 className="text-xl font-semibold mb-2">Name</h2>
            <p>{user.displayName || 'Not set'}</p>
          </div>

          <div>
            <h2 className="text-xl font-semibold mb-2">Email</h2>
            <p>{user.email}</p>
          </div>

          <div>
            <h2 className="text-xl font-semibold mb-2">Account Created</h2>
            <p>{user.metadata.creationTime ? new Date(user.metadata.creationTime).toLocaleDateString() : 'Unknown'}</p>
          </div>

          <div>
            <h2 className="text-xl font-semibold mb-2">Last Sign In</h2>
            <p>{user.metadata.lastSignInTime ? new Date(user.metadata.lastSignInTime).toLocaleDateString() : 'Unknown'}</p>
          </div>
        </div>

        <div className="mt-6">
          <Button variant="outline" onClick={onBack}>
            Back to Dashboard
          </Button>
        </div>
      </div>
    </div>
  )
}