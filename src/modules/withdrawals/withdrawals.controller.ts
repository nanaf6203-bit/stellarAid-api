import { Body, Controller, Post } from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../auth/types/user-role.enum';
import { RequestWithdrawalDto } from './dto/request-withdrawal.dto';
import { WithdrawalsService } from './withdrawals.service';

interface JwtUser {
  id: string;
  role: UserRole;
}

@Controller('withdrawals')
@Roles(UserRole.CREATOR)
export class WithdrawalsController {
  constructor(private readonly withdrawalsService: WithdrawalsService) {}

  @Post()
  requestWithdrawal(@CurrentUser() user: JwtUser, @Body() dto: RequestWithdrawalDto) {
    return this.withdrawalsService.requestWithdrawal(user.id, dto);
  }
}
