import {
  Injectable, NotFoundException, ForbiddenException, BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OrderStatus, UserType, MovementType, MovementOrigin, JwtPayload } from 'shared';
import { Order } from './entities/order.entity';
import { OrderItem } from './entities/order-item.entity';
import { StockService } from '../stock/stock.service';
import { MovementsService } from '../movements/movements.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { ReviewOrderDto } from './dto/review-order.dto';

interface OrdersListQuery {
  pageIndex?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: string;
  status?: OrderStatus;
  userId?: number;
  userName?: string;
  dateFrom?: string;
  dateTo?: string;
}

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(Order)
    private ordersRepo: Repository<Order>,
    @InjectRepository(OrderItem)
    private orderItemsRepo: Repository<OrderItem>,
    private stockService: StockService,
    private movementsService: MovementsService,
  ) {}

  /** Students see only their own orders; admins see all */
  async findAll(currentUser: JwtPayload, query: OrdersListQuery = {}) {
    const pageIndex = query.pageIndex ?? 0;
    const pageSize = query.pageSize ?? 25;
    const sortOrder = query.sortOrder?.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
    const sortColumns: Record<string, string> = {
      orderDate: 'order.orderDate',
      status: 'order.status',
      createdAt: 'order.createdAt',
    };

    const qb = this.ordersRepo.createQueryBuilder('order')
      .leftJoinAndSelect('order.user', 'user')
      .leftJoinAndSelect('user.studentProfile', 'studentProfile')
      .leftJoinAndSelect('order.approver', 'approver')
      .leftJoinAndSelect('order.items', 'items')
      .leftJoinAndSelect('items.item', 'item')
      .leftJoinAndSelect('items.variation', 'variation');

    if (currentUser.userType === UserType.STUDENT) {
      qb.where('order.userId = :userId', { userId: currentUser.sub });
    } else if (query.userId !== undefined) {
      qb.where('order.userId = :userId', { userId: query.userId });
    }

    if (query.status) {
      qb.andWhere('order.status = :status', { status: query.status });
    }

    if (query.userName) {
      qb.andWhere('user.name LIKE :userName', { userName: `%${query.userName}%` });
    }

    if (query.dateFrom) {
      qb.andWhere('order.createdAt >= :dateFrom', {
        dateFrom: new Date(query.dateFrom + 'T00:00:00'),
      });
    }

    if (query.dateTo) {
      qb.andWhere('order.createdAt <= :dateTo', {
        dateTo: new Date(query.dateTo + 'T23:59:59'),
      });
    }

    qb.orderBy(sortColumns[query.sortBy] ?? 'order.orderDate', sortOrder)
      .skip(pageIndex * pageSize)
      .take(pageSize);

    const [data, total] = await qb.getManyAndCount();
    return { data, total, pageIndex, pageSize };
  }

  async findOne(id: number, currentUser: JwtPayload) {
    const order = await this.ordersRepo.findOne({
      where: { id },
      relations: ['user', 'user.studentProfile', 'approver', 'items', 'items.item', 'items.variation'],
    });

    if (!order) throw new NotFoundException(`Order #${id} not found`);

    if (
      currentUser.userType === UserType.STUDENT &&
      order.userId !== currentUser.sub
    ) {
      throw new ForbiddenException('Access denied');
    }

    return order;
  }

  /** Students place orders */
  async create(dto: CreateOrderDto, userId: number) {
    const order = await this.ordersRepo.save(
      this.ordersRepo.create({ userId }),
    );

    for (const line of dto.items) {
      const size       = line.size ?? 'none';
      const variationId = line.variationId ?? null;
      await this.orderItemsRepo.save(
        this.orderItemsRepo.create({
          orderId:           order.id,
          itemId:            line.itemId,
          variationId,
          requestedQuantity: line.requestedQuantity,
          size,
        }),
      );
    }

    return this.ordersRepo.findOne({
      where: { id: order.id },
      relations: ['items', 'items.item', 'items.variation'],
    });
  }

  /** Admin approves or rejects an order */
  async review(id: number, dto: ReviewOrderDto, adminId: number) {
    const order = await this.ordersRepo.findOne({
      where: { id },
      relations: ['items'],
    });

    if (!order) throw new NotFoundException(`Order #${id} not found`);

    if (order.status !== OrderStatus.PENDING) {
      throw new BadRequestException('Only pending orders can be reviewed');
    }

    order.status       = dto.status;
    order.adminNotes   = dto.adminNotes;
    order.approvedBy   = adminId;
    order.approvalDate = new Date();

    if (dto.status === OrderStatus.APPROVED) {
      for (const reviewLine of dto.items ?? []) {
        const orderItem = order.items.find((oi) => oi.id === reviewLine.orderItemId);
        if (orderItem) {
          orderItem.approvedQuantity = reviewLine.approvedQuantity;
          await this.orderItemsRepo.save(orderItem);
        }
      }
    }

    return this.ordersRepo.save(order);
  }

  /** Admin marks an approved order as delivered and deducts stock */
  async deliver(id: number) {
    const order = await this.ordersRepo.findOne({
      where: { id },
      relations: ['items'],
    });

    if (!order) throw new NotFoundException(`Order #${id} not found`);
    if (order.status !== OrderStatus.APPROVED) {
      throw new BadRequestException('Only approved orders can be delivered');
    }

    for (const line of order.items) {
      const size = line.size ?? 'none';
      const qty = line.approvedQuantity ?? line.requestedQuantity;
      await this.stockService.decreaseQuantity(line.itemId, line.variationId, size, qty);
      await this.movementsService.record({
        itemId:       line.itemId,
        variationId:  line.variationId,
        size,
        movementType: MovementType.OUT,
        quantity:     qty,
        originType:   MovementOrigin.ORDER,
        originId:     order.id,
      });
    }

    order.status = OrderStatus.DELIVERED;
    return this.ordersRepo.save(order);
  }
}
