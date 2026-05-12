from fastapi import APIRouter, HTTPException, Depends, Response
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from sqlalchemy.exc import IntegrityError
from typing import List
from database import get_db
from schemas import CompanyCreate, CompanyUpdate, Company

router = APIRouter(
    prefix="/company",
    tags=["company"]
)

@router.get("/", response_model=List[Company])
async def get_company(db: AsyncSession = Depends(get_db)):
    try:
        query = text("SELECT id, name, group_name FROM company")
        result = await db.execute(query)
        rows = result.fetchall()
        
        return [Company(id=row.id, name=row.name, group_name=row.group_name) for row in rows]
    except Exception as e:
        raise HTTPException(status_code=500, detail="Error fetching companies")

@router.post("/", response_model=Company, status_code=201)
async def create_company(company: CompanyCreate, db: AsyncSession = Depends(get_db)):
    try:
        query = text("""
            INSERT INTO company (name, group_name) 
            VALUES (:name, :group_name) 
            RETURNING id, name, group_name
        """)
        
        result = await db.execute(query, {"name": company.name, "group_name": company.group_name})
        new_company = result.fetchone()
        await db.commit()
        
        return Company(id=new_company.id, name=new_company.name, group_name=new_company.group_name)
    
    except IntegrityError:
        await db.rollback()
        raise HTTPException(status_code=400, detail="Company with this name already exists")
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail="Error creating company")

@router.patch("/{company_id}/", response_model=Company)
async def update_company(company_id: int, company: CompanyUpdate, db: AsyncSession = Depends(get_db)):
    try:
        update_data = company.model_dump(exclude_unset=True)
        if not update_data:
            raise HTTPException(status_code=400, detail="No fields to update")
            
        set_clauses = [f"{field} = :{field}" for field in update_data.keys()]
        set_clause = ", ".join(set_clauses)
        
        query = text(f"""
            UPDATE company 
            SET {set_clause} 
            WHERE id = :id 
            RETURNING id, name, group_name
        """)
        
        params = update_data.copy()
        params["id"] = company_id
        
        result = await db.execute(query, params)
        updated_row = result.fetchone()
        
        if not updated_row:
            raise HTTPException(status_code=404, detail="Company not found")
            
        await db.commit()
        return Company(id=updated_row.id, name=updated_row.name, group_name=updated_row.group_name)
        
    except IntegrityError:
        await db.rollback()
        raise HTTPException(status_code=400, detail="Company with this name already exists")
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail="Error updating company")

@router.delete("/{company_id}/", status_code=204)
async def delete_company(company_id: int, db: AsyncSession = Depends(get_db)):
    try:
        query = text("DELETE FROM company WHERE id = :id RETURNING id")
        result = await db.execute(query, {"id": company_id})
        deleted_row = result.fetchone()
        
        if not deleted_row:
            raise HTTPException(status_code=404, detail="Company not found")
            
        await db.commit()
        return Response(status_code=204)
        
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail="Error deleting company")