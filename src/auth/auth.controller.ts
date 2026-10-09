import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { IsString } from 'class-validator';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { InviteDto } from './dto/invite.dto';
import { AcceptInviteDto } from './dto/accept-invite.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import {
  PermissionsGuard,
  RequirePermissions,
} from '../common/guards/permissions.guard';
import { Permission } from '../common/permissions';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import {
  RequestStudioId,
  StudioId,
} from '../common/decorators/studio.decorator';
import type { User } from '../database/entities';

class Verify2FADto {
  @IsString() code: string;
}
class Login2FADto {
  @IsString() tempToken: string;
  @IsString() code: string;
}

type Req = { ip: string; headers: Record<string, string> };

/** Brute-force protection on credential endpoints: 10 attempts per minute per IP. */
const AUTH_LIMIT = { default: { limit: 10, ttl: 60_000 } };

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('register')
  @Throttle(AUTH_LIMIT)
  @ApiOperation({ summary: 'Create a client account in this studio' })
  register(
    @StudioId() studioId: string,
    @Body() dto: RegisterDto,
    @Request() req: Req,
  ) {
    return this.authService.register(
      studioId,
      dto,
      req.ip,
      req.headers['user-agent'],
    );
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Throttle(AUTH_LIMIT)
  @ApiOperation({
    summary: 'Sign in (studio account, or platform admin when no studio)',
  })
  login(
    @RequestStudioId() studioId: string | null,
    @Body() dto: LoginDto,
    @Request() req: Req,
  ) {
    return this.authService.login(
      studioId,
      dto.email,
      dto.password,
      req.ip,
      req.headers['user-agent'],
    );
  }

  @Post('platform/login')
  @HttpCode(HttpStatus.OK)
  @Throttle(AUTH_LIMIT)
  @ApiOperation({ summary: 'Sign in as a platform admin (ignores the studio)' })
  platformLogin(@Body() dto: LoginDto, @Request() req: Req) {
    return this.authService.login(
      null,
      dto.email,
      dto.password,
      req.ip,
      req.headers['user-agent'],
    );
  }

  @Post('login/2fa')
  @HttpCode(HttpStatus.OK)
  @Throttle(AUTH_LIMIT)
  @ApiOperation({ summary: 'Complete sign-in with an authenticator code' })
  loginWith2FA(@Body() dto: Login2FADto, @Request() req: Req) {
    return this.authService.loginWith2FA(
      dto.tempToken,
      dto.code,
      req.ip,
      req.headers['user-agent'],
    );
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  refresh(@CurrentUser() user: User, @Request() req: Req) {
    return this.authService.refresh(user, req.ip, req.headers['user-agent']);
  }

  @Post('invite')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(Permission.STAFF_MANAGE)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Invite a team member' })
  sendInvite(
    @StudioId() studioId: string,
    @CurrentUser() user: User,
    @Body() dto: InviteDto,
  ) {
    return this.authService.sendInvite(studioId, user, dto);
  }

  @Get('invite/:token')
  @ApiOperation({ summary: 'Who an invitation is for' })
  describeInvite(@Param('token') token: string) {
    return this.authService.describeInvite(token);
  }

  @Post('accept-invite')
  @HttpCode(HttpStatus.OK)
  @Throttle(AUTH_LIMIT)
  acceptInvite(@Body() dto: AcceptInviteDto) {
    return this.authService.acceptInvite(dto.token, dto.name, dto.password);
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @Throttle(AUTH_LIMIT)
  forgotPassword(
    @RequestStudioId() studioId: string | null,
    @Body() dto: ForgotPasswordDto,
  ) {
    return this.authService.forgotPassword(studioId, dto.email);
  }

  @Post('verify-otp')
  @HttpCode(HttpStatus.OK)
  @Throttle(AUTH_LIMIT)
  verifyOtp(
    @RequestStudioId() studioId: string | null,
    @Body() dto: VerifyOtpDto,
  ) {
    return this.authService.verifyOtp(studioId, dto.email, dto.otp);
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @Throttle(AUTH_LIMIT)
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto.resetToken, dto.password);
  }

  // ─── 2FA ────────────────────────────────────────────────────────────────────
  @Post('2fa/setup')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  setup2FA(@CurrentUser() user: User) {
    return this.authService.generate2FASecret(user.id);
  }

  @Post('2fa/enable')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  enable2FA(@CurrentUser() user: User, @Body() dto: Verify2FADto) {
    return this.authService.enable2FA(user.id, dto.code);
  }

  @Post('2fa/disable')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  disable2FA(@CurrentUser() user: User, @Body() dto: Verify2FADto) {
    return this.authService.disable2FA(user.id, dto.code);
  }

  // ─── Sessions ───────────────────────────────────────────────────────────────
  @Get('sessions')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  getSessions(@CurrentUser() user: User) {
    return this.authService.getActiveSessions(user.id);
  }

  @Delete('sessions/:id')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  revokeSession(@CurrentUser() user: User, @Param('id') sessionId: string) {
    return this.authService.revokeSession(user.id, sessionId);
  }

  @Delete('sessions')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  revokeAllSessions(@CurrentUser() user: User) {
    return this.authService.revokeAllSessions(user.id);
  }

  @Get('login-history')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  getLoginHistory(@CurrentUser() user: User) {
    return this.authService.getLoginHistory(user.id);
  }
}
