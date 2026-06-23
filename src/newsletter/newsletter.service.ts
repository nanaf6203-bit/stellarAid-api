
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSubscriberDto } from './dto/create-subscriber.dto';

@Injectable()
export class NewsletterService {
  constructor(private readonly prisma: PrismaService) {}

  async subscribe(createSubscriberDto: CreateSubscriberDto) {
    const { email } = createSubscriberDto;

    const existingSubscriber = await this.prisma.newsletter.findUnique({
      where: { email },
    });

    if (existingSubscriber) {
      throw new Error('Email already subscribed');
    }

    const newSubscriber = await this.prisma.newsletter.create({
      data: { email },
    });

    // TODO: Send confirmation email

    return newSubscriber;
  }
}