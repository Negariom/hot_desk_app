from sqlalchemy import (Column, Integer, String, ForeignKey, DateTime, func,
                        Float, Boolean, Date)
from sqlalchemy.orm import declarative_base, relationship

Base = declarative_base()


class City(Base):
    __tablename__ = "city"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)

    buildings = relationship("Building", back_populates="city")


class Building(Base):
    __tablename__ = "building"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    address = Column(String, nullable=False)
    city_id = Column(Integer, ForeignKey("city.id"), nullable=False)

    city = relationship("City", back_populates="buildings")
    floors = relationship("Floor", back_populates="building")


class Floor(Base):
    __tablename__ = "floor"

    id = Column(Integer, primary_key=True, index=True)
    floor_number = Column(Integer, nullable=False)
    building_id = Column(Integer, ForeignKey("building.id"), nullable=False)
    description = Column(String)
    svg_map_url = Column(String)

    building = relationship("Building", back_populates="floors")
    desks = relationship("Desk", back_populates="floor")


class Desk(Base):
    __tablename__ = "desk"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    description = Column(String)
    x_pos = Column(Float)
    y_pos = Column(Float)
    is_active = Column(Boolean, default=True)
    floor_id = Column(Integer, ForeignKey("floor.id"), nullable=False)

    floor = relationship("Floor", back_populates="desks")
    reservations = relationship("Reservation", back_populates="desk")
    features = relationship("DeskFeature", back_populates="desk", lazy="selectin")


class Feature(Base):
    __tablename__ = "feature"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    category = Column(String)

    desks = relationship("DeskFeature", back_populates="feature")


class DeskFeature(Base):
    __tablename__ = "desk_feature"

    desk_id = Column(Integer, ForeignKey("desk.id"), primary_key=True)
    feature_id = Column(Integer, ForeignKey("feature.id"), primary_key=True)
    value = Column(String)

    desk = relationship("Desk", back_populates="features")
    feature = relationship("Feature", back_populates="desks", lazy="selectin")


class User(Base):
    __tablename__ = "user"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    name = Column(String)
    surname = Column(String)
    role = Column(String, default="user")
    created_at = Column(DateTime, server_default=func.now())
    last_login = Column(DateTime)

    reservations = relationship("Reservation", back_populates="user")


class Reservation(Base):
    __tablename__ = "reservation"

    id = Column(Integer, primary_key=True, index=True)
    reservation_date = Column(Date, nullable=False)
    status = Column(String, default="confirmed")
    check_in = Column(Boolean, default=False)
    created_at = Column(DateTime, server_default=func.now())
    user_id = Column(Integer, ForeignKey("user.id"), nullable=False)
    desk_id = Column(Integer, ForeignKey("desk.id"), nullable=False)

    user = relationship("User", back_populates="reservations")
    desk = relationship("Desk", back_populates="reservations")