import { Injectable } from '@nestjs/common';
import { UpdateUserRoleDto } from './dto/admin.dto';
import { AdminRepository } from './admin.repository';

@Injectable()
export class AdminService {
  constructor(private readonly repo: AdminRepository) {}
  updateRole(dto: UpdateUserRoleDto) {
    return this.repo.prisma.appUser.update({ where: { id: dto.userId }, data: { role: dto.role } });
  }
}
