import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ShipmentStatus, MovementType, MovementOrigin } from 'shared';
import { Shipment } from './entities/shipment.entity';
import { ShipmentItem } from './entities/shipment-item.entity';
import { StockService } from '../stock/stock.service';
import { MovementsService } from '../movements/movements.service';
import { CreateShipmentDto } from './dto/create-shipment.dto';

interface ShipmentsListQuery {
  pageIndex?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: string;
  status?: ShipmentStatus;
  responsibleId?: number;
  dateFrom?: string;
  dateTo?: string;
}

@Injectable()
export class ShipmentsService {
  constructor(
    @InjectRepository(Shipment)
    private shipmentsRepo: Repository<Shipment>,
    @InjectRepository(ShipmentItem)
    private shipmentItemsRepo: Repository<ShipmentItem>,
    private stockService: StockService,
    private movementsService: MovementsService,
  ) {}

  async findAll(query: ShipmentsListQuery = {}) {
    const pageIndex = query.pageIndex ?? 0;
    const pageSize  = query.pageSize ?? 25;
    const sortOrder = query.sortOrder?.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
    const sortColumns: Record<string, string> = {
      shipmentDate: 'shipment.shipmentDate',
      status:       'shipment.status',
    };

    const qb = this.shipmentsRepo.createQueryBuilder('shipment')
      .leftJoinAndSelect('shipment.responsible', 'responsible')
      .leftJoinAndSelect('shipment.items', 'items')
      .leftJoinAndSelect('items.item', 'item')
      .leftJoinAndSelect('items.variation', 'variation');

    if (query.status) {
      qb.where('shipment.status = :status', { status: query.status });
    }

    if (query.responsibleId !== undefined) {
      qb.andWhere('shipment.responsibleId = :responsibleId', { responsibleId: query.responsibleId });
    }

    if (query.dateFrom) {
      qb.andWhere('shipment.shipmentDate >= :dateFrom', {
        dateFrom: new Date(query.dateFrom + 'T00:00:00'),
      });
    }

    if (query.dateTo) {
      qb.andWhere('shipment.shipmentDate <= :dateTo', {
        dateTo: new Date(query.dateTo + 'T23:59:59'),
      });
    }

    qb.orderBy(sortColumns[query.sortBy] ?? 'shipment.shipmentDate', sortOrder)
      .skip(pageIndex * pageSize)
      .take(pageSize);

    const [data, total] = await qb.getManyAndCount();
    return { data, total, pageIndex, pageSize };
  }

  async findOne(id: number) {
    const shipment = await this.shipmentsRepo.findOne({
      where: { id },
      relations: ['responsible', 'items', 'items.item', 'items.variation'],
    });
    if (!shipment) throw new NotFoundException(`Shipment #${id} not found`);
    return shipment;
  }

  /**
   * Cria uma remessa em aberto.
   * O estoque NÃO é alterado aqui — apenas ao concluir (complete).
   */
  async create(dto: CreateShipmentDto, responsibleId: number) {
    const shipment = await this.shipmentsRepo.save(
      this.shipmentsRepo.create({
        responsibleId,
        notes:  dto.notes,
        status: ShipmentStatus.OPEN,
      }),
    );

    for (const line of dto.items) {
      await this.shipmentItemsRepo.save(
        this.shipmentItemsRepo.create({
          shipmentId:  shipment.id,
          itemId:      line.itemId,
          variationId: line.variationId ?? null,
          quantity:    line.quantity,
          size:        line.size ?? 'none',
        }),
      );
    }

    return this.findOne(shipment.id);
  }

  /**
   * Edita uma remessa aberta: substitui os itens.
   * O estoque NÃO é tocado (ainda não foi lançado).
   */
  async update(id: number, dto: CreateShipmentDto) {
    const shipment = await this.findOne(id);

    if (shipment.status !== ShipmentStatus.OPEN) {
      throw new BadRequestException('Only open shipments can be edited');
    }

    // Substituir itens
    await this.shipmentItemsRepo.delete({ shipmentId: id });

    for (const line of dto.items) {
      await this.shipmentItemsRepo.save(
        this.shipmentItemsRepo.create({
          shipmentId:  shipment.id,
          itemId:      line.itemId,
          variationId: line.variationId ?? null,
          quantity:    line.quantity,
          size:        line.size ?? 'none',
        }),
      );
    }

    await this.shipmentsRepo.update(id, { notes: dto.notes ?? shipment.notes });

    return this.findOne(id);
  }

  /**
   * Conclui a remessa: incrementa o estoque e registra os movimentos de entrada.
   */
  async complete(id: number) {
    const shipment = await this.findOne(id);

    if (shipment.status !== ShipmentStatus.OPEN) {
      throw new BadRequestException('Only open shipments can be completed');
    }

    for (const line of shipment.items) {
      const size        = line.size ?? 'none';
      const variationId = line.variationId ?? null;

      await this.stockService.increaseQuantity(line.itemId, variationId, size, line.quantity);

      await this.movementsService.record({
        itemId:       line.itemId,
        variationId,
        size,
        movementType: MovementType.IN,
        quantity:     line.quantity,
        originType:   MovementOrigin.SHIPMENT,
        originId:     shipment.id,
      });
    }

    shipment.status = ShipmentStatus.COMPLETED;
    return this.shipmentsRepo.save(shipment);
  }

  /**
   * Cancela uma remessa aberta.
   * Como o estoque ainda não foi lançado, nenhuma reversão é necessária.
   */
  async cancel(id: number) {
    const shipment = await this.findOne(id);

    if (shipment.status !== ShipmentStatus.OPEN) {
      throw new BadRequestException('Only open shipments can be cancelled');
    }

    shipment.status = ShipmentStatus.CANCELLED;
    return this.shipmentsRepo.save(shipment);
  }

  /**
   * Exclui permanentemente uma remessa aberta.
   * Como o estoque ainda não foi lançado, nenhuma reversão é necessária.
   */
  async remove(id: number) {
    const shipment = await this.findOne(id);

    if (shipment.status !== ShipmentStatus.OPEN) {
      throw new BadRequestException('Only open shipments can be deleted');
    }

    await this.shipmentItemsRepo.delete({ shipmentId: id });
    await this.shipmentsRepo.delete(id);
  }
}
