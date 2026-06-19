import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.database import Base, get_db
from app.main import app

# Use SQLite for testing
SQLALCHEMY_DATABASE_URL = "sqlite:///./test.db"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

@pytest.fixture(scope="function")
def db():
    # Setup: create tables
    Base.metadata.create_all(bind=engine)
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()
        # Teardown: drop tables
        Base.metadata.drop_all(bind=engine)

@pytest.fixture(scope="function")
def client(db):
    # Override get_db dependency to use test database session
    def override_get_db():
        try:
            yield db
        finally:
            pass
    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


# --- TESTS ---

def test_create_product_success(client):
    payload = {
        "sku": "PROD-001",
        "name": "Mechanical Keyboard",
        "description": "RGB mechanical keyboard",
        "price": "99.99",
        "stock": 10
    }
    response = client.post("/api/products", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert data["sku"] == "PROD-001"
    assert data["name"] == "Mechanical Keyboard"
    assert float(data["price"]) == 99.99
    assert data["stock"] == 10
    assert "id" in data

def test_create_product_duplicate_sku(client):
    payload = {
        "sku": "PROD-DUP",
        "name": "Item A",
        "price": "10.00",
        "stock": 5
    }
    # Create first
    response1 = client.post("/api/products", json=payload)
    assert response1.status_code == 201

    # Create second with same SKU
    payload["name"] = "Item B"
    response2 = client.post("/api/products", json=payload)
    assert response2.status_code == 400
    assert "already exists" in response2.json()["detail"]

def test_create_customer_success(client):
    payload = {
        "name": "John Doe",
        "email": "john@example.com",
        "phone": "1234567890"
    }
    response = client.post("/api/customers", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "John Doe"
    assert data["email"] == "john@example.com"
    assert "id" in data

def test_create_customer_duplicate_email(client):
    payload = {
        "name": "Alice",
        "email": "alice@example.com"
    }
    # Create first
    response1 = client.post("/api/customers", json=payload)
    assert response1.status_code == 201

    # Create second with same email
    payload["name"] = "Bob"
    response2 = client.post("/api/customers", json=payload)
    assert response2.status_code == 400
    assert "already exists" in response2.json()["detail"]

def test_create_order_success_reduces_stock(client):
    # 1. Create a product with stock = 10
    prod_resp = client.post("/api/products", json={
        "sku": "SKU-ORDER",
        "name": "Widget",
        "price": "5.00",
        "stock": 10
    })
    product_id = prod_resp.json()["id"]

    # 2. Create a customer
    cust_resp = client.post("/api/customers", json={
        "name": "Jane Customer",
        "email": "jane@example.com"
    })
    customer_id = cust_resp.json()["id"]

    # 3. Create an order with quantity = 4
    order_payload = {
        "customer_id": customer_id,
        "items": [
            {"product_id": product_id, "quantity": 4}
        ]
    }
    order_resp = client.post("/api/orders", json=order_payload)
    assert order_resp.status_code == 201
    order_data = order_resp.json()
    assert order_data["status"] == "completed"
    assert float(order_data["total_amount"]) == 20.00
    assert len(order_data["items"]) == 1
    assert order_data["items"][0]["quantity"] == 4

    # 4. Check if stock was reduced to 6
    check_prod = client.get(f"/api/products/{product_id}")
    assert check_prod.json()["stock"] == 6

def test_create_order_insufficient_stock(client):
    # 1. Create a product with stock = 3
    prod_resp = client.post("/api/products", json={
        "sku": "SKU-LIMIT",
        "name": "Limited Item",
        "price": "100.00",
        "stock": 3
    })
    product_id = prod_resp.json()["id"]

    # 2. Create a customer
    cust_resp = client.post("/api/customers", json={
        "name": "Shopper",
        "email": "shopper@example.com"
    })
    customer_id = cust_resp.json()["id"]

    # 3. Try to order quantity = 4 (insufficient)
    order_payload = {
        "customer_id": customer_id,
        "items": [
            {"product_id": product_id, "quantity": 4}
        ]
    }
    order_resp = client.post("/api/orders", json=order_payload)
    assert order_resp.status_code == 400
    assert "Insufficient stock" in order_resp.json()["detail"]

    # 4. Check that stock is still 3
    check_prod = client.get(f"/api/products/{product_id}")
    assert check_prod.json()["stock"] == 3

def test_cancel_order_restores_stock(client):
    # 1. Create product (stock = 5) and customer
    p_resp = client.post("/api/products", json={"sku": "S-CANCEL", "name": "Item", "price": "10.00", "stock": 5})
    c_resp = client.post("/api/customers", json={"name": "Buyer", "email": "buyer@example.com"})
    product_id = p_resp.json()["id"]
    customer_id = c_resp.json()["id"]

    # 2. Order 3 items -> stock becomes 2
    order_payload = {"customer_id": customer_id, "items": [{"product_id": product_id, "quantity": 3}]}
    o_resp = client.post("/api/orders", json=order_payload)
    order_id = o_resp.json()["id"]

    check_prod_1 = client.get(f"/api/products/{product_id}")
    assert check_prod_1.json()["stock"] == 2

    # 3. Cancel order
    cancel_resp = client.put(f"/api/orders/{order_id}/status", json={"status": "cancelled"})
    assert cancel_resp.status_code == 200
    assert cancel_resp.json()["status"] == "cancelled"

    # 4. Check that stock restored to 5
    check_prod_2 = client.get(f"/api/products/{product_id}")
    assert check_prod_2.json()["stock"] == 5
