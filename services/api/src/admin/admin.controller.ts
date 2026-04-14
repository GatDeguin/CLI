import { Body, Controller, Patch } from '@nestjs/common';
import { Roles } from '../common/auth/roles.decorator';
import { AdminService } from './admin.service';
import { UpdateUserRoleDto } from './dto/admin.dto';

@Controller('admin')
@Roles('ADMIN')
export class AdminController {
  constructor(private readonly service: AdminService) {}
  @Patch('users/role') updateRole(@Body() dto: UpdateUserRoleDto) { return this.service.updateRole(dto); }
}
