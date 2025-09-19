import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { notificationsAPI } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from './AuthContext';
import { Notification } from '@/types';

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  refreshNotifications: () => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (id: string) => Promise<void>;
  getRecentNotifications: (limit?: number) => Notification[];
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

interface NotificationProviderProps {
  children: ReactNode;
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({ children }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastNotificationId, setLastNotificationId] = useState<string | null>(null);
  const { toast } = useToast();
  const { user, isAuthenticated } = useAuth();

  // Busca notificações da API
  const fetchNotifications = useCallback(async (showToast = false) => {
    if (!isAuthenticated || !user) return;

    try {
      const response = await notificationsAPI.list();
      const newNotifications = response.results || response;
      
      // Detecta novas notificações para mostrar toast
      if (showToast && lastNotificationId && newNotifications.length > 0) {
        const latestNotification = newNotifications[0];
        if (latestNotification.id !== lastNotificationId) {
          // Nova notificação detectada!
          showNewNotificationToast(latestNotification);
        }
      }

      setNotifications(newNotifications);
      
      // Atualiza o ID da última notificação
      if (newNotifications.length > 0) {
        setLastNotificationId(newNotifications[0].id);
      }
      
    } catch (error) {
      console.error('Erro ao carregar notificações:', error);
      if (showToast) {
        toast({
          title: "Erro ao carregar notificações",
          description: "Não foi possível atualizar as notificações.",
          variant: "destructive"
        });
      }
    }
  }, [isAuthenticated, user, lastNotificationId, toast]);

  // Mostra toast para nova notificação
  const showNewNotificationToast = (notification: Notification) => {
    const getToastVariant = (type: string) => {
      switch (type) {
        case 'alert': return 'destructive';
        case 'warning': return 'default';
        case 'success': return 'default';
        case 'info':
        default: return 'default';
      }
    };

    const getEmoji = (type: string) => {
      switch (type) {
        case 'alert': return '🚨';
        case 'warning': return '⚠️';
        case 'success': return '✅';
        case 'info':
        default: return '🔔';
      }
    };

    toast({
      title: `${getEmoji(notification.type)} ${notification.title}`,
      description: notification.message.length > 100 
        ? notification.message.substring(0, 100) + '...' 
        : notification.message,
      variant: getToastVariant(notification.type),
      duration: notification.type === 'alert' ? 8000 : 5000, // Alertas ficam mais tempo
    });
  };

  // Refresh manual
  const refreshNotifications = useCallback(async () => {
    setLoading(true);
    await fetchNotifications(false);
    setLoading(false);
  }, [fetchNotifications]);

  // Marca como lida
  const markAsRead = useCallback(async (id: string) => {
    try {
      await notificationsAPI.markAsRead(id);
      setNotifications(prev => 
        prev.map(notification => 
          notification.id === id 
            ? { ...notification, read: true }
            : notification
        )
      );
    } catch (error) {
      console.error('Erro ao marcar como lida:', error);
      toast({
        title: "Erro ao marcar como lida",
        description: "Não foi possível marcar a notificação como lida.",
        variant: "destructive"
      });
    }
  }, [toast]);

  // Marca todas como lidas
  const markAllAsRead = useCallback(async () => {
    try {
      await notificationsAPI.markAllAsRead();
      setNotifications(prev => 
        prev.map(notification => ({ ...notification, read: true }))
      );
      toast({
        title: "Todas as notificações foram marcadas como lidas",
        description: "Suas notificações foram atualizadas.",
      });
    } catch (error) {
      console.error('Erro ao marcar todas como lidas:', error);
      toast({
        title: "Erro ao marcar todas como lidas",
        description: "Não foi possível marcar todas as notificações como lidas.",
        variant: "destructive"
      });
    }
  }, [toast]);

  // Deleta notificação
  const deleteNotification = useCallback(async (id: string) => {
    try {
      await notificationsAPI.delete(id);
      setNotifications(prev => prev.filter(notification => notification.id !== id));
      toast({
        title: "Notificação removida",
        description: "A notificação foi excluída com sucesso.",
      });
    } catch (error) {
      console.error('Erro ao excluir notificação:', error);
      toast({
        title: "Erro ao excluir notificação",
        description: "Não foi possível excluir a notificação.",
        variant: "destructive"
      });
    }
  }, [toast]);

  // Pega notificações recentes
  const getRecentNotifications = useCallback((limit = 5) => {
    return notifications.slice(0, limit);
  }, [notifications]);

  // Polling automático
  useEffect(() => {
    if (!isAuthenticated || !user) {
      setNotifications([]);
      setLoading(false);
      return;
    }

    // Carrega notificações inicialmente
    fetchNotifications(false).finally(() => setLoading(false));

    // Configura polling a cada 10 segundos
    const intervalId = setInterval(() => {
      fetchNotifications(true); // Com toast para novas notificações
    }, 10000);

    return () => clearInterval(intervalId);
  }, [isAuthenticated, user, fetchNotifications]);

  // Calcula contadores
  const unreadCount = notifications.filter(n => !n.read).length;

  const value: NotificationContextType = {
    notifications,
    unreadCount,
    loading,
    refreshNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    getRecentNotifications,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};

// Hook para usar o context
export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications deve ser usado dentro de um NotificationProvider');
  }
  return context;
};