import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { AdminService } from './admin.service';

@ApiTags('Public content')
@Controller('content')
export class PublicContentController {
  constructor(private readonly adminService: AdminService) {}

  @Get('banners')
  @ApiOperation({ summary: 'List currently active public site banners' })
  getActiveBanners() {
    return this.adminService.getPublicSiteBanners();
  }
}
