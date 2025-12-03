import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { serviceId, payload, localApiUrl } = await request.json()

    // Forward the request to the local API server
    const response = await fetch(`${localApiUrl}/run`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'accept': 'application/json',
      },
      body: JSON.stringify(payload),
    })

    const data = await response.json()

    return NextResponse.json(data, { status: response.status })
  } catch (error) {
    console.error('Error proxying to local API:', error)
    return NextResponse.json(
      { error: 'Failed to connect to local API server' },
      { status: 500 }
    )
  }
}