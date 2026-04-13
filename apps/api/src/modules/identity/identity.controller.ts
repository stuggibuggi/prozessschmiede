import { Controller, Get, Inject } from "@nestjs/common";
import { IdentityService } from "./identity.service";

@Controller("auth")
export class IdentityController {
  constructor(@Inject(IdentityService) private readonly identityService: IdentityService) {}

  @Get("profile")
  getProfile() {
    return this.identityService.getProfile();
  }

  @Get("authorization")
  getAuthorization() {
    return this.identityService.getAuthorizationMatrix();
  }
}
