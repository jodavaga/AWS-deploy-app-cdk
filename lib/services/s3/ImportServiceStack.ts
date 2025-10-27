import * as s3 from "aws-cdk-lib/aws-s3";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as s3deploy from "aws-cdk-lib/aws-s3-deployment";
import * as cdk from "aws-cdk-lib";
import * as iam from "aws-cdk-lib/aws-iam";
import * as apigateway from "aws-cdk-lib/aws-apigateway";
import * as s3n from "aws-cdk-lib/aws-s3-notifications";
import { Construct } from "constructs";
import path from "path";
import { Queue } from "aws-cdk-lib/aws-sqs";

interface ImportServiceStackProps extends cdk.StackProps {
  catalogItemsQueue: Queue;
}

export class ImportServiceStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: ImportServiceStackProps) {
    super(scope, id, props);

    // const authorizerArn = cdk.Fn.importValue("BasicAuthorizerLambdaArn");

    const bucket = new s3.Bucket(this, "StoreBucket", {
      versioned: true,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    bucket.addCorsRule({
      allowedOrigins: ["*"],
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

    const importFileParserLambda = new lambda.Function(
      this,
      "ImportFileParserLambda",
      {
        runtime: lambda.Runtime.NODEJS_20_X,
        memorySize: 1024,
        timeout: cdk.Duration.seconds(10),
        handler: "s3Handler.importFileParser",
        code: lambda.Code.fromAsset(
          path.join(__dirname, "../../../src/lambda/s3")
        ),
        environment: {
          BUCKET_NAME: bucket.bucketName,
          CATALOG_ITEMS_QUEUE_URL: props.catalogItemsQueue.queueUrl,
        },
      }
    );

    // Grant read access to S3
    bucket.grantReadWrite(importFileParserLambda);

    // Grant SQS access to send messages
    props.catalogItemsQueue.grantSendMessages(importFileParserLambda);

    // Grant permissions to write to the "parsed/" folder
    importFileParserLambda.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ["s3:PutObject"],
        resources: [`${bucket.bucketArn}/parsed/*`], // Allow PutObject in parsed folder
      })
    );

    // Create the basicAuthorizer Lambda directly in this stack
    const basicAuthorizerLambda = new lambda.Function(
      this,
      "BasicAuthorizerLambda",
      {
        runtime: lambda.Runtime.NODEJS_20_X,
        handler: "basicAuthorizer.basicAuthorizer",
        code: lambda.Code.fromAsset(
          path.join(__dirname, "../../../src/lambda")
        ),
        environment: {
          jodavaga: process.env.jodavaga ?? "TEST_PASSWORD",
        },
      }
    );

    // Create authorizer
    const tokenAuthorizer = new apigateway.TokenAuthorizer(
      this,
      "ImportTokenAuthorizer",
      {
        handler: basicAuthorizerLambda,
      }
    );

    // 3) API Gateway: create /import GET
    const api = new apigateway.RestApi(this, "ImportApi", {
      restApiName: "Import Service",
      defaultMethodOptions: {
        authorizationType: apigateway.AuthorizationType.CUSTOM,
        authorizer: tokenAuthorizer,
      },
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
        allowHeaders: ["Authorization"], // required for Basic Auth
      },
    });

    const importResource = api.root.addResource("import");
    importResource.addMethod(
      "GET",
      new apigateway.LambdaIntegration(s3ImportLambda),
      {
        authorizer: tokenAuthorizer,
        authorizationType: apigateway.AuthorizationType.CUSTOM,
      }
    );
    importResource.addMethod(
      "PUT",
      new apigateway.LambdaIntegration(s3ImportLambda),
      {
        authorizer: tokenAuthorizer,
        authorizationType: apigateway.AuthorizationType.CUSTOM,
      }
    );

    bucket.addEventNotification(
      s3.EventType.OBJECT_CREATED,
      new s3n.LambdaDestination(importFileParserLambda),
      { prefix: "uploaded/" }
    );
  }
}
