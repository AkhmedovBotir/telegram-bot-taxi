import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface PaymentModalProps {
  isOpen: boolean;
  userId: number | null;
  onClose: () => void;
  onReject: (userId: number) => void;
}

const PaymentModal = ({ isOpen, userId, onClose, onReject }: PaymentModalProps) => {
  const { toast } = useToast();
  
  // Get user payment details
  const { data: user, isLoading } = useQuery({
    queryKey: [`/api/users/${userId}`],
    enabled: isOpen && userId !== null,
  });
  
  // Approve payment mutation
  const approvePaymentMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest("POST", `/api/payments/approve/${id}`, {});
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/payments/pending"] });
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/activities"] });
      
      toast({
        title: "To'lov tasdiqlandi",
        description: "Foydalanuvchi to'lovi muvaffaqiyatli tasdiqlandi",
      });
      
      onClose();
    },
    onError: (error) => {
      toast({
        title: "Xatolik yuz berdi",
        description: error.message,
        variant: "destructive",
      });
    }
  });
  
  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (date.getDate() === today.getDate() && 
        date.getMonth() === today.getMonth() && 
        date.getFullYear() === today.getFullYear()) {
      return `Bugun, ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
    } else if (date.getDate() === yesterday.getDate() && 
               date.getMonth() === yesterday.getMonth() && 
               date.getFullYear() === yesterday.getFullYear()) {
      return `Kecha, ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
    } else {
      return `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()}, ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
    }
  };
  
  // Close modal when Escape key is pressed
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    
    window.addEventListener("keydown", handleEsc);
    
    return () => {
      window.removeEventListener("keydown", handleEsc);
    };
  }, [onClose]);
  
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={(e) => {
      if (e.target === e.currentTarget) onClose();
    }}>
      <div className="bg-white rounded-lg shadow-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b flex items-center justify-between">
          <h3 className="font-bold text-lg">To'lov chekini ko'rish</h3>
          <button className="text-gray-500 hover:text-gray-700" onClick={onClose}>
            <span className="material-icons">close</span>
          </button>
        </div>
        
        <div className="p-6">
          {isLoading ? (
            <div className="text-center py-6">
              <span className="material-icons animate-spin text-primary">refresh</span>
              <p className="mt-2 text-gray-500">Ma'lumotlar yuklanmoqda...</p>
            </div>
          ) : user ? (
            <div className="flex flex-col md:flex-row gap-6">
              <div className="w-full md:w-1/2">
                <div className="bg-gray-100 rounded-lg p-4 mb-4">
                  <h4 className="font-medium text-sm text-gray-500 mb-2">Foydalanuvchi ma'lumotlari</h4>
                  <div className="space-y-2">
                    <div className="flex items-center">
                      <span className="material-icons text-gray-400 mr-2 text-sm">person</span>
                      <span className="font-medium">{user.fullName}</span>
                    </div>
                    <div className="flex items-center">
                      <span className="material-icons text-gray-400 mr-2 text-sm">phone</span>
                      <span>{user.phoneNumber}</span>
                    </div>
                    <div className="flex items-center">
                      <span className="material-icons text-gray-400 mr-2 text-sm">calendar_today</span>
                      <span>Yuborilgan: {formatDate(user.joinDate)}</span>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h4 className="font-medium text-sm text-gray-500 mb-2">Qaror qabul qilish</h4>
                  <div className="space-y-3">
                    <button 
                      className="w-full py-2 bg-success-DEFAULT text-white rounded-md hover:bg-opacity-90 flex items-center justify-center"
                      onClick={() => {
                        if (userId) {
                          approvePaymentMutation.mutate(userId);
                        }
                      }}
                      disabled={approvePaymentMutation.isPending}
                    >
                      <span className="material-icons mr-2">check_circle</span>
                      <span>{approvePaymentMutation.isPending ? "Tasdiqlanmoqda..." : "Tasdiqlash"}</span>
                    </button>
                    
                    <button 
                      className="w-full py-2 border border-error-DEFAULT text-error-DEFAULT rounded-md hover:bg-error-DEFAULT hover:text-white flex items-center justify-center"
                      onClick={() => {
                        if (userId) {
                          onReject(userId);
                        }
                      }}
                      disabled={approvePaymentMutation.isPending}
                    >
                      <span className="material-icons mr-2">cancel</span>
                      <span>Bekor qilish</span>
                    </button>
                  </div>
                </div>
              </div>
              
              <div className="w-full md:w-1/2">
                <h4 className="font-medium text-sm text-gray-500 mb-2">To'lov cheki</h4>
                <div className="border rounded-lg overflow-hidden">
                  {user.paymentProof ? (
                    <img 
                      src={`/${user.paymentProof}`} 
                      alt="To'lov cheki" 
                      className="w-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = "https://via.placeholder.com/400x300?text=Rasm+yuklanmadi";
                      }}
                    />
                  ) : (
                    <div className="bg-gray-100 h-64 flex items-center justify-center">
                      <p className="text-gray-500">Chek topilmadi</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-6">
              <p className="text-gray-500">Foydalanuvchi ma'lumotlari topilmadi</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PaymentModal;
