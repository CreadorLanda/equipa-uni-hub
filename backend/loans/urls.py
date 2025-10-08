from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import LoanViewSet
from .views_loan_request import LoanRequestViewSet

router = DefaultRouter()
router.register(r'loans', LoanViewSet, basename='loans')
router.register(r'loan-requests', LoanRequestViewSet, basename='loan-requests')

urlpatterns = [
    path('', include(router.urls)),
] 