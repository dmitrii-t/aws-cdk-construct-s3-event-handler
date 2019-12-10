### Neat'n'sweet construct to handle S3 changes like file uploads 

Run tests with the following command 

```bash
npm run test
```

Use the builder to define the resource and a handler for that resource

```typescript
class S3EventHandlerConstructTest extends Stack {
    constructor(scope: App, id: string) {
      super(scope, id);

      const construct = new S3EventHandlerConstruct(this, {id: 'S3EventHandlerConstructTest', s3EventHandler});

      // Creates subscription for auditable path
      construct.subscribe(EventType.OBJECT_CREATED_PUT, {prefix: auditablePath});

      // Outputs
      new CfnOutput(this, 'S3EventHandlerName', {value: construct.s3EventHandlerName});
      new CfnOutput(this, 'BucketArn', {value: construct.bucketArn});
    }
  }
```
