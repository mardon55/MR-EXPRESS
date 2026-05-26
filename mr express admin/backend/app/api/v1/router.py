from fastapi import APIRouter

from app.api.v1.endpoints import (
    banners,
    catalog,
    dashboard,
    discounts,
    group_buys,
    orders,
    promocodes,
    reels,
    reviews,
    users,
)

api_router = APIRouter()
api_router.include_router(dashboard.router, prefix="/dashboard", tags=["dashboard"])
api_router.include_router(orders.router, prefix="/orders", tags=["orders"])
api_router.include_router(catalog.router, prefix="/catalog", tags=["catalog"])
api_router.include_router(users.router, prefix="/users", tags=["users"])
api_router.include_router(banners.router, prefix="/banners", tags=["banners"])
api_router.include_router(discounts.router, prefix="/discounts", tags=["discounts"])
api_router.include_router(reels.router, prefix="/reels", tags=["reels"])
api_router.include_router(group_buys.router, prefix="/group-buys", tags=["group-buys"])
api_router.include_router(promocodes.router, prefix="/promocodes", tags=["promocodes"])
api_router.include_router(reviews.router, prefix="/reviews", tags=["reviews"])
