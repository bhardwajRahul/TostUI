import { type NextRequest, NextResponse } from "next/server"
import { randomUUID } from "crypto"

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get("file") as File
    const useLocal = formData.get("useLocal") === "true"
    const localUploadUrl = formData.get("localUploadUrl") as string || "http://localhost:9000"

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    if (useLocal) {
      // Upload to local MinIO
      const ext = file.name.split('.').pop()
      const filename = `${randomUUID()}.${ext}`
      const minioUrl = `${localUploadUrl}/tost/${filename}`

      const response = await fetch(minioUrl, {
        method: "PUT",
        body: file,
        headers: {
          "Content-Type": file.type || "application/octet-stream",
        },
      })

      if (!response.ok) {
        throw new Error(`MinIO upload failed: ${response.status} ${response.statusText}`)
      }

      const url = `${localUploadUrl}/tost/${filename}`
      return NextResponse.json({ url })
    } else {
      // Upload to TostAI
      const ext = file.name.split('.').pop()
      const filename = `${randomUUID()}.${ext}`
      const baseUrl = process.env.TOST_AI_S3_BASE_URL || "https://s3.tost.ai/tost"
      const IOUrl = `${baseUrl}/${filename}`

      const response = await fetch(IOUrl, {
        method: "PUT",
        body: file,
        headers: {
          "Content-Type": file.type || "application/octet-stream",
        },
      })

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.status} ${response.statusText}`)
      }

      const url = `${IOUrl}`
      return NextResponse.json({ url })
    }
  } catch (error) {
    console.error("Upload error:", error)
    return NextResponse.json({ error: "Upload failed" }, { status: 500 })
  }
}