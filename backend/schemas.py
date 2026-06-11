from pydantic import BaseModel, ConfigDict
from typing import List, Optional
from datetime import date, datetime


# City Schemas
class CityBase(BaseModel):
    name: str


class CityCreate(CityBase):
    pass


class City(CityBase):
    id: int
    model_config = ConfigDict(from_attributes=True)


# Building Schemas
class BuildingBase(BaseModel):
    name: str
    address: str
    city_id: int


class BuildingCreate(BuildingBase):
    pass


class Building(BuildingBase):
    id: int
    model_config = ConfigDict(from_attributes=True)


# Floor Schemas
class FloorBase(BaseModel):
    floor_number: int
    building_id: int
    description: Optional[str] = None
    svg_map_url: Optional[str] = None


class FloorCreate(FloorBase):
    pass


class Floor(FloorBase):
    id: int
    model_config = ConfigDict(from_attributes=True)


# Feature Schemas
class FeatureBase(BaseModel):
    name: str
    category: Optional[str] = None


class Feature(FeatureBase):
    id: int
    model_config = ConfigDict(from_attributes=True)


# DeskFeature Schemas
class DeskFeatureBase(BaseModel):
    value: Optional[str] = None
    feature: Feature


class DeskFeature(DeskFeatureBase):
    model_config = ConfigDict(from_attributes=True)


# Desk Schemas
class DeskBase(BaseModel):
    name: str
    floor_id: int
    description: Optional[str] = None
    x_pos: Optional[float] = None
    y_pos: Optional[float] = None
    is_active: bool = True


class DeskCreate(DeskBase):
    pass


class Desk(DeskBase):
    id: int
    model_config = ConfigDict(from_attributes=True)


class DeskWithFeatures(Desk):
    features: List[DeskFeature] = []


class DeskWithAvailability(DeskWithFeatures):
    is_reserved: bool = False


class DeskFeaturePayload(BaseModel):
    feature_id: int
    value: Optional[str] = None


class DeskMapPayload(BaseModel):
    id: Optional[int] = None
    name: str
    description: Optional[str] = None
    x_pos: float
    y_pos: float
    is_active: bool = True
    features: List[DeskFeaturePayload] = []


class DeskBatchPayload(BaseModel):
    desks: List[DeskMapPayload] = []


# User Schemas
class UserBase(BaseModel):
    email: str
    name: Optional[str] = None
    surname: Optional[str] = None
    role: str = "user"


class UserCreate(UserBase):
    password: str


class User(UserBase):
    id: int
    created_at: datetime
    last_login: Optional[datetime] = None
    model_config = ConfigDict(from_attributes=True)


# Reservation Schemas
class ReservationBase(BaseModel):
    reservation_date: date
    desk_id: int


class ReservationCreate(ReservationBase):
    user_id: int


class Reservation(ReservationBase):
    id: int
    user_id: int
    status: str
    check_in: bool
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


class DeskFeatureInfo(BaseModel):
    name: str
    category: Optional[str] = None
    value: Optional[str] = None


class DeskFullDetails(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    is_active: bool
    features: List[DeskFeatureInfo] = []
    floor_number: int
    floor_description: Optional[str] = None
    building_name: str
    building_address: str
    city_name: str