-- =============================================================================
-- December Delights — Seed Data
-- Run AFTER 001_create_tables.sql
-- Run in Supabase SQL Editor: https://supabase.com/dashboard
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Admin user (password: admin123 — bcrypt hash)
-- The seed.py also creates this at runtime, but including here for DB-level seed
-- ---------------------------------------------------------------------------
INSERT INTO admin_users (username, password_hash, role, is_active)
SELECT 'admin', '$2b$12$LJ3m4ris7Hke5dmFOR9kR.zLbNQpVz4VQeVfHnZ2YfXkDdVdH8Yq', 'super_admin', true
WHERE NOT EXISTS (SELECT 1 FROM admin_users WHERE username = 'admin');

-- ---------------------------------------------------------------------------
-- Products (shop items)
-- ---------------------------------------------------------------------------
INSERT INTO products (name, description, price, original_price, category, image_url, stock, is_active, offer, sort_order)
VALUES
  ('Espresso', 'Rich single-shot espresso made from premium Arabica beans', 120, 150, 'Coffee', '/items/espresso.jpg', 100, true, '10% OFF', 1),
  ('Cappuccino', 'Classic cappuccino with velvety steamed milk foam', 150, 180, 'Coffee', '/items/espresso.jpg', 80, true, '', 2),
  ('Vanilla Latte', 'Smooth latte infused with Madagascar vanilla', 180, 200, 'Coffee', '/items/espresso.jpg', 70, true, '', 3),
  ('Iced Americano', 'Chilled double-shot espresso over ice', 160, 190, 'Coffee', '/items/espresso.jpg', 90, true, '15% OFF', 4),
  ('Basque Cheesecake', 'Creamy burnt Basque-style cheesecake with caramelised top', 350, 400, 'Dessert', '/items/basque-cheesecake.jpg', 25, true, '10% OFF', 5),
  ('Tiramisu', 'Classic Italian tiramisu layered with mascarpone and espresso', 320, 380, 'Dessert', '/items/tiramisu.jpg', 30, true, '', 6),
  ('Fudge Brownie', 'Warm chocolate fudge brownie with a gooey centre', 180, 220, 'Dessert', '/items/fudge-brownie.jpg', 40, true, '20% OFF', 7),
  ('Bubble Tea', 'Refreshing milk tea with chewy tapioca pearls', 200, 250, 'Beverages', '/items/bubble-tea.jpg', 60, true, '', 8),
  ('Marry Me Chicken', 'Creamy Tuscan chicken pasta — our signature main course', 380, 450, 'Main Course', '/items/marry-me-chicken.jpg', 35, true, '15% OFF', 9),
  ('Grilled Paneer Wrap', 'Smoky grilled paneer with fresh veggies in a whole wheat wrap', 220, 260, 'Main Course', '/items/marry-me-chicken.jpg', 50, true, '', 10),
  ('Masala Chai', 'Traditional Indian spiced chai brewed fresh', 80, 100, 'Beverages', '/items/bubble-tea.jpg', 120, true, '20% OFF', 11),
  ('Croissant', 'Flaky golden butter croissant, baked fresh daily', 100, 120, 'Bakery', '/items/basque-cheesecake.jpg', 45, true, '', 12);

-- ---------------------------------------------------------------------------
-- Menu items (café dine-in menu)
-- ---------------------------------------------------------------------------
INSERT INTO menu_items (name, category, description, price, image_url, is_active, sort_order)
VALUES
  ('Espresso', 'Hot Beverages', 'Bold single-shot espresso', '₹120', '/items/espresso.jpg', true, 1),
  ('Cappuccino', 'Hot Beverages', 'Espresso with steamed milk foam', '₹150', '/items/espresso.jpg', true, 2),
  ('Vanilla Latte', 'Hot Beverages', 'Creamy latte with vanilla', '₹180', '/items/espresso.jpg', true, 3),
  ('Iced Americano', 'Cold Beverages', 'Chilled espresso over ice', '₹160', '/items/espresso.jpg', true, 4),
  ('Bubble Tea', 'Cold Beverages', 'Milk tea with tapioca pearls', '₹200', '/items/bubble-tea.jpg', true, 5),
  ('Masala Chai', 'Hot Beverages', 'Traditional spiced Indian chai', '₹80', '/items/bubble-tea.jpg', true, 6),
  ('Basque Cheesecake', 'Desserts', 'Burnt Basque-style cheesecake', '₹350', '/items/basque-cheesecake.jpg', true, 7),
  ('Tiramisu', 'Desserts', 'Classic Italian tiramisu', '₹320', '/items/tiramisu.jpg', true, 8),
  ('Fudge Brownie', 'Desserts', 'Warm chocolate fudge brownie', '₹180', '/items/fudge-brownie.jpg', true, 9),
  ('Marry Me Chicken', 'Mains', 'Creamy Tuscan chicken pasta', '₹380', '/items/marry-me-chicken.jpg', true, 10),
  ('Grilled Paneer Wrap', 'Mains', 'Smoky paneer in whole wheat wrap', '₹220', '/items/marry-me-chicken.jpg', true, 11),
  ('Croissant', 'Bakery', 'Freshly baked butter croissant', '₹100', '/items/basque-cheesecake.jpg', true, 12);

-- ---------------------------------------------------------------------------
-- Jobs
-- ---------------------------------------------------------------------------
INSERT INTO jobs (title, department, location, description, requirements, salary_range, job_type, is_active)
VALUES
  ('Barista', 'Kitchen', 'Bangalore', 'Prepare and serve specialty coffee drinks. Maintain cleanliness of the coffee station and assist customers with menu selections.',
   '1+ years barista experience, knowledge of espresso machines, friendly personality, ability to work weekends.', '₹15,000 - ₹22,000/month', 'full-time', true),
  ('Kitchen Helper', 'Kitchen', 'Bangalore', 'Assist the head chef with food preparation, cleaning, and inventory management during peak hours.',
   'No prior experience required, food safety knowledge preferred, ability to stand for long periods.', '₹12,000 - ₹18,000/month', 'full-time', true),
  ('Store Manager', 'Management', 'Bangalore', 'Oversee daily café operations, manage staff schedules, handle customer escalations, and ensure revenue targets are met.',
   '3+ years F&B management, strong leadership skills, P&L experience, knowledge of POS systems.', '₹30,000 - ₹45,000/month', 'full-time', true),
  ('Marketing Intern', 'Marketing', 'Remote / Bangalore', 'Support social media campaigns, content creation, and influencer outreach for the brand.',
   'Currently pursuing or recently completed degree in Marketing/Communications, active on social media, creative mindset.', '₹10,000 - ₹15,000/month', 'internship', true),
  ('Delivery Executive', 'Operations', 'Bangalore', 'Deliver orders to customers on time, handle cash/Card-on-delivery payments, and maintain delivery vehicle.',
   'Valid two-wheeler license, smartphone, knowledge of local area, punctual and reliable.', '₹14,000 - ₹20,000/month', 'full-time', true);

-- ---------------------------------------------------------------------------
-- Sample franchise applications
-- ---------------------------------------------------------------------------
INSERT INTO franchise_applications (full_name, email, phone, business_experience, preferred_location, investment_capability, message, status, login_id, payment_status, tc_accepted, tc_language)
VALUES
  ('Rahul Sharma', 'rahul.sharma@example.com', '9876543210', '5 years in restaurant business', 'Whitefield, Bangalore', '25-50 Lakhs', 'Interested in opening a December Delights outlet near my locality.', 'submitted', 'DD-A1B2C3D4E5F6', 'unpaid', true, 'en'),
  ('Priya Patel', 'priya.patel@example.com', '9123456789', '3 years running a bakery', 'Koramangala, Bangalore', '10-25 Lakhs', 'Looking for a franchise opportunity in the F&B space.', 'under_process', 'DD-F6E5D4C3B2A1', 'unpaid', true, 'en'),
  ('Amit Singh', 'amit.singh@example.com', '9988776655', 'No prior experience but strong business acumen', 'HSR Layout, Bangalore', '50+ Lakhs', 'Want to invest in a proven café brand.', 'pending', 'DD-112233445566', 'unpaid', true, 'en');

-- ---------------------------------------------------------------------------
-- Sample career applications
-- ---------------------------------------------------------------------------
INSERT INTO career_applications (full_name, email, phone, position, message, status)
VALUES
  ('Neha Gupta', 'neha.gupta@email.com', '9871234567', 'Barista', 'I have 2 years of experience as a barista and am passionate about specialty coffee.', 'submitted'),
  ('Vikram Reddy', 'vikram.r@email.com', '9129876543', 'Store Manager', 'Currently managing a cafe chain in Mumbai. Looking for growth opportunities in Bangalore.', 'under_process'),
  ('Sneha Iyer', 'sneha.iyer@email.com', '9900112233', 'Kitchen Helper', 'Eager to learn and grow in the F&B industry. Available for immediate joining.', 'pending');

-- ---------------------------------------------------------------------------
-- Sample contact messages
-- ---------------------------------------------------------------------------
INSERT INTO contact_messages (name, email, phone, subject, message, status)
VALUES
  ('Karan Mehta', 'karan.m@email.com', '9876501234', 'Franchise Inquiry', 'I would like to know more about the franchise model and investment requirements.', 'submitted'),
  ('Divya Nair', 'divya.n@email.com', '9123456780', 'Catering Service', 'Do you provide catering for corporate events? We have a team lunch of 50 people.', 'under_process'),
  ('Arjun Joshi', 'arjun.j@email.com', '9988771122', 'Feedback', 'Loved the Basque Cheesecake! Best I have had in Bangalore. Keep it up!', 'pending'),
  ('Meera Das', 'meera.d@email.com', '9112233445', 'Partnership', 'I run a local bakery and would love to explore a collaboration.', 'pending');

-- ---------------------------------------------------------------------------
-- Sample orders
-- ---------------------------------------------------------------------------
INSERT INTO orders (customer_name, customer_email, customer_phone, customer_address, items, total, status, payment_method, payment_status, notes)
VALUES
  ('Ankit Kumar', 'ankit.k@email.com', '9876543001', '42 MG Road, Bangalore 560001',
   '[{"id":1,"name":"Espresso","price":120,"quantity":2},{"id":5,"name":"Basque Cheesecake","price":350,"quantity":1}]',
   590, 'delivered', 'cash', 'paid', 'Extra shot of espresso please'),
  ('Shreya Jain', 'shreya.j@email.com', '9123453002', '15 Koramangala 4th Block, Bangalore 560034',
   '[{"id":6,"name":"Tiramisu","price":320,"quantity":1},{"id":8,"name":"Bubble Tea","price":200,"quantity":2}]',
   720, 'preparing', 'razorpay', 'paid', ''),
  ('Ravi Prasad', 'ravi.p@email.com', '9988773003', '8 HSR Layout Sector 2, Bangalore 560102',
   '[{"id":9,"name":"Marry Me Chicken","price":380,"quantity":1},{"id":11,"name":"Masala Chai","price":80,"quantity":2}]',
   540, 'confirmed', 'cash', 'unpaid', 'Please pack nicely'),
  ('Pooja Menon', 'pooja.m@email.com', '9112233004', '27 Indiranagar 100ft Road, Bangalore 560038',
   '[{"id":7,"name":"Fudge Brownie","price":180,"quantity":3},{"id":3,"name":"Vanilla Latte","price":180,"quantity":1}]',
   720, 'pending', 'razorpay', 'paid', 'Birthday surprise — add a candle if possible'),
  ('Deepak Nair', 'deepak.n@email.com', '9900113005', '5 JP Nagar 5th Phase, Bangalore 560078',
   '[{"id":4,"name":"Iced Americano","price":160,"quantity":2},{"id":12,"name":"Croissant","price":100,"quantity":2}]',
   520, 'ready', 'cash', 'paid', ''),
  ('Nisha Agarwal', 'nisha.a@email.com', '9812343006', '33 Whitefield Main Road, Bangalore 560066',
   '[{"id":1,"name":"Espresso","price":120,"quantity":1},{"id":5,"name":"Basque Cheesecake","price":350,"quantity":2}]',
   820, 'cancelled', 'razorpay', 'paid', 'Changed my mind'),
  ('Suresh Babu', 'suresh.b@email.com', '9765433007', '19 Electronic City Phase 1, Bangalore 560100',
   '[{"id":2,"name":"Cappuccino","price":150,"quantity":4},{"id":9,"name":"Marry Me Chicken","price":380,"quantity":1}]',
   980, 'delivered', 'cash', 'paid', 'Office order — bulk'),
  ('Kavitha Raj', 'kavitha.r@email.com', '9654323008', '7 Banashankari 2nd Stage, Bangalore 560070',
   '[{"id":10,"name":"Grilled Paneer Wrap","price":220,"quantity":2},{"id":8,"name":"Bubble Tea","price":200,"quantity":1}]',
   640, 'pending', 'razorpay', 'paid', '');

-- ---------------------------------------------------------------------------
-- Sample activity logs
-- ---------------------------------------------------------------------------
INSERT INTO activity_logs (admin_username, action, target_type, target_id, details)
VALUES
  ('admin', 'created', 'order', 1, 'Order #1 created — delivered'),
  ('admin', 'status:preparing', 'order', 2, 'Order #2 moved to preparing'),
  ('admin', 'status:confirmed', 'order', 3, 'Order #3 confirmed'),
  ('admin', 'status:delivered', 'order', 7, 'Order #7 marked delivered'),
  ('admin', 'created', 'franchise', 1, 'Franchise application from rahul.sharma@example.com'),
  ('admin', 'status:under_process', 'franchise', 2, 'Franchise app #2 moved to under_process'),
  ('admin', 'created', 'career', 1, 'Career application from neha.gupta@email.com — Barista'),
  ('admin', 'status:under_process', 'career', 2, 'Career app #2 moved to under_process'),
  ('admin', 'created', 'contact', 1, 'Contact message from karan.m@email.com — Franchise Inquiry');
