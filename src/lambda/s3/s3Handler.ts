import { Handler } from "aws-lambda";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const s3Client = new S3Client({
  region: process.env.AWS_REGION || "us-east-1",
});
const BUCKET = process.env.BUCKET_NAME!;

function sanitizeFileName(name: string) {
  // allow letters, numbers, dots, underscores, hyphens
  if (!/^[\w.\-]+$/.test(name)) return null;
  return name;
}

export const importProducts: Handler = async (event, context) => {
  try {
    const qs = event.queryStringParameters || {};
    const fileName = qs.name || qs.fileName || qs.filename || qs.file;

    if (!fileName) {
      return {
        statusCode: 400,
        headers: { "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify({ message: "Missing fileName query parameter" }),
      };
    }

    const sanitized = sanitizeFileName(fileName);
    if (!sanitized) {
      return {
        statusCode: 400,
        headers: { "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify({ message: "Invalid fileName" }),
      };
    }

    const key = `uploaded/${sanitized}`;
    const putCommand = new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      ContentType: "text/csv",
    });

    // signed URL for PUT (client will use PUT to upload)
    const expiresInSeconds = 60 * 5; // 5 minutes
    const signedUrl = await getSignedUrl(s3Client, putCommand, {
      expiresIn: expiresInSeconds,
    });

    return {
      statusCode: 200,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ url: signedUrl, key }),
    };
  } catch (err) {
    console.error("Error creating signed URL:", err);
    return {
      statusCode: 500,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({
        message: "Internal error creating signed URL",
        error: String(err),
      }),
    };
  }
};
