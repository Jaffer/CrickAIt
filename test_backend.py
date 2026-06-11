import os
import unittest
import json
from fastapi.testclient import TestClient

# Import app from main
from main import app, redis_client

class TestCrickAItAuth(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        import uuid
        cls.rand_suffix = uuid.uuid4().hex[:8]
        cls.client_ctx = TestClient(app)
        cls.client = cls.client_ctx.__enter__()

    @classmethod
    def tearDownClass(cls):
        cls.client_ctx.__exit__(None, None, None)

    def test_01_guest_login(self):
        # 1. Test guest login with valid device ID
        payload = {"device_id": "test_device_12345"}
        response = self.client.post("/auth/guest", json=payload)
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("token", data)
        self.assertEqual(data["display_name"], "Guest User")
        self.assertIn("guest_", data["username"])

        # 2. Test guest login with null device ID
        payload = {"device_id": None}
        response = self.client.post("/auth/guest", json=payload)
        self.assertEqual(response.status_code, 200)

        # 3. Test guest login with missing device ID
        payload = {}
        response = self.client.post("/auth/guest", json=payload)
        self.assertEqual(response.status_code, 200)

    def test_02_registration_email_validation(self):
        # Test invalid email format
        payload = {
            "username": "testuser_valid",
            "email": "invalidemail",
            "password": "Password123!"
        }
        response = self.client.post("/auth/register", json=payload)
        self.assertEqual(response.status_code, 400)
        self.assertIn("valid email", response.json()["detail"].lower())

    def test_03_registration_password_complexity(self):
        # 1. Test short password (< 8 chars)
        payload = {
            "username": "testuser_valid",
            "email": "test@example.com",
            "password": "Pass1!"
        }
        response = self.client.post("/auth/register", json=payload)
        self.assertEqual(response.status_code, 400)
        self.assertIn("at least 8 characters", response.json()["detail"].lower())

        # 2. Test password with no numbers or letters
        payload["password"] = "Password!!!"
        response = self.client.post("/auth/register", json=payload)
        self.assertEqual(response.status_code, 400)
        self.assertIn("one letter and one number", response.json()["detail"].lower())

        # 3. Test password with no special character
        payload["password"] = "Password123"
        response = self.client.post("/auth/register", json=payload)
        self.assertEqual(response.status_code, 400)
        self.assertIn("special character", response.json()["detail"].lower())

    def test_04_valid_registration_and_duplicate(self):
        # Ensure clean test user
        username = f"validuser_{self.rand_suffix}"
        email = f"validuser_{self.rand_suffix}@example.com"
        password = "Password123!"

        payload = {
            "username": username,
            "email": email,
            "password": password
        }
        
        # Test successful registration
        response = self.client.post("/auth/register", json=payload)
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["username"], username)

        # Test duplicate registration (same username)
        response = self.client.post("/auth/register", json=payload)
        self.assertEqual(response.status_code, 400)

    def test_05_login_validation(self):
        username = f"validuser_{self.rand_suffix}"
        password = "Password123!"

        # Test valid login
        payload = {"username": username, "password": password}
        response = self.client.post("/auth/login", json=payload)
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("token", data)
        self.assertEqual(data["username"], username)

        # Test wrong password
        payload = {"username": username, "password": "WrongPassword!"}
        response = self.client.post("/auth/login", json=payload)
        self.assertEqual(response.status_code, 400)
        self.assertIn("invalid username or password", response.json()["detail"].lower())

    def test_06_google_login(self):
        # Test Google login
        payload = {
            "email": f"googleuser_{self.rand_suffix}@example.com",
            "display_name": "Google User"
        }
        response = self.client.post("/auth/google", json=payload)
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("token", data)
        self.assertEqual(data["display_name"], "Google User")

if __name__ == "__main__":
    unittest.main()
