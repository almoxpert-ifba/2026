// ─── Auth ────────────────────────────────────────────────────────────────────
export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthResponse {
  accessToken: string;
}

// ─── Student enums ───────────────────────────────────────────────────────────
export type StudentAid =
  | 'Auxílio Alimentação (VC)'
  | 'Auxílio Transporte Municipal (VC)'
  | 'Auxílio Cópia e Impressão (VC)'
  | 'Bolsa de Estudo (VC)'
  | 'Auxílio Moradia (VC)'
  | 'Auxílio Transporte Intermunicipal (VC)';

export type IntakeForm =
  | 'SISU / AMPLA CONCORRÊNCIA'
  | 'SISU / ESCOLAS PÚBLICAS'
  | 'SISU / ESCOLAS PÚBLICAS / BAIXA RENDA'
  | 'SISU / ESCOLAS PÚBLICAS / AUTODECLARAÇÃO - PRETOS, PARDOS E INDÍGENAS'
  | 'SISU / ESCOLAS PÚBLICAS / BAIXA RENDA / AUTODECLARAÇÃO - PRETOS, PARDOS E INDÍGENAS'
  | 'SISU / ESCOLAS PÚBLICAS / AUTODECLARAÇÃO - PRETOS, PARDOS E INDÍGENAS / PESSOAS COM DEFICIÊNCIA'
  | 'SISU / ESCOLAS PÚBLICAS / BAIXA RENDA / AUTODECLARAÇÃO - PRETOS, PARDOS E INDÍGENAS / PESSOAS COM DEFICIÊNCIA'
  | 'PROCESSO SELETIVO / AMPLA CONCORRÊNCIA'
  | 'PROCESSO SELETIVO / ESCOLAS PÚBLICAS'
  | 'PROCESSO SELETIVO / ESCOLAS PÚBLICAS / BAIXA RENDA'
  | 'PROCESSO SELETIVO / ESCOLAS PÚBLICAS / AUTODECLARAÇÃO - PRETOS, PARDOS E INDÍGENAS'
  | 'PROCESSO SELETIVO / ESCOLAS PÚBLICAS / BAIXA RENDA / AUTODECLARAÇÃO - PRETOS, PARDOS E INDÍGENAS'
  | 'PROCESSO SELETIVO / QUILOMBOLAS'
  | 'PROCESSO SELETIVO / PESSOA COM DEFICIÊNCIA'
  | 'PROCESSO SELETIVO / ESCOLAS PÚBLICAS / PESSOAS COM DEFICIÊNCIA'
  | 'PROCESSO SELETIVO / ESCOLAS PÚBLICAS / PESSOAS COM DEFICIÊNCIA / BAIXA RENDA'
  | 'PROCESSO SELETIVO / ESCOLAS PÚBLICAS / PESSOAS COM DEFICIÊNCIA / AUTODECLARAÇÃO - PRETOS, PARDOS E INDÍGENAS'
  | 'PROCESSO SELETIVO / ESCOLAS PÚBLICAS / PESSOAS COM DEFICIÊNCIA / BAIXA RENDA / AUTODECLARAÇÃO - PRETOS, PARDOS E INDÍGENAS'
  | 'PROCESSO SELETIVO PARA VAGAS REMANESCENTES / ESCOLAS PÚBLICAS / AUTODECLARAÇÃO - PRETOS, PARDOS E INDÍGENAS'
  | 'PROGRAMA PEC-G';

export type EducationLevel = 'Graduação' | 'Médio';
export type StudentModality = 'Bacharelado' | 'Licenciatura' | 'Técnico Integrado' | 'Técnico Subsequente';

// ─── User ────────────────────────────────────────────────────────────────────
export type UserType = 'admin' | 'student';

export interface User {
  id: number;
  name: string;
  email: string;
  userType: UserType;
  isActive: boolean;
  mustChangePassword?: boolean;
  createdAt: string;
  updatedAt?: string;
  studentProfile?: StudentProfile;
  adminProfile?: AdminProfile;
}

export interface StudentProfile {
  id: number;
  registrationNumber: string | null;
  course: string | null;
  socialPrograms: string | null;
  campus: string | null;
  educationLevel: EducationLevel | null;
  modality: StudentModality | null;
  intakeForms: IntakeForm[] | null;
  aids: StudentAid[] | null;
  mealTypes: string | null;
  baremScore: number | null;
}

export interface AdminProfile {
  id: number;
  position: string | null;
}

export interface CreateUserDto {
  name: string;
  email: string;
  password: string;
  userType: UserType;
  registrationNumber?: string;
  course?: string;
  socialPrograms?: string;
  campus?: string;
  educationLevel?: EducationLevel;
  modality?: StudentModality;
  intakeForms?: IntakeForm[];
  aids?: StudentAid[];
  mealTypes?: string;
  baremScore?: number;
  position?: string;
}

export interface UpdateUserDto {
  name?: string;
  email?: string;
  password?: string;
  userType?: UserType;
  registrationNumber?: string;
  course?: string;
  socialPrograms?: string;
  campus?: string;
  educationLevel?: EducationLevel;
  modality?: StudentModality;
  intakeForms?: IntakeForm[];
  aids?: StudentAid[];
  mealTypes?: string;
  baremScore?: number;
  position?: string;
  isActive?: boolean;
}

// ─── Import ───────────────────────────────────────────────────────────────────
export interface ImportRowError {
  row: number;
  field: string;
  message: string;
}

export interface ImportValidationResult {
  valid: boolean;
  totalRows: number;
  validRows: number;
  errorRows: number;
  errors: ImportRowError[];
}

export interface ImportResult {
  created: number;
  skipped: number;
  errors: { row: number; message: string }[];
}

// ─── Item ────────────────────────────────────────────────────────────────────
export type SizeType = 'none' | 'clothing' | 'shoes';

export interface ItemVariation {
  id: number;
  itemId: number;
  description: string;
  isActive: boolean;
}

export interface Item {
  id: number;
  name: string;
  type: string | null;
  unitOfMeasure: string;
  hasVariations: boolean;
  sizeType: SizeType;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  variations: ItemVariation[];
}

export interface CreateItemDto {
  name: string;
  type?: string;
  unitOfMeasure: string;
  hasVariations: boolean;
  sizeType?: SizeType;
  variations?: string[];
}

export interface UpdateItemDto {
  name?: string;
  type?: string;
  unitOfMeasure?: string;
  sizeType?: SizeType;
  isActive?: boolean;
}

// ─── Stock ───────────────────────────────────────────────────────────────────
export interface StockEntry {
  id: number;
  itemId: number;
  variationId: number;
  size: string;
  availableQuantity: number;
  minimumQuantity: number;
  item: Item;
  variation: ItemVariation;
}

export interface UpdateMinimumDto {
  minimum: number;
}

// ─── Shipment ────────────────────────────────────────────────────────────────
export type ShipmentStatus = 'open' | 'completed' | 'cancelled';

export interface ShipmentItem {
  id: number;
  itemId: number;
  variationId: number;
  size: string;
  quantity: number;
  item: Item;
  variation: ItemVariation;
}

export interface Shipment {
  id: number;
  shipmentDate: string;
  responsibleId: number;
  notes: string | null;
  status: ShipmentStatus;
  createdAt: string;
  responsible: User;
  items: ShipmentItem[];
}

export interface ShipmentLineDto {
  itemId: number;
  variationId: number;
  size: string;
  quantity: number;
}

export interface CreateShipmentDto {
  notes?: string;
  items: ShipmentLineDto[];
}

// ─── Order ───────────────────────────────────────────────────────────────────
export type OrderStatus = 'pending' | 'approved' | 'rejected' | 'delivered';

export interface OrderItem {
  id: number;
  itemId: number;
  variationId: number;
  size: string;
  requestedQuantity: number;
  approvedQuantity: number | null;
  item: Item;
  variation: ItemVariation;
}

export interface Order {
  id: number;
  userId: number;
  orderDate: string;
  status: OrderStatus;
  adminNotes: string | null;
  approvalDate: string | null;
  createdAt: string;
  updatedAt: string;
  user: User;
  items: OrderItem[];
}

export interface OrderLineDto {
  itemId: number;
  variationId: number;
  size: string;
  requestedQuantity: number;
}

export interface CreateOrderDto {
  items: OrderLineDto[];
}

export interface ReviewItemDto {
  orderItemId: number;
  approvedQuantity: number;
}

export interface ReviewOrderDto {
  status: 'approved' | 'rejected';
  adminNotes?: string;
  items?: ReviewItemDto[];
}

// ─── Movement ────────────────────────────────────────────────────────────────
export type MovementType = 'in' | 'out';
export type MovementOrigin = 'shipment' | 'order';

export interface Movement {
  id: number;
  itemId: number;
  variationId: number;
  size: string;
  movementType: MovementType;
  quantity: number;
  movementDate: string;
  originType: MovementOrigin;
  originId: number;
  notes: string | null;
  item: Item;
  variation: ItemVariation;
}

// ─── Pagination ──────────────────────────────────────────────────────────────
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  pageIndex: number;
  pageSize: number;
}

export interface ListParams {
  pageIndex?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: string;
}

// ─── Dashboard ───────────────────────────────────────────────────────────────
export interface DashboardStats {
  totalItems: number;
  lowStockItems: number;
  pendingOrders: number;
  totalUsers: number;
  recentMovements: Movement[];
  recentOrders: Order[];
}
