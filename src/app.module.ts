import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { Article } from './article.model';
import { ArticleService } from './article.service';

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
    TypeOrmModule.forFeature([Article]),
  ],
  controllers: [AppController],
  providers: [ArticleService],
})
export class AppModule {}
