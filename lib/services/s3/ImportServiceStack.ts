import * as s3 from "aws-cdk-lib/aws-s3";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as s3deploy from "aws-cdk-lib/aws-s3-deployment";
import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import path from "path";

export class ImportServiceStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const bucket = new s3.Bucket(this, "StoreBucket", {
      versioned: true,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    // Create the "uploaded/" folder
    new s3deploy.BucketDeployment(this, "CreateUploadedFolder", {
      //   sources: [s3deploy.Source.asset(path.join(__dirname, "assets"))], // Use local assets directory
      sources: [s3deploy.Source.data("uploaded", " ")],
      destinationBucket: bucket,
    });

    const s3ImportLambda = new lambda.Function(this, "S3StoreLambda", {
      runtime: lambda.Runtime.NODEJS_20_X,
      memorySize: 1024,
      timeout: cdk.Duration.seconds(5),
      handler: "s3Handler.importProducts",
      code: lambda.Code.fromAsset(
        path.join(__dirname, "../../../src/lambda/s3")
      ),
      environment: {
        BUCKET_NAME: bucket.bucketName,
      },
    });

    // Grant access
    bucket.grantReadWrite(s3ImportLambda);
  }
}
