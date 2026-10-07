import logging
from fastapi import HTTPException

class BaseService:
    def __init__(self, service_name: str):
        self.logger = logging.getLogger(service_name)

    def handle_error(self, operation: str, error: Exception, status_code: int = 500, detail: str = "Internal server error") -> None:
        """Log the error and raise an HTTPException, preserving HTTPExceptions."""
        if isinstance(error, HTTPException):
            raise error
        self.logger.error("%s error: %s", operation, error, exc_info=True)
        raise HTTPException(status_code=status_code, detail=detail)

    def validate_condition(self, condition: bool, status_code: int = 400, detail: str = "Invalid input") -> None:
        """Helper to assert a condition or raise an HTTPException."""
        if not condition:
            raise HTTPException(status_code=status_code, detail=detail)
