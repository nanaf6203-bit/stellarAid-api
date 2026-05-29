import {
  Controller,
  Post,
  Body,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Keypair, StrKey } from '@stellar/stellar-sdk';

interface VerifyDto {
  walletAddress: string;
  signedChallenge: string;
  challenge: string;
}

interface AuthResponse {
  accessToken: string;
  tokenType: 'Bearer';
}

/**
 * POST /auth/verify
 *
 * Accepts { walletAddress, signedChallenge, challenge }, verifies the
 * Ed25519 signature using stellar-sdk, and returns a signed JWT on success.
 */
@Controller('auth')
export class AuthVerifyController {
  constructor(private readonly jwt: JwtService) {}

  @Post('verify')
  verify(@Body() dto: VerifyDto): AuthResponse {
    const { walletAddress, signedChallenge, challenge } = dto;

    if (!walletAddress || !StrKey.isValidEd25519PublicKey(walletAddress)) {
      throw new BadRequestException('Invalid wallet address');
    }
    if (!signedChallenge || !challenge) {
      throw new BadRequestException('Missing signedChallenge or challenge');
    }

    const keypair = Keypair.fromPublicKey(walletAddress);
    const messageBytes = Buffer.from(challenge, 'utf8');
    const signatureBytes = Buffer.from(signedChallenge, 'base64');

    const valid = keypair.verify(messageBytes, signatureBytes);
    if (!valid) {
      throw new UnauthorizedException('Signature verification failed');
    }

    const accessToken = this.jwt.sign({ sub: walletAddress, walletAddress });
    return { accessToken, tokenType: 'Bearer' };
  }
}