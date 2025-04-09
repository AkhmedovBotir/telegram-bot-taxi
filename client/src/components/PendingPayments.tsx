import { useState } from "react";
import { useQuery } from "@tanstack/react-query";

interface PendingPaymentsProps {
  onPaymentView: (id: number) => void;
  onPaymentApprove: (id: number) => void;
  onPaymentReject: (id: number) => void;
}

const PendingPayments = ({ onPaymentView, onPaymentApprove, onPaymentReject }: PendingPaymentsProps) => {
  const [searchTerm, setSearchTerm] = useState("");
  
  // Get pending payments
  const { data: pendingPayments, isLoading } = useQuery({
    queryKey: ["/api/payments/pending"],
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
  
  // Filter payments by search term
  const filteredPayments = pendingPayments ? pendingPayments.filter((payment: any) => 
    payment.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    payment.phoneNumber.includes(searchTerm)
  ) : [];
  
  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold">Kutilayotgan to'lovlar</h2>
        <div className="flex items-center">
          <div className="relative">
            <input 
              type="text" 
              placeholder="Qidirish..." 
              className="py-2 pl-10 pr-4 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <span className="material-icons absolute left-3 top-2 text-gray-400">search</span>
          </div>
        </div>
      </div>
      
      {/* Pending Payments Full Table */}
      <div className="bg-white rounded-lg shadow">
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="text-left text-xs text-gray-500 uppercase border-b">
                <th className="py-4 px-6">Foydalanuvchi</th>
                <th className="py-4 px-6">Yuborilgan vaqt</th>
                <th className="py-4 px-6">Telefon</th>
                <th className="py-4 px-6">Holat</th>
                <th className="py-4 px-6">Amallar</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="text-center py-4">
                    <span className="material-icons animate-spin">refresh</span>
                    <p className="text-sm text-gray-500 mt-2">Yuklanmoqda...</p>
                  </td>
                </tr>
              ) : filteredPayments.length > 0 ? (
                filteredPayments.map((payment: any) => (
                  <tr className="border-b hover:bg-gray-50" key={payment.id}>
                    <td className="py-3 px-6">
                      <div className="flex items-center">
                        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-medium">
                          {payment.fullName?.[0] || "U"}
                        </div>
                        <div className="ml-3">{payment.fullName}</div>
                      </div>
                    </td>
                    <td className="py-3 px-6 text-sm">{formatDate(payment.joinDate)}</td>
                    <td className="py-3 px-6 text-sm">{payment.phoneNumber}</td>
                    <td className="py-3 px-6">
                      <span className="px-2 py-1 text-xs rounded-full bg-yellow-100 text-yellow-800">Kutilmoqda</span>
                    </td>
                    <td className="py-3 px-6">
                      <div className="flex space-x-2">
                        <button 
                          className="p-1 text-primary" 
                          title="Ko'rish"
                          onClick={() => onPaymentView(payment.id)}
                        >
                          <span className="material-icons text-sm">visibility</span>
                        </button>
                        <button 
                          className="p-1 text-success-DEFAULT" 
                          title="Tasdiqlash"
                          onClick={() => onPaymentApprove(payment.id)}
                        >
                          <span className="material-icons text-sm">check_circle</span>
                        </button>
                        <button 
                          className="p-1 text-error-DEFAULT" 
                          title="Bekor qilish"
                          onClick={() => onPaymentReject(payment.id)}
                        >
                          <span className="material-icons text-sm">cancel</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="text-center py-4">
                    <p className="text-sm text-gray-500">
                      {searchTerm ? `"${searchTerm}" bo'yicha natijalar topilmadi` : "Kutilayotgan to'lovlar yo'q"}
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        
        <div className="p-4 border-t flex items-center justify-between">
          <div className="text-sm text-gray-500">Jami: {filteredPayments.length} ta to'lov</div>
          
          {filteredPayments.length > 10 && (
            <div className="flex space-x-1">
              <button className="px-3 py-1 rounded border text-sm" disabled>
                <span className="material-icons text-sm">chevron_left</span>
              </button>
              <button className="px-3 py-1 rounded border text-sm bg-primary text-white">1</button>
              <button className="px-3 py-1 rounded border text-sm">2</button>
              <button className="px-3 py-1 rounded border text-sm">
                <span className="material-icons text-sm">chevron_right</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PendingPayments;
