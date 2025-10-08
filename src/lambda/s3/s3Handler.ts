import { Handler, S3Event } from "aws-lambda";
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  CopyObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { Readable } from "stream";
import csvParser from "csv-parser";

const s3Client = new S3Client({
  region: process.env.AWS_REGION || "us-east-1",
});
const BUCKET = process.env.BUCKET_NAME!;

function sanitizeFileName(name: string) {
  // allow letters, numbers, dots, underscores, hyphens
  if (!/^[\w.\-]+$/.test(name)) return null;
  return name;
}

const headers = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "GET,PUT,OPTIONS",
};

export const importProducts: Handler = async (event, context) => {
  try {
    const qs = event.queryStringParameters || {};
    const fileName = qs.name || qs.fileName || qs.filename || qs.file;

    if (!fileName) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ message: "Missing fileName query parameter" }),
      };
    }

    const sanitized = sanitizeFileName(fileName);
    if (!sanitized) {
      return {
        statusCode: 400,
        headers,
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
      headers,
      body: JSON.stringify({ url: signedUrl, key }),
    };
  } catch (err) {
    console.error("Error creating signed URL:", err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        message: "Internal error creating signed URL",
        error: String(err),
      }),
    };
  }
};

export const importFileParser: Handler = async (event: S3Event) => {
  try {
    for (const record of event.Records) {
      const bucket = record.s3.bucket.name;
      const key = decodeURIComponent(record.s3.object.key.replace(/\+/g, " "));

      console.log(`Processing file: ${key} from bucket: ${bucket}`);

      const command = new GetObjectCommand({ Bucket: bucket, Key: key });
      const response = await s3Client.send(command);

      const stream = response.Body as Readable;

      await new Promise((resolve, reject) => {
        stream
          .pipe(csvParser())
          .on("data", (data) => {
            console.log("Parsed record:", data);
          })
          .on("end", () => {
            console.log("File parsed successfully");
            resolve(null);
          })
          .on("error", (err) => {
            console.error("Error parsing file:", err);
            reject(err);
          });
      });

      const newKey = key.replace("uploaded/", "parsed/");

      // Copy to parsed/
      await s3Client.send(
        new CopyObjectCommand({
          Bucket: bucket,
          CopySource: `${bucket}/${key}`,
          Key: newKey,
        })
      );
      console.log(`Copied file to ${newKey}`);

      // Delete original
      await s3Client.send(
        new DeleteObjectCommand({ Bucket: bucket, Key: key })
      );
      console.log(`Deleted original file: ${key}`);
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify("File parsed and moved succesfully"),
    };
  } catch (err) {
    console.error("Error in importFileParser:", err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify(err),
    };
  }
};
