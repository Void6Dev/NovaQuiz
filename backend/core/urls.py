"""
URL configuration for core project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/5.1/topics/http/urls/
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
import mimetypes
from django.contrib import admin
from django.urls import path, include, re_path
from django.conf import settings
from django.views.static import serve

mimetypes.add_type('text/javascript', '.jsx')
mimetypes.add_type('text/javascript', '.js')

FRONTEND_DIR = settings.BASE_DIR.parent / 'frontend'

def serve_index(request):
    return serve(request, 'index.html', document_root=FRONTEND_DIR)

urlpatterns = (
    [path('media/<path:path>', serve, {'document_root': settings.MEDIA_ROOT})]
    + [
        path('admin/', admin.site.urls),
        path('api/', include('api.urls')),
        path('', serve_index),
        re_path(r'^(?P<path>.+)$', serve, {'document_root': FRONTEND_DIR}),
    ]
)
