import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

const TextTemplates = () => {
  const [activeTab, setActiveTab] = useState("startMessage");
  const [editedText, setEditedText] = useState("");
  const [editedName, setEditedName] = useState("");
  const { toast } = useToast();
  
  // Get all text templates
  const { data: texts, isLoading } = useQuery({
    queryKey: ["/api/texts"],
    onSuccess: (data) => {
      // Find the active template
      const activeTemplate = data.find((template: any) => template.key === activeTab);
      if (activeTemplate) {
        setEditedText(activeTemplate.value);
        setEditedName(getTemplateName(activeTemplate.key));
      }
    }
  });
  
  // Update text template mutation
  const updateTextMutation = useMutation({
    mutationFn: async ({ key, value }: { key: string, value: string }) => {
      const response = await apiRequest("PUT", `/api/texts/${key}`, { value });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/texts"] });
      toast({
        title: "Muvaffaqiyatli saqlandi",
        description: "Matn yangilandi",
      });
    },
    onError: (error) => {
      toast({
        title: "Xatolik yuz berdi",
        description: error.message,
        variant: "destructive",
      });
    }
  });
  
  // Handle tab change
  const handleTabChange = (tabKey: string) => {
    const template = texts?.find((template: any) => template.key === tabKey);
    
    if (template) {
      setActiveTab(tabKey);
      setEditedText(template.value);
      setEditedName(getTemplateName(template.key));
    }
  };
  
  // Handle save button click
  const handleSave = () => {
    if (!editedText.trim()) {
      toast({
        title: "Xatolik",
        description: "Matn bo'sh bo'lishi mumkin emas",
        variant: "destructive",
      });
      return;
    }
    
    updateTextMutation.mutate({ key: activeTab, value: editedText });
  };
  
  // Get friendly template name based on key
  const getTemplateName = (key: string) => {
    switch (key) {
      case "startMessage":
        return "Start bosilgandagi matn";
      case "beforePaymentMessage":
        return "Chek yuborish";
      case "aboutBotMessage":
        return "Bot haqida";
      case "contactMessage":
        return "Aloqa";
      case "approvedMessage":
        return "Tasdiqlash";
      default:
        return key;
    }
  };
  
  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-bold mb-2">Matnlar menyusi</h2>
        <p className="text-gray-600">Botda ishlatiladigan barcha matnlarni shu yerdan tahrirlashingiz mumkin</p>
      </div>
      
      {/* Templates */}
      <div className="bg-white rounded-lg shadow">
        <div className="border-b">
          <div className="flex border-b overflow-x-auto">
            {isLoading ? (
              <div className="flex-1 py-3 px-4 text-center">
                <span className="material-icons animate-spin text-primary">refresh</span>
              </div>
            ) : texts && texts.length > 0 ? (
              texts.map((template: any) => (
                <button 
                  key={template.key}
                  className={`flex-1 py-3 px-4 text-center font-medium ${activeTab === template.key ? 'text-primary border-b-2 border-primary' : 'text-gray-500 hover:text-gray-800'}`}
                  onClick={() => handleTabChange(template.key)}
                >
                  {getTemplateName(template.key)}
                </button>
              ))
            ) : (
              <div className="flex-1 py-3 px-4 text-center text-gray-500">
                Matnlar mavjud emas
              </div>
            )}
          </div>
        </div>
        
        <div className="p-6">
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-medium mb-2">Matn nomi</label>
            <input 
              type="text" 
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              value={editedName}
              disabled
            />
          </div>
          
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-medium mb-2">Matn</label>
            <textarea 
              rows={8} 
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              value={editedText}
              onChange={(e) => setEditedText(e.target.value)}
              placeholder="Matnni kiriting..."
            />
          </div>
          
          <div className="flex justify-end space-x-3">
            <button 
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              onClick={() => {
                const originalText = texts?.find((t: any) => t.key === activeTab)?.value || "";
                setEditedText(originalText);
              }}
            >
              Bekor qilish
            </button>
            <button 
              className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark"
              onClick={handleSave}
              disabled={updateTextMutation.isPending}
            >
              {updateTextMutation.isPending ? "Saqlanmoqda..." : "Saqlash"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TextTemplates;
