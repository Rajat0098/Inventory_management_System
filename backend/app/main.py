import logging
from contextlib import asynccontextmanager
from decimal import Decimal
from typing import List

from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from .database import engine, Base, get_db
from . import models, schemas

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Create DB tables
    logger.info("Initializing database tables...")
    Base.metadata.create_all(bind=engine)
    yield
    logger.info("Shutting down application...")

app = FastAPI(
    title="Inventory & Order Management API",
    description="Backend API for managing products, customers, orders, and stock levels.",
    version="1.0.0",
    lifespan=lifespan
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"message": "Welcome to the Inventory & Order Management API. Visit /docs for documentation."}

# ==========================================
# PRODUCTS ENDPOINTS
# ==========================================

@app.get("/api/products", response_model=List[schemas.ProductOut])
def list_products(db: Session = Depends(get_db)):
    return db.query(models.Product).order_by(models.Product.id.desc()).all()

@app.get("/api/products/{product_id}", response_model=schemas.ProductOut)
def get_product(product_id: int, db: Session = Depends(get_db)):
    product = db.query(models.Product).filter(models.Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return product

@app.post("/api/products", response_model=schemas.ProductOut, status_code=status.HTTP_201_CREATED)
def create_product(product_in: schemas.ProductCreate, db: Session = Depends(get_db)):
    product = models.Product(**product_in.model_dump())
    db.add(product)
    try:
        db.commit()
        db.refresh(product)
        return product
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=400,
            detail=f"Product with SKU '{product_in.sku}' already exists."
        )

@app.put("/api/products/{product_id}", response_model=schemas.ProductOut)
def update_product(product_id: int, product_in: schemas.ProductUpdate, db: Session = Depends(get_db)):
    product = db.query(models.Product).filter(models.Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    update_data = product_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(product, field, value)
    
    try:
        db.commit()
        db.refresh(product)
        return product
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=400,
            detail="Product SKU update failed. SKU must be unique."
        )

@app.delete("/api/products/{product_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_product(product_id: int, db: Session = Depends(get_db)):
    product = db.query(models.Product).filter(models.Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    db.delete(product)
    db.commit()
    return None

# ==========================================
# CUSTOMERS ENDPOINTS
# ==========================================

@app.get("/api/customers", response_model=List[schemas.CustomerOut])
def list_customers(db: Session = Depends(get_db)):
    return db.query(models.Customer).order_by(models.Customer.id.desc()).all()

@app.get("/api/customers/{customer_id}", response_model=schemas.CustomerOut)
def get_customer(customer_id: int, db: Session = Depends(get_db)):
    customer = db.query(models.Customer).filter(models.Customer.id == customer_id).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    return customer

@app.post("/api/customers", response_model=schemas.CustomerOut, status_code=status.HTTP_201_CREATED)
def create_customer(customer_in: schemas.CustomerCreate, db: Session = Depends(get_db)):
    customer = models.Customer(**customer_in.model_dump())
    db.add(customer)
    try:
        db.commit()
        db.refresh(customer)
        return customer
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=400,
            detail=f"Customer with email '{customer_in.email}' already exists."
        )

@app.put("/api/customers/{customer_id}", response_model=schemas.CustomerOut)
def update_customer(customer_id: int, customer_in: schemas.CustomerUpdate, db: Session = Depends(get_db)):
    customer = db.query(models.Customer).filter(models.Customer.id == customer_id).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    
    update_data = customer_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(customer, field, value)
    
    try:
        db.commit()
        db.refresh(customer)
        return customer
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=400,
            detail="Customer email update failed. Email must be unique."
        )

@app.delete("/api/customers/{customer_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_customer(customer_id: int, db: Session = Depends(get_db)):
    customer = db.query(models.Customer).filter(models.Customer.id == customer_id).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    db.delete(customer)
    db.commit()
    return None

# ==========================================
# ORDERS ENDPOINTS
# ==========================================

@app.get("/api/orders", response_model=List[schemas.OrderOut])
def list_orders(db: Session = Depends(get_db)):
    return db.query(models.Order).order_by(models.Order.id.desc()).all()

@app.get("/api/orders/{order_id}", response_model=schemas.OrderOut)
def get_order(order_id: int, db: Session = Depends(get_db)):
    order = db.query(models.Order).filter(models.Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    return order

@app.post("/api/orders", response_model=schemas.OrderOut, status_code=status.HTTP_201_CREATED)
def create_order(order_in: schemas.OrderCreate, db: Session = Depends(get_db)):
    """
    Creates an order and automatically decrements stock.
    Uses WITH FOR UPDATE database lock on products to avoid race conditions.
    If stock is insufficient, rolls back and returns 400.
    """
    # Verify customer exists
    customer = db.query(models.Customer).filter(models.Customer.id == order_in.customer_id).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")

    order_items = []
    try:
        # Sort items by product_id to prevent deadlocks from out-of-order locking
        sorted_items = sorted(order_in.items, key=lambda x: x.product_id)

        for item in sorted_items:
            # Query and LOCK the product row
            product = db.query(models.Product).filter(models.Product.id == item.product_id).with_for_update().first()
            if not product:
                raise HTTPException(
                    status_code=404, 
                    detail=f"Product with ID {item.product_id} not found"
                )
            
            # Stock check
            if product.stock < item.quantity:
                raise HTTPException(
                    status_code=400,
                    detail=f"Insufficient stock for product '{product.name}' (SKU: {product.sku}). Requested: {item.quantity}, Available: {product.stock}"
                )
            
            # Deduct stock
            product.stock -= item.quantity
            db.add(product)

            # Create order item record
            db_order_item = models.OrderItem(
                product_id=product.id,
                quantity=item.quantity,
                price_at_order=product.price
            )
            order_items.append(db_order_item)

        # Create Order (defaults to status="completed")
        new_order = models.Order(
            customer_id=order_in.customer_id,
            status="completed",
            items=order_items
        )
        db.add(new_order)
        db.commit()
        db.refresh(new_order)
        return new_order
        
    except HTTPException as e:
        db.rollback()
        raise e
    except Exception as e:
        db.rollback()
        logger.error(f"Error creating order: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error occurred while processing the order.")

@app.put("/api/orders/{order_id}/status", response_model=schemas.OrderOut)
def update_order_status(order_id: int, status_in: schemas.OrderUpdateStatus, db: Session = Depends(get_db)):
    """
    Updates order status.
    If the status changes to 'cancelled', restores the quantities to product stock levels.
    If the status changes from 'cancelled' to completed/pending, checks stock and deducts it.
    Uses WITH FOR UPDATE database locks on products.
    """
    order = db.query(models.Order).filter(models.Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    old_status = order.status
    new_status = status_in.status

    if old_status == new_status:
        return order

    try:
        # Sort items by product_id to prevent database deadlocks
        sorted_items = sorted(order.items, key=lambda x: x.product_id)

        # Case 1: Active order is CANCELLED -> Restore stock
        if new_status == "cancelled" and old_status != "cancelled":
            for item in sorted_items:
                product = db.query(models.Product).filter(models.Product.id == item.product_id).with_for_update().first()
                if product:
                    product.stock += item.quantity
                    db.add(product)
            order.status = new_status
            db.add(order)
            db.commit()
            db.refresh(order)
            return order

        # Case 2: Restoring a CANCELLED order to pending/completed -> Re-validate and deduct stock
        elif old_status == "cancelled" and new_status != "cancelled":
            for item in sorted_items:
                product = db.query(models.Product).filter(models.Product.id == item.product_id).with_for_update().first()
                if not product:
                    raise HTTPException(
                        status_code=404,
                        detail=f"Product '{item.product_id}' no longer exists to restore stock validation."
                    )
                if product.stock < item.quantity:
                    raise HTTPException(
                        status_code=400,
                        detail=f"Cannot reinstate order. Insufficient stock for product '{product.name}' (SKU: {product.sku}). Required: {item.quantity}, Available: {product.stock}"
                    )
                product.stock -= item.quantity
                db.add(product)
            order.status = new_status
            db.add(order)
            db.commit()
            db.refresh(order)
            return order

        # Case 3: Changing between pending and completed (no stock change)
        else:
            order.status = new_status
            db.add(order)
            db.commit()
            db.refresh(order)
            return order

    except HTTPException as e:
        db.rollback()
        raise e
    except Exception as e:
        db.rollback()
        logger.error(f"Error updating order status: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error updating order status.")

# ==========================================
# DASHBOARD ENDPOINTS
# ==========================================

@app.get("/api/dashboard/stats", response_model=schemas.DashboardStats)
def get_dashboard_stats(db: Session = Depends(get_db)):
    total_products = db.query(models.Product).count()
    total_customers = db.query(models.Customer).count()
    
    # Only count completed or pending orders
    orders_query = db.query(models.Order)
    total_orders = orders_query.count()

    # Calculate revenue (completed or pending orders)
    active_orders = db.query(models.Order).filter(models.Order.status != "cancelled").all()
    total_revenue = sum(order.total_amount for order in active_orders)

    # Low stock: stock <= 5
    low_stock_products = db.query(models.Product).filter(models.Product.stock <= 5).order_by(models.Product.stock.asc()).all()

    # Recent orders (last 5)
    recent_orders = db.query(models.Order).order_by(models.Order.id.desc()).limit(5).all()

    return schemas.DashboardStats(
        total_products=total_products,
        total_customers=total_customers,
        total_orders=total_orders,
        total_revenue=Decimal(str(total_revenue)) if active_orders else Decimal("0.00"),
        low_stock_products=low_stock_products,
        recent_orders=recent_orders
    )
