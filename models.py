from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, func
from sqlalchemy.orm import declarative_base

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

class Desk(Base):
    __tablename__ = "desk"
    id = Column(Integer, primary_key=True)
    floor_id = Column(Integer, ForeignKey("floor.id", ondelete="CASCADE"))
    label = Column(String(20))
    status = Column(String(20))
    equipment = Column(String(255))
    x_coordinate = Column(Integer)
    y_coordinate = Column(Integer)

class Reservation(Base):
    __tablename__ = "reservation"
    id = Column(Integer, primary_key=True)
    desk_id = Column(Integer, ForeignKey("desk.id", ondelete="CASCADE"))
    employee_id = Column(Integer, ForeignKey("employee.id", ondelete="CASCADE"))
    start_time = Column(DateTime)
    end_time = Column(DateTime)
    status = Column(String(20))
    created_at = Column(DateTime, server_default=func.now())
