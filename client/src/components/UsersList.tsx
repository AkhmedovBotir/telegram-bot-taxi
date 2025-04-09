import { useState } from "react";
import { useQuery } from "@tanstack/react-query";

interface UsersListProps {
  onUserView: (id: number) => void;
  onUserEdit: (id: number) => void;
  onUserRemove: (id: number) => void;
}

const UsersList = ({ onUserView, onUserEdit, onUserRemove }: UsersListProps) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const usersPerPage = 10;
  
  // Get all users
  const { data: users, isLoading } = useQuery({
    queryKey: ["/api/users"],
  });
  
  // Format date for display
  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()}`;
  };
  
  // Calculate days remaining until expiry
  const getDaysRemaining = (expiryDateString: string | null | undefined) => {
    if (!expiryDateString) return null;
    
    const expiryDate = new Date(expiryDateString);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const diffTime = expiryDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays;
  };
  
  // Get status display for a user
  const getUserStatus = (user: any) => {
    if (!user.isActive) {
      return { text: "Faol emas", className: "bg-gray-100 text-gray-800" };
    }
    
    const daysRemaining = getDaysRemaining(user.paymentExpiryDate);
    
    if (daysRemaining === null) {
      return { text: "Noma'lum", className: "bg-gray-100 text-gray-800" };
    } else if (daysRemaining <= 0) {
      return { text: "Muddati tugagan", className: "bg-red-100 text-red-800" };
    } else if (daysRemaining <= 1) {
      return { text: "1 kun qoldi", className: "bg-red-100 text-red-800" };
    } else if (daysRemaining <= 3) {
      return { text: `${daysRemaining} kun qoldi`, className: "bg-orange-100 text-orange-800" };
    } else {
      return { text: "Faol", className: "bg-green-100 text-green-800" };
    }
  };
  
  // Filter users by status and search term
  const filteredUsers = users ? users.filter((user: any) => {
    const matchesSearch = user.fullName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          user.phoneNumber.includes(searchTerm);
    
    if (filterStatus === "all") {
      return matchesSearch;
    } else if (filterStatus === "active") {
      return matchesSearch && user.isActive;
    } else if (filterStatus === "inactive") {
      return matchesSearch && !user.isActive;
    } else if (filterStatus === "expiring") {
      const daysRemaining = getDaysRemaining(user.paymentExpiryDate);
      return matchesSearch && daysRemaining !== null && daysRemaining <= 3 && daysRemaining > 0;
    }
    
    return matchesSearch;
  }) : [];
  
  // Pagination
  const indexOfLastUser = currentPage * usersPerPage;
  const indexOfFirstUser = indexOfLastUser - usersPerPage;
  const currentUsers = filteredUsers.slice(indexOfFirstUser, indexOfLastUser);
  const totalPages = Math.ceil(filteredUsers.length / usersPerPage);
  
  // Generate page numbers
  const pageNumbers = [];
  if (totalPages <= 5) {
    for (let i = 1; i <= totalPages; i++) {
      pageNumbers.push(i);
    }
  } else {
    if (currentPage <= 3) {
      for (let i = 1; i <= 5; i++) {
        pageNumbers.push(i);
      }
    } else if (currentPage >= totalPages - 2) {
      for (let i = totalPages - 4; i <= totalPages; i++) {
        pageNumbers.push(i);
      }
    } else {
      for (let i = currentPage - 2; i <= currentPage + 2; i++) {
        pageNumbers.push(i);
      }
    }
  }
  
  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold">Foydalanuvchilar ro'yxati</h2>
        <div className="flex items-center space-x-2">
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
          <div className="relative">
            <select 
              className="py-2 pl-10 pr-4 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="all">Barchasi</option>
              <option value="active">Faol</option>
              <option value="inactive">Faol emas</option>
              <option value="expiring">Muddati tugayotganlar</option>
            </select>
            <span className="material-icons absolute left-3 top-2 text-gray-400">filter_list</span>
          </div>
        </div>
      </div>
      
      {/* Users Full Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="text-left text-xs text-gray-500 uppercase border-b">
                <th className="py-4 px-6">Foydalanuvchi</th>
                <th className="py-4 px-6">Telefon</th>
                <th className="py-4 px-6">A'zolik boshlanish</th>
                <th className="py-4 px-6">Tugash vaqti</th>
                <th className="py-4 px-6">Holat</th>
                <th className="py-4 px-6">Amallar</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="text-center py-4">
                    <span className="material-icons animate-spin">refresh</span>
                    <p className="text-sm text-gray-500 mt-2">Yuklanmoqda...</p>
                  </td>
                </tr>
              ) : currentUsers.length > 0 ? (
                currentUsers.map((user: any) => {
                  const status = getUserStatus(user);
                  return (
                    <tr className="border-b hover:bg-gray-50" key={user.id}>
                      <td className="py-3 px-6">
                        <div className="flex items-center">
                          <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-medium">
                            {user.fullName?.[0] || "U"}
                          </div>
                          <div className="ml-3">{user.fullName}</div>
                        </div>
                      </td>
                      <td className="py-3 px-6 text-sm">{user.phoneNumber}</td>
                      <td className="py-3 px-6 text-sm">{formatDate(user.joinDate)}</td>
                      <td className="py-3 px-6 text-sm">{formatDate(user.paymentExpiryDate)}</td>
                      <td className="py-3 px-6">
                        <span className={`px-2 py-1 text-xs rounded-full ${status.className}`}>
                          {status.text}
                        </span>
                      </td>
                      <td className="py-3 px-6">
                        <div className="flex space-x-2">
                          <button 
                            className="p-1 text-primary" 
                            title="Ko'rish"
                            onClick={() => onUserView(user.id)}
                          >
                            <span className="material-icons text-sm">visibility</span>
                          </button>
                          <button 
                            className="p-1 text-primary-light" 
                            title="Tahrirlash"
                            onClick={() => onUserEdit(user.id)}
                          >
                            <span className="material-icons text-sm">edit</span>
                          </button>
                          <button 
                            className="p-1 text-error-DEFAULT" 
                            title="Guruhdan chiqarish"
                            onClick={() => onUserRemove(user.id)}
                          >
                            <span className="material-icons text-sm">person_remove</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className="text-center py-4">
                    <p className="text-sm text-gray-500">
                      {searchTerm || filterStatus !== "all" 
                        ? `Natijalar topilmadi` 
                        : "Foydalanuvchilar ro'yxati bo'sh"}
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        
        <div className="p-4 border-t flex items-center justify-between">
          <div className="text-sm text-gray-500">Jami: {filteredUsers.length} ta foydalanuvchi</div>
          
          {totalPages > 1 && (
            <div className="flex space-x-1">
              <button 
                className="px-3 py-1 rounded border text-sm" 
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(currentPage - 1)}
              >
                <span className="material-icons text-sm">chevron_left</span>
              </button>
              
              {pageNumbers.map(number => (
                <button 
                  key={number}
                  className={`px-3 py-1 rounded border text-sm ${currentPage === number ? 'bg-primary text-white' : ''}`}
                  onClick={() => setCurrentPage(number)}
                >
                  {number}
                </button>
              ))}
              
              <button 
                className="px-3 py-1 rounded border text-sm"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(currentPage + 1)}
              >
                <span className="material-icons text-sm">chevron_right</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default UsersList;
