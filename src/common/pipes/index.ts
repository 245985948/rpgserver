/**
 * 全局管道
 */

import {
  PipeTransform,
  Injectable,
  ArgumentMetadata,
  BadRequestException,
} from '@nestjs/common';

/**
 * 分页参数解析管道
 * 标准化分页查询参数
 */
@Injectable()
export class PaginationPipe implements PipeTransform {
  private readonly DEFAULT_PAGE = 1;
  private readonly DEFAULT_PAGE_SIZE = 20;
  private readonly MAX_PAGE_SIZE = 100;

  transform(value: any, metadata: ArgumentMetadata) {
    if (metadata.type !== 'query') {
      return value;
    }

    const page = Math.max(1, parseInt(value.page, 10) || this.DEFAULT_PAGE);
    const pageSize = Math.min(
      this.MAX_PAGE_SIZE,
      Math.max(1, parseInt(value.pageSize, 10) || this.DEFAULT_PAGE_SIZE),
    );

    return {
      ...value,
      page,
      pageSize,
      skip: (page - 1) * pageSize,
    };
  }
}

/**
 * ID验证管道
 * 验证ID参数格式
 */
@Injectable()
export class ParseIdPipe implements PipeTransform<string, string> {
  transform(value: string, metadata: ArgumentMetadata): string {
    if (!value || typeof value !== 'string') {
      throw new BadRequestException(`${metadata.data} must be a valid ID`);
    }
    return value;
  }
}

/**
 * 整数解析管道
 */
@Injectable()
export class ParseIntPipe implements PipeTransform<string, number> {
  transform(value: string, metadata: ArgumentMetadata): number {
    const val = parseInt(value, 10);
    if (isNaN(val)) {
      throw new BadRequestException(
        `${metadata.data} must be a valid integer`,
      );
    }
    return val;
  }
}
