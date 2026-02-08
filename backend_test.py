#!/usr/bin/env python3
"""
Secure Folder Backend API Test Suite
Tests all backend endpoints for the Secure Folder app
"""

import requests
import json
import base64
import uuid
from datetime import datetime
import os

# Get backend URL from frontend .env
BACKEND_URL = "https://secure-id-check-2.preview.emergentagent.com/api"

class SecureFolderAPITester:
    def __init__(self):
        self.base_url = BACKEND_URL
        self.test_user_id = None
        self.test_document_id = None
        self.session = requests.Session()
        self.session.headers.update({'Content-Type': 'application/json'})
        
    def log(self, message, status="INFO"):
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        print(f"[{timestamp}] [{status}] {message}")
        
    def test_health_check(self):
        """Test health check endpoint"""
        self.log("Testing health check endpoint...")
        try:
            response = self.session.get(f"{self.base_url}/health")
            if response.status_code == 200:
                data = response.json()
                self.log(f"Health check passed: {data}", "SUCCESS")
                return True
            else:
                self.log(f"Health check failed: {response.status_code} - {response.text}", "ERROR")
                return False
        except Exception as e:
            self.log(f"Health check error: {str(e)}", "ERROR")
            return False
    
    def test_create_user(self):
        """Test user creation endpoint"""
        self.log("Testing user creation...")
        try:
            # Create a unique test user
            test_email = f"testuser_{uuid.uuid4().hex[:8]}@example.com"
            user_data = {
                "email": test_email,
                "pin": "1234"
            }
            
            response = self.session.post(f"{self.base_url}/users", json=user_data)
            if response.status_code == 200:
                data = response.json()
                self.test_user_id = data["id"]
                self.log(f"User created successfully: {data['email']} (ID: {self.test_user_id})", "SUCCESS")
                return True
            else:
                self.log(f"User creation failed: {response.status_code} - {response.text}", "ERROR")
                return False
        except Exception as e:
            self.log(f"User creation error: {str(e)}", "ERROR")
            return False
    
    def test_verify_pin_correct(self):
        """Test PIN verification with correct PIN"""
        self.log("Testing PIN verification (correct PIN)...")
        if not self.test_user_id:
            self.log("No test user ID available", "ERROR")
            return False
            
        try:
            pin_data = {
                "user_id": self.test_user_id,
                "pin": "1234"
            }
            
            response = self.session.post(f"{self.base_url}/users/verify-pin", json=pin_data)
            if response.status_code == 200:
                data = response.json()
                if data.get("success") == True:
                    self.log("PIN verification (correct) passed", "SUCCESS")
                    return True
                else:
                    self.log(f"PIN verification failed: {data}", "ERROR")
                    return False
            else:
                self.log(f"PIN verification request failed: {response.status_code} - {response.text}", "ERROR")
                return False
        except Exception as e:
            self.log(f"PIN verification error: {str(e)}", "ERROR")
            return False
    
    def test_verify_pin_incorrect(self):
        """Test PIN verification with incorrect PIN"""
        self.log("Testing PIN verification (incorrect PIN)...")
        if not self.test_user_id:
            self.log("No test user ID available", "ERROR")
            return False
            
        try:
            pin_data = {
                "user_id": self.test_user_id,
                "pin": "9999"
            }
            
            response = self.session.post(f"{self.base_url}/users/verify-pin", json=pin_data)
            if response.status_code == 200:
                data = response.json()
                if data.get("success") == False:
                    self.log("PIN verification (incorrect) correctly rejected", "SUCCESS")
                    return True
                else:
                    self.log(f"PIN verification should have failed but didn't: {data}", "ERROR")
                    return False
            else:
                self.log(f"PIN verification request failed: {response.status_code} - {response.text}", "ERROR")
                return False
        except Exception as e:
            self.log(f"PIN verification error: {str(e)}", "ERROR")
            return False
    
    def test_create_document(self):
        """Test document creation"""
        self.log("Testing document creation...")
        if not self.test_user_id:
            self.log("No test user ID available", "ERROR")
            return False
            
        try:
            # Create a simple base64 encoded test image (1x1 pixel PNG)
            test_image_b64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=="
            
            doc_data = {
                "user_id": self.test_user_id,
                "doc_type": "id",
                "name": "Test Driver License",
                "image_base64": test_image_b64
            }
            
            response = self.session.post(f"{self.base_url}/documents", json=doc_data)
            if response.status_code == 200:
                data = response.json()
                self.test_document_id = data["id"]
                self.log(f"Document created successfully: {data['name']} (ID: {self.test_document_id})", "SUCCESS")
                return True
            else:
                self.log(f"Document creation failed: {response.status_code} - {response.text}", "ERROR")
                return False
        except Exception as e:
            self.log(f"Document creation error: {str(e)}", "ERROR")
            return False
    
    def test_get_documents(self):
        """Test getting user documents"""
        self.log("Testing get user documents...")
        if not self.test_user_id:
            self.log("No test user ID available", "ERROR")
            return False
            
        try:
            response = self.session.get(f"{self.base_url}/documents/{self.test_user_id}")
            if response.status_code == 200:
                data = response.json()
                if isinstance(data, list) and len(data) > 0:
                    self.log(f"Retrieved {len(data)} documents for user", "SUCCESS")
                    return True
                else:
                    self.log("No documents found for user", "WARNING")
                    return True  # This is still a successful response
            else:
                self.log(f"Get documents failed: {response.status_code} - {response.text}", "ERROR")
                return False
        except Exception as e:
            self.log(f"Get documents error: {str(e)}", "ERROR")
            return False
    
    def test_log_officer_access(self):
        """Test logging officer access"""
        self.log("Testing officer access logging...")
        if not self.test_user_id:
            self.log("No test user ID available", "ERROR")
            return False
            
        try:
            access_data = {
                "user_id": self.test_user_id,
                "officer_name": "Officer John Smith",
                "badge_number": "12345",
                "latitude": 40.7128,
                "longitude": -74.0060,
                "documents_viewed": [self.test_document_id] if self.test_document_id else []
            }
            
            response = self.session.post(f"{self.base_url}/access-log", json=access_data)
            if response.status_code == 200:
                data = response.json()
                self.log(f"Officer access logged: {data['officer_name']} (Badge: {data['badge_number']})", "SUCCESS")
                return True
            else:
                self.log(f"Officer access logging failed: {response.status_code} - {response.text}", "ERROR")
                return False
        except Exception as e:
            self.log(f"Officer access logging error: {str(e)}", "ERROR")
            return False
    
    def test_get_access_history(self):
        """Test getting access history"""
        self.log("Testing get access history...")
        if not self.test_user_id:
            self.log("No test user ID available", "ERROR")
            return False
            
        try:
            response = self.session.get(f"{self.base_url}/access-log/{self.test_user_id}")
            if response.status_code == 200:
                data = response.json()
                if isinstance(data, list):
                    self.log(f"Retrieved {len(data)} access log entries", "SUCCESS")
                    return True
                else:
                    self.log("Invalid access history response format", "ERROR")
                    return False
            else:
                self.log(f"Get access history failed: {response.status_code} - {response.text}", "ERROR")
                return False
        except Exception as e:
            self.log(f"Get access history error: {str(e)}", "ERROR")
            return False
    
    def test_export_access_history(self):
        """Test exporting access history"""
        self.log("Testing export access history...")
        if not self.test_user_id:
            self.log("No test user ID available", "ERROR")
            return False
            
        try:
            response = self.session.get(f"{self.base_url}/access-log/{self.test_user_id}/export")
            if response.status_code == 200:
                data = response.json()
                if "user_email" in data and "export_date" in data and "logs" in data:
                    self.log(f"Access history exported successfully: {data['total_accesses']} entries", "SUCCESS")
                    return True
                else:
                    self.log("Invalid export format", "ERROR")
                    return False
            else:
                self.log(f"Export access history failed: {response.status_code} - {response.text}", "ERROR")
                return False
        except Exception as e:
            self.log(f"Export access history error: {str(e)}", "ERROR")
            return False
    
    def test_log_failed_attempt(self):
        """Test logging failed PIN attempt"""
        self.log("Testing failed attempt logging...")
        if not self.test_user_id:
            self.log("No test user ID available", "ERROR")
            return False
            
        try:
            attempt_data = {
                "user_id": self.test_user_id,
                "latitude": 40.7128,
                "longitude": -74.0060
            }
            
            response = self.session.post(f"{self.base_url}/failed-attempt", json=attempt_data)
            if response.status_code == 200:
                data = response.json()
                if data.get("success") == True:
                    self.log("Failed attempt logged successfully", "SUCCESS")
                    return True
                else:
                    self.log(f"Failed attempt logging unsuccessful: {data}", "ERROR")
                    return False
            else:
                self.log(f"Failed attempt logging failed: {response.status_code} - {response.text}", "ERROR")
                return False
        except Exception as e:
            self.log(f"Failed attempt logging error: {str(e)}", "ERROR")
            return False
    
    def test_delete_document(self):
        """Test document deletion"""
        self.log("Testing document deletion...")
        if not self.test_document_id:
            self.log("No test document ID available", "ERROR")
            return False
            
        try:
            response = self.session.delete(f"{self.base_url}/documents/{self.test_document_id}")
            if response.status_code == 200:
                data = response.json()
                if data.get("success") == True:
                    self.log("Document deleted successfully", "SUCCESS")
                    return True
                else:
                    self.log(f"Document deletion unsuccessful: {data}", "ERROR")
                    return False
            else:
                self.log(f"Document deletion failed: {response.status_code} - {response.text}", "ERROR")
                return False
        except Exception as e:
            self.log(f"Document deletion error: {str(e)}", "ERROR")
            return False
    
    def run_all_tests(self):
        """Run all API tests in sequence"""
        self.log("=" * 60)
        self.log("STARTING SECURE FOLDER BACKEND API TESTS")
        self.log(f"Backend URL: {self.base_url}")
        self.log("=" * 60)
        
        test_results = {}
        
        # Test sequence as specified in the review request
        tests = [
            ("Health Check", self.test_health_check),
            ("Create User", self.test_create_user),
            ("Verify PIN (Correct)", self.test_verify_pin_correct),
            ("Verify PIN (Incorrect)", self.test_verify_pin_incorrect),
            ("Create Document", self.test_create_document),
            ("Get Documents", self.test_get_documents),
            ("Log Officer Access", self.test_log_officer_access),
            ("Get Access History", self.test_get_access_history),
            ("Export Access History", self.test_export_access_history),
            ("Log Failed Attempt", self.test_log_failed_attempt),
            ("Delete Document", self.test_delete_document)
        ]
        
        for test_name, test_func in tests:
            self.log(f"\n--- Running: {test_name} ---")
            try:
                result = test_func()
                test_results[test_name] = result
                if result:
                    self.log(f"✅ {test_name} PASSED")
                else:
                    self.log(f"❌ {test_name} FAILED")
            except Exception as e:
                self.log(f"❌ {test_name} CRASHED: {str(e)}", "ERROR")
                test_results[test_name] = False
        
        # Summary
        self.log("\n" + "=" * 60)
        self.log("TEST SUMMARY")
        self.log("=" * 60)
        
        passed = sum(1 for result in test_results.values() if result)
        total = len(test_results)
        
        for test_name, result in test_results.items():
            status = "✅ PASS" if result else "❌ FAIL"
            self.log(f"{status} - {test_name}")
        
        self.log(f"\nOverall: {passed}/{total} tests passed")
        
        if passed == total:
            self.log("🎉 ALL TESTS PASSED!", "SUCCESS")
        else:
            self.log(f"⚠️  {total - passed} tests failed", "ERROR")
        
        return test_results

if __name__ == "__main__":
    tester = SecureFolderAPITester()
    results = tester.run_all_tests()