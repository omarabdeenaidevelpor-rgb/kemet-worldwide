/**
 * Static demo data returned by all API routes when DATABASE_URL is not set.
 * This allows the app to run fully in the browser for client demos.
 */

export const DEMO_CUSTOMERS = [
  { id: 'c1', fileNumber: 'KMT-C-2024-001', type: 'COMPANY', legalName: 'Global Trade Co.', primaryContactName: 'Ahmed Hassan', phone: '+20 100 123 4567', email: 'contact@globaltrade.com', country: 'EG', status: 'ACTIVE', creditLimit: 50000, billingAddress: 'Cairo, Egypt', shippingAddress: 'Cairo, Egypt', taxNumber: '123456789', accountManagerId: null, accountManager: null, notes: '', createdAt: '2024-01-15T10:00:00Z', updatedAt: '2024-01-15T10:00:00Z', _count: { shipments: 8, invoices: 6 } },
  { id: 'c2', fileNumber: 'KMT-C-2024-002', type: 'COMPANY', legalName: 'Nile Logistics Ltd.', primaryContactName: 'Sara Mohamed', phone: '+20 101 234 5678', email: 'info@nilelogistics.com', country: 'EG', status: 'ACTIVE', creditLimit: 75000, billingAddress: 'Alexandria, Egypt', shippingAddress: 'Alexandria, Egypt', taxNumber: '987654321', accountManagerId: null, accountManager: null, notes: '', createdAt: '2024-02-10T10:00:00Z', updatedAt: '2024-02-10T10:00:00Z', _count: { shipments: 12, invoices: 10 } },
  { id: 'c3', fileNumber: 'KMT-C-2024-003', type: 'INDIVIDUAL', legalName: 'Mohamed Ali Exports', primaryContactName: 'Mohamed Ali', phone: '+20 102 345 6789', email: 'mali@exports.com', country: 'EG', status: 'ACTIVE', creditLimit: 20000, billingAddress: 'Giza, Egypt', shippingAddress: 'Giza, Egypt', taxNumber: null, accountManagerId: null, accountManager: null, notes: '', createdAt: '2024-03-05T10:00:00Z', updatedAt: '2024-03-05T10:00:00Z', _count: { shipments: 3, invoices: 3 } },
  { id: 'c4', fileNumber: 'KMT-C-2024-004', type: 'COMPANY', legalName: 'Red Sea Shipping Corp.', primaryContactName: 'Karim Nasser', phone: '+20 103 456 7890', email: 'ops@redsea.com', country: 'SA', status: 'ACTIVE', creditLimit: 100000, billingAddress: 'Jeddah, Saudi Arabia', shippingAddress: 'Jeddah, Saudi Arabia', taxNumber: '456789123', accountManagerId: null, accountManager: null, notes: '', createdAt: '2024-03-20T10:00:00Z', updatedAt: '2024-03-20T10:00:00Z', _count: { shipments: 15, invoices: 12 } },
  { id: 'c5', fileNumber: 'KMT-C-2024-005', type: 'COMPANY', legalName: 'Delta Freight Solutions', primaryContactName: 'Nour Ibrahim', phone: '+20 104 567 8901', email: 'nour@deltafreight.com', country: 'EG', status: 'INACTIVE', creditLimit: 30000, billingAddress: 'Port Said, Egypt', shippingAddress: 'Port Said, Egypt', taxNumber: '321654987', accountManagerId: null, accountManager: null, notes: '', createdAt: '2024-04-01T10:00:00Z', updatedAt: '2024-04-01T10:00:00Z', _count: { shipments: 5, invoices: 4 } },
];

export const DEMO_SHIPMENTS = [
  { id: 's1', referenceNumber: 'KMT-S2024-001', mode: 'SEA', status: 'IN_TRANSIT', origin: 'Shanghai, China', destination: 'Alexandria, Egypt', originCountry: 'CN', destinationCountry: 'EG', carrier: 'COSCO Shipping', containerNumber: 'CSNU1234567', billOfLading: 'BL202400001', airwayBill: null, consignmentNote: null, departureDate: '2024-10-01T00:00:00Z', estimatedArrivalDate: '2024-10-25T00:00:00Z', actualArrivalDate: null, description: 'Electronic goods', cargoCategory: 'Electronics', packageCount: 50, weight: 2500, weightUnit: 'KG', volume: 15, volumeUnit: 'CBM', customerPrice: 8500, estimatedCosts: 6000, actualCosts: null, margin: null, customerId: 'c1', customer: { id: 'c1', legalName: 'Global Trade Co.', fileNumber: 'KMT-C-2024-001' }, assignedEmployeeId: null, assignedEmployee: null, isOffloaded: false, docsReceivedDate: '2024-09-28T00:00:00Z', freightForwarder: 'Kuehne+Nagel', createdAt: '2024-09-25T10:00:00Z', updatedAt: '2024-10-01T10:00:00Z', _count: { trackingEvents: 5, incidents: 0, documents: 3, containers: 1 } },
  { id: 's2', referenceNumber: 'KMT-A2024-002', mode: 'AIR', status: 'DELIVERED', origin: 'Dubai, UAE', destination: 'Cairo, Egypt', originCountry: 'AE', destinationCountry: 'EG', carrier: 'Emirates SkyCargo', containerNumber: null, billOfLading: null, airwayBill: 'AW202400002', consignmentNote: null, departureDate: '2024-09-15T00:00:00Z', estimatedArrivalDate: '2024-09-16T00:00:00Z', actualArrivalDate: '2024-09-16T14:00:00Z', description: 'Pharmaceutical supplies', cargoCategory: 'Healthcare', packageCount: 20, weight: 500, weightUnit: 'KG', volume: 3, volumeUnit: 'CBM', customerPrice: 4200, estimatedCosts: 3000, actualCosts: 2900, margin: 1300, customerId: 'c2', customer: { id: 'c2', legalName: 'Nile Logistics Ltd.', fileNumber: 'KMT-C-2024-002' }, assignedEmployeeId: null, assignedEmployee: null, isOffloaded: false, docsReceivedDate: '2024-09-14T00:00:00Z', freightForwarder: null, createdAt: '2024-09-10T10:00:00Z', updatedAt: '2024-09-16T15:00:00Z', _count: { trackingEvents: 8, incidents: 0, documents: 4, containers: 0 } },
  { id: 's3', referenceNumber: 'KMT-L2024-003', mode: 'LAND', status: 'IN_TRANSIT', origin: 'Cairo, Egypt', destination: 'Riyadh, Saudi Arabia', originCountry: 'EG', destinationCountry: 'SA', carrier: 'Saudi Cargo Lines', containerNumber: null, billOfLading: null, airwayBill: null, consignmentNote: 'CN202400003', departureDate: '2024-10-10T00:00:00Z', estimatedArrivalDate: '2024-10-14T00:00:00Z', actualArrivalDate: null, description: 'Food products', cargoCategory: 'Food & Beverage', packageCount: 200, weight: 8000, weightUnit: 'KG', volume: 40, volumeUnit: 'CBM', customerPrice: 6000, estimatedCosts: 4500, actualCosts: null, margin: null, customerId: 'c4', customer: { id: 'c4', legalName: 'Red Sea Shipping Corp.', fileNumber: 'KMT-C-2024-004' }, assignedEmployeeId: null, assignedEmployee: null, isOffloaded: false, docsReceivedDate: '2024-10-08T00:00:00Z', freightForwarder: null, createdAt: '2024-10-05T10:00:00Z', updatedAt: '2024-10-10T10:00:00Z', _count: { trackingEvents: 3, incidents: 1, documents: 2, containers: 0 } },
  { id: 's4', referenceNumber: 'KMT-S2024-004', mode: 'SEA', status: 'DELAYED', origin: 'Rotterdam, Netherlands', destination: 'Port Said, Egypt', originCountry: 'NL', destinationCountry: 'EG', carrier: 'MSC', containerNumber: 'MSCU7654321', billOfLading: 'BL202400004', airwayBill: null, consignmentNote: null, departureDate: '2024-09-20T00:00:00Z', estimatedArrivalDate: '2024-10-10T00:00:00Z', actualArrivalDate: null, description: 'Industrial machinery', cargoCategory: 'Machinery', packageCount: 5, weight: 12000, weightUnit: 'KG', volume: 60, volumeUnit: 'CBM', customerPrice: 15000, estimatedCosts: 11000, actualCosts: null, margin: null, customerId: 'c3', customer: { id: 'c3', legalName: 'Mohamed Ali Exports', fileNumber: 'KMT-C-2024-003' }, assignedEmployeeId: null, assignedEmployee: null, isOffloaded: false, docsReceivedDate: '2024-09-18T00:00:00Z', freightForwarder: 'DHL Global', createdAt: '2024-09-15T10:00:00Z', updatedAt: '2024-10-05T10:00:00Z', _count: { trackingEvents: 6, incidents: 2, documents: 5, containers: 1 } },
  { id: 's5', referenceNumber: 'KMT-A2024-005', mode: 'AIR', status: 'DRAFT', origin: 'London, UK', destination: 'Cairo, Egypt', originCountry: 'GB', destinationCountry: 'EG', carrier: null, containerNumber: null, billOfLading: null, airwayBill: null, consignmentNote: null, departureDate: null, estimatedArrivalDate: null, actualArrivalDate: null, description: 'Fashion garments', cargoCategory: 'Textiles', packageCount: 100, weight: 1200, weightUnit: 'KG', volume: 8, volumeUnit: 'CBM', customerPrice: 3500, estimatedCosts: 2500, actualCosts: null, margin: null, customerId: 'c2', customer: { id: 'c2', legalName: 'Nile Logistics Ltd.', fileNumber: 'KMT-C-2024-002' }, assignedEmployeeId: null, assignedEmployee: null, isOffloaded: false, docsReceivedDate: null, freightForwarder: null, createdAt: '2024-10-14T10:00:00Z', updatedAt: '2024-10-14T10:00:00Z', _count: { trackingEvents: 0, incidents: 0, documents: 1, containers: 0 } },
];

export const DEMO_EMPLOYEES = [
  { id: 'e1', employeeNumber: 'KMT-EMP-001', name: 'Ahmed Al-Rashidy', email: 'admin@kemet.com', phone: '+20 100 001 0001', department: 'Management', position: 'General Manager', isActive: true, hireDate: '2020-01-01T00:00:00Z', salary: null, createdAt: '2020-01-01T10:00:00Z', updatedAt: '2024-01-01T10:00:00Z' },
  { id: 'e2', employeeNumber: 'KMT-EMP-002', name: 'Mohamed Hassan', email: 'ops@kemet.com', phone: '+20 100 001 0002', department: 'Operations', position: 'Operations Manager', isActive: true, hireDate: '2020-06-01T00:00:00Z', salary: null, createdAt: '2020-06-01T10:00:00Z', updatedAt: '2024-01-01T10:00:00Z' },
  { id: 'e3', employeeNumber: 'KMT-EMP-003', name: 'Sara Mahmoud', email: 'finance@kemet.com', phone: '+20 100 001 0003', department: 'Finance', position: 'Accountant', isActive: true, hireDate: '2021-01-15T00:00:00Z', salary: null, createdAt: '2021-01-15T10:00:00Z', updatedAt: '2024-01-01T10:00:00Z' },
  { id: 'e4', employeeNumber: 'KMT-EMP-004', name: 'Karim Nasser', email: 'coordinator@kemet.com', phone: '+20 100 001 0004', department: 'Operations', position: 'Shipment Coordinator', isActive: true, hireDate: '2021-03-01T00:00:00Z', salary: null, createdAt: '2021-03-01T10:00:00Z', updatedAt: '2024-01-01T10:00:00Z' },
  { id: 'e5', employeeNumber: 'KMT-EMP-005', name: 'Nour El-Din', email: 'cs@kemet.com', phone: '+20 100 001 0005', department: 'Customer Service', position: 'Customer Service Agent', isActive: true, hireDate: '2022-01-01T00:00:00Z', salary: null, createdAt: '2022-01-01T10:00:00Z', updatedAt: '2024-01-01T10:00:00Z' },
];

export const DEMO_INVOICES = [
  { id: 'inv1', invoiceNumber: 'INV-2024-001', status: 'PAID', currency: 'USD', totalAmount: 8500, paidAmount: 8500, issueDate: '2024-09-25T00:00:00Z', dueDate: '2024-10-25T00:00:00Z', notes: '', customerId: 'c1', customer: { id: 'c1', legalName: 'Global Trade Co.' }, shipmentId: 's1', shipment: { id: 's1', referenceNumber: 'KMT-S2024-001' }, createdAt: '2024-09-25T10:00:00Z', updatedAt: '2024-09-25T10:00:00Z' },
  { id: 'inv2', invoiceNumber: 'INV-2024-002', status: 'PAID', currency: 'USD', totalAmount: 4200, paidAmount: 4200, issueDate: '2024-09-10T00:00:00Z', dueDate: '2024-10-10T00:00:00Z', notes: '', customerId: 'c2', customer: { id: 'c2', legalName: 'Nile Logistics Ltd.' }, shipmentId: 's2', shipment: { id: 's2', referenceNumber: 'KMT-A2024-002' }, createdAt: '2024-09-10T10:00:00Z', updatedAt: '2024-09-16T10:00:00Z' },
  { id: 'inv3', invoiceNumber: 'INV-2024-003', status: 'SENT', currency: 'USD', totalAmount: 6000, paidAmount: 0, issueDate: '2024-10-05T00:00:00Z', dueDate: '2024-11-05T00:00:00Z', notes: '', customerId: 'c4', customer: { id: 'c4', legalName: 'Red Sea Shipping Corp.' }, shipmentId: 's3', shipment: { id: 's3', referenceNumber: 'KMT-L2024-003' }, createdAt: '2024-10-05T10:00:00Z', updatedAt: '2024-10-05T10:00:00Z' },
  { id: 'inv4', invoiceNumber: 'INV-2024-004', status: 'OVERDUE', currency: 'USD', totalAmount: 15000, paidAmount: 5000, issueDate: '2024-09-15T00:00:00Z', dueDate: '2024-10-15T00:00:00Z', notes: 'Partial payment received', customerId: 'c3', customer: { id: 'c3', legalName: 'Mohamed Ali Exports' }, shipmentId: 's4', shipment: { id: 's4', referenceNumber: 'KMT-S2024-004' }, createdAt: '2024-09-15T10:00:00Z', updatedAt: '2024-10-01T10:00:00Z' },
];

export const DEMO_INCIDENTS = [
  { id: 'inc1', referenceNumber: 'INC-2024-001', title: 'Container Damage Reported', description: 'Container MSCU7654321 shows signs of water damage upon inspection at port.', status: 'IN_PROGRESS', severity: 'HIGH', shipmentId: 's4', shipment: { id: 's4', referenceNumber: 'KMT-S2024-004' }, reportedById: 'e4', reportedBy: { id: 'e4', name: 'Karim Nasser' }, assignedToId: 'e2', assignedTo: { id: 'e2', name: 'Mohamed Hassan' }, resolvedAt: null, createdAt: '2024-10-05T10:00:00Z', updatedAt: '2024-10-06T10:00:00Z' },
  { id: 'inc2', referenceNumber: 'INC-2024-002', title: 'Shipment Delay - Port Congestion', description: 'Port Said experiencing heavy congestion causing 5-day delay.', status: 'OPEN', severity: 'MEDIUM', shipmentId: 's4', shipment: { id: 's4', referenceNumber: 'KMT-S2024-004' }, reportedById: 'e2', reportedBy: { id: 'e2', name: 'Mohamed Hassan' }, assignedToId: null, assignedTo: null, resolvedAt: null, createdAt: '2024-10-08T10:00:00Z', updatedAt: '2024-10-08T10:00:00Z' },
  { id: 'inc3', referenceNumber: 'INC-2024-003', title: 'Documentation Missing', description: 'Required customs documents missing for Land shipment to Riyadh.', status: 'OPEN', severity: 'HIGH', shipmentId: 's3', shipment: { id: 's3', referenceNumber: 'KMT-L2024-003' }, reportedById: 'e4', reportedBy: { id: 'e4', name: 'Karim Nasser' }, assignedToId: 'e4', assignedTo: { id: 'e4', name: 'Karim Nasser' }, resolvedAt: null, createdAt: '2024-10-11T10:00:00Z', updatedAt: '2024-10-11T10:00:00Z' },
];

export const DEMO_DASHBOARD = {
  kpis: {
    totalCustomers: 5,
    totalShipments: 5,
    inTransit: 2,
    delivered: 1,
    delayed: 1,
    openIncidents: 3,
    totalInvoiced: 33700,
    totalCollected: 17700,
    outstanding: 16000,
    currency: 'USD',
    missingRateCurrencies: [],
    canViewFinance: true,
  },
  charts: {
    shipmentsByStatus: [
      { status: 'IN_TRANSIT', count: 2 },
      { status: 'DELIVERED', count: 1 },
      { status: 'DELAYED', count: 1 },
      { status: 'DRAFT', count: 1 },
    ],
    shipmentsByMode: [
      { mode: 'SEA', count: 2 },
      { mode: 'AIR', count: 2 },
      { mode: 'LAND', count: 1 },
    ],
    monthlyShipments: [
      { month: 'Jun 2024', count: 1 },
      { month: 'Jul 2024', count: 0 },
      { month: 'Aug 2024', count: 1 },
      { month: 'Sep 2024', count: 2 },
      { month: 'Oct 2024', count: 1 },
    ],
    monthlyRevenue: [
      { month: 'Aug 2024', invoiced: 4200, collected: 4200 },
      { month: 'Sep 2024', invoiced: 23500, collected: 13500 },
      { month: 'Oct 2024', invoiced: 6000, collected: 0 },
    ],
    topCustomers: [
      { name: 'Red Sea Shipping Corp.', amount: 15000 },
      { name: 'Global Trade Co.', amount: 8500 },
      { name: 'Nile Logistics Ltd.', amount: 6700 },
      { name: 'Mohamed Ali Exports', amount: 3500 },
    ],
  },
};

export const DEMO_CURRENCIES = [
  { id: 'cur1', code: 'USD', name: 'US Dollar', symbol: '$', exchangeRate: 1, isBase: true, isActive: true, updatedAt: '2024-10-01T00:00:00Z' },
  { id: 'cur2', code: 'EGP', name: 'Egyptian Pound', symbol: 'ج.م', exchangeRate: 48.5, isBase: false, isActive: true, updatedAt: '2024-10-01T00:00:00Z' },
  { id: 'cur3', code: 'EUR', name: 'Euro', symbol: '€', exchangeRate: 0.93, isBase: false, isActive: true, updatedAt: '2024-10-01T00:00:00Z' },
  { id: 'cur4', code: 'SAR', name: 'Saudi Riyal', symbol: 'ر.س', exchangeRate: 3.75, isBase: false, isActive: true, updatedAt: '2024-10-01T00:00:00Z' },
];
