import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
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
    @InjectDataSource() private dataSource: DataSource,
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
    // Header + items committed atomically.
    const shipmentId = await this.dataSource.transaction(async (manager) => {
      const shipmentsRepo     = manager.getRepository(Shipment);
      const shipmentItemsRepo = manager.getRepository(ShipmentItem);

      const shipment = await shipmentsRepo.save(
        shipmentsRepo.create({
          responsibleId,
          notes:  dto.notes,
          status: ShipmentStatus.OPEN,
        }),
      );

      for (const line of dto.items) {
        await shipmentItemsRepo.save(
          shipmentItemsRepo.create({
            shipmentId:  shipment.id,
            itemId:      line.itemId,
            variationId: line.variationId ?? null,
            quantity:    line.quantity,
            size:        line.size ?? 'none',
          }),
        );
      }

      return shipment.id;
    });

    return this.findOne(shipmentId);
  }

  /**
   * Edita uma remessa aberta: substitui os itens.
   * O estoque NÃO é tocado (ainda não foi lançado).
   */
  async update(id: number, dto: CreateShipmentDto) {
    // The item replacement (delete-then-reinsert) and the notes update run in
    // one transaction, so a failure can never leave the shipment with its old
    // items deleted and the new ones missing.
    await this.dataSource.transaction(async (manager) => {
      const shipmentsRepo     = manager.getRepository(Shipment);
      const shipmentItemsRepo = manager.getRepository(ShipmentItem);

      const shipment = await shipmentsRepo.findOne({ where: { id } });
      if (!shipment) throw new NotFoundException(`Shipment #${id} not found`);
      if (shipment.status !== ShipmentStatus.OPEN) {
        throw new BadRequestException('Only open shipments can be edited');
      }

      await shipmentItemsRepo.delete({ shipmentId: id });

      for (const line of dto.items) {
        await shipmentItemsRepo.save(
          shipmentItemsRepo.create({
            shipmentId:  shipment.id,
            itemId:      line.itemId,
            variationId: line.variationId ?? null,
            quantity:    line.quantity,
            size:        line.size ?? 'none',
          }),
        );
      }

      await shipmentsRepo.update(id, { notes: dto.notes ?? shipment.notes });
    });

    return this.findOne(id);
  }

  /**
   * Conclui a remessa: incrementa o estoque e registra os movimentos de entrada.
   */
  async complete(id: number) {
    // Atomic completion: every stock increment, its IN movement and the status
    // change commit together. Stock rows are read under a pessimistic write
    // lock, so a concurrent delivery/completion on the same item is serialized.
    return this.dataSource.transaction(async (manager) => {
      const shipmentsRepo = manager.getRepository(Shipment);

      const shipment = await shipmentsRepo.findOne({
        where: { id },
        relations: ['items', 'items.item', 'items.variation', 'responsible'],
      });
      if (!shipment) throw new NotFoundException(`Shipment #${id} not found`);
      if (shipment.status !== ShipmentStatus.OPEN) {
        throw new BadRequestException('Only open shipments can be completed');
      }

      for (const line of shipment.items) {
        const size        = line.size ?? 'none';
        const variationId = line.variationId ?? null;

        await this.stockService.increaseQuantity(line.itemId, variationId, size, line.quantity, manager);

        await this.movementsService.record({
          itemId:       line.itemId,
          variationId,
          size,
          movementType: MovementType.IN,
          quantity:     line.quantity,
          originType:   MovementOrigin.SHIPMENT,
          originId:     shipment.id,
        }, manager);
      }

      shipment.status = ShipmentStatus.COMPLETED;
      return shipmentsRepo.save(shipment);
    });
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
    // Items and header are removed in one transaction.
    await this.dataSource.transaction(async (manager) => {
      const shipmentsRepo     = manager.getRepository(Shipment);
      const shipmentItemsRepo = manager.getRepository(ShipmentItem);

      const shipment = await shipmentsRepo.findOne({ where: { id } });
      if (!shipment) throw new NotFoundException(`Shipment #${id} not found`);
      if (shipment.status !== ShipmentStatus.OPEN) {
        throw new BadRequestException('Only open shipments can be deleted');
      }

      await shipmentItemsRepo.delete({ shipmentId: id });
      await shipmentsRepo.delete(id);
    });
  }
}
