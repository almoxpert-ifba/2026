import {
  Controller, Get, Post, Patch, Delete, Param, Body,
  UseGuards, ParseIntPipe, Query, DefaultValuePipe, HttpCode,
} from '@nestjs/common';
import {
  ApiTags, ApiOperation, ApiResponse, ApiBearerAuth,
  ApiParam, ApiBody, ApiQuery,
} from '@nestjs/swagger';
import { ItemsService } from './items.service';
import { CreateItemDto } from './dto/create-item.dto';
import { UpdateItemDto } from './dto/update-item.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserType } from 'shared';

@ApiTags('Items')
@ApiBearerAuth('JWT')
@Controller('items')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ItemsController {
  constructor(private itemsService: ItemsService) {}

  @Get()
  @ApiOperation({ summary: 'Listar itens' })
  @ApiQuery({ name: 'pageIndex',  type: Number,  required: false, example: 0 })
  @ApiQuery({ name: 'pageSize',   type: Number,  required: false, example: 25 })
  @ApiQuery({ name: 'sortBy',     type: String,  required: false, example: 'name' })
  @ApiQuery({ name: 'sortOrder',  type: String,  required: false, example: 'ASC' })
  @ApiQuery({ name: 'name',       type: String,  required: false })
  @ApiQuery({ name: 'type',       type: String,  required: false })
  @ApiQuery({ name: 'isActive',   type: Boolean, required: false })
  @ApiResponse({ status: 200, description: 'Lista de itens retornada com sucesso.' })
  findAll(
    @Query('pageIndex', new DefaultValuePipe(0), ParseIntPipe) pageIndex: number,
    @Query('pageSize', new DefaultValuePipe(25), ParseIntPipe)  pageSize: number,
    @Query('sortBy',    new DefaultValuePipe('name'))  sortBy: string,
    @Query('sortOrder', new DefaultValuePipe('ASC'))   sortOrder: string,
    @Query('name')     name?: string,
    @Query('type')     type?: string,
    @Query('isActive') isActive?: string,
  ) {
    return this.itemsService.findAll({
      pageIndex, pageSize, sortBy, sortOrder, name, type,
      isActive: isActive === undefined ? undefined : isActive === 'true',
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Buscar item por ID' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: 'Item encontrado.' })
  @ApiResponse({ status: 404, description: 'Item não encontrado.' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.itemsService.findOne(id);
  }

  @Post()
  @Roles(UserType.ADMIN)
  @ApiOperation({ summary: 'Criar item' })
  @ApiResponse({ status: 201, description: 'Item criado com sucesso.' })
  create(@Body() dto: CreateItemDto) {
    return this.itemsService.create(dto);
  }

  @Patch(':id')
  @Roles(UserType.ADMIN)
  @ApiOperation({ summary: 'Atualizar item' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: 'Item atualizado.' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateItemDto,
  ) {
    return this.itemsService.update(id, dto);
  }

  @Patch(':id/toggle')
  @Roles(UserType.ADMIN)
  @ApiOperation({ summary: 'Ativar/Desativar item (toggle)' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: 'Status do item alternado.' })
  toggleItem(@Param('id', ParseIntPipe) id: number) {
    return this.itemsService.toggleItem(id);
  }

  @Patch(':id/variations/:variationId/toggle')
  @Roles(UserType.ADMIN)
  @ApiOperation({ summary: 'Ativar/Desativar variação (toggle)' })
  @ApiParam({ name: 'id', type: Number })
  @ApiParam({ name: 'variationId', type: Number })
  @ApiResponse({ status: 200, description: 'Status da variação alternado.' })
  toggleVariation(
    @Param('id', ParseIntPipe)          itemId: number,
    @Param('variationId', ParseIntPipe) variationId: number,
  ) {
    return this.itemsService.toggleVariation(itemId, variationId);
  }

  @Patch(':id/deactivate')
  @Roles(UserType.ADMIN)
  @ApiOperation({ summary: 'Desativar item' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: 'Item desativado.' })
  deactivate(@Param('id', ParseIntPipe) id: number) {
    return this.itemsService.deactivate(id);
  }

  @Delete(':id')
  @Roles(UserType.ADMIN)
  @HttpCode(204)
  @ApiOperation({ summary: 'Excluir item (somente se nunca entrou em estoque)' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 204, description: 'Item excluído.' })
  @ApiResponse({ status: 400, description: 'Item já entrou em estoque — não pode ser excluído; desative-o.' })
  @ApiResponse({ status: 404, description: 'Item não encontrado.' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.itemsService.remove(id);
  }

  @Delete(':id/variations/:variationId')
  @Roles(UserType.ADMIN)
  @HttpCode(204)
  @ApiOperation({ summary: 'Excluir variação (somente se nunca entrou em estoque)' })
  @ApiParam({ name: 'id', type: Number })
  @ApiParam({ name: 'variationId', type: Number })
  @ApiResponse({ status: 204, description: 'Variação excluída.' })
  @ApiResponse({ status: 400, description: 'Variação já entrou em estoque — não pode ser excluída; desative-a.' })
  @ApiResponse({ status: 404, description: 'Item ou variação não encontrado.' })
  removeVariation(
    @Param('id', ParseIntPipe)          itemId: number,
    @Param('variationId', ParseIntPipe) variationId: number,
  ) {
    return this.itemsService.removeVariation(itemId, variationId);
  }

  @Post(':id/variations')
  @Roles(UserType.ADMIN)
  @ApiOperation({ summary: 'Adicionar variação' })
  @ApiParam({ name: 'id', type: Number })
  @ApiBody({ schema: { example: { description: 'Azul' } } })
  @ApiResponse({ status: 201, description: 'Variação criada.' })
  addVariation(
    @Param('id', ParseIntPipe) itemId: number,
    @Body('description') description: string,
  ) {
    return this.itemsService.addVariation(itemId, description);
  }
}
