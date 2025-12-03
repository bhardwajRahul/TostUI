import { type NextRequest, NextResponse } from "next/server"

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
      const filename = `upload-${Date.now()}-${file.name}`
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
      const uploadFormData = new FormData()
      uploadFormData.append("file", file)

      const response = await fetch("https://upload.tost.ai/api/v1", {
        method: "POST",
        body: uploadFormData,
      })

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.status} ${response.statusText}`)
      }

      const url = await response.text()
      return NextResponse.json({ url })
    }
  } catch (error) {
    console.error("Upload error:", error)
    return NextResponse.json({ error: "Upload failed" }, { status: 500 })
  }
}