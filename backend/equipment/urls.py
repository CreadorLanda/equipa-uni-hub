from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import EquipmentViewSet
from .package_views import EquipmentPackageViewSet

router = DefaultRouter()
router.register(r'equipment', EquipmentViewSet, basename='equipment')
router.register(r'packages', EquipmentPackageViewSet, basename='packages')

urlpatterns = [
    path('', include(router.urls)),
] 