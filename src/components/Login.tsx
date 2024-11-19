import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function Login() {
  const { user, signInWithGoogle, loading } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (user && !loading) {
      navigate('/')
    }
  }, [user, loading, navigate])

  const handleGoogleSignIn = async () => {
    try {
      await signInWithGoogle()
      // Navigation will happen automatically due to the useEffect hook
    } catch (error) {
      console.error('Failed to sign in with Google:', error)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-gray-800 border-gray-700">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-3xl font-bold text-white">Statement Manager</CardTitle>
        </CardHeader>
        <CardContent>
          <Button
            onClick={handleGoogleSignIn}
            className="w-full bg-white text-gray-900 hover:bg-gray-100"
            variant="outline"
          >
            <img src="https://www.google.com/favicon.ico" alt="" className="w-5 h-5 mr-2" />
            Sign in with Google
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}