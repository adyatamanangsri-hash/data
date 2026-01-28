
export enum TransactionStatus {
  PENDING = 'PENDING',
  COMPLETED = 'COMPLETED'
}

export enum TradeType {
  PENJUALAN = 'PENJUALAN',
  PEMBELIAN = 'PEMBELIAN'
}

export enum UserRole {
  MASTER = 'MASTER',
  OPERATOR = 'OPERATOR'
}

export interface User {
  id: string;
  name: string;
  pin: string;
  role: UserRole;
}

export interface PartyDetail {
  name: string;
  address: string;
  contact: string;
}

export interface MasterData {
  suppliers: PartyDetail[];
  customers: PartyDetail[];
  cargoTypes: string[];
  operators: User[]; 
}

export interface Transaction {
  id: string;
  ticketNumber: string;
  plateNumber: string;
  driverName: string;
  cargoType: string;
  partyName: string; 
  type: TradeType;
  weight1: number; 
  weight2?: number;
  netWeight?: number;
  timestamp1: number;
  timestamp2?: number;
  status: TransactionStatus;
  operator: string;
  recordedByRole: UserRole; 
}

export interface SerialConfig {
  baudRate: number;
  dataBits: number;
  parity: 'none' | 'even' | 'odd';
  stopBits: number;
  autoExtract: boolean;
}

export interface AppConfig {
  companyName: string;
  companyAddress: string;
  printerMode: 'thermal' | 'dotmatrix';
  paperSize: '58mm' | '80mm' | 'A4';
  ticketHeader: string;
  ticketFooter: string;
  autoPrint?: boolean; // Fitur baru
}
