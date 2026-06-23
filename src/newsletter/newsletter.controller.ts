
import { Controller, Post, Body, Get, Query } from '@nestjs/common';
import { NewsletterService } from './newsletter.service';
import { CreateSubscriberDto } from './dto/create-subscriber.dto';

@Controller('newsletter')
export class NewsletterController {
  constructor(private readonly newsletterService: NewsletterService) {}

  @Post('subscribe')
  async subscribe(@Body() createSubscriberDto: CreateSubscriberDto) {
    return this.newsletterService.subscribe(createSubscriberDto);
  }

  @Get('unsubscribe')
  async unsubscribe(@Query('token') token: string) {
    return this.newsletterService.unsubscribe(token);
  }
}