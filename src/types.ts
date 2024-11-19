// export interface Entry {
//   id: string;
//   date: Date;  // Changed from string to Date
//   invoice: string;
//   description: string;
//   debit: number;
//   credit: number;
// }

// export interface Statement {
//   id: string;
//   company: string;
//   place: string;
//   date: string;
//   title?: string;
//   entries: Entry[];
// }

// export interface StatementSummary {
//   totalDebit: number;
//   totalCredit: number;
//   difference: number;
//   numberOfCredits: number;
//   numberOfDebits: number;
// }

export interface Statement {
  id: string;
  company: string;
  place: string;
  date: Date;
  entries: Entry[];
}

export interface Entry {
  id: string;
  date: Date;
  invoice: string;
  description: string;
  debit: number;
  credit: number;
}