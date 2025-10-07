import * as s3 from "aws-cdk-lib/aws-s3";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as s3deploy from "aws-cdk-lib/aws-s3-deployment";
import * as cdk from "aws-cdk-lib";
import * as iam from "aws-cdk-lib/aws-iam";
import * as apigateway from "aws-cdk-lib/aws-apigateway";
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

    bucket.addCorsRule({
      allowedOrigins: [
        "https://dz4s6rslc2nya.cloudfront.net",
        "http://localhost:3000",
      ],
      allowedMethods: [
        s3.HttpMethods.PUT,
        s3.HttpMethods.POST,
        s3.HttpMethods.GET,
      ],
      allowedHeaders: ["*"],
    });

    // Create the "uploaded/" folder
    new s3deploy.BucketDeployment(this, "CreateUploadedFolder", {
      //   sources: [s3deploy.Source.asset(path.join(__dirname, "assets"))], // Use local assets directory
      sources: [s3deploy.Source.data("uploaded/.keep", " ")],
      destinationBucket: bucket,
    });

    // 1) Lambda
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

    // Grant lambda access to bucket
    bucket.grantReadWrite(s3ImportLambda);

    // 2) Grant the lambda permission to create signed URLs (needs PutObject for client uploads)
    s3ImportLambda.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ["s3:PutObject", "s3:PutObjectAcl", "s3:GetObject"],
        resources: [bucket.arnForObjects("uploaded/*")],
      })
    );

    // 3) API Gateway: create /import GET
    const api = new apigateway.RestApi(this, "ImportApi", {
      restApiName: "Import Service",
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
      },
    });

    const importResource = api.root.addResource("import");
    importResource.addMethod(
      "GET",
      new apigateway.LambdaIntegration(s3ImportLambda)
    );
    importResource.addMethod(
      "PUT",
      new apigateway.LambdaIntegration(s3ImportLambda)
    );

    // 4) Output the invoke URL for frontend
    new cdk.CfnOutput(this, "ImportApiUrl", {
      value: `${api.url}import`,
    });
  }
}
