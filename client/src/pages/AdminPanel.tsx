import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";

import Sidebar from "@/components/Sidebar";
import Dashboard from "@/components/Dashboard";
import PendingPayments from "@/components/PendingPayments";
import UsersList from "@/components/UsersList";
import TextTemplates from "@/components/TextTemplates";
import PaymentModal from "@/components/PaymentModal";
import RejectionModal from "@/components/RejectionModal";
import RemoveUserModal from "@/components/RemoveUserModal";

const AdminPanel = () => {
  const [location, setLocation] = useLocation();
  const hash = location.split("#")[1] || "dashboard";
  
  // Modal states
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [rejectionModalOpen, setRejectionModalOpen] = useState(false);
  const [removeUserModalOpen, setRemoveUserModalOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  
  // Get pending payments count for sidebar
  const { data: pendingPayments } = useQuery({
    queryKey: ["/api/payments/pending"],
  });
  
  const pendingCount = pendingPayments?.length || 0;
  
  // Handle hash change from URL
  useEffect(() => {
    const handleHashChange = () => {
      const newHash = window.location.hash.substring(1) || "dashboard";
      if (hash !== newHash) {
        setLocation(`#${newHash}`, { replace: true });
      }
    };
    
    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, [hash, setLocation]);
  
  // Handle payment view
  const handlePaymentView = (id: number) => {
    setSelectedUserId(id);
    setPaymentModalOpen(true);
  };
  
  // Handle payment approve
  const handlePaymentApprove = (id: number) => {
    setSelectedUserId(id);
    setPaymentModalOpen(true);
  };
  
  // Handle payment reject
  const handlePaymentReject = (id: number) => {
    setSelectedUserId(id);
    setRejectionModalOpen(true);
  };
  
  // Handle user view
  const handleUserView = (id: number) => {
    // TODO: Implement user view functionality
    console.log("View user", id);
  };
  
  // Handle user edit
  const handleUserEdit = (id: number) => {
    // TODO: Implement user edit functionality
    console.log("Edit user", id);
  };
  
  // Handle user remove
  const handleUserRemove = (id: number) => {
    setSelectedUserId(id);
    setRemoveUserModalOpen(true);
  };
  
  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <Sidebar pendingPaymentsCount={pendingCount} />
      
      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-4 md:p-6 bg-gray-50">
        {/* Dashboard */}
        {hash === "dashboard" && (
          <Dashboard 
            onPaymentView={handlePaymentView}
            onPaymentApprove={handlePaymentApprove}
            onPaymentReject={handlePaymentReject}
          />
        )}
        
        {/* Pending Payments */}
        {hash === "pending" && (
          <PendingPayments 
            onPaymentView={handlePaymentView}
            onPaymentApprove={handlePaymentApprove}
            onPaymentReject={handlePaymentReject}
          />
        )}
        
        {/* Users List */}
        {hash === "users" && (
          <UsersList 
            onUserView={handleUserView}
            onUserEdit={handleUserEdit}
            onUserRemove={handleUserRemove}
          />
        )}
        
        {/* Text Templates */}
        {hash === "templates" && (
          <TextTemplates />
        )}
        
        {/* Settings - Not implemented yet, placeholder */}
        {hash === "settings" && (
          <div className="mb-8">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold">Sozlamalar</h2>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <p className="text-gray-500">Sozlamalar sahifasi hali tayyorlanmoqda.</p>
            </div>
          </div>
        )}
      </main>
      
      {/* Modals */}
      <PaymentModal 
        isOpen={paymentModalOpen}
        userId={selectedUserId}
        onClose={() => setPaymentModalOpen(false)}
        onReject={(id) => {
          setPaymentModalOpen(false);
          setRejectionModalOpen(true);
        }}
      />
      
      <RejectionModal 
        isOpen={rejectionModalOpen}
        userId={selectedUserId}
        onClose={() => setRejectionModalOpen(false)}
      />
      
      <RemoveUserModal 
        isOpen={removeUserModalOpen}
        userId={selectedUserId}
        onClose={() => setRemoveUserModalOpen(false)}
      />
    </div>
  );
};

export default AdminPanel;
