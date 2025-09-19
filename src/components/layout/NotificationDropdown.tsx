import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, CheckCircle, AlertTriangle, Clock, Loader2, Eye, Trash2, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useNotifications } from '@/contexts/NotificationContext';
import { Notification } from '@/types';

export const NotificationDropdown = () => {
  const { 
    unreadCount, 
    loading, 
    getRecentNotifications, 
    markAsRead, 
    markAllAsRead,
    deleteNotification,
    refreshNotifications 
  } = useNotifications();
  
  const navigate = useNavigate();
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const recentNotifications = getRecentNotifications(5);

  const getNotificationIcon = (type: string, size = "w-4 h-4") => {
    const iconClass = `${size} text-muted-foreground`;
    switch (type) {
      case 'alert':
        return <AlertTriangle className={`${iconClass} text-destructive`} />;
      case 'warning':
        return <Clock className={`${iconClass} text-warning`} />;
      case 'success':
        return <CheckCircle className={`${iconClass} text-success`} />;
      case 'info':
      default:
        return <Bell className={iconClass} />;
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) {
      return 'Agora mesmo';
    } else if (diffInMinutes < 60) {
      return `${diffInMinutes}m atrás`;
    } else {
      const diffInHours = Math.floor(diffInMinutes / 60);
      if (diffInHours < 24) {
        return `${diffInHours}h atrás`;
      } else {
        return date.toLocaleDateString('pt-BR');
      }
    }
  };

  const handleMarkAsRead = async (id: string, event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    setActionLoading(id);
    try {
      await markAsRead(id);
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (id: string, event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    setActionLoading(`delete-${id}`);
    try {
      await deleteNotification(id);
    } finally {
      setActionLoading(null);
    }
  };

  const handleMarkAllAsRead = async () => {
    setActionLoading('mark-all');
    try {
      await markAllAsRead();
    } finally {
      setActionLoading(null);
    }
  };

  const handleRefresh = async () => {
    setActionLoading('refresh');
    try {
      await refreshNotifications();
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="relative">
          <Bell className="w-4 h-4" />
          {unreadCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent className="w-80" align="end">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>Notificações</span>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost" 
              size="sm"
              onClick={handleRefresh}
              disabled={actionLoading === 'refresh'}
              className="h-6 w-6 p-0"
            >
              {actionLoading === 'refresh' ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <RotateCcw className="w-3 h-3" />
              )}
            </Button>
            {unreadCount > 0 && (
              <Button
                variant="ghost" 
                size="sm"
                onClick={handleMarkAllAsRead}
                disabled={actionLoading === 'mark-all'}
                className="h-6 px-2 text-xs"
              >
                {actionLoading === 'mark-all' ? (
                  <Loader2 className="w-3 h-3 animate-spin mr-1" />
                ) : (
                  <CheckCircle className="w-3 h-3 mr-1" />
                )}
                Todas
              </Button>
            )}
          </div>
        </DropdownMenuLabel>
        
        <DropdownMenuSeparator />
        
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
        ) : recentNotifications.length === 0 ? (
          <div className="p-4 text-center">
            <Bell className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">
              Nenhuma notificação
            </p>
          </div>
        ) : (
          <div className="max-h-80 overflow-y-auto">
            {recentNotifications.map((notification: Notification) => (
              <div key={notification.id} className="group">
                <div className={`px-4 py-3 hover:bg-accent/50 cursor-pointer border-l-2 ${
                  !notification.read 
                    ? 'border-l-primary bg-primary/5' 
                    : 'border-l-transparent'
                }`}>
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5">
                      {getNotificationIcon(notification.type)}
                    </div>
                    
                    <div className="flex-1 space-y-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-medium truncate">
                          {notification.title}
                        </p>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          {!notification.read && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => handleMarkAsRead(notification.id, e)}
                              disabled={actionLoading === notification.id}
                              className="h-6 w-6 p-0"
                              title="Marcar como lida"
                            >
                              {actionLoading === notification.id ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                <Eye className="w-3 h-3" />
                              )}
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => handleDelete(notification.id, e)}
                            disabled={actionLoading === `delete-${notification.id}`}
                            className="h-6 w-6 p-0 hover:text-destructive"
                            title="Excluir"
                          >
                            {actionLoading === `delete-${notification.id}` ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <Trash2 className="w-3 h-3" />
                            )}
                          </Button>
                        </div>
                      </div>
                      
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {notification.message}
                      </p>
                      
                      <div className="flex items-center justify-between">
                        <p className="text-xs text-muted-foreground">
                          {formatTimestamp(notification.timestamp)}
                        </p>
                        <div className="flex items-center gap-1">
                          {!notification.read && (
                            <Badge variant="outline" className="text-xs h-4 px-1">
                              Nova
                            </Badge>
                          )}
                          {notification.actionRequired && (
                            <Badge variant="destructive" className="text-xs h-4 px-1">
                              Ação
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <DropdownMenuSeparator className="my-0" />
              </div>
            ))}
          </div>
        )}
        
        <DropdownMenuSeparator />
        
        <DropdownMenuItem 
          className="w-full text-center cursor-pointer"
          onClick={() => navigate('/notificacoes')}
        >
          Ver todas as notificações
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};