from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict


class CompanyBase(BaseModel):
    name: str
    group_name: Optional[str] = None


class CompanyCreate(CompanyBase):
    pass


class CompanyUpdate(BaseModel):
    name: Optional[str] = None
    group_name: Optional[str] = None


class CompanyOut(CompanyBase):
    id: int
    model_config = ConfigDict(from_attributes=True)


CompanyRead = CompanyOut
Company = CompanyOut


class LocationBase(BaseModel):
    country: str
    city: str


class LocationCreate(LocationBase):
    pass


class LocationOut(LocationBase):
    id: int
    model_config = ConfigDict(from_attributes=True)


LocationRead = LocationOut


class UserGroupBase(BaseModel):
    name: str


class UserGroupCreate(UserGroupBase):
    pass


class UserGroupOut(UserGroupBase):
    id: int
    model_config = ConfigDict(from_attributes=True)


UserGroupRead = UserGroupOut


class BuildingBase(BaseModel):
    location_id: int
    name: str
    address: str
    company_id: int


class BuildingCreate(BuildingBase):
    pass


class BuildingOut(BuildingBase):
    id: int
    model_config = ConfigDict(from_attributes=True)


BuildingRead = BuildingOut


class WorkGroupBase(BaseModel):
    name: str
    company_id: int


class WorkGroupCreate(WorkGroupBase):
    pass


class WorkGroupOut(WorkGroupBase):
    id: int
    model_config = ConfigDict(from_attributes=True)


WorkGroupRead = WorkGroupOut


class FloorBase(BaseModel):
    building_id: int
    level: int
    name: str
    svg_map: Optional[str] = None
    width: Optional[int] = None
    height: Optional[int] = None


class FloorCreate(FloorBase):
    pass


class FloorOut(FloorBase):
    id: int
    model_config = ConfigDict(from_attributes=True)


FloorRead = FloorOut


class WorkGroupBuildingBase(BaseModel):
    workgroup_id: int
    building_id: int


class WorkGroupBuildingCreate(WorkGroupBuildingBase):
    pass


class WorkGroupBuildingOut(WorkGroupBuildingBase):
    model_config = ConfigDict(from_attributes=True)


WorkGroupBuildingRead = WorkGroupBuildingOut


class EmployeeBase(BaseModel):
    first_name: str
    last_name: str
    user_group_id: Optional[int] = None
    workgroup_id: Optional[int] = None
    email: str


class EmployeeCreate(EmployeeBase):
    hash_password: str


class EmployeeOut(EmployeeBase):
    id: int
    model_config = ConfigDict(from_attributes=True)


EmployeeRead = EmployeeOut


class DeskBase(BaseModel):
    floor_id: int
    label: str
    status: str
    equipment: Optional[str] = None
    x_coordinate: Optional[int] = None
    y_coordinate: Optional[int] = None


class DeskCreate(DeskBase):
    pass


class DeskOut(DeskBase):
    id: int
    model_config = ConfigDict(from_attributes=True)


DeskRead = DeskOut


class ReservationBase(BaseModel):
    desk_id: int
    employee_id: int
    start_time: datetime
    end_time: datetime
    status: str = "reserved"


class ReservationCreate(ReservationBase):
    pass


class ReservationOut(ReservationBase):
    id: int
    created_at: Optional[datetime] = None
    model_config = ConfigDict(from_attributes=True)


ReservationRead = ReservationOut
Reservation = ReservationOut


class AvailableDesk(BaseModel):
    desk_id: int
    label: str
    equipment: str
    floor_level: int
    building_name: str
    city: str