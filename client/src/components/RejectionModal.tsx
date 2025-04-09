import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface RejectionModalProps {
  isOpen: boolean;
  userId: number | null;
  onClose: () => void;
}

const RejectionModal = ({ isOpen, userId, onClose }: RejectionModalProps) => {
  const [reason, setReason] = useState("");
  const { toast } = useToast();
  
  // Reset reason when modal opens
  useEffect(() => {
    if (isOpen) {
      setReason("");
    }
  }, [isOpen]);
  
  // Reject payment mutation
  const rejectPaymentMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: number, reason: string }) => {
      const response = await apiRequest("POST", `/api/payments/reject/${id}`, { reason });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/payments/pending"] });
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/activities"] });
      
      toast({
        title: "To'lov bekor qilindi",
        description: "Foydalanuvchi to'lovi bekor qilindi",
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
  
  // Handle rejection submission
  const handleReject = () => {
    if (!reason.trim()) {
      toast({
        title: "Sabab kiritilmadi",
        description: "Iltimos, bekor qilish sababini kiriting",
        variant: "destructive",
      });
      return;
    }
    
    if (!userId) {
      toast({
        title: "Xatolik",
        description: "Foydalanuvchi ID si topilmadi",
        variant: "destructive",
      });
      return;
    }
    
    rejectPaymentMutation.mutate({ id: userId, reason });
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
          <h3 className="font-bold text-lg">Bekor qilish sababi</h3>
          <button className="text-gray-500 hover:text-gray-700" onClick={onClose}>
            <span className="material-icons">close</span>
          </button>
        </div>
        
        <div className="p-6">
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-medium mb-2">Bekor qilish sababini kiriting</label>
            <textarea 
              rows={4} 
              placeholder="Masalan: Chek sifati yomon, to'lov summasi noto'g'ri, boshqa..." 
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>
          
          <div className="flex justify-end space-x-3">
            <button 
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50" 
              onClick={onClose}
              disabled={rejectPaymentMutation.isPending}
            >
              Qaytish
            </button>
            <button 
              className="px-4 py-2 bg-error-DEFAULT text-white rounded-md hover:bg-opacity-90"
              onClick={handleReject}
              disabled={rejectPaymentMutation.isPending}
            >
              {rejectPaymentMutation.isPending ? "Bekor qilinmoqda..." : "Bekor qilish"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RejectionModal;
