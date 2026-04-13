import "reflect-metadata";
import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { AppModule } from "./modules/app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { cors: true });

  app.setGlobalPrefix("api/v1");
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true
    })
  );

  const config = new DocumentBuilder()
    .setTitle("Prozessschmiede API")
    .setDescription("Enterprise BPMN Governance API")
    .setVersion("1.0.0")
    .build();

  try {
    SwaggerModule.setup("api/docs", app, SwaggerModule.createDocument(app, config));
  } catch (error) {
    console.warn("Swagger initialization skipped:", error);
  }

  await app.listen(process.env.PORT ?? 4000);
}

bootstrap();
