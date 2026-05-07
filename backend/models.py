from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Table, func
from sqlalchemy.orm import declarative_base, relationship

Base = declarative_base()

class Company(Base):
    __tablename__ = "company"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True)
    group_name = Column(String(50))

class Location(Base):
    __tablename__ = "location"
    id = Column(Integer, primary_key=True)
    country = Column(String(50))
    city = Column(String(100))

class UserGroup(Base):
    __tablename__ = "user_group"
    id = Column(Integer, primary_key=True)
    name = Column(String(50), unique=True)

class Building(Base):
    __tablename__ = "building"
    id = Column(Integer, primary_key=True)
    location_id = Column(Integer, ForeignKey("location.id", ondelete="CASCADE"))
    name = Column(String(100))
    address = Column(String(100))
    company_id = Column(Integer, ForeignKey("company.id", ondelete="CASCADE"))

class WorkGroup(Base):
    __tablename__ = "work_group"
    id = Column(Integer, primary_key=True)
    name = Column(String(50), unique=True)
    company_id = Column(Integer, ForeignKey("company.id", ondelete="CASCADE"))

class Floor(Base):
    __tablename__ = "floor"
    id = Column(Integer, primary_key=True)
    building_id = Column(Integer, ForeignKey("building.id", ondelete="CASCADE"))
    level = Column(Integer)
    name = Column(String(50))
    svg_map = Column(String(255))
    width = Column(Integer)
    height = Column(Integer)

class WorkGroupBuilding(Base):
    __tablename__ = "work_group_building"
    workgroup_id = Column(Integer, ForeignKey("work_group.id", ondelete="CASCADE"), primary_key=True)
    building_id = Column(Integer, ForeignKey("building.id", ondelete="CASCADE"), primary_key=True)

class Employee(Base):
    __tablename__ = "employee"
    id = Column(Integer, primary_key=True)
    first_name = Column(String(50))
    last_name = Column(String(50))
    user_group_id = Column(Integer, ForeignKey("user_group.id", ondelete="SET NULL"))
    workgroup_id = Column(Integer, ForeignKey("work_group.id", ondelete="SET NULL"))
    email = Column(String(50), unique=True)
    hash_password = Column(String(256))
    

class Reservation(Base):
    __tablename__ = "reservation"
    id = Column(Integer, primary_key=True)
    desk_id = Column(Integer, ForeignKey("desk.id", ondelete="CASCADE"))
    employee_id = Column(Integer, ForeignKey("employee.id", ondelete="CASCADE"))
    start_time = Column(DateTime)
    end_time = Column(DateTime)
    status = Column(String(20))
    created_at = Column(DateTime, server_default=func.now())

desk_equipment = Table(
    "desk_equipment",
    Base.metadata,
    Column("desk_id", Integer, ForeignKey("desk.id", ondelete="CASCADE"), primary_key=True),
    Column("equipment_id", Integer, ForeignKey("equipment.id", ondelete="CASCADE"), primary_key=True)
)

class Equipment(Base):
    __tablename__ = "equipment"
    id = Column(Integer, primary_key=True)
    name = Column(String(50), unique=True)
    
    desks = relationship("Desk", secondary=desk_equipment, back_populates="equipments")

class Desk(Base):
    __tablename__ = "desk"
    id = Column(Integer, primary_key=True)
    floor_id = Column(Integer, ForeignKey("floor.id", ondelete="CASCADE"))
    label = Column(String(20))
    status = Column(String(20))
    x_coordinate = Column(Integer)
    y_coordinate = Column(Integer)
    
    equipments = relationship("Equipment", secondary=desk_equipment, back_populates="desks")