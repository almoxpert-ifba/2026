import {
  Injectable, NotFoundException, ForbiddenException, BadRequestException,
} from '@nestjs/common';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { OrderStatus, UserType, MovementType, MovementOrigin, JwtPayload } from 'shared';
import { Order } from './entities/order.entity';
import { OrderItem } from './entities/order-item.entity';
import { StockService } from '../stock/stock.service';
import { MovementsService } from '../movements/movements.service';
import { EmailService } from '../email/email.service';
import type { OrderReviewStatus, OrderReviewItem } from '../email/templates';
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
    private emailService: EmailService,
    @InjectDataSource() private dataSource: DataSource,
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

  /** Students or admin (on behalf of a student) place orders */
  async create(dto: CreateOrderDto, requestingUserId: number) {
    const targetUserId = dto.userId ? Number(dto.userId) : requestingUserId;

    // Header + line items are written atomically: a partially-saved order
    // (header without its items) can never be persisted.
    const orderId = await this.dataSource.transaction(async (manager) => {
      const ordersRepo     = manager.getRepository(Order);
      const orderItemsRepo = manager.getRepository(OrderItem);

      const order = await ordersRepo.save(ordersRepo.create({ userId: targetUserId }));

      for (const line of dto.items) {
        const size        = line.size ?? 'none';
        const variationId = line.variationId ?? null;
        await orderItemsRepo.save(
          orderItemsRepo.create({
            orderId:           order.id,
            itemId:            line.itemId,
            variationId,
            requestedQuantity: line.requestedQuantity,
            size,
          }),
        );
      }

      return order.id;
    });

    return this.ordersRepo.findOne({
      where: { id: orderId },
      relations: ['items', 'items.item', 'items.variation'],
    });
  }

  /** Admin approves or rejects an order */
  async review(id: number, dto: ReviewOrderDto, adminId: number) {
    // All quantity adjustments, new-item insertions and the status change are
    // committed atomically; a failure mid-review leaves the order untouched.
    const order = await this.dataSource.transaction(async (manager) => {
      const ordersRepo     = manager.getRepository(Order);
      const orderItemsRepo = manager.getRepository(OrderItem);

      const ord = await ordersRepo.findOne({
        where: { id },
        relations: ['items', 'items.item', 'user'],
      });

      if (!ord) throw new NotFoundException(`Order #${id} not found`);

      if (ord.status !== OrderStatus.PENDING) {
        throw new BadRequestException('Only pending orders can be reviewed');
      }

      ord.status       = dto.status;
      ord.adminNotes   = dto.adminNotes;
      ord.approvedBy   = adminId;
      ord.approvalDate = new Date();

      if (dto.status === OrderStatus.APPROVED) {
        for (const reviewLine of dto.items ?? []) {
          const orderItem = ord.items.find((oi) => Number(oi.id) === Number(reviewLine.orderItemId));
          if (orderItem) {
            orderItem.approvedQuantity = reviewLine.approvedQuantity;
            await orderItemsRepo.save(orderItem);
          }
        }

        for (const newLine of dto.newItems ?? []) {
          await orderItemsRepo.save(
            orderItemsRepo.create({
              orderId:           Number(ord.id),
              itemId:            Number(newLine.itemId),
              variationId:       newLine.variationId ? Number(newLine.variationId) : null,
              size:              newLine.size ?? 'none',
              requestedQuantity: 0,
              approvedQuantity:  newLine.approvedQuantity,
            }),
          );
        }
      }

      return ordersRepo.save(ord);
    });

    const saved = order;

    if (order.user?.receiveEmails) {
      const hasChanges = dto.status === OrderStatus.APPROVED && (
        (dto.newItems?.length ?? 0) > 0 ||
        order.items.some((oi) => {
          const reviewLine = dto.items?.find((r) => r.orderItemId === oi.id);
          return reviewLine && reviewLine.approvedQuantity !== oi.requestedQuantity;
        })
      );

      const emailStatus: OrderReviewStatus =
        dto.status === OrderStatus.REJECTED
          ? 'rejected'
          : hasChanges
          ? 'approved_with_changes'
          : 'approved';

      const existingEmailItems: OrderReviewItem[] = order.items.map((oi) => ({
        name:              oi.item?.name ?? `Item #${oi.itemId}`,
        requestedQuantity: oi.requestedQuantity,
        approvedQuantity:  oi.approvedQuantity ?? null,
      }));

      const newEmailItems: OrderReviewItem[] = (dto.newItems ?? []).map((n) => ({
        name:              `Item #${n.itemId}`,
        requestedQuantity: 0,
        approvedQuantity:  n.approvedQuantity,
        isNew:             true,
      }));

      const emailItems: OrderReviewItem[] = [...existingEmailItems, ...newEmailItems];

      this.emailService
        .sendOrderReview(order.user.email, order.user.name, order.id, emailStatus, emailItems, dto.adminNotes)
        .catch(() => {/* fire and forget */});
    }

    return saved;
  }

  /** Admin marks an approved order as delivered and deducts stock */
  async deliver(id: number) {
    // Atomic delivery: every stock decrement and its OUT movement, plus the
    // status change, commit together. Stock rows are read under a pessimistic
    // write lock, so concurrent deliveries cannot oversell. Any failure
    // (e.g. insufficient stock on the 3rd line) rolls back the whole delivery.
    const order = await this.dataSource.transaction(async (manager) => {
      const ordersRepo = manager.getRepository(Order);

      const ord = await ordersRepo.findOne({
        where: { id },
        relations: ['items', 'items.item', 'user'],
      });

      if (!ord) throw new NotFoundException(`Order #${id} not found`);
      if (ord.status !== OrderStatus.APPROVED) {
        throw new BadRequestException('Only approved orders can be delivered');
      }

      for (const line of ord.items) {
        const qty = line.approvedQuantity ?? 0;
        if (qty <= 0) continue;

        const size = line.size ?? 'none';
        await this.stockService.decreaseQuantity(line.itemId, line.variationId, size, qty, manager);
        await this.movementsService.record({
          itemId:       line.itemId,
          variationId:  line.variationId,
          size,
          movementType: MovementType.OUT,
          quantity:     qty,
          originType:   MovementOrigin.ORDER,
          originId:     ord.id,
        }, manager);
      }

      ord.status = OrderStatus.DELIVERED;
      return ordersRepo.save(ord);
    });

    const saved = order;

    if (order.user?.receiveEmails) {
      const emailItems: OrderReviewItem[] = order.items
        .filter((line) => (line.approvedQuantity ?? 0) > 0)
        .map((line) => ({
          name:              line.item?.name ?? `Item #${line.itemId}`,
          requestedQuantity: line.requestedQuantity,
          approvedQuantity:  line.approvedQuantity,
          isNew:             line.requestedQuantity === 0,
        }));

      this.emailService
        .sendOrderDelivered(order.user.email, order.user.name, order.id, emailItems)
        .catch(() => {/* fire and forget */});
    }

    return saved;
  }
}
