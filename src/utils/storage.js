// Cloudflare R2 file upload utility
// R2 is S3-compatible — uses AWS SDK v3

// Install when ready: npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner

const uploadToR2 = async (buffer, filename, contentType) => {
  if (!process.env.R2_ACCESS_KEY || process.env.R2_ACCESS_KEY === 'your_r2_access_key') {
    // Dev mode — return a placeholder URL
    console.log('⚠️  R2 not configured — using placeholder image URL')
    return `https://placehold.co/400x300/E8E6F0/6B6880?text=${encodeURIComponent(filename)}`
  }
  try {
    const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3')
    const client = new S3Client({
      region:   'auto',
      endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId:     process.env.R2_ACCESS_KEY,
        secretAccessKey: process.env.R2_SECRET_KEY,
      },
    })
    const key = `products/${Date.now()}_${filename}`
    await client.send(new PutObjectCommand({
      Bucket:      process.env.R2_BUCKET,
      Key:         key,
      Body:        buffer,
      ContentType: contentType,
    }))
    return `${process.env.R2_PUBLIC_URL}/${key}`
  } catch (e) {
    throw new Error('Upload failed: ' + e.message)
  }
}

module.exports = { uploadToR2 }
