/**
 * System accounts shown on the login page (quick sign-in) and created by `npm run db:seed`.
 * Single source of truth — the seed script imports this same list.
 *
 * To hide the panel on a public deployment set: NEXT_PUBLIC_SHOW_DEMO_ACCOUNTS="false"
 */
export interface DemoAccount {
  role: string;
  email: string;
  password: string;
  name: string;
  labelEn: string;
  labelAr: string;
  emoji: string;
}

export const DEMO_ACCOUNTS: readonly DemoAccount[] = [
  { role: 'GENERAL_MANAGER', email: 'admin@kemet.com', password: 'KemetAdmin2024!', name: 'Ahmed Al-Rashidy', labelEn: 'General Manager', labelAr: 'المدير العام', emoji: '👑' },
  { role: 'OPERATIONS_MANAGER', email: 'ops@kemet.com', password: 'KemetOps2024!', name: 'Mohamed Hassan', labelEn: 'Operations Manager', labelAr: 'مدير العمليات', emoji: '⚙️' },
  { role: 'ACCOUNTANT', email: 'finance@kemet.com', password: 'KemetFinance2024!', name: 'Sara Mahmoud', labelEn: 'Accountant', labelAr: 'المحاسب', emoji: '💰' },
  { role: 'SHIPMENT_COORDINATOR', email: 'coordinator@kemet.com', password: 'KemetCoord2024!', name: 'Karim Nasser', labelEn: 'Shipment Coordinator', labelAr: 'منسق الشحنات', emoji: '🚢' },
  { role: 'CUSTOMER_SERVICE_AGENT', email: 'cs@kemet.com', password: 'KemetCS2024!', name: 'Nour El-Din', labelEn: 'Customer Service', labelAr: 'خدمة العملاء', emoji: '🎧' },
  { role: 'SALES_REPRESENTATIVE', email: 'sales@kemet.com', password: 'KemetSales2024!', name: 'Dina Fahmy', labelEn: 'Sales Representative', labelAr: 'مندوب المبيعات', emoji: '📈' },
  { role: 'AUDITOR', email: 'auditor@kemet.com', password: 'KemetAudit2024!', name: 'Omar Abdallah', labelEn: 'Auditor (read-only)', labelAr: 'المراجع (قراءة فقط)', emoji: '🔍' },
] as const;

export const SHOW_DEMO_ACCOUNTS = process.env.NEXT_PUBLIC_SHOW_DEMO_ACCOUNTS !== 'false';
