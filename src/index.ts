import * as lambda from '@aws-cdk/aws-lambda';
import {Construct} from '@aws-cdk/core';
import {Queue, QueueProps} from "@aws-cdk/aws-sqs";
import {SqsEventSource} from "@aws-cdk/aws-lambda-event-sources";
import {Bucket, EventType, NotificationKeyFilter} from "@aws-cdk/aws-s3";
import {SqsDestination} from "@aws-cdk/aws-s3-notifications";


export interface S3EventHandlerProps extends QueueProps {
  id: string;
  s3EventHandler: lambda.FunctionProps
}

export class S3EventHandlerConstruct extends Construct {

  private readonly bucket: Bucket;

  private readonly queue: Queue;

  private readonly queueHandler: lambda.Function;

  private readonly deadLetterQueue: Queue;

  // --
  public get bucketName(): string {
    return this.bucket.bucketName
  }

  public get bucketArn(): string {
    return this.bucket.bucketArn
  }

  public get queueUrl(): string {
    return this.queue.queueUrl;
  }

  public get s3EventHandlerName(): string {
    return this.queueHandler.functionName;
  }

  public get queueHandlerArn(): string {
    return this.queueHandler.functionArn
  }

  constructor(scope: Construct, props: S3EventHandlerProps) {
    super(scope, props.id);

    const {id} = props;

    // Bucket
    this.bucket = new Bucket(scope, `${id}Bucket`);

    // DL Q
    this.deadLetterQueue = new Queue(scope, 'DeadLetterQueue', {});

    // Main Q
    this.queue = new Queue(scope, 'Queue', {
      // Main Q name
      queueName: `${id}Queue`,
      // DL Q reference
      deadLetterQueue: {
        queue: this.deadLetterQueue,
        maxReceiveCount: 1,
        ...props.deadLetterQueue
      }
    });

    // Queue handler
    this.queueHandler = new lambda.Function(scope, 'QueueHandler', props.s3EventHandler);
    this.queueHandler.addEventSource(new SqsEventSource(this.queue));
  }

  public subscribe(event: EventType = EventType.OBJECT_CREATED_PUT, ...filters: NotificationKeyFilter[]) {
    this.bucket.addEventNotification(event, new SqsDestination(this.queue), ...filters);
  }

}
