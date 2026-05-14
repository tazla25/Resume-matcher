'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

export default function Dashboard() {
  const [user, setUser] = useState(null)
  const [jobDescription, setJobDescription] = useState('')
  const [files, setFiles] = useState([])
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [results, setResults] = useState(null)

  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.push('/')
      } else {
        setUser(session.user)
      }
    }
    checkUser()
  }, [router, supabase])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  const handleFileChange = (e) => {
    if (e.target.files) {
      setFiles(Array.from(e.target.files))
    }
  }

  const handleAnalyze = async () => {
    if (!jobDescription || files.length === 0) {
      alert('Please provide a job description and at least one resume PDF.')
      return
    }

    setIsAnalyzing(true)
    setResults(null)

    try {
      const formData = new FormData()
      formData.append('jobDescription', jobDescription)
      files.forEach(file => {
        formData.append('files', file)
      })

      const response = await fetch('/api/analyze', {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()

      if (response.ok) {
        setResults(data.results)
      } else {
        alert(data.error || 'An error occurred during analysis.')
      }
    } catch (error) {
      console.error(error)
      alert('Failed to analyze resumes.')
    } finally {
      setIsAnalyzing(false)
    }
  }

  if (!user) return <div className="min-h-screen flex items-center justify-center">Loading...</div>

  return (
    <div className="min-h-screen bg-blue-50 text-gray-900 pb-12">
      <header className="bg-blue-600 text-white p-4 shadow-md flex justify-between items-center">
        <h1 className="text-xl font-bold">Dashboard - Resume Matcher</h1>
        <div className="flex items-center gap-4">
          <span className="text-sm hidden md:inline">{user.email}</span>
          <button
            onClick={handleLogout}
            className="bg-blue-700 hover:bg-blue-800 px-4 py-2 rounded text-sm font-semibold transition"
          >
            Logout
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-4 md:p-6 space-y-8">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
          <h2 className="text-lg font-semibold mb-4 text-blue-800">Job Description</h2>
          <textarea
            value={jobDescription}
            onChange={(e) => setJobDescription(e.target.value)}
            placeholder="Paste the job description here..."
            className="w-full h-40 p-3 border rounded focus:ring-2 focus:ring-blue-500 focus:outline-none"
          ></textarea>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
          <h2 className="text-lg font-semibold mb-4 text-blue-800">Upload Resumes (PDF)</h2>
          <input
            type="file"
            accept="application/pdf"
            multiple
            onChange={handleFileChange}
            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
          />
          {files.length > 0 && (
            <div className="mt-4">
              <p className="text-sm text-gray-600 font-medium">Selected files:</p>
              <ul className="list-disc pl-5 mt-2 space-y-1">
                {files.map((file, i) => (
                  <li key={i} className="text-sm text-gray-500">{file.name}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="flex justify-end">
          <button
            onClick={handleAnalyze}
            disabled={isAnalyzing || !jobDescription || files.length === 0}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-bold py-3 px-8 rounded shadow-md transition"
          >
            {isAnalyzing ? 'Analyzing...' : 'Analyze Resumes'}
          </button>
        </div>

        {results && (
          <div className="mt-8 space-y-6">
            <h2 className="text-2xl font-bold text-blue-800 border-b pb-2">Analysis Results</h2>
            <div className="grid gap-6">
              {results.map((res, idx) => (
                <div key={idx} className="bg-white p-6 rounded-lg shadow-md border-l-4 border-blue-500">
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="text-xl font-bold text-gray-800">{res.name}</h3>
                    <div className="bg-blue-100 text-blue-800 font-bold px-4 py-2 rounded-full shadow-sm text-lg">
                      {res.score ?? 0}% Match
                    </div>
                  </div>

                  {res.error ? (
                    <p className="text-red-500">{res.error}</p>
                  ) : (
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <h4 className="font-semibold text-green-700 mb-2">Strengths (Found Keywords)</h4>
                        <ul className="list-disc pl-5 text-gray-600">
                          {res.strengths?.length > 0 ? (
                            res.strengths.map((s, i) => <li key={i}>{s}</li>)
                          ) : (
                            <li>None found</li>
                          )}
                        </ul>
                      </div>
                      <div>
                        <h4 className="font-semibold text-red-700 mb-2">Missing Skills</h4>
                        <ul className="list-disc pl-5 text-gray-600">
                          {res.missingSkills?.length > 0 ? (
                            res.missingSkills.map((s, i) => <li key={i}>{s}</li>)
                          ) : (
                            <li>None missing</li>
                          )}
                        </ul>
                      </div>
                      <div className="col-span-full mt-2 pt-4 border-t border-gray-100">
                        <span className="font-semibold text-gray-700 mr-2">ATS Compatible:</span>
                        {res.atsCompatible ? (
                          <span className="text-green-600 font-medium bg-green-50 px-2 py-1 rounded">Yes ✓</span>
                        ) : (
                          <span className="text-yellow-600 font-medium bg-yellow-50 px-2 py-1 rounded">Needs Improvement ⚠</span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
