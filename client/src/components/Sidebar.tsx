import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";

interface SidebarProps {
  pendingPaymentsCount: number;
}

const Sidebar = ({ pendingPaymentsCount }: SidebarProps) => {
  const [location] = useLocation();
  const activeHash = location.split("#")[1] || "dashboard";
  
  // Get admin information - in a real app, we would fetch this from the API
  const admin = {
    fullName: "Admin",
    role: "Admin"
  };
  
  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 bg-white shadow-md h-screen">
        <div className="p-4 border-b flex items-center gap-3">
          <span className="material-icons text-primary">payment</span>
          <h1 className="font-bold text-xl text-primary">To'lov Nazoratchi</h1>
        </div>
        
        <div className="p-2">
          <div className="text-sm text-gray-500 px-4 py-2 uppercase">Admin Panel</div>
          
          <nav>
            <Link href="#dashboard">
              <a className={`flex items-center px-4 py-3 text-sm rounded-lg mb-1 ${activeHash === "dashboard" ? "sidebar-active" : "text-gray-700 hover:bg-gray-100"}`}>
                <span className={`material-icons mr-3 ${activeHash === "dashboard" ? "text-primary" : "text-gray-500"}`}>dashboard</span>
                <span>Boshqaruv paneli</span>
              </a>
            </Link>
            
            <Link href="#pending">
              <a className={`flex items-center px-4 py-3 text-sm rounded-lg mb-1 ${activeHash === "pending" ? "sidebar-active" : "text-gray-700 hover:bg-gray-100"}`}>
                <span className={`material-icons mr-3 ${activeHash === "pending" ? "text-primary" : "text-gray-500"}`}>hourglass_empty</span>
                <span>Kutib turganlar</span>
                {pendingPaymentsCount > 0 && (
                  <span className="ml-auto bg-primary text-white rounded-full text-xs px-2 py-1">{pendingPaymentsCount}</span>
                )}
              </a>
            </Link>
            
            <Link href="#users">
              <a className={`flex items-center px-4 py-3 text-sm rounded-lg mb-1 ${activeHash === "users" ? "sidebar-active" : "text-gray-700 hover:bg-gray-100"}`}>
                <span className={`material-icons mr-3 ${activeHash === "users" ? "text-primary" : "text-gray-500"}`}>people</span>
                <span>Foydalanuvchilar</span>
              </a>
            </Link>
            
            <Link href="#templates">
              <a className={`flex items-center px-4 py-3 text-sm rounded-lg mb-1 ${activeHash === "templates" ? "sidebar-active" : "text-gray-700 hover:bg-gray-100"}`}>
                <span className={`material-icons mr-3 ${activeHash === "templates" ? "text-primary" : "text-gray-500"}`}>text_snippet</span>
                <span>Matnlar menyusi</span>
              </a>
            </Link>
            
            <Link href="#settings">
              <a className={`flex items-center px-4 py-3 text-sm rounded-lg mb-1 ${activeHash === "settings" ? "sidebar-active" : "text-gray-700 hover:bg-gray-100"}`}>
                <span className={`material-icons mr-3 ${activeHash === "settings" ? "text-primary" : "text-gray-500"}`}>settings</span>
                <span>Sozlamalar</span>
              </a>
            </Link>
          </nav>
        </div>
        
        <div className="mt-auto p-4 border-t">
          <div className="flex items-center">
            <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white">
              <span>{admin.fullName[0]}</span>
            </div>
            <div className="ml-3">
              <div className="font-medium">{admin.fullName}</div>
              <div className="text-xs text-gray-500">{admin.role}</div>
            </div>
            <button className="ml-auto text-gray-500">
              <span className="material-icons">exit_to_app</span>
            </button>
          </div>
        </div>
      </aside>
      
      {/* Mobile sidebar toggle button */}
      <div className="md:hidden fixed bottom-4 right-4 z-20">
        <button 
          id="mobileSidebarToggle" 
          className="bg-primary text-white p-3 rounded-full shadow-lg"
          onClick={() => {
            const mobileSidebar = document.getElementById("mobileSidebar");
            if (mobileSidebar) {
              mobileSidebar.classList.toggle("hidden");
              const sidebarInner = mobileSidebar.querySelector("div");
              if (sidebarInner) {
                sidebarInner.classList.toggle("-translate-x-full");
              }
            }
          }}
        >
          <span className="material-icons">menu</span>
        </button>
      </div>
      
      {/* Mobile sidebar (hidden by default) */}
      <div id="mobileSidebar" className="fixed inset-0 bg-black bg-opacity-50 z-10 hidden" onClick={(e) => {
        if (e.target === e.currentTarget) {
          e.currentTarget.classList.add("hidden");
          const sidebarInner = e.currentTarget.querySelector("div");
          if (sidebarInner) {
            sidebarInner.classList.add("-translate-x-full");
          }
        }
      }}>
        <div className="w-64 h-full bg-white transform transition-transform -translate-x-full overflow-y-auto">
          <div className="p-4 border-b flex items-center gap-3">
            <span className="material-icons text-primary">payment</span>
            <h1 className="font-bold text-xl text-primary">To'lov Nazoratchi</h1>
          </div>
          
          <div className="p-2">
            <div className="text-sm text-gray-500 px-4 py-2 uppercase">Admin Panel</div>
            
            <nav>
              <Link href="#dashboard">
                <a className={`flex items-center px-4 py-3 text-sm rounded-lg mb-1 ${activeHash === "dashboard" ? "sidebar-active" : "text-gray-700 hover:bg-gray-100"}`}>
                  <span className={`material-icons mr-3 ${activeHash === "dashboard" ? "text-primary" : "text-gray-500"}`}>dashboard</span>
                  <span>Boshqaruv paneli</span>
                </a>
              </Link>
              
              <Link href="#pending">
                <a className={`flex items-center px-4 py-3 text-sm rounded-lg mb-1 ${activeHash === "pending" ? "sidebar-active" : "text-gray-700 hover:bg-gray-100"}`}>
                  <span className={`material-icons mr-3 ${activeHash === "pending" ? "text-primary" : "text-gray-500"}`}>hourglass_empty</span>
                  <span>Kutib turganlar</span>
                  {pendingPaymentsCount > 0 && (
                    <span className="ml-auto bg-primary text-white rounded-full text-xs px-2 py-1">{pendingPaymentsCount}</span>
                  )}
                </a>
              </Link>
              
              <Link href="#users">
                <a className={`flex items-center px-4 py-3 text-sm rounded-lg mb-1 ${activeHash === "users" ? "sidebar-active" : "text-gray-700 hover:bg-gray-100"}`}>
                  <span className={`material-icons mr-3 ${activeHash === "users" ? "text-primary" : "text-gray-500"}`}>people</span>
                  <span>Foydalanuvchilar</span>
                </a>
              </Link>
              
              <Link href="#templates">
                <a className={`flex items-center px-4 py-3 text-sm rounded-lg mb-1 ${activeHash === "templates" ? "sidebar-active" : "text-gray-700 hover:bg-gray-100"}`}>
                  <span className={`material-icons mr-3 ${activeHash === "templates" ? "text-primary" : "text-gray-500"}`}>text_snippet</span>
                  <span>Matnlar menyusi</span>
                </a>
              </Link>
              
              <Link href="#settings">
                <a className={`flex items-center px-4 py-3 text-sm rounded-lg mb-1 ${activeHash === "settings" ? "sidebar-active" : "text-gray-700 hover:bg-gray-100"}`}>
                  <span className={`material-icons mr-3 ${activeHash === "settings" ? "text-primary" : "text-gray-500"}`}>settings</span>
                  <span>Sozlamalar</span>
                </a>
              </Link>
            </nav>
          </div>
          
          <div className="mt-auto p-4 border-t">
            <div className="flex items-center">
              <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white">
                <span>{admin.fullName[0]}</span>
              </div>
              <div className="ml-3">
                <div className="font-medium">{admin.fullName}</div>
                <div className="text-xs text-gray-500">{admin.role}</div>
              </div>
              <button className="ml-auto text-gray-500">
                <span className="material-icons">exit_to_app</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Sidebar;
