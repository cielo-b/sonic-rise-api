"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const app_module_1 = require("./src/app.module");
const auth_service_1 = require("./src/auth/auth.service");
async function bootstrap() {
    const app = await core_1.NestFactory.createApplicationContext(app_module_1.AppModule);
    const authService = app.get(auth_service_1.AuthService);
    try {
        const email = 'TEST_CASE@example.com';
        await authService.sendInvite(email);
        console.log('Invite sent');
        const { getRepository } = require('typeorm');
        const { User } = require('./src/database/entities');
        const userRepo = app.get('UserRepository');
        const user = await userRepo.findOne({ where: { email } });
        await authService.acceptInvite(user.inviteToken, 'Test User', 'MySecurePass123!');
        console.log('Invite accepted');
        const valid1 = await authService.validateUser(email, 'MySecurePass123!');
        console.log('Valid same case:', !!valid1);
        const valid2 = await authService.validateUser('test_case@example.com', 'MySecurePass123!');
        console.log('Valid lower case:', !!valid2);
        await userRepo.remove(user);
    }
    catch (e) {
        console.error(e);
    }
    await app.close();
}
bootstrap();
//# sourceMappingURL=test-login.js.map