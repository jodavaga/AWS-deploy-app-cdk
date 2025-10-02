import { Stack } from "aws-cdk-lib";
import { AttributeType, TablePropsV2, TableV2 } from "aws-cdk-lib/aws-dynamodb";

interface BaseDynamoDbTableProps extends TablePropsV2 {
  tableName?: string;
}

export class DynamoDbBaseTable extends TableV2 {
  constructor(scope: Stack, id: string, props: BaseDynamoDbTableProps) {
    super(scope, id, {
      ...props,
      partitionKey: {
        name: props.partitionKey?.name || "defaultPartitionKey",
        type: AttributeType.STRING,
      },
      sortKey: props.sortKey
        ? {
            name: props.sortKey?.name || "defaultSortKey",
            type: props.sortKey?.type || AttributeType.NUMBER,
          }
        : undefined,
    });
  }
}
