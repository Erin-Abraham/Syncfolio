from datetime import datetime
from pydantic import BaseModel, Field


class DatabaseHealthStatus(BaseModel):
    status: str = Field(..., description="Connection status indicator")
    dialect: str = Field(..., description="Underlying database driver")
    latency_ms: float = Field(..., description="Round-trip database ping latency in milliseconds")
    pool_size: int = Field(..., description="Configured persistent connection pool size")
    pool_checked_out: int = Field(..., description="Currently active checked-out connections")
    pool_overflow: int = Field(..., description="Active temporary overflow connections")


class LivenessResponse(BaseModel):
    status: str = "alive"
    timestamp: datetime = Field(default_factory=datetime.utcnow)


class ReadinessResponse(BaseModel):
    status: str
    environment: str
    app_name: str
    version: str
    database: DatabaseHealthStatus
    timestamp: datetime = Field(default_factory=datetime.utcnow)


class SystemInfoResponse(BaseModel):
    app_name: str
    version: str
    environment: str
    supported_brokers: list[str]
    supported_asset_classes: list[str]
