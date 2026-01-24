from fastapi import FastAPI, APIRouter, HTTPException, UploadFile, File
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional
import uuid
from datetime import datetime
import base64

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app
app = FastAPI(title="Secure Folder API")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# ==================== Models ====================

class UserCreate(BaseModel):
    email: EmailStr
    pin: str  # Stored as hashed

class UserResponse(BaseModel):
    id: str
    email: str
    created_at: datetime
    is_premium: bool = False

class PinVerify(BaseModel):
    user_id: str
    pin: str

class Document(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    doc_type: str  # id, birth_certificate, disability, permit, job_badge, immigration, social_security, insurance
    name: str
    image_base64: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class DocumentCreate(BaseModel):
    user_id: str
    doc_type: str
    name: str
    image_base64: str

class OfficerAccess(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    officer_name: str
    badge_number: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    address: Optional[str] = None
    documents_viewed: List[str] = []  # List of document IDs viewed

class OfficerAccessCreate(BaseModel):
    user_id: str
    officer_name: str
    badge_number: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    address: Optional[str] = None
    documents_viewed: List[str] = []

class FailedAttempt(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    latitude: Optional[float] = None
    longitude: Optional[float] = None

class FailedAttemptCreate(BaseModel):
    user_id: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None

class EmailAlertRequest(BaseModel):
    user_id: str
    email: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    intruder_photo: Optional[str] = None  # Base64 encoded photo

# ==================== Helper Functions ====================

import hashlib

def hash_pin(pin: str) -> str:
    """Simple hash for PIN storage"""
    return hashlib.sha256(pin.encode()).hexdigest()

def verify_pin(pin: str, hashed: str) -> bool:
    """Verify PIN against hash"""
    return hash_pin(pin) == hashed

async def send_failed_attempt_email(email: str, latitude: float = None, longitude: float = None, intruder_photo: str = None):
    """Send email alert for failed PIN attempt with optional intruder photo"""
    try:
        sendgrid_key = os.environ.get('SENDGRID_API_KEY')
        if not sendgrid_key:
            logger.warning("SendGrid API key not configured")
            return False
        
        from sendgrid import SendGridAPIClient
        from sendgrid.helpers.mail import Mail, Attachment, FileContent, FileName, FileType, Disposition
        
        location_info = ""
        if latitude and longitude:
            location_info = f"<p><strong>Location:</strong> Lat: {latitude}, Long: {longitude}</p>"
            location_info += f"<p><a href='https://maps.google.com/?q={latitude},{longitude}'>View on Google Maps</a></p>"
        
        # Photo section for email body
        photo_section = ""
        if intruder_photo:
            photo_section = """
            <div style="margin: 20px 0; padding: 15px; background: #fff3cd; border-radius: 8px;">
                <h3 style="color: #856404; margin: 0 0 10px 0;">📸 Intruder Photo Captured</h3>
                <p style="color: #856404; margin: 0;">A photo was taken of the person attempting to access your device. See attached image.</p>
            </div>
            """
        
        message = Mail(
            from_email=os.environ.get('SENDER_EMAIL', 'noreply@securefolder.app'),
            to_emails=email,
            subject='🚨 SECURITY ALERT - Failed Access Attempt with Photo',
            html_content=f"""
            <html>
            <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <div style="background: #dc3545; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
                    <h1 style="margin: 0;">🔒 Security Alert</h1>
                </div>
                <div style="padding: 20px; background: #f8f9fa; border: 1px solid #dee2e6;">
                    <h2 style="color: #dc3545;">Failed PIN Attempt Detected</h2>
                    <p>Someone attempted to unlock your Secure Folder with an incorrect PIN.</p>
                    
                    <div style="background: white; padding: 15px; border-radius: 8px; margin: 15px 0;">
                        <p style="margin: 5px 0;"><strong>⏰ Time:</strong> {datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S UTC')}</p>
                        {location_info}
                    </div>
                    
                    {photo_section}
                    
                    <div style="background: #d4edda; padding: 15px; border-radius: 8px; margin-top: 20px;">
                        <p style="color: #155724; margin: 0;"><strong>What to do:</strong></p>
                        <ul style="color: #155724; margin: 10px 0;">
                            <li>Check if your phone is still in your possession</li>
                            <li>Consider changing your PIN if compromised</li>
                            <li>Review your access history in the app</li>
                        </ul>
                    </div>
                </div>
                <div style="padding: 15px; text-align: center; color: #6c757d; font-size: 12px;">
                    <p>Secure Folder - Your documents, protected.</p>
                </div>
            </body>
            </html>
            """
        )
        
        # Attach the intruder photo if available
        if intruder_photo:
            try:
                # Remove the data:image/jpeg;base64, prefix if present
                if ',' in intruder_photo:
                    photo_data = intruder_photo.split(',')[1]
                else:
                    photo_data = intruder_photo
                
                attachment = Attachment()
                attachment.file_content = FileContent(photo_data)
                attachment.file_name = FileName(f'intruder_{datetime.utcnow().strftime("%Y%m%d_%H%M%S")}.jpg')
                attachment.file_type = FileType('image/jpeg')
                attachment.disposition = Disposition('attachment')
                message.add_attachment(attachment)
            except Exception as e:
                logger.error(f"Failed to attach photo: {e}")
        
        sg = SendGridAPIClient(sendgrid_key)
        response = sg.send(message)
        return response.status_code == 202
    except Exception as e:
        logger.error(f"Failed to send email: {e}")
        return False

# ==================== User Routes ====================

@api_router.post("/users", response_model=UserResponse)
async def create_user(user: UserCreate):
    """Create a new user with PIN"""
    # Check if user exists
    existing = await db.users.find_one({"email": user.email})
    if existing:
        raise HTTPException(status_code=400, detail="User already exists")
    
    user_dict = {
        "id": str(uuid.uuid4()),
        "email": user.email,
        "pin_hash": hash_pin(user.pin),
        "created_at": datetime.utcnow(),
        "is_premium": False
    }
    
    await db.users.insert_one(user_dict)
    
    return UserResponse(
        id=user_dict["id"],
        email=user_dict["email"],
        created_at=user_dict["created_at"],
        is_premium=user_dict["is_premium"]
    )

@api_router.get("/users/{user_id}", response_model=UserResponse)
async def get_user(user_id: str):
    """Get user by ID"""
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    return UserResponse(
        id=user["id"],
        email=user["email"],
        created_at=user["created_at"],
        is_premium=user.get("is_premium", False)
    )

@api_router.get("/users/by-email/{email}", response_model=UserResponse)
async def get_user_by_email(email: str):
    """Get user by email"""
    user = await db.users.find_one({"email": email.lower()})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    return UserResponse(
        id=user["id"],
        email=user["email"],
        created_at=user["created_at"],
        is_premium=user.get("is_premium", False)
    )

@api_router.post("/users/verify-pin")
async def verify_user_pin(data: PinVerify):
    """Verify user PIN"""
    user = await db.users.find_one({"id": data.user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if verify_pin(data.pin, user["pin_hash"]):
        return {"success": True, "message": "PIN verified"}
    else:
        return {"success": False, "message": "Invalid PIN"}

@api_router.put("/users/{user_id}/pin")
async def update_pin(user_id: str, old_pin: str, new_pin: str):
    """Update user PIN"""
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if not verify_pin(old_pin, user["pin_hash"]):
        raise HTTPException(status_code=401, detail="Invalid current PIN")
    
    await db.users.update_one(
        {"id": user_id},
        {"$set": {"pin_hash": hash_pin(new_pin)}}
    )
    
    return {"success": True, "message": "PIN updated"}

# ==================== Document Routes ====================

@api_router.post("/documents", response_model=Document)
async def create_document(doc: DocumentCreate):
    """Create/Upload a document"""
    doc_dict = Document(
        user_id=doc.user_id,
        doc_type=doc.doc_type,
        name=doc.name,
        image_base64=doc.image_base64
    ).dict()
    
    await db.documents.insert_one(doc_dict)
    return Document(**doc_dict)

@api_router.get("/documents/{user_id}", response_model=List[Document])
async def get_user_documents(user_id: str):
    """Get all documents for a user"""
    docs = await db.documents.find({"user_id": user_id}).to_list(100)
    return [Document(**doc) for doc in docs]

@api_router.get("/documents/{user_id}/{doc_type}", response_model=List[Document])
async def get_documents_by_type(user_id: str, doc_type: str):
    """Get documents by type for a user"""
    docs = await db.documents.find({"user_id": user_id, "doc_type": doc_type}).to_list(100)
    return [Document(**doc) for doc in docs]

@api_router.delete("/documents/{doc_id}")
async def delete_document(doc_id: str):
    """Delete a document"""
    result = await db.documents.delete_one({"id": doc_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Document not found")
    return {"success": True, "message": "Document deleted"}

@api_router.put("/documents/{doc_id}")
async def update_document(doc_id: str, name: str = None, image_base64: str = None):
    """Update a document"""
    update_data = {"updated_at": datetime.utcnow()}
    if name:
        update_data["name"] = name
    if image_base64:
        update_data["image_base64"] = image_base64
    
    result = await db.documents.update_one(
        {"id": doc_id},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Document not found")
    
    return {"success": True, "message": "Document updated"}

# ==================== Officer Access Routes ====================

@api_router.post("/access-log", response_model=OfficerAccess)
async def log_officer_access(access: OfficerAccessCreate):
    """Log officer access to documents"""
    access_dict = OfficerAccess(
        user_id=access.user_id,
        officer_name=access.officer_name,
        badge_number=access.badge_number,
        latitude=access.latitude,
        longitude=access.longitude,
        address=access.address,
        documents_viewed=access.documents_viewed
    ).dict()
    
    await db.access_logs.insert_one(access_dict)
    return OfficerAccess(**access_dict)

@api_router.get("/access-log/{user_id}", response_model=List[OfficerAccess])
async def get_access_logs(user_id: str):
    """Get all access logs for a user"""
    logs = await db.access_logs.find({"user_id": user_id}).sort("timestamp", -1).to_list(1000)
    return [OfficerAccess(**log) for log in logs]

@api_router.get("/access-log/{user_id}/export")
async def export_access_logs(user_id: str):
    """Export access logs as structured data for PDF generation"""
    logs = await db.access_logs.find({"user_id": user_id}).sort("timestamp", -1).to_list(1000)
    user = await db.users.find_one({"id": user_id})
    
    export_data = {
        "user_email": user["email"] if user else "Unknown",
        "export_date": datetime.utcnow().isoformat(),
        "total_accesses": len(logs),
        "logs": []
    }
    
    for log in logs:
        export_data["logs"].append({
            "officer_name": log["officer_name"],
            "badge_number": log["badge_number"],
            "timestamp": log["timestamp"].isoformat() if isinstance(log["timestamp"], datetime) else log["timestamp"],
            "latitude": log.get("latitude"),
            "longitude": log.get("longitude"),
            "address": log.get("address"),
            "documents_viewed": log.get("documents_viewed", [])
        })
    
    return export_data

# ==================== Failed Attempt Routes ====================

@api_router.post("/failed-attempt")
async def log_failed_attempt(attempt: FailedAttemptCreate):
    """Log a failed PIN attempt"""
    attempt_dict = FailedAttempt(
        user_id=attempt.user_id,
        latitude=attempt.latitude,
        longitude=attempt.longitude
    ).dict()
    
    await db.failed_attempts.insert_one(attempt_dict)
    return {"success": True, "message": "Failed attempt logged"}

@api_router.post("/failed-attempt/alert")
async def send_failed_alert(data: EmailAlertRequest):
    """Send email alert for failed attempt with optional intruder photo"""
    # Log the attempt with photo
    attempt_dict = {
        "id": str(uuid.uuid4()),
        "user_id": data.user_id,
        "timestamp": datetime.utcnow(),
        "latitude": data.latitude,
        "longitude": data.longitude,
        "has_photo": data.intruder_photo is not None
    }
    
    # Store photo separately if provided (to avoid large documents)
    if data.intruder_photo:
        photo_record = {
            "id": str(uuid.uuid4()),
            "attempt_id": attempt_dict["id"],
            "user_id": data.user_id,
            "timestamp": datetime.utcnow(),
            "photo_base64": data.intruder_photo
        }
        await db.intruder_photos.insert_one(photo_record)
    
    await db.failed_attempts.insert_one(attempt_dict)
    
    # Send email with photo
    success = await send_failed_attempt_email(
        data.email,
        data.latitude,
        data.longitude,
        data.intruder_photo
    )
    
    return {"success": success, "message": "Security alert with photo sent" if success else "Failed to send alert (check SendGrid API key)"}

@api_router.get("/failed-attempts/{user_id}")
async def get_failed_attempts(user_id: str):
    """Get failed attempt history"""
    attempts = await db.failed_attempts.find({"user_id": user_id}).sort("timestamp", -1).to_list(100)
    return [{"id": a["id"], "timestamp": a["timestamp"], "latitude": a.get("latitude"), "longitude": a.get("longitude")} for a in attempts]

# ==================== Health Check ====================

@api_router.get("/")
async def root():
    return {"message": "Secure Folder API", "status": "running"}

@api_router.get("/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.utcnow().isoformat()}

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
