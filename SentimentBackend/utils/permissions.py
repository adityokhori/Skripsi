from fastapi import HTTPException, status
from database import User

def require_admin(current_user: User):
    """Check if user is admin"""
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    return current_user

def check_data_owner(current_user: User, data_owner_id: int):
    """Check if user owns the data or is admin"""
    if current_user.role == "admin":
        return True  # Admin can access all data
    
    if current_user.id != data_owner_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to access this data"
        )
    return True
