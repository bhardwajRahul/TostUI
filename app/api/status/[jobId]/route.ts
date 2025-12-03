import { NextRequest, NextResponse } from 'next/server'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const { jobId } = await params
    const { localApiUrl } = await request.json()

    // Forward the request to the local API server using POST (as per API spec)
    const response = await fetch(`${localApiUrl}/status/${jobId}`, {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: '', // Empty body as per curl example
    })

    const data = await response.json()

    return NextResponse.json(data, { status: response.status })
  } catch (error) {
    console.error('Error proxying status request to local API:', error)
    return NextResponse.json(
      { error: 'Failed to connect to local API server' },
      { status: 500 }
    )
  }
}