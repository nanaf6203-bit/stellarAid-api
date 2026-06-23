
import { Controller, Post, Body } from '@nestjs/common';
import { NewsletterService } from './newsletter.service';
import { CreateSubscriberDto } from './dto/create-subscriber.dto';

@Controller('newsletter')
export class NewsletterController {
  constructor(private readonly newsletterService: NewsletterService) {}

  @Post('subscribe')
  async subscribe(@Body() createSubscriberDto: CreateSubscriberDto) {
    return this.newsletterService.subscribe(createSubscriberDto);
  }
}