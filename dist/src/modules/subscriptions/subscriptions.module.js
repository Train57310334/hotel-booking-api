"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SubscriptionsModule = void 0;
const common_1 = require("@nestjs/common");
const subscriptions_controller_1 = require("./subscriptions.controller");
const subscriptions_service_1 = require("./subscriptions.service");
const plans_controller_1 = require("./plans.controller");
const plans_service_1 = require("./plans.service");
const stripe_service_1 = require("./stripe.service");
const prisma_module_1 = require("../../common/prisma/prisma.module");
const auth_module_1 = require("../auth/auth.module");
let SubscriptionsModule = class SubscriptionsModule {
};
exports.SubscriptionsModule = SubscriptionsModule;
exports.SubscriptionsModule = SubscriptionsModule = __decorate([
    (0, common_1.Module)({
        imports: [prisma_module_1.PrismaModule, auth_module_1.AuthModule],
        controllers: [subscriptions_controller_1.SubscriptionsController, plans_controller_1.PlansController],
        providers: [subscriptions_service_1.SubscriptionsService, plans_service_1.PlansService, stripe_service_1.StripeService],
    })
], SubscriptionsModule);
//# sourceMappingURL=subscriptions.module.js.map