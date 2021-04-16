import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { Article } from './article.model';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: 'localhost',
      port: 5435,
      username: 'test',
      password: 'test',
      database: 'test',
      logging: true,
      synchronize: true,
      entities: [Article],
    }),
  ],
  controllers: [AppController],
})
export class AppModule {}
