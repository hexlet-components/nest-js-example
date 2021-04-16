import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Redirect,
  Render,
} from '@nestjs/common';
import { Article } from './article.model';

@Controller()
export class AppController {
  @Get()
  @Render('index')
  async index() {
    return {
      posts: await Article.find(),
    };
  }

  @Get('articles/:id')
  @Render('article')
  async post(@Param('id', ParseIntPipe) id: number) {
    const article = await Article.findOne({ id });
    console.log(article);
    return article;
  }

  @Get('create')
  @Render('create-article')
  getForm(): void {
    return;
  }

  @Post('articles')
  @Redirect('/', 301)
  async create(
    @Body() body: { title: string; content: string },
  ): Promise<void> {
    const article = new Article(body.title, body.content);
    await article.save();
  }
}
