from pydantic import BaseModel, EmailStr, Field, ConfigDict
from typing import List, Optional
from decimal import Decimal
from datetime import datetime

# --- Product ---
class ProductBase(BaseModel):
    sku: str = Field(..., max_length=50, description="Unique SKU code")
    name: str = Field(..., max_length=100)
    description: Optional[str] = None
    price: Decimal = Field(..., ge=0)
    stock: int = Field(..., ge=0)

class ProductCreate(ProductBase):
    pass

class ProductUpdate(BaseModel):
    sku: Optional[str] = Field(None, max_length=50)
    name: Optional[str] = Field(None, max_length=100)
    description: Optional[str] = None
    price: Optional[Decimal] = Field(None, ge=0)
    stock: Optional[int] = Field(None, ge=0)

class ProductOut(ProductBase):
    id: int
    model_config = ConfigDict(from_attributes=True)


# --- Customer ---
class CustomerBase(BaseModel):
    name: str = Field(..., max_length=100)
    email: EmailStr = Field(..., max_length=100)
    phone: Optional[str] = Field(None, max_length=20)

class CustomerCreate(CustomerBase):
    pass

class CustomerUpdate(BaseModel):
    name: Optional[str] = Field(None, max_length=100)
    email: Optional[EmailStr] = Field(None, max_length=100)
    phone: Optional[str] = Field(None, max_length=20)

class CustomerOut(CustomerBase):
    id: int
    model_config = ConfigDict(from_attributes=True)


# --- OrderItem ---
class OrderItemBase(BaseModel):
    product_id: int
    quantity: int = Field(..., gt=0)

class OrderItemCreate(OrderItemBase):
    pass

class OrderItemOut(BaseModel):
    id: int
    product_id: int
    quantity: int
    price_at_order: Decimal
    product: Optional[ProductOut] = None

    model_config = ConfigDict(from_attributes=True)


# --- Order ---
class OrderCreate(BaseModel):
    customer_id: int
    items: List[OrderItemCreate] = Field(..., min_length=1)

class OrderUpdateStatus(BaseModel):
    status: str = Field(..., pattern="^(pending|completed|cancelled)$")

class OrderOut(BaseModel):
    id: int
    customer_id: int
    status: str
    created_at: datetime
    customer: CustomerOut
    items: List[OrderItemOut]
    total_amount: Decimal

    model_config = ConfigDict(from_attributes=True)


# --- Dashboard Stats ---
class DashboardStats(BaseModel):
    total_products: int
    total_customers: int
    total_orders: int
    total_revenue: Decimal
    low_stock_products: List[ProductOut]
    recent_orders: List[OrderOut]
