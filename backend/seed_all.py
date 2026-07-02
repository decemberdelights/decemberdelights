import sys, os, random, json
from datetime import datetime, timedelta
sys.path.insert(0, os.path.dirname(__file__))
os.chdir(os.path.dirname(__file__))

from database import SessionLocal
from models import FranchiseApplication, CareerApplication, MenuItem, Product, Job, ContactMessage
from auth import hash_password

db = SessionLocal()

fran_names = ['Rajesh Kumar', 'Suresh Patel', 'Mahesh Singh', 'Dinesh Gupta', 'Nilesh Verma', 'Bhavesh Shah', 'Kalpesh Mehta', 'Hitesh Joshi', 'Ketan Shah', 'Mitesh Shah']
statuses = ['pending', 'approved', 'rejected', 'under_process', 'submitted']
locations = ['Hyderabad', 'Mumbai', 'Delhi', 'Bangalore', 'Chennai', 'Pune', 'Ahmedabad']

for i, name in enumerate(fran_names):
    app = FranchiseApplication(
        full_name=name,
        email=f'{name.split()[0].lower()}@example.com',
        phone=f'+91{random.randint(7000000000,9999999999)}',
        password_hash=hash_password('test123'),
        business_experience=f'{random.randint(1,15)} years in F&B',
        preferred_location=random.choice(locations),
        investment_capability=f'{random.choice([50,75,100,150,200])}L',
        status=random.choice(statuses),
        created_at=datetime.now() - timedelta(days=random.randint(0,30))
    )
    db.add(app)
db.commit()
print(f'Seeded {len(fran_names)} franchise applications')

positions = ['Manager', 'Chef', 'Cashier', 'Waiter', 'Delivery Executive', 'Marketing Lead', 'HR Executive']
career_names = ['Arjun Reddy', 'Vijay Nair', 'Srinivas Rao', 'Krishna Prasad', 'Venkat Ram', 'Prakash Das', 'Ravi Teja', 'Karthik Menon']
for i in range(8):
    app = CareerApplication(
        full_name=career_names[i],
        email=f'career{i}@example.com',
        phone=f'+91{random.randint(7000000000,9999999999)}',
        position=random.choice(positions),
        message=f'Interested in the position. I have relevant experience.',
        status=random.choice(['pending', 'approved', 'rejected']),
        created_at=datetime.now() - timedelta(days=random.randint(0,20))
    )
    db.add(app)
db.commit()
print('Seeded 8 career applications')

menu_data = [
    ('Starters', 'Masala Chai', 'Traditional Indian spiced tea', '40'),
    ('Starters', 'Samosa', 'Crispy pastry with spiced potato filling', '60'),
    ('Starters', 'Paneer Tikka', 'Grilled cottage cheese with spices', '180'),
    ('Main Course', 'Biryani', 'Fragrant basmati rice with tender meat', '250'),
    ('Main Course', 'Dosa', 'Crispy South Indian crepe', '120'),
    ('Main Course', 'Idli Sambar', 'Steamed rice cakes with lentil soup', '80'),
    ('Snacks', 'Vada Pav', 'Mumbai style spicy burger', '50'),
    ('Snacks', 'Pav Bhaji', 'Spiced mashed vegetables with bread', '100'),
    ('Desserts', 'Gulab Jamun', 'Deep fried milk dumplings in syrup', '70'),
    ('Desserts', 'Rasmalai', 'Cottage cheese dumplings in saffron milk', '90'),
]
for i, (cat, name, desc, price) in enumerate(menu_data):
    item = MenuItem(category=cat, name=name, description=desc, price=price, sort_order=i)
    db.add(item)
db.commit()
print(f'Seeded {len(menu_data)} menu items')

products_data = [
    ('Masala Chai Mix', 'Premium spice blend for authentic chai', 250, 300, 'Beverages'),
    ('Samosa Kit', 'Ready to fry samosa packets', 180, 220, 'Snacks'),
    ('Biryani Spice Pack', 'Authentic biryani masala', 150, 180, 'Spices'),
    ('Gulab Jamun Mix', 'Instant gulab jamun mix', 120, 150, 'Desserts'),
    ('Chai Glasses Set', 'Traditional cutting chai glasses (set of 4)', 350, 400, 'Accessories'),
]
for i, (name, desc, price, orig, cat) in enumerate(products_data):
    p = Product(name=name, description=desc, price=price, original_price=orig, category=cat, stock=random.randint(10,100), sort_order=i)
    db.add(p)
db.commit()
print(f'Seeded {len(products_data)} products')

jobs_data = [
    ('Restaurant Manager', 'Operations', 'Hyderabad', 'full_time'),
    ('Head Chef', 'Kitchen', 'Hyderabad', 'full_time'),
    ('Cashier', 'Front Desk', 'Mumbai', 'part_time'),
    ('Marketing Executive', 'Marketing', 'Delhi', 'full_time'),
]
for title, dept, loc, jtype in jobs_data:
    j = Job(title=title, department=dept, location=loc, description=f'Responsible for {dept.lower()} operations', requirements=f'Experience in {dept.lower()}', salary_range=f'{random.randint(3,12)}L PA', job_type=jtype)
    db.add(j)
db.commit()
print(f'Seeded {len(jobs_data)} jobs')

for i in range(5):
    c = ContactMessage(
        name=random.choice(['Amit', 'Priya', 'Rahul', 'Sneha', 'Vikram']),
        email=f'contact{i}@example.com',
        phone=f'+91{random.randint(7000000000,9999999999)}',
        subject=random.choice(['Partnership', 'Feedback', 'Complaint', 'Inquiry', 'Franchise']),
        message='This is a test message.',
        status=random.choice(['pending', 'replied']),
        created_at=datetime.now() - timedelta(days=random.randint(0,10))
    )
    db.add(c)
db.commit()
print('Seeded 5 contact messages')

db.close()
print('All seed data created!')
