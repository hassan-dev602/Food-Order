# Food Order Management System

A full-stack food ordering application with a Django REST Framework backend and a React frontend. It supports customer registration/login, menu browsing, wishlist/cart flow, order placement, order tracking, password reset with OTP, and an admin panel for managing food items, categories, users, orders, reviews, and reports.

## Tech Stack

### Backend
- Python
- Django
- Django REST Framework
- Simple JWT authentication
- SQLite database for local development
- Django CORS Headers
- Django Filter
- Pillow for image uploads

### Frontend
- React
- React Router DOM
- Material UI
- Axios / Fetch API
- CSS

## Project Structure

```text
project-root/
├── backend/
│   ├── accounts/          # User model, auth, OTP/password reset APIs
│   ├── foodorder/         # Django project settings and root URLs
│   ├── menu/              # Categories, food items, orders, reviews, reports
│   ├── media/             # Uploaded food images for local development
│   ├── manage.py
│   └── requirements.txt
│
├── frontend/
│   └── src/
│       ├── AdminPanel/    # Admin dashboard, item/category/order/report pages
│       ├── auth/          # Login, register, admin login, password reset pages
│       ├── components/    # Route guards and shared components
│       ├── context/       # User/admin auth context providers
│       ├── pages/         # Public/customer pages
│       ├── utils/         # Utility functions
│       ├── App.jsx
│       ├── main.jsx
│       └── index.css
│
├── README.md
└── .gitignore
```

## Main Features

- Customer registration and login
- Admin login and protected admin dashboard
- JWT-based authentication
- Food category management
- Food item management with images
- Menu listing and product detail pages
- Wishlist, cart, and place-order flow
- Order tracking and order history
- Order status workflow:
  - New Order
  - Being Prepared
  - Food On The Way
  - Delivered
  - Cancelled
- Review management
- Daily and monthly reports
- Password reset using OTP email verification

## Backend Setup

Go to the backend folder:

```bash
cd backend
```

Create and activate a virtual environment:

```bash
python -m venv .venv
```

Windows:

```bash
.venv\Scripts\activate
```

macOS/Linux:

```bash
source .venv/bin/activate
```

Install backend dependencies:

```bash
pip install -r requirements.txt
```

Run database migrations:

```bash
python manage.py migrate
```

Create an admin user:

```bash
python manage.py createsuperuser
```

Start the backend server:

```bash
python manage.py runserver
```




## Frontend Setup

Go to the frontend folder:

```bash
cd frontend
```

Install frontend dependencies:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```