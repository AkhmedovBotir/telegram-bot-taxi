import { ArrowDownIcon, ArrowUpIcon } from "lucide-react";

interface StatsCardProps {
  title: string;
  value: number | string;
  icon: string;
  iconColor: string;
  changeValue?: string;
  changeType?: "positive" | "negative" | "neutral";
  suffix?: string;
}

const StatsCard = ({
  title,
  value,
  icon,
  iconColor,
  changeValue,
  changeType,
  suffix
}: StatsCardProps) => {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-gray-500 text-sm font-medium">{title}</h3>
        <span className={`material-icons ${iconColor}`}>{icon}</span>
      </div>
      <div className="flex items-end">
        <span className="text-3xl font-bold">{value}</span>
        {suffix && <span className="ml-2 text-xs text-gray-500">{suffix}</span>}
        {changeValue && changeType && (
          <span className={`ml-2 text-sm ${
            changeType === "positive" ? "text-success-DEFAULT" : 
            changeType === "negative" ? "text-error-DEFAULT" : 
            "text-gray-500"
          } font-medium flex items-center`}>
            {changeValue}
            {changeType === "positive" ? (
              <span className="material-icons text-xs">arrow_upward</span>
            ) : changeType === "negative" ? (
              <span className="material-icons text-xs">arrow_upward</span>
            ) : null}
          </span>
        )}
      </div>
    </div>
  );
};

export default StatsCard;
