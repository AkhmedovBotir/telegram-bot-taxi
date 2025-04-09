import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import StatsCard from "./StatsCard";
import { formatNumber } from "@/lib/utils";

interface DashboardProps {
  onPaymentView: (id: number) => void;
  onPaymentApprove: (id: number) => void;
  onPaymentReject: (id: number) => void;
}

const Dashboard = ({ onPaymentView, onPaymentApprove, onPaymentReject }: DashboardProps) => {
  // Get dashboard stats
  const { data: stats, isLoading: isStatsLoading } = useQuery({
    queryKey: ["/api/stats"],
  });
  
  // Get recent activities
  const { data: activities, isLoading: isActivitiesLoading } = useQuery({
    queryKey: ["/api/activities"],
  });
  
  // Get pending payments
  const { data: pendingPayments, isLoading: isPendingLoading } = useQuery({
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
  
  // Activity icon based on type
  const getActivityIcon = (type: string) => {
    switch (type) {
      case "user_joined":
        return { icon: "person_add", bgColor: "bg-purple-100", textColor: "text-purple-600" };
      case "payment_approved":
        return { icon: "check_circle", bgColor: "bg-green-100", textColor: "text-green-600" };
      case "user_removed":
        return { icon: "remove_circle", bgColor: "bg-red-100", textColor: "text-red-600" };
      case "payment_sent":
        return { icon: "receipt", bgColor: "bg-blue-100", textColor: "text-blue-600" };
      case "payment_rejected":
        return { icon: "cancel", bgColor: "bg-orange-100", textColor: "text-orange-600" };
      default:
        return { icon: "info", bgColor: "bg-gray-100", textColor: "text-gray-600" };
    }
  };
  
  // Activity message based on type
  const getActivityMessage = (activity: any) => {
    switch (activity.type) {
      case "user_joined":
        return `${activity.userName} qo'shildi`;
      case "payment_approved":
        return `${activity.userName} toʻlovi tasdiqlandi`;
      case "user_removed":
        return `${activity.userName} guruhdan chiqarildi`;
      case "payment_sent":
        return `${activity.userName} chek yubordi`;
      case "payment_rejected":
        return `${activity.userName} toʻlovi bekor qilindi`;
      default:
        return `${activity.userName}: harakatlar`;
    }
  };
  
  return (
    <div className="mb-8">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold">Boshqaruv paneli</h2>
        <div className="flex items-center space-x-2">
          <div className="relative">
            <input 
              type="text" 
              placeholder="Qidirish..." 
              className="py-2 pl-10 pr-4 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            />
            <span className="material-icons absolute left-3 top-2 text-gray-400">search</span>
          </div>
          <button className="p-2 rounded-full hover:bg-gray-200">
            <span className="material-icons text-gray-600">notifications</span>
          </button>
        </div>
      </div>
      
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatsCard 
          title="Faol foydalanuvchilar"
          value={isStatsLoading ? "..." : stats?.activeUsers || 0}
          icon="people"
          iconColor="text-primary"
          changeValue="+12%"
          changeType="positive"
        />
        
        <StatsCard 
          title="Kutilayotgan to'lovlar"
          value={isStatsLoading ? "..." : stats?.pendingPayments || 0}
          icon="hourglass_empty"
          iconColor="text-warning-DEFAULT"
          changeValue={stats?.pendingPayments > 0 ? `+${stats.pendingPayments}` : "0"}
          changeType="negative"
        />
        
        <StatsCard 
          title="Bugun muddati tugaydiganlar"
          value={isStatsLoading ? "..." : stats?.expiringToday || 0}
          icon="access_time"
          iconColor="text-error-DEFAULT"
          changeValue={stats?.expiringToday > 0 ? `+${stats.expiringToday}` : "0"}
          changeType="negative"
        />
        
        <StatsCard 
          title="Oylik daromad"
          value={isStatsLoading ? "..." : `${formatNumber(stats?.monthlyRevenue || 0)}`}
          icon="payments"
          iconColor="text-success-DEFAULT"
          suffix="UZS"
        />
      </div>
      
      {/* Recent Activity and Pending Payments */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Recent Activity */}
        <div className="lg:col-span-2 bg-white rounded-lg shadow">
          <div className="p-6 border-b">
            <h3 className="font-medium">So'nggi harakatlar</h3>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {isActivitiesLoading ? (
                <div className="text-center py-4">
                  <span className="material-icons animate-spin">refresh</span>
                  <p className="text-sm text-gray-500 mt-2">Yuklanmoqda...</p>
                </div>
              ) : activities && activities.length > 0 ? (
                activities.slice(0, 4).map((activity: any) => {
                  const { icon, bgColor, textColor } = getActivityIcon(activity.type);
                  return (
                    <div className="flex items-start" key={activity.id}>
                      <div className={`${bgColor} p-2 rounded-full`}>
                        <span className={`material-icons ${textColor}`}>{icon}</span>
                      </div>
                      <div className="ml-4">
                        <p className="text-sm font-medium">{getActivityMessage(activity)}</p>
                        <p className="text-sm text-gray-500">{formatDate(activity.date)}</p>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-4">
                  <p className="text-sm text-gray-500">Hozircha harakatlar yo'q</p>
                </div>
              )}
            </div>
            
            <Link href="#users">
              <a className="mt-4 text-primary text-sm font-medium flex items-center">
                <span>Barcha faoliyatni ko'rish</span>
                <span className="material-icons text-sm ml-1">arrow_forward</span>
              </a>
            </Link>
          </div>
        </div>
        
        {/* Pending Payments Preview */}
        <div className="lg:col-span-3 bg-white rounded-lg shadow">
          <div className="p-6 border-b flex justify-between items-center">
            <h3 className="font-medium">Kutilayotgan to'lovlar</h3>
            <Link href="#pending">
              <a className="text-primary text-sm font-medium">Barchasini ko'rish</a>
            </Link>
          </div>
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
                {isPendingLoading ? (
                  <tr>
                    <td colSpan={5} className="text-center py-4">
                      <span className="material-icons animate-spin">refresh</span>
                      <p className="text-sm text-gray-500 mt-2">Yuklanmoqda...</p>
                    </td>
                  </tr>
                ) : pendingPayments && pendingPayments.length > 0 ? (
                  pendingPayments.slice(0, 3).map((payment: any) => (
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
                      <p className="text-sm text-gray-500">Kutilayotgan to'lovlar yo'q</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
