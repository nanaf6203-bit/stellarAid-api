
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSubscriberDto } from './dto/create-subscriber.dto';
import * as crypto from 'crypto';

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

    const token = crypto.randomBytes(32).toString('hex');

    const newSubscriber = await this.prisma.newsletter.create({
      data: { email, token },
    });

    // TODO: Send confirmation email

    return newSubscriber;
  }

  async unsubscribe(token: string) {
    const subscriber = await this.prisma.newsletter.findFirst({
      where: { token },
    });

    if (!subscriber) {
      throw new Error('Invalid token');
    }

    await this.prisma.newsletter.update({
      where: { id: subscriber.id },
      data: { unsubscribedAt: new Date() },
    });

    return { message: 'Successfully unsubscribed' };
  }
}