"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpdatePortfolioDto = void 0;
const swagger_1 = require("@nestjs/swagger");
const create_portfolio_dto_1 = require("./create-portfolio.dto");
class UpdatePortfolioDto extends (0, swagger_1.PartialType)(create_portfolio_dto_1.CreatePortfolioDto) {
}
exports.UpdatePortfolioDto = UpdatePortfolioDto;
//# sourceMappingURL=update-portfolio.dto.js.map