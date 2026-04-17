/**
 * 扩展示例控制器
 * 展示标准的CRUD控制器结构
 */

import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { ExampleService } from './example.service';
import { AuthGuard } from '../../common/guards';
import { PaginationPipe } from '../../common/pipes';

// DTO定义(实际项目中应单独放在 dto/ 文件夹)
class CreateExampleDto {
  name: string;
  value: number;
}

class UpdateExampleDto {
  name?: string;
  value?: number;
}

@Controller('example')
@UseGuards(AuthGuard)
export class ExampleController {
  constructor(private readonly exampleService: ExampleService) {}

  /**
   * 创建
   * POST /api/example
   */
  @Post()
  async create(@Req() req: any, @Body() dto: CreateExampleDto) {
    return this.exampleService.create(req.playerId, dto);
  }

  /**
   * 查询列表(分页)
   * GET /api/example?page=1&pageSize=20
   */
  @Get()
  async findAll(
    @Req() req: any,
    @Query(new PaginationPipe()) query: any,
  ) {
    return this.exampleService.findAll(req.playerId, query);
  }

  /**
   * 查询单个
   * GET /api/example/:id
   */
  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.exampleService.findOne(id);
  }

  /**
   * 更新
   * PUT /api/example/:id
   */
  @Put(':id')
  async update(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateExampleDto,
  ) {
    return this.exampleService.update(req.playerId, id, dto);
  }

  /**
   * 删除
   * DELETE /api/example/:id
   */
  @Delete(':id')
  async remove(@Req() req: any, @Param('id') id: string) {
    return this.exampleService.remove(req.playerId, id);
  }
}
