import { NextResponse } from 'next/server'
import { PDFParse } from 'pdf-parse'

// Simple keyword extractor to simulate AI analysis
function extractKeywords(text) {
  // Very basic word extraction (lowercase, words > 3 chars, remove common stop words)
  const words = text.toLowerCase().match(/\b[a-z]{4,}\b/g) || []
  const stopWords = new Set(['this', 'that', 'with', 'from', 'your', 'have', 'more', 'will', 'about'])

  const keywords = new Set()
  words.forEach(w => {
    if (!stopWords.has(w)) keywords.add(w)
  })

  return Array.from(keywords)
}

function analyzeResume(resumeText, jdText) {
  const jdKeywords = extractKeywords(jdText)
  const resumeTextLower = resumeText.toLowerCase()

  let matchCount = 0
  const matchedSkills = []
  const missingSkills = []

  jdKeywords.forEach(kw => {
    if (resumeTextLower.includes(kw)) {
      matchCount++
      matchedSkills.push(kw)
    } else {
      missingSkills.push(kw)
    }
  })

  // Calculate score 0-100
  let score = jdKeywords.length > 0 ? Math.round((matchCount / jdKeywords.length) * 100) : 0

  // Basic ATS check: length and formatting clues (stubbed)
  const atsCompatible = resumeText.length > 200 && !resumeText.includes('') // Simple heuristic

  return {
    score,
    strengths: matchedSkills.slice(0, 5), // Top 5
    missingSkills: missingSkills.slice(0, 5), // Top 5 missing
    atsCompatible
  }
}

export async function POST(request) {
  try {
    const formData = await request.formData()
    const jobDescription = formData.get('jobDescription')

    // Get all files from formData
    const files = []
    for (const [key, value] of formData.entries()) {
      if (key === 'files' && value instanceof Blob) {
        files.push(value)
      }
    }

    if (!jobDescription) {
      return NextResponse.json({ error: 'Job description is required' }, { status: 400 })
    }
    if (files.length === 0) {
      return NextResponse.json({ error: 'At least one resume PDF is required' }, { status: 400 })
    }

    const results = []

    for (const file of files) {
      try {
        const buffer = Buffer.from(await file.arrayBuffer())
        const parser = new PDFParse(buffer)
        const data = await parser.getText()

        const analysis = analyzeResume(data.text, jobDescription)

        results.push({
          name: file.name,
          ...analysis
        })
      } catch (err) {
        console.error(`Failed to parse PDF ${file.name}:`, err)
        results.push({
          name: file.name,
          error: 'Failed to process PDF'
        })
      }
    }

    // Sort results by score descending
    results.sort((a, b) => (b.score || 0) - (a.score || 0))

    return NextResponse.json({ results }, { status: 200 })

  } catch (error) {
    console.error('Analysis error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
