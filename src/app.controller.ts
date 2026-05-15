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
import { ArticleService } from './article.service';

@Controller()
export class AppController {
  constructor(private readonly articleService: ArticleService) {}

  @Get()
  @Render('index')
  async index() {
    return {
      posts: await this.articleService.findAll(),
    };
  }

  @Get('articles/:id')
  @Render('article')
  async getById(@Param('id', ParseIntPipe) id: number) {
    const article = await this.articleService.findById(id);
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
    await this.articleService.create(body.title, body.content);
  }
}
