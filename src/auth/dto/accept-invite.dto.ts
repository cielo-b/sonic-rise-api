import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsUUID, MinLength } from 'class-validator';

export class AcceptInviteDto {
  @ApiProperty()
  @IsUUID()
  token: string;

  @ApiProperty({ example: 'Alice Uwimana' })
  @IsString()
  name: string;

  @ApiProperty({ minLength: 8 })
  @IsString()
  @MinLength(8)
  password: string;
}
