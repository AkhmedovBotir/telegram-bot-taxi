import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface RemoveUserModalProps {
  isOpen: boolean;
  userId: number | null;
  onClose: () => void;
}

const RemoveUserModal = ({ isOpen, userId, onClose }: RemoveUserModalProps) => {
  const [reason, setReason] = useState("");
  const { toast } = useToast();
  
  // Get user details
  const { data: user } = useQuery({
    queryKey: [`/api/users/${userId}`],
    enabled: isOpen && userId !== null,
  });
  
  // Reset reason when modal opens
  useEffect(() => {
    if (isOpen) {
      setReason("");
    }
  }, [isOpen]);
  
  // Remove user mutation
  const removeUserMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: number, reason: string }) => {
      const response = await apiRequest("POST", `/api/users/remove/${id}`, { reason });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/activities"] });
      
      toast({
        title: "Foydalanuvchi chiqarildi",
        description: "Foydalanuvchi guruhdan muvaffaqiyatli chiqarildi",
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
  
  // Handle user removal
  const handleRemoveUser = () => {
    if (!userId) {
      toast({
        title: "Xatolik",
        description: "Foydalanuvchi ID si topilmadi",
        variant: "destructive",
      });
      return;
    }
    
    removeUserMutation.mutate({ id: userId, reason });
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
      <div className="bg-white rounded-lg shadow-lg w-full max-w-md">
        <div className="p-6 border-b flex items-center justify-between">
          <h3 className="font-bold text-lg">Foydalanuvchini chiqarish</h3>
          <button className="text-gray-500 hover:text-gray-700" onClick={onClose}>
            <span className="material-icons">close</span>
          </button>
        </div>
        
        <div className="p-6">
          <div className="mb-6">
            <div className="flex items-center justify-center mb-4">
              <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center text-red-500">
                <span className="material-icons text-4xl">person_remove</span>
              </div>
            </div>
            
            <p className="text-center text-gray-700 mb-2">
              Siz haqiqatan ham <strong>{user?.fullName || "foydalanuvchi"}</strong>ni guruhdan chiqarmoqchimisiz?
            </p>
            <p className="text-center text-gray-500 text-sm">
              Bu amal bajarilgandan so'ng foydalanuvchi guruhga qayta qo'shilishi uchun yangi to'lov qilishi kerak.
            </p>
          </div>
          
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-medium mb-2">Chiqarish sababini kiriting (ixtiyoriy)</label>
            <textarea 
              rows={3} 
              placeholder="Masalan: To'lov qilmaganligi sababli, guruh qoidalarini buzganligi uchun..." 
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>
          
          <div className="flex justify-end space-x-3">
            <button 
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50" 
              onClick={onClose}
              disabled={removeUserMutation.isPending}
            >
              Bekor qilish
            </button>
            <button 
              className="px-4 py-2 bg-error-DEFAULT text-white rounded-md hover:bg-opacity-90"
              onClick={handleRemoveUser}
              disabled={removeUserMutation.isPending}
            >
              {removeUserMutation.isPending ? "Chiqarilmoqda..." : "Chiqarish"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RemoveUserModal;
