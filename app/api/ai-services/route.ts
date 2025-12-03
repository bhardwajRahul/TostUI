import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const url = process.env.TOST_AI_SERVICES_URL
    if (!url) {
      return NextResponse.json({ error: 'TOST_AI_SERVICES_URL not configured' }, { status: 500 })
    }
    const response = await fetch(url)
    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Failed to fetch AI services:', error)
    return NextResponse.json({ error: 'Failed to fetch AI services' }, { status: 500 })
  }
}