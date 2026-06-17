import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';
import { AuthService } from './src/auth/auth.service';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const authService = app.get(AuthService);
  
  try {
    const email = 'TEST_CASE@example.com';
    // 1. send invite
    await authService.sendInvite(email);
    console.log('Invite sent');
    
    // get token from db
    const { getRepository } = require('typeorm');
    const { User } = require('./src/database/entities');
    const userRepo = app.get('UserRepository');
    const user = await userRepo.findOne({ where: { email } });
    
    // 2. accept invite
    await authService.acceptInvite(user.inviteToken, 'Test User', 'MySecurePass123!');
    console.log('Invite accepted');
    
    // 3. validate user with same case
    const valid1 = await authService.validateUser(email, 'MySecurePass123!');
    console.log('Valid same case:', !!valid1);
    
    // 4. validate user with lower case
    const valid2 = await authService.validateUser('test_case@example.com', 'MySecurePass123!');
    console.log('Valid lower case:', !!valid2);
    
    await userRepo.remove(user);
  } catch (e) {
    console.error(e);
  }
  
  await app.close();
}
bootstrap();
