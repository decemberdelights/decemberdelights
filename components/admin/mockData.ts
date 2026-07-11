import { Stats, App, MenuItem, Product, Job, Order, OrderStats } from "./types";

const now = new Date();
const daysAgo = (d: number) => new Date(now.getTime() - d * 86400000).toISOString();
const hoursAgo = (h: number) => new Date(now.getTime() - h * 3600000).toISOString();

export const MOCK_STATS: Stats = {
  franchise_count: 24,
  career_count: 18,
  contact_count: 31,
  menu_count: 42,
  product_count: 16,
  job_opening_count: 5,
  order_count: 127,
  total_revenue: 384250,
  admin_count: 2,
  pending_franchise: 8,
  pending_careers: 4,
  pending_contacts: 6,
  submitted_franchise: 3,
  under_process_franchise: 5,
  approved_franchise: 6,
  rejected_franchise: 5,
  approved_careers: 7,
  rejected_careers: 3,
  pending_orders: 12,
  preparing_orders: 5,
  delivered_orders: 98,
  cancelled_orders: 12,
  today_orders: 8,
  today_revenue: 4850,
  products_online: 14,
  franchise_month_count: 7,
};

export const MOCK_FRANCHISES: App[] = [
  { id: 101, full_name: "Arjun Reddy", email: "arjun.reddy@gmail.com", phone: "9876543210", status: "pending", created_at: daysAgo(1), preferred_location: "Madhapur, Hyderabad" },
  { id: 102, full_name: "Priya Sharma", email: "priya.s@outlook.com", phone: "8765432109", status: "submitted", created_at: daysAgo(2), preferred_location: "Jubilee Hills, Hyderabad" },
  { id: 103, full_name: "Ravi Kumar", email: "ravi.kumar@yahoo.com", phone: "7654321098", status: "under_process", admin_notes: "Reviewing financials", created_at: daysAgo(5), preferred_location: "Gachibowli, Hyderabad" },
  { id: 104, full_name: "Sneha Patel", email: "sneha.p@gmail.com", phone: "6543210987", status: "approved", admin_notes: "Approved — great profile", created_at: daysAgo(8), preferred_location: "Banjara Hills, Hyderabad" },
  { id: 105, full_name: "Vikram Singh", email: "vikram.s@rediffmail.com", phone: "5432109876", status: "rejected", admin_notes: "Incomplete documents", created_at: daysAgo(10), preferred_location: "Kondapur, Hyderabad" },
  { id: 106, full_name: "Meera Joshi", email: "meera.j@gmail.com", phone: "4321098765", status: "pending", created_at: daysAgo(0), preferred_location: "Secunderabad, Hyderabad" },
  { id: 107, full_name: "Karthik Nair", email: "karthik.n@proton.me", phone: "3210987654", status: "approved", admin_notes: "Location finalized", created_at: daysAgo(12), preferred_location: "HITEC City, Hyderabad" },
  { id: 108, full_name: "Divya Menon", email: "divya.m@gmail.com", phone: "2109876543", status: "pending", created_at: daysAgo(0), preferred_location: "Ameerpet, Hyderabad" },
];

export const MOCK_CAREERS: App[] = [
  { id: 201, full_name: "Amit Verma", email: "amit.v@gmail.com", phone: "9123456780", status: "pending", position: "Barista", created_at: daysAgo(1) },
  { id: 202, full_name: "Neha Gupta", email: "neha.g@outlook.com", phone: "9234567801", status: "approved", position: "Chef", admin_notes: "Hired — starting Monday", created_at: daysAgo(3) },
  { id: 203, full_name: "Rahul Tiwari", email: "rahul.t@yahoo.com", phone: "9345678012", status: "pending", position: "Floor Manager", created_at: daysAgo(2) },
  { id: 204, full_name: "Pooja Das", email: "pooja.d@gmail.com", phone: "9456780123", status: "rejected", position: "Barista", admin_notes: "Lacked experience", created_at: daysAgo(7) },
  { id: 205, full_name: "Suresh Babu", email: "suresh.b@gmail.com", phone: "9567801234", status: "pending", position: "Sous Chef", created_at: daysAgo(0) },
  { id: 206, full_name: "Kavitha R.", email: "kavitha.r@rediffmail.com", phone: "9678012345", status: "submitted", position: "Cashier", created_at: daysAgo(4) },
];

export const MOCK_CONTACTS: App[] = [
  { id: 301, name: "Lakshmi Devi", email: "lakshmi@gmail.com", phone: "9800011111", subject: "Catering Inquiry", message: "Hi, I would like to book your cafe for a birthday party of 50 people on the 25th. Do you offer catering?", status: "pending", created_at: hoursAgo(3) },
  { id: 302, name: "Mohammed Ali", email: "mali@outlook.com", phone: "9800022222", subject: "Feedback", message: "Amazing espresso! Best I've had in Hyderabad. Will definitely come back.", status: "approved", admin_notes: "Thank you card sent", created_at: daysAgo(2) },
  { id: 303, name: "Anjali N.", email: "anjali.n@yahoo.com", phone: "9800033333", subject: "Franchise Question", message: "What is the investment required for a franchise? I'm interested in the Gachibowli area.", status: "pending", created_at: daysAgo(1) },
  { id: 304, name: "Rajesh K.", email: "rajesh.k@gmail.com", phone: "9800044444", subject: "Ambiance Feedback", message: "The interior is beautiful but the music was too loud. Please consider lowering the volume.", status: "submitted", created_at: daysAgo(3) },
  { id: 305, name: "Swathi Reddy", email: "swathi.r@gmail.com", phone: "9800055555", subject: "Event Hosting", message: "Can you host a corporate event for 30 people? Looking for options.", status: "pending", created_at: hoursAgo(6) },
];

export const MOCK_MENU: MenuItem[] = [
  { id: 1, category: "Coffee", name: "Classic Espresso", description: "Rich, bold single-origin espresso", price: "₹180", image_url: "/items/espresso.jpg", is_active: true, sort_order: 1 },
  { id: 2, category: "Coffee", name: "Cappuccino", description: "Creamy cappuccino with latte art", price: "₹220", image_url: "/items/cappuccino.jpg", is_active: true, sort_order: 2 },
  { id: 3, category: "Coffee", name: "Cold Brew", description: "24-hour steeped cold brew concentrate", price: "₹250", image_url: "/items/cold-brew.jpg", is_active: true, sort_order: 3 },
  { id: 4, category: "Desserts", name: "Tiramisu", description: "Coffee-soaked ladyfingers with mascarpone", price: "₹350", image_url: "/items/tiramisu.jpg", is_active: true, sort_order: 4 },
  { id: 5, category: "Desserts", name: "Basque Burnt Cheesecake", description: "Caramelized outside, creamy inside", price: "₹320", image_url: "/items/basque-cheesecake.jpg", is_active: true, sort_order: 5 },
  { id: 6, category: "Desserts", name: "Fudge Brownie", description: "Dense, gooey dark chocolate brownie", price: "₹280", image_url: "/items/fudge-brownie.jpg", is_active: true, sort_order: 6 },
  { id: 7, category: "Main Course", name: "Marry Me Chicken", description: "Creamy sun-dried tomato pasta", price: "₹420", image_url: "/items/marry-me-chicken.jpg", is_active: true, sort_order: 7 },
  { id: 8, category: "Beverages", name: "Bubble Tea", description: "Milk tea with chewy tapioca pearls", price: "₹200", image_url: "/items/bubble-tea.jpg", is_active: true, sort_order: 8 },
  { id: 9, category: "Coffee", name: "Flat White", description: "Velvety microfoam over ristretto", price: "₹240", image_url: "/items/flat-white.jpg", is_active: true, sort_order: 9 },
  { id: 10, category: "Main Course", name: "Pesto Pasta", description: "Fresh basil pesto with penne", price: "₹380", image_url: "/items/pesto-pasta.jpg", is_active: false, sort_order: 10 },
];

export const MOCK_PRODUCTS: Product[] = [
  { id: 1, name: "DD Signature Blend", description: "Our signature house blend — smooth, balanced, with notes of dark chocolate and caramel", price: 450, original_price: 500, category: "Coffee Beans", image_url: "/items/espresso.jpg", stock: 45, is_active: true, offer: "10% off", sort_order: 1 },
  { id: 2, name: "Single Origin Ethiopian", description: "Bright, fruity Yirgacheffe with wine-like acidity", price: 680, original_price: 680, category: "Coffee Beans", image_url: "/items/cold-brew.jpg", stock: 22, is_active: true, offer: "", sort_order: 2 },
  { id: 3, name: "DD Espresso Powder", description: "Fine-ground espresso for home brewing", price: 350, original_price: 400, category: "Coffee Powder", image_url: "/items/espresso.jpg", stock: 60, is_active: true, offer: "12% off", sort_order: 3 },
  { id: 4, name: "DD Ceramic Mug", description: "Handcrafted 300ml ceramic mug in DD green", price: 599, original_price: 599, category: "Merchandise", image_url: "/items/cappuccino.jpg", stock: 30, is_active: true, offer: "", sort_order: 4 },
  { id: 5, name: "Cold Brew Kit", description: "Glass carafe + filter + 250g DD blend", price: 1200, original_price: 1500, category: "Brewing Kits", image_url: "/items/cold-brew.jpg", stock: 12, is_active: true, offer: "20% off", sort_order: 5 },
  { id: 6, name: "DD Tote Bag", description: "Canvas tote bag with DD branding", price: 399, original_price: 399, category: "Merchandise", image_url: "/items/flat-white.jpg", stock: 0, is_active: false, offer: "", sort_order: 6 },
  { id: 7, name: "DD Travel Tumbler", description: "Double-walled stainless steel 350ml tumbler", price: 850, original_price: 950, category: "Merchandise", image_url: "/items/cappuccino.jpg", stock: 18, is_active: true, offer: "10% off", sort_order: 7 },
  { id: 8, name: "Guatemala Antigua", description: "Full-bodied with smoky chocolate undertones", price: 720, original_price: 720, category: "Coffee Beans", image_url: "/items/espresso.jpg", stock: 15, is_active: true, offer: "", sort_order: 8 },
];

const makeItems = (names: string[]) => JSON.stringify(names.map((n, i) => ({ id: i + 1, name: n, quantity: Math.floor(Math.random() * 3) + 1, price: [180, 220, 250, 350, 320][i % 5] })));

export const MOCK_ORDERS: Order[] = [
  { id: 1001, customer_name: "Rahul Sharma", customer_email: "rahul@gmail.com", customer_phone: "9876500001", customer_address: "Madhapur, Hyderabad", items: makeItems(["Classic Espresso", "Tiramisu"]), total: 530, status: "delivered", payment_method: "upi", payment_status: "paid", notes: "", created_at: daysAgo(0), updated_at: daysAgo(0) },
  { id: 1002, customer_name: "Priya Nair", customer_email: "priya.n@gmail.com", customer_phone: "9876500002", customer_address: "Jubilee Hills, Hyderabad", items: makeItems(["Cappuccino", "Fudge Brownie", "Cold Brew"]), total: 690, status: "preparing", payment_method: "card", payment_status: "paid", notes: "Extra hot cappuccino", created_at: daysAgo(0), updated_at: daysAgo(0) },
  { id: 1003, customer_name: "Karthik Rao", customer_email: "karthik.r@yahoo.com", customer_phone: "9876500003", customer_address: "Gachibowli, Hyderabad", items: makeItems(["Flat White", "Basque Burnt Cheesecake"]), total: 560, status: "pending", payment_method: "cash", payment_status: "pending", notes: "", created_at: daysAgo(0), updated_at: daysAgo(0) },
  { id: 1004, customer_name: "Sneha Iyer", customer_email: "sneha.i@gmail.com", customer_phone: "9876500004", customer_address: "Banjara Hills, Hyderabad", items: makeItems(["Marry Me Chicken", "Bubble Tea"]), total: 620, status: "delivered", payment_method: "upi", payment_status: "paid", notes: "", created_at: daysAgo(1), updated_at: daysAgo(1) },
  { id: 1005, customer_name: "Vikram Das", customer_email: "vikram.d@outlook.com", customer_phone: "9876500005", customer_address: "Secunderabad, Hyderabad", items: makeItems(["Classic Espresso", "Classic Espresso", "Tiramisu"]), total: 710, status: "delivered", payment_method: "card", payment_status: "paid", notes: "Two espressos, one tiramisu", created_at: daysAgo(1), updated_at: daysAgo(1) },
  { id: 1006, customer_name: "Anjali Mehra", customer_email: "anjali.m@gmail.com", customer_phone: "9876500006", customer_address: "HITEC City, Hyderabad", items: makeItems(["Cold Brew", "Fudge Brownie"]), total: 530, status: "cancelled", payment_method: "upi", payment_status: "refunded", notes: "Customer cancelled — changed mind", created_at: daysAgo(2), updated_at: daysAgo(2) },
  { id: 1007, customer_name: "Deepak Reddy", customer_email: "deepak.r@gmail.com", customer_phone: "9876500007", customer_address: "Kondapur, Hyderabad", items: makeItems(["Cappuccino", "Basque Burnt Cheesecake"]), total: 570, status: "delivered", payment_method: "cash", payment_status: "paid", notes: "", created_at: daysAgo(2), updated_at: daysAgo(2) },
  { id: 1008, customer_name: "Meera Singh", customer_email: "meera.s@yahoo.com", customer_phone: "9876500008", customer_address: "Ameerpet, Hyderabad", items: makeItems(["Flat White", "Marry Me Chicken"]), total: 660, status: "pending", payment_method: "upi", payment_status: "pending", notes: "", created_at: daysAgo(0), updated_at: daysAgo(0) },
  { id: 1009, customer_name: "Arjun Menon", customer_email: "arjun.m@gmail.com", customer_phone: "9876500009", customer_address: "Madhapur, Hyderabad", items: makeItems(["Bubble Tea", "Tiramisu", "Classic Espresso"]), total: 750, status: "preparing", payment_method: "card", payment_status: "paid", notes: "Birthday celebration", created_at: daysAgo(0), updated_at: daysAgo(0) },
  { id: 1010, customer_name: "Lakshmi Devi", customer_email: "lakshmi.d@gmail.com", customer_phone: "9876500010", customer_address: "Jubilee Hills, Hyderabad", items: makeItems(["Cold Brew"]), total: 250, status: "delivered", payment_method: "cash", payment_status: "paid", notes: "", created_at: daysAgo(3), updated_at: daysAgo(3) },
  { id: 1011, customer_name: "Ravi Teja", customer_email: "ravi.t@gmail.com", customer_phone: "9876500011", customer_address: "Gachibowli, Hyderabad", items: makeItems(["Cappuccino", "Fudge Brownie", "Cold Brew"]), total: 690, status: "pending", payment_method: "upi", payment_status: "pending", notes: "", created_at: daysAgo(0), updated_at: daysAgo(0) },
  { id: 1012, customer_name: "Pooja Verma", customer_email: "pooja.v@outlook.com", customer_phone: "9876500012", customer_address: "Banjara Hills, Hyderabad", items: makeItems(["Classic Espresso", "Basque Burnt Cheesecake"]), total: 500, status: "delivered", payment_method: "card", payment_status: "paid", notes: "", created_at: daysAgo(4), updated_at: daysAgo(4) },
];

export const MOCK_ORDER_STATS: OrderStats = {
  daily: {
    [new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString().slice(0, 10)]: { orders: 8, revenue: 4850 },
    [daysAgo(1).slice(0, 10)]: { orders: 12, revenue: 7200 },
    [daysAgo(2).slice(0, 10)]: { orders: 6, revenue: 3180 },
    [daysAgo(3).slice(0, 10)]: { orders: 10, revenue: 5900 },
    [daysAgo(4).slice(0, 10)]: { orders: 9, revenue: 4750 },
  },
  monthly: {
    [`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`]: { orders: 127, revenue: 384250 },
  },
  today_orders: 8,
  today_revenue: 4850,
  week_orders: 45,
  week_revenue: 25880,
  month_orders: 127,
  month_revenue: 384250,
  total_orders: 127,
  total_revenue: 384250,
  pending: 12,
  preparing: 5,
  delivered: 98,
  cancelled: 12,
};

export const MOCK_JOBS: Job[] = [
  { id: 1, title: "Head Barista", department: "Kitchen", location: "Madhapur, Hyderabad", description: "Lead our coffee program, train junior baristas, and ensure consistent quality across all espresso-based drinks.", requirements: "3+ years specialty coffee experience, latte art proficiency, SCA certification preferred", salary_range: "₹30,000 — ₹45,000", job_type: "full-time", is_active: true },
  { id: 2, title: "Pastry Chef", department: "Kitchen", location: "Madhapur, Hyderabad", description: "Create and execute our dessert menu, develop seasonal specials, and maintain quality standards.", requirements: "2+ years pastry experience, food safety certification, creative portfolio", salary_range: "₹25,000 — ₹40,000", job_type: "full-time", is_active: true },
  { id: 3, title: "Floor Manager", department: "Operations", location: "Madhapur, Hyderabad", description: "Oversee daily floor operations, manage staff scheduling, and ensure excellent customer experience.", requirements: "3+ years F&B management, strong communication skills, team leadership", salary_range: "₹35,000 — ₹50,000", job_type: "full-time", is_active: true },
  { id: 4, title: "Barista (Part-Time)", department: "Kitchen", location: "Secunderabad, Hyderabad", description: "Prepare and serve coffee drinks, maintain cleanliness, and provide friendly customer service.", requirements: "1+ year barista experience, flexible schedule, passion for coffee", salary_range: "₹15,000 — ₹20,000", job_type: "part-time", is_active: true },
  { id: 5, title: "Marketing Intern", department: "Marketing", location: "Remote", description: "Assist with social media content creation, community engagement, and marketing campaigns.", requirements: "Currently pursuing marketing/communications degree, social media savvy, creative thinker", salary_range: "₹10,000 — ₹15,000", job_type: "internship", is_active: false },
];
