import { IsArray, IsInt, IsOptional, IsPositive, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class OrderLineDto {
  @ApiProperty({ example: 1, description: 'ID do item' })
  @IsInt()
  itemId: number;

  @ApiPropertyOptional({ example: 3, description: 'ID da variação do item (omitir para itens sem variação)' })
  @IsOptional()
  @IsInt()
  variationId?: number;

  @ApiProperty({ example: 2, description: 'Quantidade solicitada', minimum: 1 })
  @IsInt()
  @IsPositive()
  requestedQuantity: number;

  @ApiPropertyOptional({ example: 'M', description: 'Tamanho do item (none, PP, P, M, G, GG, GGG, 33-45). Padrão: none.' })
  @IsOptional()
  @IsString()
  size?: string;
}

export class CreateOrderDto {
  @ApiPropertyOptional({ example: 42, description: 'ID do aluno recebedor (somente admin). Se omitido, usa o usuário autenticado.' })
  @IsOptional()
  @IsInt()
  userId?: number;

  @ApiProperty({ type: [OrderLineDto], description: 'Itens solicitados no pedido' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderLineDto)
  items: OrderLineDto[];
}
