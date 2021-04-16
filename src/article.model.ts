import { BaseEntity, Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class Article extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  title: string;

  @Column()
  content: string;

  constructor(title: string, content: string, id?: number) {
    super();
    this.id = id;
    this.title = title;
    this.content = content;
  }
}
