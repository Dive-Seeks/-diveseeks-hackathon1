import './tracing';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger, ValidationPipe } from '@nestjs/common';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { WinstonModule } from 'nest-winston';
import { winstonConfig } from './common/logger/winston.config';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const isWorker = process.env.AI_WORKER_MODE === 'worker';

  if (isWorker) {
    logger.log(
      '--- STARTING IN AI_WORKER_MODE=worker (no HTTP, processors only) ---',
    );
    const app = await NestFactory.createApplicationContext(AppModule, {
      logger: WinstonModule.createLogger(winstonConfig),
    });
    logger.log('AI Worker Context Initialized. BullMQ Processors active.');

    // Handle shutdown
    process.on('SIGTERM', async () => {
      await app.close();
      process.exit(0);
    });
    return;
  }

  const app = await NestFactory.create(AppModule, {
    logger: WinstonModule.createLogger(winstonConfig),
    bodyParser: true,
  });
  app.use(require('express').json({ limit: '10mb' }));
  app.use(require('express').urlencoded({ limit: '10mb', extended: true }));
  const configService = app.get(ConfigService);

  // Set global prefix for all routes
  app.setGlobalPrefix('api');

  // Enable CORS for frontend access
  app.enableCors({
    origin: true, // In production, replace with specific origins
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      // forbidNonWhitelisted removed — it rejects extra fields on nested plain objects
      // (e.g. visionTableSnapshot/stepSnapshot on VisionChatTurn history items)
      transform: true,
    }),
  );

  // Global filters
  app.useGlobalFilters(new AllExceptionsFilter());

  // Global interceptors
  app.useGlobalInterceptors(new TransformInterceptor());

  // Swagger Configuration
  const config = new DocumentBuilder()
    .setTitle('Dive POS API')
    .setDescription('The comprehensive API documentation for Dive POS platform')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  // Graceful shutdown so node --watch releases port 7771 quickly on restart
  app.enableShutdownHooks();

  const port = configService.get<number>('PORT') || 7771;
  await app.listen(port);

  logger.log(`Backend application is running on: http://localhost:${port}/api`);
  logger.log(
    `Swagger documentation available at: http://localhost:${port}/api/docs`,
  );
}
bootstrap().catch((err) => {
  new Logger('Bootstrap').error(err);
});
