import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { Repository, DataSource, MoreThan } from 'typeorm';
import { SizeType } from 'shared';
import { Item } from './entities/item.entity';
import { ItemVariation } from './entities/item-variation.entity';
import { Stock } from '../stock/entities/stock.entity';
import { StockMovement } from '../movements/entities/stock-movement.entity';
import { OrderItem } from '../orders/entities/order-item.entity';
import { ShipmentItem } from '../shipments/entities/shipment-item.entity';
import { CreateItemDto } from './dto/create-item.dto';
import { UpdateItemDto } from './dto/update-item.dto';

interface ItemsListQuery {
  pageIndex?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: string;
  name?: string;
  type?: string;
  isActive?: boolean;
}

@Injectable()
export class ItemsService {
  constructor(
    @InjectRepository(Item)
    private itemsRepo: Repository<Item>,
    @InjectRepository(ItemVariation)
    private variationsRepo: Repository<ItemVariation>,
    @InjectDataSource() private dataSource: DataSource,
  ) {}

  async findAll(query: ItemsListQuery = {}) {
    const pageIndex = query.pageIndex ?? 0;
    const pageSize = query.pageSize ?? 25;
    const sortOrder = query.sortOrder?.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';
    const sortColumns: Record<string, string> = {
      name: 'item.name',
      type: 'item.type',
      createdAt: 'item.createdAt',
    };

    const qb = this.itemsRepo.createQueryBuilder('item')
      .leftJoinAndSelect('item.variations', 'variation');

    if (query.isActive !== undefined) {
      qb.where('item.isActive = :isActive', { isActive: query.isActive });
    }

    if (query.name) {
      qb.andWhere('item.name LIKE :name', { name: `%${query.name}%` });
    }

    if (query.type) {
      qb.andWhere('item.type = :type', { type: query.type });
    }

    qb.orderBy(sortColumns[query.sortBy] ?? 'item.name', sortOrder)
      .skip(pageIndex * pageSize)
      .take(pageSize);

    const [data, total] = await qb.getManyAndCount();
    return { data, total, pageIndex, pageSize };
  }

  async findOne(id: number) {
    const item = await this.itemsRepo.findOne({
      where: { id },
      relations: ['variations'],
    });
    if (!item) throw new NotFoundException(`Item #${id} not found`);
    return item;
  }

  async create(dto: CreateItemDto) {
    const hasVariations = dto.hasVariations ?? false;

    // Coerência na criação: só um item "de variação" pode nascer com variações.
    if (!hasVariations && dto.variations?.length) {
      throw new BadRequestException(
        'Um item sem variações (hasVariations=false) não pode ser criado com variações. ' +
        'Habilite hasVariations ou remova a lista de variações.',
      );
    }

    const item = this.itemsRepo.create({
      name:          dto.name,
      type:          dto.type,
      unitOfMeasure: dto.unitOfMeasure,
      hasVariations,
      sizeType:      dto.sizeType ?? SizeType.NONE,
    });
    const saved = await this.itemsRepo.save(item);

    if (dto.variations?.length) {
      await this.variationsRepo.save(
        dto.variations.map((v) =>
          this.variationsRepo.create({ itemId: saved.id, description: v }),
        ),
      );
    }

    return this.findOne(saved.id);
  }

  async update(id: number, dto: UpdateItemDto) {
    const item = await this.findOne(id);

    // As duas dimensões da chave de estoque (item, variação, tamanho) são
    // fixadas na criação. Ligar/desligar qualquer uma delas depois tornaria o
    // estoque existente incompatível, então a alteração é bloqueada.
    if (dto.hasVariations !== undefined && dto.hasVariations !== item.hasVariations) {
      throw new BadRequestException(
        'Não é possível alterar "hasVariations" após a criação do item: isso mudaria a ' +
        'chave de estoque (item, variação, tamanho) e invalidaria o estoque já existente.',
      );
    }
    if (dto.sizeType !== undefined && dto.sizeType !== item.sizeType) {
      throw new BadRequestException(
        'Não é possível alterar "sizeType" após a criação do item: isso mudaria a ' +
        'chave de estoque (item, variação, tamanho) e invalidaria o estoque já existente.',
      );
    }

    // 'variations' não é editado por aqui (use POST /items/:id/variations).
    const { variations: _ignored, ...rest } = dto;
    Object.assign(item, rest);
    return this.itemsRepo.save(item);
  }

  /** Ativa ou desativa um item (toggle) */
  async toggleItem(id: number) {
    const item = await this.findOne(id);
    item.isActive = !item.isActive;
    return this.itemsRepo.save(item);
  }

  /** Ativa ou desativa uma variação específica (toggle) */
  async toggleVariation(itemId: number, variationId: number) {
    await this.findOne(itemId); // garante que o item existe
    const variation = await this.variationsRepo.findOne({
      where: { id: variationId, itemId },
    });
    if (!variation) throw new NotFoundException(`Variation #${variationId} not found`);
    variation.isActive = !variation.isActive;
    return this.variationsRepo.save(variation);
  }

  async deactivate(id: number) {
    const item = await this.findOne(id);
    item.isActive = false;
    return this.itemsRepo.save(item);
  }

  async addVariation(itemId: number, description: string) {
    const item = await this.findOne(itemId);

    // Só um item declarado como "de variação" (hasVariations=true) pode receber
    // variações. Um item baseado apenas em tamanho — ou sem dimensões — teria seu
    // estoque fraturado se ganhasse variações depois.
    if (!item.hasVariations) {
      throw new BadRequestException(
        'Este item não utiliza variações (hasVariations=false); não é possível adicionar ' +
        'variações a ele. Apenas itens criados como "de variação" aceitam novas variações.',
      );
    }

    return this.variationsRepo.save(
      this.variationsRepo.create({ itemId, description }),
    );
  }

  /**
   * Exclui uma variação de item permanentemente. Só é permitido se a variação
   * ainda NÃO entrou em estoque (sem movimentações e sem saldo positivo), pois
   * as FKs de estoque/movimentações/remessas/pedidos são ON DELETE CASCADE e a
   * exclusão apagaria a trilha de auditoria daquela variação em cascata. Para
   * variações já em uso, o correto é desativá-las (toggle), preservando o histórico.
   */
  /**
   * Conta em quantos lugares um item OU uma variação está em uso: saldo de
   * estoque, movimentações (auditoria), itens de pedido e itens de remessa.
   * Serve de base para as validações de exclusão — como todas essas FKs são
   * ON DELETE CASCADE, excluir algo em uso apagaria esses registros em cascata.
   */
  private async collectUsage(key: 'itemId' | 'variationId', id: number) {
    const ref = { [key]: id } as any;
    const [stock, movements, orderItems, shipmentItems] = await Promise.all([
      this.dataSource.getRepository(Stock).count({ where: { ...ref, availableQuantity: MoreThan(0) } }),
      this.dataSource.getRepository(StockMovement).count({ where: ref }),
      this.dataSource.getRepository(OrderItem).count({ where: ref }),
      this.dataSource.getRepository(ShipmentItem).count({ where: ref }),
    ]);
    return { stock, movements, orderItems, shipmentItems };
  }

  /** Monta a lista de motivos ("estoque", "pedidos", "remessas") que impedem a exclusão. */
  private usageReasons(u: { stock: number; movements: number; orderItems: number; shipmentItems: number }): string[] {
    const reasons: string[] = [];
    if (u.stock > 0 || u.movements > 0) reasons.push('estoque/movimentações');
    if (u.orderItems > 0) reasons.push('pedidos');
    if (u.shipmentItems > 0) reasons.push('remessas');
    return reasons;
  }

  async removeVariation(itemId: number, variationId: number) {
    await this.findOne(itemId); // 404 se o item não existir

    const variation = await this.variationsRepo.findOne({
      where: { id: variationId, itemId },
    });
    if (!variation) throw new NotFoundException(`Variation #${variationId} not found`);

    const reasons = this.usageReasons(await this.collectUsage('variationId', variationId));
    if (reasons.length > 0) {
      throw new BadRequestException(
        `Esta variação não pode ser excluída porque está vinculada a: ${reasons.join(', ')}. ` +
        'Para tirá-la de uso, desative-a (toggle) em vez de excluir — assim o histórico é preservado.',
      );
    }

    await this.variationsRepo.delete({ id: variationId, itemId });
  }

  /**
   * Exclui um item permanentemente. Como as FKs de estoque, movimentações,
   * remessas e pedidos são ON DELETE CASCADE, a exclusão só é permitida se o
   * item NUNCA entrou em estoque — caso contrário a trilha de auditoria e o
   * saldo seriam apagados em cascata. Para itens já em uso, o correto é
   * desativar (deactivate), preservando o histórico.
   */
  async remove(id: number) {
    await this.findOne(id); // 404 se o item não existir

    const reasons = this.usageReasons(await this.collectUsage('itemId', id));
    if (reasons.length > 0) {
      throw new BadRequestException(
        `Este item não pode ser excluído porque está vinculado a: ${reasons.join(', ')}. ` +
        'Para tirá-lo de uso, desative-o (deactivate) em vez de excluir — assim o histórico é preservado.',
      );
    }

    await this.itemsRepo.delete(id);
  }
}
