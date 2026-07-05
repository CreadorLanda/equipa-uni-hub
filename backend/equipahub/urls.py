"""
URL configuration for equipahub project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/4.2/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from rest_framework.routers import DefaultRouter
from accounts.views import AuthViewSet, UserViewSet
from .views import dashboard_stats

# Router principal para as APIs REST
router = DefaultRouter()

# URLs de autenticação e usuários
router.register(r'auth', AuthViewSet, basename='auth')
router.register(r'users', UserViewSet, basename='users')

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/v1/', include(router.urls)),
    path('api/v1/', include('equipment.urls')),
    path('api/v1/', include('loans.urls')),
    path('api/v1/', include('reservations.urls')),
    # Atribuidores eventuais via UserViewSet (actions: atribuidores, atribuidores_create, etc.)
    path('api/v1/atribuidores/', UserViewSet.as_view({'get': 'atribuidores'}), name='atribuidores-list'),
    path('api/v1/atribuidores/criar/', UserViewSet.as_view({'post': 'atribuidores_create'}), name='atribuidores-create'),
    path('api/v1/atribuidores/<int:pk>/editar/', UserViewSet.as_view({'put': 'atribuidores_update', 'patch': 'atribuidores_update'}), name='atribuidores-update'),
    path('api/v1/atribuidores/<int:pk>/ativar/', UserViewSet.as_view({'post': 'atribuidores_activate'}), name='atribuidores-activate'),
    path('api/v1/atribuidores/<int:pk>/desativar/', UserViewSet.as_view({'post': 'atribuidores_deactivate'}), name='atribuidores-deactivate'),
    path('api/v1/', include('notifications.urls')),
    path('api/v1/dashboard/stats/', dashboard_stats, name='dashboard-stats'),
]

# Servir arquivos de mídia em desenvolvimento
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
