import { PartialType } from '@nestjs/mapped-types';
import { CreateProductDto } from 'src/products/dto/create-product.dto';

export class UpdateOrderDto extends PartialType(CreateProductDto) {}
